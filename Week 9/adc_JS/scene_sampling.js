// Scene 02 · Sampling.
// Top plot: continuous sine v(t) overlaid with sample dots at rate f_s.
// Lower plot: zero-order hold reconstruction from the sampled sequence, with a
// dashed marker at the apparent (aliased) frequency where applicable.
(function () {
    var finI  = document.getElementById('smp-fin');
    var fsI   = document.getElementById('smp-fs');
    var finL  = document.getElementById('smp-fin-val');
    var fsL   = document.getElementById('smp-fs-val');
    var rdNyq = document.getElementById('smp-nyq');
    var rdRat = document.getElementById('smp-ratio');
    var rdAls = document.getElementById('smp-alias');

    var state = { fin: 2.0, fs: 20 };
    var T_VIEW = 1.0;  // seconds shown on the x-axis

    var traceSvg = d3.select('#plot-smp-trace').classed('ov', true);
    var reconSvg = d3.select('#plot-smp-recon').classed('ov', true);

    function makeFrame(svg, opts) {
        opts = opts || {};
        var rect = svg.node().getBoundingClientRect();
        var W = Math.max(420, rect.width);
        var H = Math.max(opts.minH || 200, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var m = { top: 22, right: 28, bottom: 38, left: 56 };
        var iw = W - m.left - m.right;
        var ih = H - m.top - m.bottom;
        var g = svg.select('g.root');
        if (g.empty()) g = svg.append('g').attr('class', 'root');
        g.attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { g: g, iw: iw, ih: ih, W: W, H: H };
    }

    function drawTrace() {
        var f = makeFrame(traceSvg);
        f.g.selectAll('*').remove();

        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-1.25, 1.25]).range([f.ih, 0]);

        // Grid
        var grid = f.g.append('g').attr('class', 'grid');
        [-1, -0.5, 0, 0.5, 1].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        // Continuous sine
        var pts = [];
        var N = 400;
        for (var k = 0; k <= N; k++) {
            var t = (k / N) * T_VIEW;
            pts.push([t, Math.sin(2 * Math.PI * state.fin * t)]);
        }
        f.g.append('path')
            .datum(pts)
            .attr('class', 'trace input')
            .attr('d', d3.line()
                .x(function (d) { return x(d[0]); })
                .y(function (d) { return y(d[1]); }));

        // Sample dots
        var dots = [];
        var Ts = 1 / state.fs;
        for (var n = 0; n * Ts <= T_VIEW + 1e-9; n++) {
            var tn = n * Ts;
            dots.push([tn, Math.sin(2 * Math.PI * state.fin * tn)]);
        }
        var gDots = f.g.append('g');
        dots.forEach(function (d) {
            gDots.append('line')
                .attr('class', 'sample-stem')
                .attr('x1', x(d[0])).attr('x2', x(d[0]))
                .attr('y1', y(0)).attr('y2', y(d[1]));
            gDots.append('circle')
                .attr('class', 'sample-dot')
                .attr('cx', x(d[0])).attr('cy', y(d[1])).attr('r', 3.2);
        });

        // Axes
        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(6).tickFormat(function (d) { return d.toFixed(2) + ' s'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).tickValues([-1, 0, 1]).tickFormat(function (d) { return d.toFixed(0); })
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        // Axis titles
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 30)
            .attr('text-anchor', 'middle')
            .text('time, seconds');
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-40) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('amplitude');
    }

    function drawRecon() {
        var f = makeFrame(reconSvg, { minH: 140 });
        f.g.selectAll('*').remove();

        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-1.25, 1.25]).range([f.ih, 0]);

        // Grid
        var grid = f.g.append('g').attr('class', 'grid');
        [-1, 0, 1].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        // Original (faint dashed) for reference
        var origPts = [];
        for (var k = 0; k <= 400; k++) {
            var t = (k / 400) * T_VIEW;
            origPts.push([t, Math.sin(2 * Math.PI * state.fin * t)]);
        }
        f.g.append('path')
            .datum(origPts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-input)')
            .attr('stroke-width', 1.2)
            .attr('stroke-dasharray', '3 4')
            .attr('opacity', 0.5)
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Apparent / aliased frequency for the reconstructed signal
        var fApparent = state.fin;
        if (state.fin > state.fs / 2) {
            // Fold into [0, fs/2]
            var r = state.fin / state.fs;
            var frac = r - Math.floor(r);
            if (frac > 0.5) frac = 1 - frac;
            fApparent = frac * state.fs;
        }

        // Zero-order hold reconstruction
        var Ts = 1 / state.fs;
        var holdPts = [];
        var nMax = Math.floor(T_VIEW / Ts);
        for (var n = 0; n <= nMax; n++) {
            var tn = n * Ts;
            var v = Math.sin(2 * Math.PI * state.fin * tn);
            holdPts.push([tn, v]);
            holdPts.push([Math.min(T_VIEW, tn + Ts), v]);
        }
        f.g.append('path')
            .datum(holdPts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-output)')
            .attr('stroke-width', 2.0)
            .attr('d', d3.line()
                .x(function (d) { return x(d[0]); })
                .y(function (d) { return y(d[1]); })
                .curve(d3.curveStepAfter));

        // Smooth ideal reconstruction at fApparent (what a downstream filter recovers)
        if (state.fin > 0.05) {
            var sPts = [];
            for (var k = 0; k <= 400; k++) {
                var t = (k / 400) * T_VIEW;
                sPts.push([t, Math.sin(2 * Math.PI * fApparent * t)]);
            }
            f.g.append('path')
                .datum(sPts)
                .attr('fill', 'none')
                .attr('stroke', 'var(--c-output2)')
                .attr('stroke-width', 1.6)
                .attr('opacity', 0.85)
                .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));
        }

        // Axes
        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(6).tickFormat(function (d) { return d.toFixed(2) + ' s'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();

        // Title and apparent-frequency annotation
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 30)
            .attr('text-anchor', 'middle')
            .text('time, seconds');

        f.g.append('text')
            .attr('x', f.iw - 6).attr('y', 14)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 11)
            .attr('fill', 'var(--c-output2)')
            .text('apparent f = ' + fApparent.toFixed(2) + ' Hz');
    }

    function updateReadout() {
        var fNyq = state.fs / 2;
        var ratio = state.fin / fNyq;
        rdNyq.textContent = fNyq.toFixed(1) + ' Hz';
        rdRat.textContent = ratio.toFixed(2);
        var alias = state.fin > fNyq;
        rdAls.textContent = alias ? 'YES' : 'no';
        rdAls.className = 'v ' + (alias ? 'warn' : 'on');
    }

    function refresh() {
        drawTrace();
        drawRecon();
        updateReadout();
    }

    function init() {
        finI.addEventListener('input', function () {
            state.fin = parseFloat(finI.value);
            finL.textContent = state.fin.toFixed(1) + ' Hz';
            refresh();
        });
        fsI.addEventListener('input', function () {
            state.fs = parseFloat(fsI.value);
            fsL.textContent = state.fs.toFixed(1) + ' Hz';
            refresh();
        });
        window.addEventListener('themechange', refresh);
        window.addEventListener('resize', refresh);
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
