// Section 03 · Magnitude responses of the two Wien arms (high-pass and
// low-pass), plotted alongside the resulting Wien band-pass divider beta(jw).
// Single-panel linear-magnitude Bode-style plot, log frequency on the x-axis
// in normalised frequency u = w / w0 = wRC.
(function () {
    var sel = '#plot-wien-filters';

    function magHP(u)   { return u / Math.sqrt(1 + u * u); }
    function magLP(u)   { return 1 / Math.sqrt(1 + u * u); }
    function magBeta(u) {
        var reD = 1 - u * u;
        var imD = 3 * u;
        return u / Math.sqrt(reD * reD + imD * imD);
    }

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || 360;

        var margin = { top: 96, right: 28, bottom: 72, left: 76 };
        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top - margin.bottom;

        var svg = root.append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);
        var g = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var x = d3.scaleLog().domain([1e-2, 1e2]).range([0, innerW]);
        var y = d3.scaleLinear().domain([0, 1.05]).range([innerH, 0]);

        var xTicks = [1e-2, 1e-1, 1, 10, 100];
        var yTicks = [0, 1 / 3, 0.5, 1.0];

        window.CMP.drawGrid(g, x, y, innerW, innerH, {
            xTicks: xTicks, yTicks: [0, 0.25, 0.5, 0.75, 1.0]
        });

        // Sample points
        var n = 600;
        var u0 = Math.log10(1e-2), u1 = Math.log10(1e2);
        var ptsHP = [], ptsLP = [], ptsBP = [];
        for (var i = 0; i <= n; i++) {
            var u = Math.pow(10, u0 + (u1 - u0) * i / n);
            ptsHP.push([u, magHP(u)]);
            ptsLP.push([u, magLP(u)]);
            ptsBP.push([u, magBeta(u)]);
        }

        // Resonance vertical at u = 1
        var resColor = window.CMP.cssVar('--c-thresh');
        g.append('line')
            .attr('x1', x(1)).attr('x2', x(1))
            .attr('y1', 0).attr('y2', innerH)
            .attr('stroke', resColor).attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '5 4');

        // Horizontal at |beta| = 1/3
        g.append('line')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', y(1 / 3)).attr('y2', y(1 / 3))
            .attr('stroke', resColor).attr('stroke-width', 1)
            .attr('stroke-dasharray', '2 4').attr('opacity', 0.7);

        // Curves
        var line = d3.line()
            .x(function (d) { return x(d[0]); })
            .y(function (d) { return y(d[1]); });

        // Mode-driven emphasis. The active trace renders at full opacity
        // and a thicker stroke; the others fade to background.
        var mode = (window.WienMode && window.WienMode.value) || 'high-pass';
        var emph = {
            'high-pass': 'hp',
            'low-pass':  'lp',
            'band-pass': 'bp'
        }[mode] || 'hp';

        function styleTrace(path, key) {
            var active = (emph === key);
            path.attr('opacity', active ? 1 : 0.18)
                .attr('stroke-width', active ? 3.0 : 1.6);
        }

        // Plot the inactive traces first so the emphasised one sits on top.
        var orderedKeys = ['hp', 'lp', 'bp'].sort(function (a, b) {
            return ((a === emph) ? 1 : 0) - ((b === emph) ? 1 : 0);
        });
        var datasets = {
            hp: { pts: ptsHP, cls: 'trace input'   },
            lp: { pts: ptsLP, cls: 'trace output2' },
            bp: { pts: ptsBP, cls: 'trace output'  }
        };
        orderedKeys.forEach(function (k) {
            var p = g.append('path').datum(datasets[k].pts)
                .attr('class', datasets[k].cls).attr('d', line);
            styleTrace(p, k);
        });

        // Resonance dot on the band-pass curve
        g.append('circle')
            .attr('cx', x(1)).attr('cy', y(magBeta(1)))
            .attr('r', 5).attr('fill', resColor).attr('stroke', 'none');

        // Axes
        var xFormatter = function (d) {
            if (d === 1e-2) return '0.01';
            if (d === 1e-1) return '0.1';
            if (d === 1) return '1';
            if (d === 10) return '10';
            if (d === 100) return '100';
            return d;
        };
        var xAxisG = g.append('g')
            .attr('transform', 'translate(0,' + innerH + ')')
            .call(d3.axisBottom(x).tickValues(xTicks).tickFormat(xFormatter));
        var yAxisG = g.append('g')
            .call(d3.axisLeft(y).tickValues([0, 0.25, 0.5, 0.75, 1.0])
                .tickFormat(d3.format('.2f')).tickSizeOuter(0));
        [xAxisG, yAxisG].forEach(window.CMP.styleAxis);

        // ── Legend (above the plot, right-aligned to the plot frame) ─
        var legendItems = [
            { key: 'hp', label: '\\text{high-pass } R_1{,}\\,C_1', color: window.CMP.cssVar('--c-input') },
            { key: 'lp', label: '\\text{low-pass } R_2 \\| C_2',   color: window.CMP.cssVar('--c-output2') },
            { key: 'bp', label: '\\text{Wien band-pass } \\beta',  color: window.CMP.cssVar('--c-output') }
        ];
        var rowH = 22;
        var swatchLen = 22;
        var legendBoxW = 220;
        var legendX = margin.left + innerW - legendBoxW;
        var legendY = 14;
        legendItems.forEach(function (item, idx) {
            var ly = legendY + idx * rowH;
            var active = (emph === item.key);
            var rowOp = active ? 1 : 0.32;
            svg.append('line')
                .attr('x1', legendX).attr('x2', legendX + swatchLen)
                .attr('y1', ly).attr('y2', ly)
                .attr('stroke', item.color).attr('stroke-width', 2.6)
                .attr('stroke-linecap', 'round')
                .attr('opacity', rowOp);
            window.renderKatex(svg, item.label,
                legendX + swatchLen + 8 + 100, ly,
                { width: 200, height: 20, size: 12, color: window.T.text,
                  align: 'left' })
                .attr('opacity', rowOp);
        });

        // |beta| = 1/3 annotation, anchored to the right edge of the plot
        var annW = 110;
        var annX = margin.left + innerW - annW / 2 - 8;
        window.renderKatex(svg, '|\\beta| = \\tfrac{1}{3}',
            annX, margin.top + y(1 / 3) - 14,
            { width: annW, height: 22, size: 12, color: resColor });

        // omega_0 marker label, just above the top of the plot near u = 1
        window.renderKatex(svg, '\\omega_0 = 1/RC',
            margin.left + x(1), margin.top - 18,
            { width: 160, height: 22, size: 12, color: resColor });

        // Axis titles · single-quadrant rule (x>=0 freq, y>=0 magnitude)
        window.renderKatex(svg, '|H(j\\omega)|',
            22, margin.top + innerH / 2,
            { width: 160, height: 22, rotate: -90, size: 14 });
        window.renderKatex(svg, '\\omega / \\omega_0',
            margin.left + innerW / 2, H - 28,
            { width: 160, height: 22, size: 14 });
    }

    function init() {
        render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
        window.addEventListener('wienmodechange', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
