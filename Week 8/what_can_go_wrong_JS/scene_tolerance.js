(function () {
    var pctSlider, qSlider, pctReadout, qReadout;
    var samples = 28;
    var fcNominal = 100;

    function seeded(idx) {
        var x = Math.sin(idx * 91.3457 + 1.7) * 43758.5453;
        return 2 * (x - Math.floor(x)) - 1;
    }

    function magDb(w, wc, q) {
        var r = w / wc;
        var num = 1;
        var denReal = 1 - r * r;
        var denImag = r / q;
        var den = Math.sqrt(denReal * denReal + denImag * denImag);
        return 20 * Math.log10(num / den + 1e-9);
    }

    function trace(wc, q) {
        return d3.range(0, 220).map(function (i) {
            var f = Math.pow(10, 0 + 4 * i / 219);
            var w = 2 * Math.PI * f;
            return { f: f, magDb: magDb(w, 2 * Math.PI * wc, q) };
        });
    }

    function draw() {
        var pct = parseFloat(pctSlider.value);
        var qNom = parseFloat(qSlider.value);
        if (!isFinite(pct)) pct = 3;
        if (!isFinite(qNom)) qNom = 0.71;
        pctReadout.textContent = pct.toFixed(1) + '%';
        qReadout.textContent = qNom.toFixed(2);

        var P = window.WCGW.setupPlot('#plot-tol-mag', {
            xScale: d3.scaleLog(),
            xDomain: [1, 10000],
            yDomain: [-50, 12],
            xLabel: 'f\\,[\\mathrm{Hz}]',
            yLabel: '|H(j2\\pi f)|\\,[\\mathrm{dB}]',
            yTicks: 6
        });

        var sigma = pct / 100;
        for (var k = 0; k < samples; k++) {
            var dR1 = sigma * 0.5 * seeded(k * 4 + 1);
            var dR2 = sigma * 0.5 * seeded(k * 4 + 2);
            var dC1 = sigma * seeded(k * 4 + 3);
            var dC2 = sigma * seeded(k * 4 + 4);
            var fcK = fcNominal / Math.sqrt((1 + dR1) * (1 + dR2) * (1 + dC1) * (1 + dC2));
            var qK = qNom * Math.sqrt((1 + dR1) * (1 + dC1) / ((1 + dR2) * (1 + dC2)));
            var t = trace(fcK, qK);
            window.WCGW.drawLine(P, t, function (d) { return d.f; }, function (d) { return d.magDb; }, 'distort thin', P.y);
        }

        var nom = trace(fcNominal, qNom);
        window.WCGW.drawLine(P, nom, function (d) { return d.f; }, function (d) { return d.magDb; }, 'clean', P.y);

        P.g.append('line').attr('class', 'marker-line').attr('x1', P.x(fcNominal)).attr('x2', P.x(fcNominal)).attr('y1', 0).attr('y2', P.innerH);
        P.g.append('text').attr('x', P.x(fcNominal) + 6).attr('y', 14).attr('fill', P.colors.mark)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('f_c nominal = 100 Hz');

        var dfc = 0.5 * Math.sqrt(2 * sigma * sigma + 2 * sigma * sigma);
        window.WCGW.legend(P.svg, [
            { key: 'clean', label: 'nominal' },
            { key: 'distort', label: 'tolerance ensemble (σ f_c ≈ ' + (dfc * 100).toFixed(1) + '%)' }
        ], P.margin.left + 12, P.margin.top + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        pctSlider = document.getElementById('tol-pct-slider');
        qSlider = document.getElementById('tol-q-slider');
        pctReadout = document.getElementById('tol-pct-val');
        qReadout = document.getElementById('tol-q-val');
        if (!pctSlider) return;
        pctSlider.addEventListener('input', draw);
        qSlider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
