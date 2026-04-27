(function () {
    var tauSlider, tauReadout, offsetSlider, offsetReadout;

    function draw() {
        var tau = +tauSlider.value;
        var initialOffset = +offsetSlider.value;
        tauReadout.textContent = tau.toFixed(2) + ' s';
        offsetReadout.textContent = initialOffset.toFixed(2) + ' mV';

        var out = window.WCGW.linspace(0, 6, 700).map(function (t) {
            var baseline = 0.10 * Math.sin(2 * Math.PI * 0.18 * t);
            var truth = 0.12 + baseline + 0.34 * window.WCGW.ecg(t, { st: 0.04 });
            var transient = initialOffset * Math.exp(-t / tau);
            return {
                t: t,
                truth: truth,
                transient: transient,
                measured: truth + transient,
                settled: truth + initialOffset * Math.exp(-5)
            };
        });

        var yMin = d3.min(out, function (d) { return Math.min(d.truth, d.measured); });
        var yMax = d3.max(out, function (d) { return Math.max(d.truth, d.measured); });
        var pad = 0.15 * Math.max(1, yMax - yMin);
        var P = window.WCGW.setupPlot('#plot-transient', {
            xDomain: [0, 6],
            yDomain: [yMin - pad, yMax + pad],
            xLabel: 't\\,[\\mathrm{s}]',
            yLabel: 'v\\,[\\mathrm{mV}]'
        });
        P.g.append('rect').attr('x', P.x(0)).attr('y', 0).attr('width', P.x(Math.min(6, 5 * tau))).attr('height', P.innerH)
            .attr('fill', P.colors.distort).attr('opacity', 0.08);
        P.g.append('text').attr('x', P.x(Math.min(5.7, 5 * tau)) + 6).attr('y', 18)
            .attr('fill', P.colors.distort).attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('first 5 tau');
        window.WCGW.drawLine(P, out, function (d) { return d.t; }, function (d) { return d.truth; }, 'clean reference', P.y);
        window.WCGW.drawLine(P, out, function (d) { return d.t; }, function (d) { return d.measured; }, 'distort', P.y);
        window.WCGW.drawLine(P, out, function (d) { return d.t; }, function (d) { return d.settled; }, 'fixed faint', P.y);
        window.WCGW.legend(P.svg, [
            { key: 'clean', label: 'true analogue signal' },
            { key: 'distort', label: 'with capacitor transient' },
            { key: 'fixed', label: 'after settling' }
        ], P.margin.left + 12, P.margin.top + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        tauSlider = document.getElementById('transient-tau-slider');
        tauReadout = document.getElementById('transient-tau-val');
        offsetSlider = document.getElementById('transient-offset-slider');
        offsetReadout = document.getElementById('transient-offset-val');
        if (!tauSlider || !offsetSlider) return;
        tauSlider.addEventListener('input', draw);
        offsetSlider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
