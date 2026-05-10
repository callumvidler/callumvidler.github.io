// scene_threshold.js  ·  Slide 3
// Comparator and Schmitt trigger applied to the filtered EEG. Toggle
// hysteresis to compare single-threshold and dual-threshold behaviour.
// Counts true detections and false re-triggers against the ground-truth
// spike list.
(function () {
    var SVG = '#plot-cmp-trace';
    var WINDOW = 10;
    var Y_DOMAIN = [-3.4, 3.4];
    var OUT_HI = -2.20, OUT_LO = -3.05;

    var svg = d3.select(SVG).classed('ov', true);
    var W = 700, H = 360;
    var margin = { top: 48, right: 26, bottom: 42, left: 56 };
    var iw, ih, x, y;

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gTrace = gRoot.append('g');
    var gOut = gRoot.append('g');
    var gThresh = gRoot.append('g');
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');
    var gMark = gRoot.append('g');

    var ui = {
        hyst: document.getElementById('cmp-hyst'),
        th: document.getElementById('cmp-th'),
        thVal: document.getElementById('cmp-th-val'),
        hw: document.getElementById('cmp-hw'),
        hwVal: document.getElementById('cmp-hw-val'),
        rTrue: document.getElementById('cmp-true'),
        rDet: document.getElementById('cmp-det'),
        rFalse: document.getElementById('cmp-false')
    };

    var state = {
        hyst: true,
        th: 0.55,
        hw: 0.20,
        // Comparator memory (last sample value & current digital state)
        lastVal: 0,
        outHigh: false,
        // Detected pulse times (for both modes), absolute t
        pulses: []
    };

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(420, rect.width);
        H = Math.max(260, rect.height);
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

        [-3, -2, -1, 0, 1, 2, 3].forEach(function (v) {
            gGrid.append('line').attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });
        var yAxis = d3.axisLeft(y).tickValues([-2, -1, 0, 1, 2, 3]).tickSize(0).tickPadding(8);
        gAxis.append('g').call(yAxis).select('.domain').remove();
        var xAxis = d3.axisBottom(x).tickValues([-10, -8, -6, -4, -2, 0])
            .tickFormat(function (d) { return d + 's'; }).tickSize(0).tickPadding(8);
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(xAxis).select('.domain').remove();

        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', iw / 2).attr('y', ih + 32)
            .attr('text-anchor', 'middle')
            .text('time relative to now, s');
        gTitles.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-42) + ',' + (ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('amplitude, mV');
    }

    function comparatorEvaluate(data, nowT) {
        // Reset internal comparator state and re-evaluate the visible window so
        // toggling hysteresis takes effect immediately. Returns rising-edge
        // pulses and a per-sample digital output so the displayed step
        // waveform matches the comparator faithfully.
        var pulses = [];
        var outArr = new Uint8Array(data.length);
        var prev = data[0] ? data[0].filt : 0;
        var outHigh = false;
        var Vth = state.th;
        var Vlo = state.hyst ? state.th - state.hw : state.th;
        outArr[0] = (data[0] && data[0].filt > Vth) ? 1 : 0;
        if (!state.hyst) outHigh = outArr[0] === 1;
        for (var i = 1; i < data.length; i++) {
            var v = data[i].filt;
            if (state.hyst) {
                if (!outHigh && prev <= Vth && v > Vth) {
                    outHigh = true;
                    pulses.push({ t: data[i].t, kind: 'rise' });
                } else if (outHigh && prev >= Vlo && v < Vlo) {
                    outHigh = false;
                }
                outArr[i] = outHigh ? 1 : 0;
            } else {
                if (prev <= Vth && v > Vth) {
                    pulses.push({ t: data[i].t, kind: 'rise' });
                }
                outArr[i] = (v > Vth) ? 1 : 0;
            }
            prev = v;
        }
        var falseExtra = 0;
        // Compare against ground-truth: each true spike should produce exactly one rise
        // within ±150 ms; extra rises in the same window are false retriggers.
        var spikes = EEG.spikesRecent(WINDOW);
        var matchedSpikes = 0;
        var consumed = pulses.map(function () { return false; });
        for (var s = 0; s < spikes.length; s++) {
            var st = spikes[s].t;
            // Only counts if the spike amplitude actually exceeds the threshold.
            // Otherwise the comparator is "right" to miss it.
            if (spikes[s].amp < state.th) continue;
            var bestIdx = -1, bestDt = 1;
            for (var p = 0; p < pulses.length; p++) {
                if (consumed[p]) continue;
                var dt = Math.abs(pulses[p].t - st);
                if (dt < 0.20 && dt < bestDt) { bestDt = dt; bestIdx = p; }
            }
            if (bestIdx >= 0) { consumed[bestIdx] = true; matchedSpikes++; }
        }
        // Unmatched pulses near a real spike are re-triggers; far from any spike
        // they are noise-driven false positives. Both count as "false".
        for (var k = 0; k < pulses.length; k++) {
            if (!consumed[k]) falseExtra++;
        }
        return { pulses: pulses, matched: matchedSpikes, falseExtra: falseExtra, outArr: outArr };
    }

    function drawFrame() {
        var data = EEG.recent(WINDOW);
        if (data.length === 0) return;
        var nowT = data[data.length - 1].t;

        // Trace · clipped above the comparator-output strip so the seizure's
        // negative swings do not draw on top of the digital trace.
        var TRACE_FLOOR = OUT_HI + 0.30;
        var line = d3.line()
            .x(function (d) { return x(d.t - nowT); })
            .y(function (d) { return y(Math.max(TRACE_FLOOR, Math.min(Y_DOMAIN[1], d.filt))); });
        gTrace.selectAll('*').remove();
        gTrace.append('path').datum(data)
            .attr('class', 'trace input')
            .attr('stroke-width', 1.6)
            .attr('d', line);

        // Threshold lines
        gThresh.selectAll('*').remove();
        gThresh.append('line').attr('class', 'thresh-line')
            .attr('x1', 0).attr('x2', iw)
            .attr('y1', y(state.th)).attr('y2', y(state.th));
        gThresh.append('text').attr('class', 'thresh-label')
            .attr('x', iw - 4).attr('y', y(state.th) - 4)
            .attr('text-anchor', 'end')
            .text(state.hyst ? 'V_T+' : 'V_th');
        if (state.hyst) {
            gThresh.append('line').attr('class', 'thresh-line')
                .attr('stroke', 'var(--c-output2)')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(state.th - state.hw)).attr('y2', y(state.th - state.hw));
            gThresh.append('text').attr('class', 'thresh-label')
                .attr('fill', 'var(--c-output2)')
                .attr('x', iw - 4).attr('y', y(state.th - state.hw) + 12)
                .attr('text-anchor', 'end')
                .text('V_T−');
        }

        // Comparator output as step waveform, sampled directly from the per-
        // sample output array so what is shown is exactly what the comparator
        // produces on the visible buffer.
        var ev = comparatorEvaluate(data, nowT);
        var step = new Array(data.length);
        for (var k = 0; k < data.length; k++) {
            step[k] = [data[k].t - nowT, ev.outArr[k] ? OUT_HI : OUT_LO];
        }
        gOut.selectAll('*').remove();
        var outLine = d3.line()
            .x(function (d) { return x(d[0]); })
            .y(function (d) { return y(d[1]); })
            .curve(d3.curveStepAfter);
        gOut.append('path').datum(step)
            .attr('class', 'trace output')
            .attr('stroke-width', 2.0)
            .attr('d', outLine);
        gOut.append('text')
            .attr('x', 4).attr('y', y(OUT_HI) - 4)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10).style('fill', 'var(--c-output)')
            .text('comparator out');

        // Pulse marks
        gMark.selectAll('*').remove();
        ev.pulses.forEach(function (p, i) {
            var rel = p.t - nowT;
            if (rel < -WINDOW || rel > 0) return;
            gMark.append('circle')
                .attr('class', 'pulse-mark')
                .attr('cx', x(rel)).attr('cy', y(OUT_HI) - 9).attr('r', 3);
        });

        // Readouts
        var trueCount = EEG.spikesRecent(WINDOW).filter(function (s) { return s.amp >= state.th; }).length;
        ui.rTrue.textContent = trueCount;
        ui.rDet.textContent = ev.matched;
        ui.rFalse.textContent = ev.falseExtra;
    }

    function init() {
        layout();
        drawStatic();

        ui.hyst.addEventListener('click', function () {
            state.hyst = !state.hyst;
            ui.hyst.classList.toggle('active', state.hyst);
            ui.hyst.textContent = state.hyst ? 'hysteresis on' : 'hysteresis off';
            drawFrame();
        });
        ui.th.addEventListener('input', function () {
            state.th = parseFloat(ui.th.value);
            ui.thVal.textContent = state.th.toFixed(2);
            drawFrame();
        });
        ui.hw.addEventListener('input', function () {
            state.hw = parseFloat(ui.hw.value);
            ui.hwVal.textContent = state.hw.toFixed(2);
            drawFrame();
        });

        EEG.onTick(drawFrame);
        window.addEventListener('themechange', function () { drawStatic(); drawFrame(); });
        window.addEventListener('resize', function () { layout(); drawStatic(); drawFrame(); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
