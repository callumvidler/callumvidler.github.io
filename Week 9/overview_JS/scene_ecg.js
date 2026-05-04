// Scene 02 · ECG R-peak detection.
// A synthesised ECG scrolls across the panel. A draggable threshold defines
// the comparator level; each upward crossing produces an output pulse and
// contributes to the displayed beat count.
(function () {
    var svgSel = '#plot-ecg-trace';
    var hrInp = document.getElementById('ecg-hr');
    var hrLab = document.getElementById('ecg-hr-val');
    var nzInp = document.getElementById('ecg-noise');
    var nzLab = document.getElementById('ecg-noise-val');
    var rdTrue = document.getElementById('ecg-true');
    var rdDet = document.getElementById('ecg-detected');
    var rdThr = document.getElementById('ecg-thresh');

    var WINDOW = 4.0; // seconds shown
    var FS = 250;     // sample rate
    var Y_DOMAIN = [-0.5, 1.4];

    var state = {
        hr: 72,
        noise: 0.06,
        thresh: 0.55,
        t: 0,
        last: performance.now(),
        seed: 1234
    };

    // Buffer of samples (rolling)
    var N = Math.round(WINDOW * FS);
    var buf = new Float32Array(N);
    var bufT = new Float32Array(N);
    var head = 0; // next write index

    // Pulse history (timestamps of detected upward threshold crossings)
    var pulses = [];

    function rng() { // mulberry32-ish, simple
        state.seed = (state.seed + 0x6D2B79F5) | 0;
        var t = state.seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // Synthetic ECG sample at absolute time t (seconds)
    function ecgSample(t) {
        var bps = state.hr / 60;
        var phase = ((t * bps) % 1 + 1) % 1; // 0..1 within one beat
        var v = 0;
        // P wave
        v += 0.10 * Math.exp(-Math.pow((phase - 0.18) / 0.030, 2));
        // Q
        v += -0.10 * Math.exp(-Math.pow((phase - 0.36) / 0.012, 2));
        // R
        v += 1.10 * Math.exp(-Math.pow((phase - 0.40) / 0.012, 2));
        // S
        v += -0.20 * Math.exp(-Math.pow((phase - 0.44) / 0.014, 2));
        // T wave
        v += 0.30 * Math.exp(-Math.pow((phase - 0.62) / 0.050, 2));
        // baseline noise
        v += state.noise * (rng() * 2 - 1);
        return v;
    }

    var svg = d3.select(svgSel).classed('ov', true);
    var W = 600, H = 280;
    var margin = { top: 22, right: 78, bottom: 38, left: 56 };
    var iw, ih, x, y;

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gTrace = gRoot.append('g');
    var gOut = gRoot.append('g');
    var gThresh = gRoot.append('g');
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');
    var gPulses = gRoot.append('g');

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(360, rect.width);
        H = Math.max(220, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        iw = W - margin.left - margin.right;
        ih = H - margin.top - margin.bottom;
        gRoot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        x = d3.scaleLinear().domain([-WINDOW, 0]).range([0, iw]);
        y = d3.scaleLinear().domain(Y_DOMAIN).range([ih, 0]);
    }

    function drawStatic() {
        gGrid.selectAll('*').remove();
        gAxis.selectAll('*').remove();
        gTitles.selectAll('*').remove();

        [-0.5, 0, 0.5, 1.0].forEach(function (v) {
            gGrid.append('line')
                .attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        var yAxis = d3.axisLeft(y).tickValues([-0.5, 0, 0.5, 1.0]).tickSize(0).tickPadding(8);
        gAxis.append('g').call(yAxis).select('.domain').remove();
        var xAxis = d3.axisBottom(x).tickValues([-4, -3, -2, -1, 0]).tickFormat(function (d) { return d + 's'; }).tickSize(0).tickPadding(8);
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')').call(xAxis).select('.domain').remove();

        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', iw / 2).attr('y', ih + 30)
            .attr('text-anchor', 'middle')
            .text('time (relative to now), s');
        gTitles.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-40) + ',' + (ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('amplitude, mV');
    }

    function drawTrace() {
        // Pull samples in chronological order from buffer
        var pts = new Array(N);
        for (var i = 0; i < N; i++) {
            var idx = (head + i) % N;
            pts[i] = [bufT[idx] - state.t, buf[idx]];
        }
        var line = d3.line()
            .x(function (d) { return x(Math.max(-WINDOW, Math.min(0, d[0]))); })
            .y(function (d) { return y(Math.max(Y_DOMAIN[0], Math.min(Y_DOMAIN[1], d[1]))); });
        gTrace.selectAll('*').remove();
        gTrace.append('path').datum(pts)
            .attr('class', 'trace input')
            .attr('stroke-width', 1.6)
            .attr('d', line);

        // Comparator output: high inside the small refractory window after each pulse.
        gOut.selectAll('*').remove();
        var OUT_HI = -0.30, OUT_LO = -0.45;
        var outLine = d3.line()
            .x(function (d) { return x(d[0]); })
            .y(function (d) { return y(d[1]); })
            .curve(d3.curveStepAfter);
        // Build a step waveform along the visible window
        var step = [];
        var dt = WINDOW / 240;
        for (var k = 0; k <= 240; k++) {
            var rel = -WINDOW + k * dt;
            var absT = state.t + rel;
            var hi = false;
            for (var p = pulses.length - 1; p >= 0; p--) {
                if (pulses[p] <= absT && absT < pulses[p] + 0.08) { hi = true; break; }
                if (pulses[p] < absT - 0.5) break;
            }
            step.push([rel, hi ? OUT_HI : OUT_LO]);
        }
        gOut.append('path').datum(step)
            .attr('class', 'trace output')
            .attr('stroke-width', 2.0)
            .attr('d', outLine);
        gOut.append('text')
            .attr('x', 4).attr('y', y(OUT_HI) - 4)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10).style('fill', 'var(--c-output)')
            .text('comparator out');

        // Threshold draggable
        gThresh.selectAll('*').remove();
        var yT = y(state.thresh);
        gThresh.append('line')
            .attr('class', 'thresh-line')
            .attr('x1', 0).attr('x2', iw)
            .attr('y1', yT).attr('y2', yT);
        var grab = gThresh.append('g').style('cursor', 'ns-resize');
        grab.append('rect')
            .attr('x', iw + 4).attr('y', yT - 11)
            .attr('width', 56).attr('height', 22)
            .attr('rx', 4)
            .style('fill', 'var(--c-thresh)').attr('opacity', 0.18);
        grab.append('text')
            .attr('class', 'thresh-label')
            .attr('x', iw + 32).attr('y', yT + 4)
            .attr('text-anchor', 'middle')
            .text('V_th');
        grab.append('circle')
            .attr('cx', iw).attr('cy', yT).attr('r', 5)
            .style('fill', 'var(--c-thresh)')
            .style('stroke', 'var(--bg-2)').attr('stroke-width', 1.5);
        var dragH = d3.drag().on('drag', function (event) {
            var ny = Math.max(0, Math.min(ih, event.y));
            state.thresh = Math.max(-0.3, Math.min(1.3, y.invert(ny)));
            drawTrace();
            rdThr.textContent = state.thresh.toFixed(2);
        });
        grab.call(dragH);
        gThresh.select('line').style('cursor', 'ns-resize').call(dragH);
    }

    function step(now) {
        var dt = (now - state.last) / 1000;
        state.last = now;
        if (dt > 0.1) dt = 0.1;
        var nNew = Math.max(1, Math.round(dt * FS));
        for (var i = 0; i < nNew; i++) {
            state.t += 1 / FS;
            var v = ecgSample(state.t);
            // detect upward threshold crossing on the absolute signal (using last sample stored in buffer)
            var prevIdx = (head - 1 + N) % N;
            var prev = buf[prevIdx];
            // refractory: 250 ms
            var lastP = pulses.length ? pulses[pulses.length - 1] : -1;
            if (prev <= state.thresh && v > state.thresh && (state.t - lastP) > 0.25) {
                pulses.push(state.t);
                if (pulses.length > 64) pulses.shift();
            }
            buf[head] = v;
            bufT[head] = state.t;
            head = (head + 1) % N;
        }

        // Detected rate: count pulses inside last WINDOW
        var since = state.t - WINDOW;
        var count = 0;
        for (var p = 0; p < pulses.length; p++) if (pulses[p] >= since) count++;
        var det = count * (60 / WINDOW);
        rdDet.textContent = (count >= 2 ? Math.round(det) : '—') + ' bpm';

        drawTrace();
        requestAnimationFrame(step);
    }

    function init() {
        layout();
        // Pre-fill buffer so the trace doesn't pop from zero
        for (var i = 0; i < N; i++) {
            state.t += 1 / FS;
            buf[i] = ecgSample(state.t);
            bufT[i] = state.t;
        }
        head = 0;

        drawStatic();
        drawTrace();
        rdTrue.textContent = state.hr + ' bpm';
        rdThr.textContent = state.thresh.toFixed(2);
        nzLab.textContent = state.noise.toFixed(2);

        hrInp.addEventListener('input', function () {
            state.hr = parseFloat(hrInp.value);
            hrLab.textContent = state.hr.toFixed(0) + ' bpm';
            rdTrue.textContent = state.hr.toFixed(0) + ' bpm';
        });
        nzInp.addEventListener('input', function () {
            state.noise = parseFloat(nzInp.value);
            nzLab.textContent = state.noise.toFixed(2);
        });
        window.addEventListener('themechange', function () { drawStatic(); drawTrace(); });
        window.addEventListener('resize', function () {
            layout(); drawStatic(); drawTrace();
        });

        state.last = performance.now();
        requestAnimationFrame(step);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
