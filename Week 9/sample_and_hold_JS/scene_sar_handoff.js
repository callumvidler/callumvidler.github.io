// Scene 06 · Hand-off to the SAR.
// Continuous v_in(t) overlaid with the held staircase the SAR receives. Each
// step is annotated with the captured value so the reader can trace what the
// converter actually digitises.
(function () {
    var finI = document.getElementById('sh-hand-fin');
    var fsI  = document.getElementById('sh-hand-fs');
    var finL = document.getElementById('sh-hand-fin-val');
    var fsL  = document.getElementById('sh-hand-fs-val');
    var rdRate = document.getElementById('sh-hand-rate');
    var rdWin  = document.getElementById('sh-hand-win');

    var state = { fin: 1.5, fs: 14 };
    var T_VIEW = 1.0;
    var svg = d3.select('#plot-sh-hand-trace').classed('ov', true);

    function makeFrame(svg) {
        var rect = svg.node().getBoundingClientRect();
        var W = Math.max(420, rect.width);
        var H = Math.max(260, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        var m = { top: 24, right: 28, bottom: 40, left: 56 };
        var iw = W - m.left - m.right;
        var ih = H - m.top - m.bottom;
        var g = svg.select('g.root');
        if (g.empty()) g = svg.append('g').attr('class', 'root');
        g.attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        return { g: g, iw: iw, ih: ih, W: W, H: H };
    }

    function refresh() {
        var f = makeFrame(svg);
        f.g.selectAll('*').remove();

        var x = d3.scaleLinear().domain([0, T_VIEW]).range([0, f.iw]);
        var y = d3.scaleLinear().domain([-1.25, 1.25]).range([f.ih, 0]);

        var grid = f.g.append('g').attr('class', 'grid');
        [-1, 0, 1].forEach(function (v) {
            grid.append('line')
                .attr('x1', 0).attr('x2', f.iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        // Continuous input
        var inPts = [];
        for (var k = 0; k <= 400; k++) {
            var t = (k / 400) * T_VIEW;
            inPts.push([t, Math.sin(2 * Math.PI * state.fin * t)]);
        }
        f.g.append('path')
            .datum(inPts)
            .attr('class', 'trace input')
            .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));

        // Held staircase (sampled at start of each Ts, held for entire Ts)
        var Ts = 1 / state.fs;
        var holdPts = [];
        var n = 0;
        while (n * Ts < T_VIEW + 1e-9) {
            var tn = n * Ts;
            var v = Math.sin(2 * Math.PI * state.fin * tn);
            holdPts.push([tn, v]);
            holdPts.push([Math.min(T_VIEW, (n + 1) * Ts), v]);
            n++;
        }
        f.g.append('path')
            .datum(holdPts)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-output)')
            .attr('stroke-width', 2.4)
            .attr('d', d3.line()
                .x(function (d) { return x(d[0]); })
                .y(function (d) { return y(d[1]); })
                .curve(d3.curveStepAfter));

        // Sample dots at the start of each step
        for (var m = 0; m * Ts < T_VIEW + 1e-9; m++) {
            var tm = m * Ts;
            var vm = Math.sin(2 * Math.PI * state.fin * tm);
            f.g.append('circle')
                .attr('cx', x(tm)).attr('cy', y(vm)).attr('r', 3.2)
                .attr('class', 'sample-dot');
        }

        // Axes
        var ax = f.g.append('g').attr('class', 'axis')
            .attr('transform', 'translate(0,' + f.ih + ')')
            .call(d3.axisBottom(x).ticks(6)
                .tickFormat(function (d) { return d.toFixed(2) + ' s'; })
                .tickSize(0).tickPadding(8));
        ax.select('.domain').remove();
        var ay = f.g.append('g').attr('class', 'axis')
            .call(d3.axisLeft(y).tickValues([-1, 0, 1])
                .tickFormat(function (d) { return d.toFixed(0); })
                .tickSize(0).tickPadding(8));
        ay.select('.domain').remove();

        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('x', f.iw / 2).attr('y', f.ih + 32)
            .attr('text-anchor', 'middle')
            .text('time, seconds');
        f.g.append('text')
            .attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-40) + ',' + (f.ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('amplitude');

        // Legend
        var lg = f.g.append('g').attr('transform', 'translate(' + (f.iw - 12) + ',6)');
        lg.append('text')
            .attr('text-anchor', 'end').attr('y', 10)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-input)').text('v_in(t)');
        lg.append('text')
            .attr('text-anchor', 'end').attr('y', 26)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-output)').text('held output to SAR');

        rdRate.textContent = state.fs.toFixed(0);
        rdWin.textContent = (Ts * 1000).toFixed(1) + ' ms';
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
