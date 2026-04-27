(function () {
    var fs = 400;

    function sinc(x) {
        if (Math.abs(x) < 1e-9) return 1;
        return Math.sin(Math.PI * x) / (Math.PI * x);
    }

    function fir(fc, taps, windowed) {
        var m = (taps - 1) / 2;
        var out = [];
        for (var n = 0; n < taps; n++) {
            var w = windowed ? 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (taps - 1)) : 1;
            out.push(2 * fc / fs * sinc(2 * fc / fs * (n - m)) * w);
        }
        var sum = d3.sum(out);
        return out.map(function (v) { return v / sum; });
    }

    function convolve(values, coeffs) {
        var m = (coeffs.length - 1) / 2;
        return values.map(function (_, i) {
            var y = 0;
            for (var k = 0; k < coeffs.length; k++) {
                var idx = Math.max(0, Math.min(values.length - 1, i + k - m));
                y += coeffs[k] * values[idx];
            }
            return y;
        });
    }

    function source() {
        return window.WCGW.linspace(0, 1.2, 360).map(function (t) {
            var y = window.WCGW.ecg(t, { st: 0.04 });
            if (t > 0.36 && t < 0.43) y += 0.55;
            return { t: t, y: y };
        });
    }

    function draw() {
        var C = window.WCGW.colors();
        var x = source();
        var values = x.map(function (p) { return p.y; });
        var sharp = fir(28, 49, false);
        var ham = fir(28, 49, true);
        var ySharp = convolve(values, sharp);
        var yHam = convolve(values, ham);
        var P = window.WCGW.setupDual('#plot-brick-dual', {
            xDomain: [0, 1.2],
            yTopDomain: [-0.18, 0.28],
            yBottomDomain: [-0.45, 1.55],
            xLabel: 't\\,[\\mathrm{s}]',
            topLabel: 'h[n]',
            bottomLabel: 'v\\,[\\mathrm{mV}]'
        });
        var hData = sharp.map(function (v, i) { return { t: 0.56 + (i - 24) / fs, sharp: v, ham: ham[i] }; });
        window.WCGW.drawLine({ x: P.x, g: P.gTop }, hData, function (d) { return d.t; }, function (d) { return d.sharp; }, 'distort', P.yTop, P.gTop);
        window.WCGW.drawLine({ x: P.x, g: P.gTop }, hData, function (d) { return d.t; }, function (d) { return d.ham; }, 'fixed', P.yTop, P.gTop);
        var out = x.map(function (p, i) { return { t: p.t, clean: p.y, sharp: ySharp[i], ham: yHam[i] }; });
        window.WCGW.drawLine({ x: P.x, g: P.gBottom }, out, function (d) { return d.t; }, function (d) { return d.clean; }, 'clean faint', P.yBottom, P.gBottom);
        window.WCGW.drawLine({ x: P.x, g: P.gBottom }, out, function (d) { return d.t; }, function (d) { return d.sharp; }, 'distort', P.yBottom, P.gBottom);
        window.WCGW.drawLine({ x: P.x, g: P.gBottom }, out, function (d) { return d.t; }, function (d) { return d.ham; }, 'fixed', P.yBottom, P.gBottom);
        P.gBottom.append('rect').attr('x', P.x(0.30)).attr('y', 0).attr('width', P.x(0.36) - P.x(0.30)).attr('height', P.innerH)
            .attr('fill', C.distort).attr('opacity', 0.08);
        P.gBottom.append('text').attr('x', P.x(0.31)).attr('y', 18).attr('fill', C.distort)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('pre-ringing');
        window.WCGW.legend(P.svg, [
            { key: 'distort', label: 'truncated sinc' },
            { key: 'fixed', label: 'Hamming window' }
        ], P.margin.left + 12, P.margin.top + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (!document.getElementById('plot-brick-dual')) return;
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
