// scene_input.js  ·  Slide 1
// Sinewave input with the target MAV (2A/pi) shown as a horizontal dashed
// line. Two sliders (amplitude, frequency) update the trace in place.
(function () {
    var SVG = '#plot-emg-input';
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
    var gTrace = gRoot.append('g');
    var gMark = gRoot.append('g');

    var ui = {
        A: document.getElementById('emg-A'),
        Av: document.getElementById('emg-A-val'),
        f: document.getElementById('emg-f'),
        fv: document.getElementById('emg-f-val'),
        Aout: document.getElementById('emg-A-out'),
        target: document.getElementById('emg-mav-target')
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

        var ys = [-2, -1, 0, 1, 2];
        ys.forEach(function (v) {
            gGrid.append('line')
                .attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        var yAxis = d3.axisLeft(y).tickValues(ys).tickFormat(function (d) {
            return d.toFixed(1);
        }).tickSize(0).tickPadding(8);
        gAxis.append('g').call(yAxis).select('.domain').remove();

        var xt = [];
        var step = T_WIN / 5;
        for (var k = 0; k <= 5; k++) xt.push(k * step);
        var xAxis = d3.axisBottom(x).tickValues(xt)
            .tickFormat(function (d) { return (d * 1000).toFixed(0) + ' ms'; })
            .tickSize(0).tickPadding(8);
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(xAxis).select('.domain').remove();

        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', iw / 2).attr('y', ih + 38)
            .attr('text-anchor', 'middle')
            .text('time, ms');
        gTitles.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-46) + ',' + (ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('amplitude, V');
    }

    function drawTrace(p) {
        gTrace.selectAll('*').remove();
        gMark.selectAll('*').remove();

        // Sample density scales with frequency so high-f waves stay smooth.
        var N = Math.max(600, Math.ceil(40 * p.f * T_WIN));
        var pts = [];
        for (var i = 0; i <= N; i++) {
            var t = (i / N) * T_WIN;
            pts.push([t, p.A * Math.sin(2 * Math.PI * p.f * t)]);
        }
        var line = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
        gTrace.append('path').datum(pts).attr('class', 'trace input').attr('d', line);

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
    }

    function update() {
        var p = params();
        ui.Av.textContent = p.A.toFixed(2) + ' V';
        ui.fv.textContent = p.f.toFixed(0) + ' Hz';
        if (ui.Aout) ui.Aout.textContent = p.A.toFixed(2) + ' V';
        if (ui.target) ui.target.textContent = ((2 * p.A) / Math.PI).toFixed(3) + ' V';
        layout();
        drawAxes();
        drawTrace(p);
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
