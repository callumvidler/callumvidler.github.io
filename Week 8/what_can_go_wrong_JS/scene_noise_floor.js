(function () {
    var rSlider, enSlider, inSlider, rReadout, enReadout, inReadout;
    var kT = 4.14e-21;

    function formatOhm(R) {
        if (R >= 1e6) return (R / 1e6).toFixed(R >= 1e7 ? 0 : 1) + ' MΩ';
        if (R >= 1e3) return (R / 1e3).toFixed(R >= 1e4 ? 0 : 1) + ' kΩ';
        return R.toFixed(0) + ' Ω';
    }

    function draw() {
        var rLog = parseFloat(rSlider.value);
        var en = parseFloat(enSlider.value) * 1e-9;
        var inLog = parseFloat(inSlider.value);
        if (!isFinite(rLog)) rLog = 4;
        if (!isFinite(en)) en = 8e-9;
        if (!isFinite(inLog)) inLog = 0;
        var R = Math.pow(10, rLog);
        var inA = Math.pow(10, inLog) * 1e-12;
        rReadout.textContent = formatOhm(R);
        enReadout.textContent = (en * 1e9).toFixed(1) + ' nV/√Hz';
        inReadout.textContent = (inA * 1e12).toFixed(2) + ' pA/√Hz';

        var P = window.WCGW.setupPlot('#plot-noise-floor', {
            xScale: d3.scaleLog(),
            yScale: d3.scaleLog(),
            xDomain: [1, 1e5],
            yDomain: [1e-10, 1e-4],
            xLabel: 'f\\,[\\mathrm{Hz}]',
            yLabel: 'e_{ni}\\,[\\mathrm{V}/\\sqrt{\\mathrm{Hz}}]',
            yTicks: 7
        });

        var fs = d3.range(0, 240).map(function (i) { return Math.pow(10, 0 + 5 * i / 239); });
        var enFc = 10;
        var enF = fs.map(function (f) { return en * Math.sqrt(1 + enFc / f); });
        var iR = inA * R;
        var jhn = Math.sqrt(4 * kT * R);

        var enTrace = fs.map(function (f, i) { return { f: f, y: enF[i] }; });
        var inTrace = fs.map(function (f) { return { f: f, y: iR }; });
        var johnsonTrace = fs.map(function (f) { return { f: f, y: jhn }; });
        var totalTrace = fs.map(function (f, i) {
            var t = Math.sqrt(enF[i] * enF[i] + iR * iR + 4 * kT * R);
            return { f: f, y: t };
        });

        window.WCGW.drawLine(P, enTrace, function (d) { return d.f; }, function (d) { return d.y; }, 'clean thin', P.y);
        window.WCGW.drawLine(P, inTrace, function (d) { return d.f; }, function (d) { return d.y; }, 'noise thin', P.y);
        window.WCGW.drawLine(P, johnsonTrace, function (d) { return d.f; }, function (d) { return d.y; }, 'fixed thin', P.y);
        window.WCGW.drawLine(P, totalTrace, function (d) { return d.f; }, function (d) { return d.y; }, 'distort', P.y);

        var Ropt = en / inA;
        var info = 'R_opt = e_n/i_n = ' + formatOhm(Ropt);
        P.g.append('text').attr('x', P.innerW - 8).attr('y', 16).attr('text-anchor', 'end').attr('fill', P.colors.fg)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text(info);

        window.WCGW.legend(P.svg, [
            { key: 'clean', label: 'op-amp e_n' },
            { key: 'noise', label: 'i_n · R' },
            { key: 'fixed', label: 'Johnson √(4kTR)' },
            { key: 'distort', label: 'total e_ni' }
        ], P.margin.left + 12, P.margin.top + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        rSlider = document.getElementById('noise-r-slider');
        enSlider = document.getElementById('noise-en-slider');
        inSlider = document.getElementById('noise-in-slider');
        rReadout = document.getElementById('noise-r-val');
        enReadout = document.getElementById('noise-en-val');
        inReadout = document.getElementById('noise-in-val');
        if (!rSlider) return;
        rSlider.addEventListener('input', draw);
        enSlider.addEventListener('input', draw);
        inSlider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
