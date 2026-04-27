(function () {
    var zeSlider, rinSlider, zeReadout, rinReadout;
    var Cc = 1e-6;

    function formatOhm(R) {
        if (R >= 1e6) return (R / 1e6).toFixed(R >= 1e7 ? 0 : 1) + ' MΩ';
        if (R >= 1e3) return (R / 1e3).toFixed(R >= 1e4 ? 0 : 1) + ' kΩ';
        return R.toFixed(0) + ' Ω';
    }

    function magDb(f, Rtot) {
        var w = 2 * Math.PI * f;
        var num = w * Rtot * Cc;
        var mag = num / Math.sqrt(1 + num * num);
        return 20 * Math.log10(mag + 1e-9);
    }

    function gainDb(Rin, Rtot) {
        return 20 * Math.log10(Rin / Rtot);
    }

    function draw() {
        var zeLog = parseFloat(zeSlider.value);
        var rinLog = parseFloat(rinSlider.value);
        if (!isFinite(zeLog)) zeLog = 5;
        if (!isFinite(rinLog)) rinLog = 7;
        var Ze = Math.pow(10, zeLog);
        var Rin = Math.pow(10, rinLog);
        zeReadout.textContent = formatOhm(Ze);
        rinReadout.textContent = formatOhm(Rin);

        var fcNom = 1 / (2 * Math.PI * Rin * Cc);
        var fcReal = 1 / (2 * Math.PI * (Rin + Ze) * Cc);
        var divDb = gainDb(Rin, Rin + Ze);

        var P = window.WCGW.setupPlot('#plot-ze-mag', {
            xScale: d3.scaleLog(),
            xDomain: [0.001, 100],
            yDomain: [-60, 6],
            xLabel: 'f\\,[\\mathrm{Hz}]',
            yLabel: '|H(j2\\pi f)|\\,[\\mathrm{dB}]',
            yTicks: 6
        });

        var fs = d3.range(0, 240).map(function (i) { return Math.pow(10, -3 + 5 * i / 239); });
        var nominal = fs.map(function (f) { return { f: f, db: magDb(f, Rin) }; });
        var realised = fs.map(function (f) { return { f: f, db: magDb(f, Rin + Ze) + divDb }; });

        window.WCGW.drawLine(P, nominal, function (d) { return d.f; }, function (d) { return d.db; }, 'clean reference', P.y);
        window.WCGW.drawLine(P, realised, function (d) { return d.f; }, function (d) { return d.db; }, 'distort', P.y);

        [fcNom, fcReal].forEach(function (fc, i) {
            P.g.append('line').attr('class', 'marker-line').attr('x1', P.x(fc)).attr('x2', P.x(fc)).attr('y1', 0).attr('y2', P.innerH)
                .attr('stroke', i === 0 ? P.colors.clean : P.colors.distort).attr('opacity', 0.55);
        });
        P.g.append('text').attr('x', P.x(fcNom) + 6).attr('y', 14).attr('fill', P.colors.clean)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('f_c nominal = ' + fcNom.toFixed(3) + ' Hz');
        P.g.append('text').attr('x', P.x(fcReal) + 6).attr('y', 30).attr('fill', P.colors.distort)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('f_c realised = ' + fcReal.toFixed(3) + ' Hz, gain ' + divDb.toFixed(2) + ' dB');

        window.WCGW.legend(P.svg, [
            { key: 'clean', label: 'design (Z_e = 0)' },
            { key: 'distort', label: 'with electrode Z_e' }
        ], P.margin.left + 12, P.margin.top + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        zeSlider = document.getElementById('ze-slider');
        rinSlider = document.getElementById('rin-slider');
        zeReadout = document.getElementById('ze-val');
        rinReadout = document.getElementById('rin-val');
        if (!zeSlider) return;
        zeSlider.addEventListener('input', draw);
        rinSlider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
