// Section 04 · Plain comparator response to a noisy biosignal.
// Two stacked panels share a common time axis:
//   top    — clean ECG-like input plus broadband noise, with the threshold
//   bottom — plain comparator output, showing chatter when the signal
//            grazes the threshold.
(function () {
    var sel = '#plot-noise-comparator';

    var Vsat = 1.0;
    var Tend = 3.0;
    var nSamples = 1500;
    var seed = 17;

    var state = { noise: 0.18, vref: 0.45 };

    var samples = null;
    function buildSamples() {
        var t = new Array(nSamples + 1);
        var clean = new Array(nSamples + 1);
        var noise = new Array(nSamples + 1);
        var localRng = window.CMP.rng(seed);
        for (var i = 0; i <= nSamples; i++) {
            t[i] = i * Tend / nSamples;
            clean[i] = window.CMP.ecgLike(t[i]);
            noise[i] = window.CMP.gaussian(localRng);
        }
        samples = { t: t, clean: clean, noise: noise };
    }

    function render() {
        if (!samples) buildSamples();

        var root = d3.select(sel);
        root.selectAll('*').remove();

        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || 420;

        var margin = { top: 30, right: 28, bottom: 56, left: 76 };
        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top - margin.bottom;
        var gap = 10;
        // Signal panel taller than output panel.
        var hSig = (innerH - gap) * 0.62;
        var hOut = innerH - gap - hSig;

        var svg = root.append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);

        var x = d3.scaleLinear().domain([0, Tend]).range([0, innerW]);
        var ySig = d3.scaleLinear().domain([-0.4, 1.3]).range([hSig, 0]);
        var yDigit = d3.scaleLinear().domain([-1.4, 1.4]).range([hOut, 0]);

        var gSig = svg.append('g').attr('transform',
            'translate(' + margin.left + ',' + margin.top + ')');
        var gOut = svg.append('g').attr('transform',
            'translate(' + margin.left + ',' + (margin.top + hSig + gap) + ')');

        window.CMP.drawGrid(gSig, x, ySig, innerW, hSig, {
            xTicks: d3.range(0, Tend + 0.5, 0.5),
            yTicks: [-0.4, 0, 0.4, 0.8, 1.2]
        });
        window.CMP.drawGrid(gOut, x, yDigit, innerW, hOut, {
            xTicks: d3.range(0, Tend + 0.5, 0.5),
            yTicks: [-1, 0, 1]
        });

        // Threshold line on signal panel
        gSig.append('line')
            .attr('class', 'trace thresh')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', ySig(state.vref)).attr('y2', ySig(state.vref));

        // Build noisy signal
        var sig = new Array(samples.t.length);
        for (var i = 0; i < sig.length; i++) {
            sig[i] = samples.clean[i] + state.noise * samples.noise[i];
        }

        // Plain comparator output
        var out = new Array(sig.length);
        for (var j = 0; j < sig.length; j++) {
            out[j] = sig[j] > state.vref ? +Vsat : -Vsat;
        }

        // Count transitions to surface the chatter problem numerically
        var transitions = 0;
        for (var k = 1; k < out.length; k++) {
            if (out[k] !== out[k - 1]) transitions++;
        }

        var lineSig = d3.line()
            .x(function (d, i) { return x(samples.t[i]); })
            .y(function (d) { return ySig(d); });
        gSig.append('path')
            .datum(sig)
            .attr('class', 'trace input')
            .attr('stroke-width', 1.4)
            .attr('d', lineSig);

        var lineOut = d3.line()
            .x(function (d, i) { return x(samples.t[i]); })
            .y(function (d) { return yDigit(d); })
            .curve(d3.curveStepAfter);
        gOut.append('path')
            .datum(out)
            .attr('class', 'trace output')
            .attr('d', lineOut);

        // Axes
        var xAxisSig = gSig.append('g')
            .attr('transform', 'translate(0,' + hSig + ')')
            .call(d3.axisBottom(x).ticks(6).tickFormat(function () { return ''; }));
        var yAxisSig = gSig.append('g')
            .call(d3.axisLeft(ySig).tickValues([0, 0.5, 1.0]).tickFormat(d3.format('.1f')));

        var xAxisOut = gOut.append('g')
            .attr('transform', 'translate(0,' + hOut + ')')
            .call(d3.axisBottom(x).ticks(6));
        var yAxisOut = gOut.append('g')
            .call(d3.axisLeft(yDigit).tickValues([-1, 1]));

        [xAxisSig, yAxisSig, xAxisOut, yAxisOut].forEach(window.CMP.styleAxis);

        // Panel labels
        window.renderKatex(svg, '\\text{biosignal} + \\text{noise} + V_\\text{ref}',
            margin.left + innerW - 110, margin.top + 12,
            { width: 220, height: 18, size: 11, color: window.T.textDim, align: 'right' });
        window.renderKatex(svg,
            '\\text{comparator output} \\;\\;\\;' + transitions + '\\text{ transitions}',
            margin.left + innerW - 110, margin.top + hSig + gap + 12,
            { width: 240, height: 18, size: 11,
              color: window.CMP.cssVar('--c-output'), align: 'right' });

        // Axis titles
        window.renderKatex(svg, 'v(t) \\, [\\mathrm{V}]',
            22, margin.top + hSig / 2,
            { width: 140, height: 22, rotate: -90, size: 13 });
        window.renderKatex(svg, 'v_\\text{out}',
            22, margin.top + hSig + gap + hOut / 2,
            { width: 100, height: 22, rotate: -90, size: 13 });
        window.renderKatex(svg, 't \\, [\\mathrm{s}]',
            margin.left + innerW / 2, H - 14,
            { width: 100, height: 22, size: 14 });
    }

    function bind() {
        var n  = document.getElementById('noise-amp');
        var v  = document.getElementById('noise-vref');
        var nL = document.getElementById('noise-amp-val');
        var vL = document.getElementById('noise-vref-val');

        function update() {
            state.noise = parseFloat(n.value);
            state.vref  = parseFloat(v.value);
            nL.textContent = state.noise.toFixed(2) + ' V';
            vL.textContent = state.vref.toFixed(2) + ' V';
            render();
        }
        [n, v].forEach(function (el) { el.addEventListener('input', update); });
        update();
    }

    function init() {
        bind();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
