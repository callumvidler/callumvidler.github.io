// scene_peak.js  ·  Slide 4
// Passive peak detector (diode + capacitor) with adjustable leak time-
// constant and diode forward drop V_D. The capacitor charges to V_in - V_D
// when the input is rising and the diode conducts; otherwise the held
// voltage decays through the leak resistor. Spikes smaller than V_D produce
// no held output at all — the failure mode that motivates the gain stage on
// slide 5.
(function () {
    var SVG = '#plot-pk-trace';
    var WINDOW = 10;
    var Y_DOMAIN = [-1.0, 3.4];

    var svg = d3.select(SVG).classed('ov', true);
    var W = 700, H = 360;
    var margin = { top: 48, right: 26, bottom: 42, left: 56 };
    var iw, ih, x, y;

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gTrace = gRoot.append('g');
    var gHold = gRoot.append('g');
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');

    var ui = {
        tau: document.getElementById('pk-tau'),
        tauVal: document.getElementById('pk-tau-val'),
        vd: document.getElementById('pk-vd'),
        vdVal: document.getElementById('pk-vd-val'),
        rVal: document.getElementById('pk-val'),
        rLast: document.getElementById('pk-last'),
        rSlope: document.getElementById('pk-slope')
    };

    var state = {
        tau: 2.0,
        vd: 0.30,
        // Per-sample peak buffer (recomputed every frame from the EEG ring buffer)
        held: new Float32Array(EEG.HISTORY * EEG.FS)
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

        [-1, 0, 1, 2, 3].forEach(function (v) {
            gGrid.append('line').attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });
        var yAxis = d3.axisLeft(y).tickValues([-1, 0, 1, 2, 3]).tickSize(0).tickPadding(8);
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

    // Passive peak detector model (diode + capacitor + leak resistor):
    //   if (V_in - V_D) > V_held:   V_held := V_in - V_D   (diode conducts)
    //   else:                       V_held := V_held * exp(-dt/τ_leak)
    // Spikes with V_in <= V_D never charge the capacitor.
    function computeHeld(data) {
        var n = data.length;
        var dt = (n > 1) ? (data[1].t - data[0].t) : (1 / EEG.FS);
        var alpha = Math.exp(-dt / state.tau);
        var v = 0;
        for (var i = 0; i < n; i++) {
            var x = data[i].filt - state.vd;
            if (x > v) v = x;
            else v *= alpha;
            if (v < 0) v = 0;
            state.held[i] = v;
        }
    }

    function drawFrame() {
        var data = EEG.recent(WINDOW);
        if (data.length === 0) return;
        var nowT = data[data.length - 1].t;

        computeHeld(data);

        var line = d3.line()
            .x(function (d) { return x(d.t - nowT); })
            .y(function (d) { return y(Math.max(Y_DOMAIN[0], Math.min(Y_DOMAIN[1], d.filt))); });
        gTrace.selectAll('*').remove();
        gTrace.append('path').datum(data)
            .attr('class', 'trace input')
            .attr('stroke-width', 1.4)
            .attr('opacity', 0.85)
            .attr('d', line);

        var hd = data.map(function (d, i) { return { t: d.t, v: state.held[i] }; });
        var hLine = d3.line()
            .x(function (d) { return x(d.t - nowT); })
            .y(function (d) { return y(Math.max(Y_DOMAIN[0], Math.min(Y_DOMAIN[1], d.v))); });
        gHold.selectAll('*').remove();
        gHold.append('path').datum(hd)
            .attr('class', 'trace output2')
            .attr('stroke-width', 2.4)
            .attr('d', hLine);
        gHold.append('text')
            .attr('x', 4).attr('y', y(0) - 6)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10).style('fill', 'var(--c-output2)')
            .text('V_held ≈ V_peak − V_D');

        // Diode threshold marker
        gHold.append('line')
            .attr('x1', 0).attr('x2', iw)
            .attr('y1', y(state.vd)).attr('y2', y(state.vd))
            .attr('stroke', 'var(--c-thresh)')
            .attr('stroke-width', 1.0)
            .attr('stroke-dasharray', '4 4')
            .attr('opacity', 0.6);
        gHold.append('text')
            .attr('x', iw - 6).attr('y', y(state.vd) - 4)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10).style('fill', 'var(--c-thresh)')
            .text('V_D = ' + state.vd.toFixed(2));

        var lastHeld = state.held[data.length - 1];
        ui.rVal.textContent = lastHeld.toFixed(2) + ' mV';

        var sp = EEG.spikesRecent(WINDOW);
        if (sp.length) {
            ui.rLast.textContent = sp[sp.length - 1].amp.toFixed(2) + ' mV';
        } else {
            ui.rLast.textContent = '— mV';
        }

        // Envelope slope: simple linear regression on the held trace, downsampled.
        var stepN = Math.max(1, Math.floor(data.length / 80));
        var xs = [], ys = [];
        for (var i = 0; i < data.length; i += stepN) {
            xs.push(data[i].t - nowT);
            ys.push(state.held[i]);
        }
        if (xs.length >= 4) {
            var xm = 0, ym = 0;
            for (var k = 0; k < xs.length; k++) { xm += xs[k]; ym += ys[k]; }
            xm /= xs.length; ym /= xs.length;
            var num = 0, den = 0;
            for (var j = 0; j < xs.length; j++) {
                num += (xs[j] - xm) * (ys[j] - ym);
                den += (xs[j] - xm) * (xs[j] - xm);
            }
            var slope = den < 1e-6 ? 0 : num / den;
            var label = 'flat';
            if (slope > 0.05) label = 'rising';
            else if (slope < -0.05) label = 'falling';
            ui.rSlope.textContent = label;
            ui.rSlope.classList.toggle('on', label === 'rising');
            ui.rSlope.classList.toggle('warn', label === 'falling');
        }
    }

    function init() {
        layout();
        drawStatic();
        ui.tau.addEventListener('input', function () {
            state.tau = parseFloat(ui.tau.value);
            ui.tauVal.textContent = state.tau.toFixed(1) + ' s';
            drawFrame();
        });
        ui.vd.addEventListener('input', function () {
            state.vd = parseFloat(ui.vd.value);
            ui.vdVal.textContent = state.vd.toFixed(2);
            drawFrame();
        });
        EEG.onTick(drawFrame);
        window.addEventListener('themechange', function () { drawStatic(); drawFrame(); });
        window.addEventListener('resize', function () { layout(); drawStatic(); drawFrame(); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
