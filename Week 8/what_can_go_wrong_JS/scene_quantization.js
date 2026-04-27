(function () {
    var slider, readout;
    var fs = 300;

    function quantize(v, bits, vmin, vmax) {
        var levels = Math.pow(2, bits);
        var q = Math.round((v - vmin) / (vmax - vmin) * (levels - 1));
        return vmin + q / (levels - 1) * (vmax - vmin);
    }

    function draw() {
        var bits = +slider.value;
        readout.textContent = bits + ' bits';
        var clean = window.WCGW.ecgSeries(2.2, fs, { st: 0.06 });
        var q = clean.map(function (p) { return { t: p.t, y: quantize(p.y, bits, -0.6, 1.3) }; });
        var err = clean.map(function (p, i) { return { t: p.t, y: q[i].y - p.y }; });
        var P = window.WCGW.setupDual('#plot-quant-dual', {
            xTopDomain: [0, 2.2],
            xBottomDomain: [0, 120],
            yTopDomain: [-0.7, 1.35],
            yBottomDomain: [-105, -25],
            xLabel: 'f\\,[\\mathrm{Hz}]',
            topLabel: 'v\\,[\\mathrm{mV}]',
            bottomLabel: '|E(f)|\\,[\\mathrm{dB}]'
        });
        window.WCGW.drawLine({ x: P.xTop, g: P.gTop }, clean, function (d) { return d.t; }, function (d) { return d.y; }, 'clean faint', P.yTop, P.gTop);
        window.WCGW.drawLine({ x: P.xTop, g: P.gTop }, q, function (d) { return d.t; }, function (d) { return d.y; }, bits < 8 ? 'distort' : 'fixed', P.yTop, P.gTop);
        var spec = window.WCGW.spectrum(err, fs, 120, 100);
        window.WCGW.drawLine({ x: P.xBottom, g: P.gBottom }, spec, function (d) { return d.f; }, function (d) { return d.y; }, bits < 8 ? 'distort' : 'fixed', P.yBottom, P.gBottom);
        window.WCGW.legend(P.svg, [
            { key: 'clean', label: 'input ECG' },
            { key: bits < 8 ? 'distort' : 'fixed', label: 'quantized output' }
        ], P.margin.left + 12, P.margin.top + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        slider = document.getElementById('quant-bits-slider');
        readout = document.getElementById('quant-bits-val');
        if (!slider) return;
        slider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
