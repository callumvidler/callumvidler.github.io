// scene_rect.js  ·  Slide 3
// Input sinewave x(t) and the full-wave-rectified output |x(t)|. The DC
// component of the rectified output, 2A/pi, is drawn as a horizontal
// dashed line and reported in the readout.
(function () {
    var SVG = '#plot-rect';
    var svg = d3.select(SVG);
    if (svg.empty()) return;
    svg.classed('ov', true);

    var W = 800, H = 320;
    var margin = { top: 48, right: 28, bottom: 48, left: 60 };
    var iw, ih, x, y;

    var T_WIN = 0.05;     // 50 ms x-window, fixed
    var Y_MAX = 2.2;      // fixed amplitude window (V)

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');
    var gIn = gRoot.append('g');
    var gOut = gRoot.append('g');
    var gMark = gRoot.append('g');
    var gLegend = gRoot.append('g');

    var ui = {
        A: document.getElementById('rect-A'),
        Av: document.getElementById('rect-A-val'),
        f: document.getElementById('rect-f'),
        fv: document.getElementById('rect-f-val'),
        peak: document.getElementById('rect-peak'),
        dc: document.getElementById('rect-dc'),
        h1: document.getElementById('rect-h1')
    };

    function params() {
        return {
            A: parseFloat(ui.A.value),
            f: parseFloat(ui.f.value)
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

    function drawTraces(p) {
        gIn.selectAll('*').remove();
        gOut.selectAll('*').remove();
        gMark.selectAll('*').remove();
        gLegend.selectAll('*').remove();

        var N = Math.max(800, Math.ceil(40 * p.f * T_WIN));
        var inPts = [], outPts = [];
        for (var i = 0; i <= N; i++) {
            var t = (i / N) * T_WIN;
            var v = p.A * Math.sin(2 * Math.PI * p.f * t);
            inPts.push([t, v]);
            outPts.push([t, Math.abs(v)]);
        }
        var line = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
        gIn.append('path').datum(inPts).attr('class', 'trace input').attr('d', line)
            .attr('opacity', 0.55);
        gOut.append('path').datum(outPts).attr('class', 'trace output').attr('d', line);

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
            .text('DC = 2A/π = ' + mav.toFixed(3) + ' V');

        // Legend
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
        lg(0, 'var(--c-input)',  'x(t) = A·sin(ωt)');
        lg(1, 'var(--c-output)', '|x(t)|');
    }

    function update() {
        var p = params();
        ui.Av.textContent = p.A.toFixed(2) + ' V';
        ui.fv.textContent = p.f.toFixed(0) + ' Hz';
        if (ui.peak) ui.peak.textContent = p.A.toFixed(3) + ' V';
        if (ui.dc) ui.dc.textContent = ((2 * p.A) / Math.PI).toFixed(3) + ' V';
        if (ui.h1) ui.h1.textContent = (2 * p.f).toFixed(0) + ' Hz';
        layout();
        drawAxes();
        drawTraces(p);
    }

    function init() {
        ui.A.addEventListener('input', update);
        ui.f.addEventListener('input', update);
        window.addEventListener('resize', update);
        window.addEventListener('themechange', update);
        update();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
