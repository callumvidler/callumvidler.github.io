(function () {
    var mmSlider, fcSlider, mmReadout, fcReadout;

    function H(w, tau) {
        var d = 1 + (w * tau) * (w * tau);
        return { re: 1 / d, im: -w * tau / d };
    }

    function magCMtoD(w, tau1, tau2) {
        var h1 = H(w, tau1);
        var h2 = H(w, tau2);
        var dr = h1.re - h2.re;
        var di = h1.im - h2.im;
        return Math.sqrt(dr * dr + di * di);
    }

    function magDiff(w, tau1, tau2) {
        var h1 = H(w, tau1);
        var h2 = H(w, tau2);
        var sr = h1.re + h2.re;
        var si = h1.im + h2.im;
        return Math.sqrt(sr * sr + si * si);
    }

    function draw() {
        var mm = parseFloat(mmSlider.value);
        var fc = parseFloat(fcSlider.value);
        if (!isFinite(mm)) mm = 1;
        if (!isFinite(fc)) fc = 100;
        mmReadout.textContent = mm.toFixed(2) + '%';
        fcReadout.textContent = fc.toFixed(0) + ' Hz';

        var tauNom = 1 / (2 * Math.PI * fc);
        var d = mm / 100;
        var tau1 = tauNom * (1 + d / 2);
        var tau2 = tauNom * (1 - d / 2);

        var P = window.WCGW.setupPlot('#plot-cmrr', {
            xScale: d3.scaleLog(),
            xDomain: [0.1, 10000],
            yDomain: [0, 140],
            xLabel: 'f\\,[\\mathrm{Hz}]',
            yLabel: '\\mathrm{CMRR}_F\\,[\\mathrm{dB}]',
            yTicks: 8
        });

        var fs = d3.range(0, 240).map(function (i) { return Math.pow(10, -1 + 5 * i / 239); });
        var trace = fs.map(function (f) {
            var w = 2 * Math.PI * f;
            var cm = magCMtoD(w, tau1, tau2);
            var df = magDiff(w, tau1, tau2);
            var ratio = df / (cm + 1e-18);
            return { f: f, db: 20 * Math.log10(ratio) };
        });

        window.WCGW.drawLine(P, trace, function (d) { return d.f; }, function (d) { return d.db; }, 'distort', P.y);

        [50, 60].forEach(function (fMains) {
            P.g.append('line').attr('class', 'marker-line').attr('x1', P.x(fMains)).attr('x2', P.x(fMains)).attr('y1', 0).attr('y2', P.innerH)
                .attr('stroke', P.colors.noise).attr('opacity', 0.6);
        });
        P.g.append('text').attr('x', P.x(50) + 6).attr('y', 14).attr('fill', P.colors.noise)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('mains');

        var idx50 = trace.reduce(function (acc, d, i) {
            return Math.abs(d.f - 50) < Math.abs(trace[acc].f - 50) ? i : acc;
        }, 0);
        var cmrr50 = trace[idx50].db;
        var floorDb = 20 * Math.log10(2 / (d + 1e-9));
        var info = 'CMRR_F at 50 Hz = ' + cmrr50.toFixed(1) + ' dB    ·    DC limit ≈ ' + floorDb.toFixed(1) + ' dB';
        P.g.append('text').attr('x', 14).attr('y', P.innerH - 10).attr('fill', P.colors.fg)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text(info);

        window.WCGW.legend(P.svg, [
            { key: 'distort', label: 'CMRR_F with mismatch δτ/τ' }
        ], P.margin.left + 12, P.margin.top + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        mmSlider = document.getElementById('cmrr-mm-slider');
        fcSlider = document.getElementById('cmrr-fc-slider');
        mmReadout = document.getElementById('cmrr-mm-val');
        fcReadout = document.getElementById('cmrr-fc-val');
        if (!mmSlider) return;
        mmSlider.addEventListener('input', draw);
        fcSlider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
