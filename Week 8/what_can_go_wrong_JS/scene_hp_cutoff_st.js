(function () {
    var slider, readout;
    var fs = 250;

    function draw() {
        var s = parseFloat(slider.value);
        if (!isFinite(s)) s = -0.301;
        var fc = Math.pow(10, s);
        readout.textContent = (fc < 0.1 ? fc.toFixed(3) : fc.toFixed(2)) + ' Hz';
        var clean = window.WCGW.ecgSeries(5, fs, { st: 0.18, baseline: 0 });
        clean = clean.map(function (p) {
            return { t: p.t, y: p.y + 0.12 * Math.sin(2 * Math.PI * 0.22 * p.t) };
        });
        var vals = clean.map(function (p) { return p.y; });
        var filtered = window.WCGW.filterValues(vals, window.WCGW.biquadHighpass(fc, 0.707, fs), vals[0]);
        var out = clean.map(function (p, i) { return { t: p.t, clean: p.y, y: filtered[i] }; });
        var P = window.WCGW.setupPlot('#plot-hp-st', {
            xDomain: [0, 5],
            yDomain: [-0.65, 1.35],
            xLabel: 't\\,[\\mathrm{s}]',
            yLabel: 'v\\,[\\mathrm{mV}]'
        });
        window.WCGW.drawLine(P, out, function (d) { return d.t; }, function (d) { return d.clean; }, 'clean faint', P.y);
        window.WCGW.drawLine(P, out, function (d) { return d.t; }, function (d) { return d.y; }, fc <= 0.05 ? 'fixed' : 'distort', P.y);
        [0.51, 1.51, 2.51, 3.51, 4.51].forEach(function (t) {
            P.g.append('rect').attr('x', P.x(t)).attr('y', P.y(0.42)).attr('width', P.x(t + 0.10) - P.x(t)).attr('height', P.y(0.06) - P.y(0.42))
                .attr('fill', P.colors.mark).attr('opacity', 0.08);
        });
        P.g.append('text').attr('x', P.x(0.58)).attr('y', P.y(0.56)).attr('fill', P.colors.mark)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('ST segment');
        window.WCGW.legend(P.svg, [
            { key: 'clean', label: 'true ST elevation' },
            { key: fc <= 0.05 ? 'fixed' : 'distort', label: 'high-pass output' }
        ], P.margin.left + 12, P.margin.top + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        slider = document.getElementById('hp-cutoff-slider');
        readout = document.getElementById('hp-cutoff-val');
        if (!slider) return;
        slider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
