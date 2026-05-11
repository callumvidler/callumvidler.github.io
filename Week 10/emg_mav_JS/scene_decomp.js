// scene_decomp.js  ·  Slide 2
// Static three-trace plot showing the decomposition: input sinewave,
// rectified |x|, and the running mean line at 2A/pi. Fixed parameters so
// the figure reads as a schematic, not a sandbox.
(function () {
    var SVG = '#plot-decomp';
    var svg = d3.select(SVG);
    if (svg.empty()) return;
    svg.classed('ov', true);

    var W = 800, H = 320;
    var margin = { top: 48, right: 28, bottom: 48, left: 60 };
    var iw, ih, x, y;

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');
    var gIn = gRoot.append('g');
    var gRect = gRoot.append('g');
    var gMean = gRoot.append('g');
    var gLegend = gRoot.append('g');

    var P = { A: 1.0, f: 80 };

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

        var T = 1 / P.f;
        x = d3.scaleLinear().domain([0, 4 * T]).range([0, iw]);
        y = d3.scaleLinear().domain([-1.15 * P.A, 1.15 * P.A]).range([ih, 0]);

        [-1, -0.5, 0, 0.5, 1].forEach(function (v) {
            gGrid.append('line')
                .attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v * P.A)).attr('y2', y(v * P.A));
        });

        gAxis.append('g')
            .call(d3.axisLeft(y).tickValues([-1, -0.5, 0, 0.5, 1].map(function (v) { return v * P.A; }))
                .tickFormat(function (d) { return d.toFixed(2); })
                .tickSize(0).tickPadding(8))
            .select('.domain').remove();

        var xt = [];
        for (var k = 0; k <= 4; k++) xt.push(k * T);
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(d3.axisBottom(x).tickValues(xt)
                .tickFormat(function (d) { return (d * 1000).toFixed(1) + ' ms'; })
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

    function drawTraces() {
        gIn.selectAll('*').remove();
        gRect.selectAll('*').remove();
        gMean.selectAll('*').remove();
        gLegend.selectAll('*').remove();

        var T = 1 / P.f;
        var N = 600, ptsIn = [], ptsR = [];
        for (var i = 0; i <= N; i++) {
            var t = (i / N) * 4 * T;
            var v = P.A * Math.sin(2 * Math.PI * P.f * t);
            ptsIn.push([t, v]);
            ptsR.push([t, Math.abs(v)]);
        }

        var line = d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); });
        gIn.append('path').datum(ptsIn).attr('class', 'trace input').attr('d', line);
        gRect.append('path').datum(ptsR).attr('class', 'trace output').attr('d', line);

        var mav = (2 * P.A) / Math.PI;
        gMean.append('line')
            .attr('class', 'thresh-line')
            .attr('x1', 0).attr('x2', iw)
            .attr('y1', y(mav)).attr('y2', y(mav))
            .style('cursor', 'default');
        gMean.append('text')
            .attr('class', 'thresh-label')
            .attr('x', iw - 6).attr('y', y(mav) - 5)
            .attr('text-anchor', 'end')
            .text('⟨|x|⟩ = 2A/π');

        // Legend (top-right, above plot, horizontal)
        var items = [
            { color: 'var(--c-input)',  label: 'x(t)'   },
            { color: 'var(--c-output)', label: '|x(t)|' },
            { color: 'var(--c-thresh)', label: '⟨|x|⟩'  }
        ];
        var lineLen = 18, labelPad = 6, gap = 18;
        var groups = [];
        var totalW = 0;
        items.forEach(function (it) {
            var sub = gLegend.append('g');
            sub.append('line')
                .attr('x1', 0).attr('x2', lineLen)
                .attr('y1', 7).attr('y2', 7)
                .attr('stroke', it.color).attr('stroke-width', 2.2);
            sub.append('text')
                .attr('x', lineLen + labelPad).attr('y', 10)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 10).attr('fill', 'var(--text-dim)')
                .text(it.label);
            var w = sub.node().getBBox().width;
            groups.push({ sub: sub, w: w });
            totalW += w;
        });
        totalW += gap * (items.length - 1);
        var cursor = iw - totalW;
        groups.forEach(function (grp) {
            grp.sub.attr('transform', 'translate(' + cursor + ',-22)');
            cursor += grp.w + gap;
        });
    }

    function update() {
        layout();
        drawAxes();
        drawTraces();
    }

    function init() {
        window.addEventListener('resize', update);
        window.addEventListener('themechange', update);
        update();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
