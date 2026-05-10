// scene_chain.js  ·  Slide 5
// End-to-end simulation. Input sinewave -> precision rectifier -> first-
// order LPF. Three traces share an axis: x(t), |x(t)|, y(t). The dashed
// line marks the analytic target 2A/pi.
(function () {
    var SVG = '#plot-mav-chain';
    var svg = d3.select(SVG);
    if (svg.empty()) return;
    svg.classed('ov', true);

    var W = 800, H = 320;
    var margin = { top: 48, right: 28, bottom: 48, left: 60 };
    var iw, ih, x, y;

    var T_WIN = 0.50;     // 500 ms x-window, fixed
    var Y_MAX = 2.2;      // fixed amplitude window (V)

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');
    var gIn = gRoot.append('g');
    var gRect = gRoot.append('g');
    var gOut = gRoot.append('g');
    var gMark = gRoot.append('g');
    var gLegend = gRoot.append('g');

    var ui = {
        A: document.getElementById('chain-A'),
        Av: document.getElementById('chain-A-val'),
        f: document.getElementById('chain-f'),
        fv: document.getElementById('chain-f-val'),
        fc: document.getElementById('chain-fc'),
        fcv: document.getElementById('chain-fc-val'),
        target: document.getElementById('mav-target'),
        out: document.getElementById('mav-out'),
        err: document.getElementById('mav-err')
    };

    function params() {
        return {
            A: parseFloat(ui.A.value),
            f: parseFloat(ui.f.value),
            fc: parseFloat(ui.fc.value)
        };
    }

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(420, rect.width);
        H = Math.max(240, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        iw = W - margin.left - margin.right;
        ih = H - margin.top - margin.bottom;
        gRoot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    }

    function lpf(u, dt, tau) {
        var y = new Array(u.length);
        y[0] = 0;
        for (var n = 1; n < u.length; n++) {
            y[n] = y[n - 1] + (dt / tau) * (u[n - 1] - y[n - 1]);
        }
        return y;
    }

    function drawAxes() {
        gGrid.selectAll('*').remove();
        gAxis.selectAll('*').remove();
        gTitles.selectAll('*').remove();

        x = d3.scaleLinear().domain([0, T_WIN]).range([0, iw]);
        y = d3.scaleLinear().domain([-Y_MAX, Y_MAX]).range([ih, 0]);

        [-2, -1, 0, 1, 2].forEach(function (v) {
            gGrid.append('line')
                .attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        gAxis.append('g')
            .call(d3.axisLeft(y).tickValues([-2, -1, 0, 1, 2])
                .tickFormat(function (d) { return d.toFixed(1); })
                .tickSize(0).tickPadding(8))
            .select('.domain').remove();

        var xt = [];
        var step = T_WIN / 5;
        for (var k = 0; k <= 5; k++) xt.push(k * step);
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(d3.axisBottom(x).tickValues(xt)
                .tickFormat(function (d) { return (d * 1000).toFixed(0) + ' ms'; })
                .tickSize(0).tickPadding(8))
            .select('.domain').remove();

        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', iw / 2).attr('y', ih + 38)
            .attr('text-anchor', 'middle')
            .text('time, ms');
        gTitles.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-46) + ',' + (ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('amplitude, V');
    }

    function drawTraces(p, t, xs, rect, ys) {
        gIn.selectAll('*').remove();
        gRect.selectAll('*').remove();
        gOut.selectAll('*').remove();
        gMark.selectAll('*').remove();
        gLegend.selectAll('*').remove();

        var line = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
        var inPts = t.map(function (ti, i) { return [ti, xs[i]]; });
        var rPts = t.map(function (ti, i) { return [ti, rect[i]]; });
        var oPts = t.map(function (ti, i) { return [ti, ys[i]]; });

        gIn.append('path').datum(inPts).attr('class', 'trace input').attr('d', line)
            .attr('opacity', 0.45);
        gRect.append('path').datum(rPts).attr('class', 'trace output').attr('d', line)
            .attr('opacity', 0.7);
        gOut.append('path').datum(oPts).attr('class', 'trace output2').attr('d', line);

        var mav = (2 * p.A) / Math.PI;
        gMark.append('line')
            .attr('class', 'thresh-line')
            .attr('x1', 0).attr('x2', iw)
            .attr('y1', y(mav)).attr('y2', y(mav))
            .style('cursor', 'default');
        gMark.append('text')
            .attr('class', 'thresh-label')
            .attr('x', iw - 6).attr('y', y(mav) - 5)
            .attr('text-anchor', 'end')
            .text('MAV = 2A/π = ' + mav.toFixed(3) + ' V');

        var lx = 8, ly = 8, dy = 14;
        function lg(i, color, label) {
            gLegend.append('line')
                .attr('x1', lx).attr('x2', lx + 18)
                .attr('y1', ly + i * dy + 6).attr('y2', ly + i * dy + 6)
                .attr('stroke', color).attr('stroke-width', 2.2);
            gLegend.append('text')
                .attr('x', lx + 24).attr('y', ly + i * dy + 9)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 10).attr('fill', 'var(--text-dim)')
                .text(label);
        }
        lg(0, 'var(--c-input)',   'x(t)');
        lg(1, 'var(--c-output)',  '|x(t)|');
        lg(2, 'var(--c-output2)', 'y(t) · MAV');
    }

    function update() {
        var p = params();
        var tau = 1 / (2 * Math.PI * p.fc);
        var dt = Math.min(1 / (60 * p.f), tau / 30);
        var N = Math.min(6000, Math.ceil(T_WIN / dt));
        dt = T_WIN / N;

        var t = new Array(N + 1);
        var xs = new Array(N + 1);
        var rect = new Array(N + 1);
        for (var i = 0; i <= N; i++) {
            t[i] = i * dt;
            xs[i] = p.A * Math.sin(2 * Math.PI * p.f * t[i]);
            rect[i] = Math.abs(xs[i]);
        }
        var ys = lpf(rect, dt, tau);

        var mav = (2 * p.A) / Math.PI;
        var s = 0, k0 = Math.floor(0.8 * (N + 1));
        for (var k = k0; k <= N; k++) s += ys[k];
        var measured = s / (N + 1 - k0);

        ui.Av.textContent = p.A.toFixed(2) + ' V';
        ui.fv.textContent = p.f.toFixed(0) + ' Hz';
        ui.fcv.textContent = p.fc.toFixed(1) + ' Hz';
        if (ui.target) ui.target.textContent = mav.toFixed(3) + ' V';
        if (ui.out) ui.out.textContent = measured.toFixed(3) + ' V';
        if (ui.err) {
            var e = mav > 0 ? (100 * (measured - mav) / mav) : 0;
            ui.err.textContent = (e >= 0 ? '+' : '') + e.toFixed(1) + ' %';
        }

        layout();
        drawAxes();
        drawTraces(p, t, xs, rect, ys);
    }

    function init() {
        ui.A.addEventListener('input', update);
        ui.f.addEventListener('input', update);
        ui.fc.addEventListener('input', update);
        window.addEventListener('resize', update);
        window.addEventListener('themechange', update);
        update();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
