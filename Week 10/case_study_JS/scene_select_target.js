// scene_select_target.js  ·  Slide 2
// Static illustration of the target signal: a filtered EEG segment with a
// rising train of pre-state spikes, annotated to show the three operations
// the circuit must perform — detect each spike, measure its amplitude,
// and track the envelope over time.
(function () {
    var SVG = '#plot-select-target';
    var svg = d3.select(SVG).classed('ov', true);
    var W = 800, H = 320;
    var margin = { top: 48, right: 28, bottom: 44, left: 56 };
    var iw, ih, x, y;

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gTrace = gRoot.append('g');
    var gAnno = gRoot.append('g');
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');
    var gLegend = gRoot.append('g');

    var spikes = [
        { t: 1.4, amp: 0.7 },
        { t: 4.2, amp: 1.1 },
        { t: 7.4, amp: 1.6 },
        { t: 10.6, amp: 2.2 }
    ];
    var T_MAX = 12.5;
    var Y_DOMAIN = [-0.6, 3.2];

    var data = [];
    var N = 1000;
    for (var i = 0; i <= N; i++) {
        var t = (i / N) * T_MAX;
        var v = 0.06 * Math.sin(2 * Math.PI * 0.18 * t)
              + 0.04 * Math.sin(2 * Math.PI * 0.7 * t + 0.5);
        for (var k = 0; k < spikes.length; k++) {
            var s = spikes[k];
            var dt = t - s.t;
            v += s.amp * Math.exp(-(dt * dt) / (2 * 0.18 * 0.18));
        }
        data.push({ t: t, v: v });
    }

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(420, rect.width);
        H = Math.max(220, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        iw = W - margin.left - margin.right;
        ih = H - margin.top - margin.bottom;
        gRoot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        x = d3.scaleLinear().domain([0, T_MAX]).range([0, iw]);
        y = d3.scaleLinear().domain(Y_DOMAIN).range([ih, 0]);
    }

    function draw() {
        gGrid.selectAll('*').remove();
        [0, 1, 2].forEach(function (v) {
            gGrid.append('line').attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });

        gAxis.selectAll('*').remove();
        var yAxis = d3.axisLeft(y).tickValues([0, 1, 2]).tickSize(0).tickPadding(8);
        gAxis.append('g').call(yAxis).select('.domain').remove();
        var xAxis = d3.axisBottom(x).tickValues([0, 3, 6, 9, 12])
            .tickFormat(function (d) { return d + 's'; }).tickSize(0).tickPadding(8);
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(xAxis).select('.domain').remove();

        gTitles.selectAll('*').remove();
        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', iw / 2).attr('y', ih + 34)
            .attr('text-anchor', 'middle')
            .text('time, s');
        gTitles.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-42) + ',' + (ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('amplitude, mV');

        gTrace.selectAll('*').remove();
        var line = d3.line()
            .x(function (d) { return x(d.t); })
            .y(function (d) { return y(d.v); });
        gTrace.append('path').datum(data)
            .attr('class', 'trace input')
            .attr('stroke-width', 1.4)
            .attr('d', line);

        gAnno.selectAll('*').remove();

        var envLine = d3.line()
            .x(function (s) { return x(s.t); })
            .y(function (s) { return y(s.amp); });
        gAnno.append('path').datum(spikes)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-output2)')
            .attr('stroke-width', 1.6)
            .attr('stroke-dasharray', '5 4')
            .attr('d', envLine);

        spikes.forEach(function (s, idx) {
            gAnno.append('line')
                .attr('x1', x(s.t)).attr('x2', x(s.t))
                .attr('y1', y(s.amp) + 4).attr('y2', ih)
                .attr('stroke', 'var(--c-thresh)')
                .attr('stroke-width', 1.0)
                .attr('stroke-dasharray', '3 3')
                .attr('opacity', 0.55);

            gAnno.append('circle')
                .attr('cx', x(s.t)).attr('cy', y(s.amp))
                .attr('r', 3.6)
                .attr('class', 'peak-anno');

            gAnno.append('text')
                .attr('x', x(s.t)).attr('y', y(s.amp) - 12)
                .attr('text-anchor', 'middle')
                .attr('class', 'peak-anno-label')
                .text('A' + (idx + 1) + ' = ' + s.amp.toFixed(1));
        });

        gLegend.selectAll('*').remove();
        var entries = [
            { c: 'var(--c-thresh)', dash: '3 3', lbl: 'detect (event)' },
            { c: 'var(--c-thresh)', dash: null,  lbl: 'amplitude (peak)', dot: true },
            { c: 'var(--c-output2)', dash: '5 4', lbl: 'trend (rising envelope)' }
        ];
        var lg = gLegend.append('g').attr('transform', 'translate(8,6)');
        lg.append('rect')
            .attr('x', -8).attr('y', -4)
            .attr('width', 220).attr('height', entries.length * 18 + 8)
            .attr('rx', 4)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', 'var(--border)')
            .attr('opacity', 0.85);
        entries.forEach(function (e, i) {
            var yy = i * 18 + 6;
            if (e.dot) {
                lg.append('circle').attr('cx', 8).attr('cy', yy).attr('r', 3.5)
                    .attr('fill', e.c);
            } else {
                lg.append('line')
                    .attr('x1', 0).attr('x2', 16)
                    .attr('y1', yy).attr('y2', yy)
                    .attr('stroke', e.c).attr('stroke-width', 1.6)
                    .attr('stroke-dasharray', e.dash || null);
            }
            lg.append('text').attr('x', 22).attr('y', yy + 4)
                .attr('class', 'phase-label')
                .text(e.lbl);
        });
    }

    function init() {
        layout();
        draw();
        window.addEventListener('themechange', function () { draw(); });
        window.addEventListener('resize', function () { layout(); draw(); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
