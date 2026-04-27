(function () {
    var slider, readout;
    var fs = 500;

    function stepResponse(q) {
        var w0 = 2 * Math.PI * 18;
        return window.WCGW.linspace(0, 0.8, 260).map(function (t) {
            var z = 1 / (2 * q);
            var y;
            if (z < 1) {
                var wd = w0 * Math.sqrt(1 - z * z);
                y = 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + z / Math.sqrt(1 - z * z) * Math.sin(wd * t));
            } else {
                y = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
            }
            return { t: t, y: y };
        });
    }

    function draw() {
        var q = +slider.value;
        readout.textContent = q.toFixed(2);
        var P = window.WCGW.setupDual('#plot-ringing-dual', {
            xDomain: [0, 0.8],
            yTopDomain: [-0.1, 1.8],
            yBottomDomain: [-0.5, 1.35],
            xLabel: 't\\,[\\mathrm{s}]',
            topLabel: 'y_{\\mathrm{step}}(t)',
            bottomLabel: 'v\\,[\\mathrm{mV}]'
        });
        var step = stepResponse(q);
        window.WCGW.drawLine({ x: P.x, g: P.gTop }, step, function (d) { return d.t; }, function (d) { return d.y; }, q > 0.707 ? 'distort' : 'fixed', P.yTop, P.gTop);
        P.gTop.append('line').attr('class', 'marker-line').attr('x1', 0).attr('x2', P.innerW).attr('y1', P.yTop(1)).attr('y2', P.yTop(1));

        var clean = window.WCGW.ecgSeries(0.8, fs, { st: 0.03 });
        var values = clean.map(function (p) { return p.y; });
        var filtered = window.WCGW.filterValues(values, window.WCGW.biquadLowpass(18, q, fs), values[0]);
        var out = clean.map(function (p, i) { return { t: p.t, clean: p.y, y: filtered[i] }; });
        window.WCGW.drawLine({ x: P.x, g: P.gBottom }, out, function (d) { return d.t; }, function (d) { return d.clean; }, 'clean faint', P.yBottom, P.gBottom);
        window.WCGW.drawLine({ x: P.x, g: P.gBottom }, out, function (d) { return d.t; }, function (d) { return d.y; }, 'distort', P.yBottom, P.gBottom);
        window.WCGW.legend(P.svg, [
            { key: 'clean', label: 'clean ECG' },
            { key: 'distort', label: 'filtered ECG' }
        ], P.margin.left + 12, P.bottomTop + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        slider = document.getElementById('ringing-q-slider');
        readout = document.getElementById('ringing-q-val');
        if (!slider) return;
        slider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
