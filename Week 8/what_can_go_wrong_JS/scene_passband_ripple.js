(function () {
    var rippleSlider, cutoffSlider, rippleReadout, cutoffReadout;
    var order = 4;

    function acosh(x) { return Math.log(x + Math.sqrt(x * x - 1)); }
    function chebT(n, x) {
        if (Math.abs(x) <= 1) return Math.cos(n * Math.acos(x));
        return Math.cosh(n * acosh(x));
    }

    function chebMagnitude(w, wc, rippleDb) {
        var eps = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
        var r = w / wc;
        return 1 / Math.sqrt(1 + eps * eps * Math.pow(chebT(order, r), 2));
    }

    function butterMagnitude(w, wc) {
        var r = w / wc;
        return 1 / Math.sqrt(1 + Math.pow(r, 2 * order));
    }

    function trace(rippleDb, wc) {
        return d3.range(0, 180).map(function (i) {
            var w = Math.pow(10, 0 + 3 * i / 179);
            var r = w / wc;
            var mag = chebMagnitude(w, wc, rippleDb);
            return { w: w, magDb: 20 * Math.log10(mag + 1e-9), phase: -order * Math.atan(r) * 180 / Math.PI };
        });
    }

    function butterTrace(wc) {
        return d3.range(0, 180).map(function (i) {
            var w = Math.pow(10, 0 + 3 * i / 179);
            var r = w / wc;
            var mag = butterMagnitude(w, wc);
            return { w: w, magDb: 20 * Math.log10(mag + 1e-9), phase: -order * Math.atan(r) * 180 / Math.PI };
        });
    }

    function signal(rippleDb, wc) {
        var components = [
            { f: 5, a: 0.30, phi: 0.0 },
            { f: 14, a: 0.22, phi: 0.7 },
            { f: 28, a: 0.16, phi: 1.4 },
            { f: 45, a: 0.12, phi: 2.1 }
        ];
        return window.WCGW.linspace(0, 1.2, 420).map(function (t) {
            var base = window.WCGW.ecg(t, { st: 0.03 }) * 0.45;
            var y = base;
            var yc = base;
            components.forEach(function (c) {
                var w = 2 * Math.PI * c.f;
                y += c.a * Math.sin(2 * Math.PI * c.f * t + c.phi);
                yc += c.a * chebMagnitude(w, wc, rippleDb) * Math.sin(2 * Math.PI * c.f * t + c.phi);
            });
            return { t: t, clean: y, cheby: yc };
        });
    }

    function draw() {
        var rippleDb = +rippleSlider.value;
        var wc = +cutoffSlider.value;
        rippleReadout.textContent = rippleDb.toFixed(2) + ' dB';
        cutoffReadout.textContent = wc.toFixed(0) + ' rad/s';

        var cheb = trace(rippleDb, wc);
        var butter = butterTrace(wc);

        var mag = window.WCGW.setupPlot('#plot-ripple-mag', {
            xScale: d3.scaleLog(),
            xDomain: [1, 1000],
            yDomain: [-70, 4],
            xLabel: '\\omega\\,[\\mathrm{rad/s}]',
            yLabel: '|H(j\\omega)|\\,[\\mathrm{dB}]',
            yTicks: 5
        });
        var phase = window.WCGW.setupPlot('#plot-ripple-phase', {
            xScale: d3.scaleLog(),
            xDomain: [1, 1000],
            yDomain: [-380, 10],
            xLabel: '\\omega\\,[\\mathrm{rad/s}]',
            yLabel: '\\angle H(j\\omega)\\,[^\\circ]',
            yTicks: 5
        });

        window.WCGW.drawLine(mag, butter, function (d) { return d.w; }, function (d) { return d.magDb; }, 'fixed', mag.y);
        window.WCGW.drawLine(mag, cheb, function (d) { return d.w; }, function (d) { return d.magDb; }, 'distort', mag.y);
        window.WCGW.drawLine(phase, butter, function (d) { return d.w; }, function (d) { return d.phase; }, 'fixed', phase.y);
        window.WCGW.drawLine(phase, cheb, function (d) { return d.w; }, function (d) { return d.phase; }, 'distort', phase.y);
        mag.g.append('line').attr('class', 'marker-line').attr('x1', mag.x(wc)).attr('x2', mag.x(wc)).attr('y1', 0).attr('y2', mag.innerH);
        phase.g.append('line').attr('class', 'marker-line').attr('x1', phase.x(wc)).attr('x2', phase.x(wc)).attr('y1', 0).attr('y2', phase.innerH);
        window.WCGW.legend(mag.svg, [
            { key: 'fixed', label: 'Butterworth' },
            { key: 'distort', label: 'Chebyshev' }
        ], mag.W - 155, 14);

        var P = window.WCGW.setupPlot('#plot-ripple-signal', {
            xDomain: [0, 1.2],
            yDomain: [-1.1, 1.1],
            xLabel: 't\\,[\\mathrm{s}]',
            yLabel: 'v\\,[\\mathrm{mV}]'
        });
        var data = signal(rippleDb, wc);
        window.WCGW.drawLine(P, data, function (d) { return d.t; }, function (d) { return d.clean; }, 'clean reference', P.y);
        window.WCGW.drawLine(P, data, function (d) { return d.t; }, function (d) { return d.cheby; }, 'distort', P.y);
        window.WCGW.legend(P.svg, [
            { key: 'clean', label: 'flat passband reference' },
            { key: 'distort', label: 'Chebyshev output' }
        ], P.margin.left + 12, P.margin.top + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        rippleSlider = document.getElementById('ripple-db-slider');
        cutoffSlider = document.getElementById('ripple-cutoff-slider');
        rippleReadout = document.getElementById('ripple-db-val');
        cutoffReadout = document.getElementById('ripple-cutoff-val');
        if (!rippleSlider || !cutoffSlider) return;
        rippleSlider.addEventListener('input', draw);
        cutoffSlider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
