// Section 04 · Static illustrative figure for hysteresis sizing.
// Shows two simulated heartbeats with a peak-to-peak noise envelope and
// the chosen hysteresis band V_TH / V_TL straddling V_ref. Fixed
// parameters; no controls.
(function () {
    var sel = '#plot-sizing';

    // Fixed illustrative parameters
    var Tend = 2.0;          // s of waveform shown
    var nSamples = 600;
    var Vref = 0.55;
    var hyst = 0.30;
    var noisePP = 0.18;      // peak-to-peak noise envelope (illustrative)

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || 360;

        var margin = { top: 36, right: 32, bottom: 56, left: 64 };
        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top - margin.bottom;

        var svg = root.append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);

        var g = svg.append('g').attr('transform',
            'translate(' + margin.left + ',' + margin.top + ')');

        var x = d3.scaleLinear().domain([0, Tend]).range([0, innerW]);
        var y = d3.scaleLinear().domain([-0.4, 1.3]).range([innerH, 0]);

        window.CMP.drawGrid(g, x, y, innerW, innerH, {
            xTicks: d3.range(0, Tend + 0.01, 0.5),
            yTicks: [-0.4, 0, 0.4, 0.8, 1.2]
        });

        // Build the clean signal and an upper/lower envelope around it.
        var ts = d3.range(0, nSamples + 1).map(function (i) {
            return i * Tend / nSamples;
        });
        var clean = ts.map(function (t) { return window.CMP.ecgLike(t); });
        var hi = clean.map(function (v) { return v + noisePP / 2; });
        var lo = clean.map(function (v) { return v - noisePP / 2; });

        // Envelope band (filled area between hi and lo)
        var area = d3.area()
            .x(function (_, i) { return x(ts[i]); })
            .y0(function (_, i) { return y(lo[i]); })
            .y1(function (_, i) { return y(hi[i]); });
        g.append('path')
            .datum(hi)
            .attr('d', area)
            .attr('fill', window.T.fg(0.10))
            .attr('stroke', 'none');

        // Hysteresis band rectangle
        var VTH = Vref + hyst / 2;
        var VTL = Vref - hyst / 2;
        g.append('rect')
            .attr('class', 'hyst-band')
            .attr('x', 0).attr('y', y(VTH))
            .attr('width', innerW).attr('height', y(VTL) - y(VTH));

        // Threshold lines
        g.append('line')
            .attr('class', 'trace thresh')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', y(Vref)).attr('y2', y(Vref));
        [VTH, VTL].forEach(function (v) {
            g.append('line')
                .attr('x1', 0).attr('x2', innerW)
                .attr('y1', y(v)).attr('y2', y(v))
                .attr('stroke', window.CMP.cssVar('--c-thresh-h'))
                .attr('stroke-width', 1.2)
                .attr('stroke-dasharray', '3 4')
                .attr('fill', 'none');
        });

        // Clean signal trace
        var line = d3.line()
            .x(function (_, i) { return x(ts[i]); })
            .y(function (v) { return y(v); });
        g.append('path')
            .datum(clean)
            .attr('class', 'trace input')
            .attr('d', line);

        // Axes (single-quadrant rule: x along bottom, y on left)
        var xAxisG = g.append('g')
            .attr('transform', 'translate(0,' + innerH + ')')
            .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));
        var yAxisG = g.append('g')
            .call(d3.axisLeft(y).tickValues([0, 0.5, 1.0]).tickFormat(d3.format('.1f')));
        window.CMP.styleAxis(xAxisG);
        window.CMP.styleAxis(yAxisG);

        // Threshold annotations on the right edge
        var thrColor = window.CMP.cssVar('--c-thresh');
        window.renderKatex(svg, 'V_\\text{TH}',
            margin.left + innerW - 36, margin.top + y(VTH) - 12,
            { width: 80, height: 18, size: 12, color: thrColor });
        window.renderKatex(svg, 'V_\\text{ref}',
            margin.left + innerW - 36, margin.top + y(Vref) + 0,
            { width: 80, height: 18, size: 12, color: thrColor });
        window.renderKatex(svg, 'V_\\text{TL}',
            margin.left + innerW - 36, margin.top + y(VTL) + 12,
            { width: 80, height: 18, size: 12, color: thrColor });

        // Annotation: "noise envelope" with leader to the band
        var annotX = x(0.92);
        var annotY = y(clean[Math.round(0.92 * nSamples / Tend)] + noisePP / 2 + 0.05);
        g.append('line')
            .attr('x1', annotX).attr('y1', annotY)
            .attr('x2', annotX + 28).attr('y2', annotY - 30)
            .attr('stroke', window.T.fg(0.5)).attr('stroke-width', 1)
            .attr('stroke-dasharray', '2 3');
        window.renderKatex(svg, '\\text{noise envelope}',
            margin.left + annotX + 88, margin.top + annotY - 32,
            { width: 160, height: 18, size: 12, color: window.T.textDim });

        // Axis titles · single-quadrant rule
        window.renderKatex(svg, 't \\, [\\mathrm{s}]',
            margin.left + innerW / 2, H - 16,
            { width: 100, height: 22, size: 14 });
        window.renderKatex(svg, 'v(t) \\, [\\mathrm{V}]',
            22, margin.top + innerH / 2,
            { width: 140, height: 22, rotate: -90, size: 14 });
    }

    function init() {
        render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
