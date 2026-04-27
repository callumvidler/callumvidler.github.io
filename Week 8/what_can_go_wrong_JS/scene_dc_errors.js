(function () {
    var rsSlider, ibSlider, gainSlider, rsReadout, ibReadout, gainReadout;
    var Vos = 1e-3;
    var Vrail = 5;
    var fs = 250;

    function formatOhm(R) {
        if (R >= 1e6) return (R / 1e6).toFixed(R >= 1e7 ? 0 : 1) + ' MΩ';
        if (R >= 1e3) return (R / 1e3).toFixed(R >= 1e4 ? 0 : 1) + ' kΩ';
        return R.toFixed(0) + ' Ω';
    }

    function formatCurrent(I) {
        if (I >= 1e-6) return (I * 1e6).toFixed(2) + ' μA';
        if (I >= 1e-9) return (I * 1e9).toFixed(I >= 1e-7 ? 0 : 1) + ' nA';
        return (I * 1e12).toFixed(0) + ' pA';
    }

    function draw() {
        var rsLog = parseFloat(rsSlider.value);
        var ibLog = parseFloat(ibSlider.value);
        var gain = parseFloat(gainSlider.value);
        if (!isFinite(rsLog)) rsLog = 5;
        if (!isFinite(ibLog)) ibLog = 2;
        if (!isFinite(gain)) gain = 100;
        var Rs = Math.pow(10, rsLog);
        var Ib = Math.pow(10, ibLog) * 1e-9;
        rsReadout.textContent = formatOhm(Rs);
        ibReadout.textContent = formatCurrent(Ib);
        gainReadout.textContent = gain.toFixed(0);

        var Voff = Vos + Ib * Rs;
        var VoutOff = gain * Voff;

        var clean = window.WCGW.ecgSeries(4, fs, { st: 0.05 });
        var data = clean.map(function (p) {
            var sig = gain * (p.y * 1e-3);
            var raw = sig + VoutOff;
            var clipped = Math.max(-Vrail, Math.min(Vrail, raw));
            return { t: p.t, sig: sig, raw: raw, out: clipped };
        });

        var P = window.WCGW.setupPlot('#plot-dc-out', {
            xDomain: [0, 4],
            yDomain: [-Vrail * 1.15, Vrail * 1.15],
            xLabel: 't\\,[\\mathrm{s}]',
            yLabel: 'V_{out}\\,[\\mathrm{V}]'
        });

        P.g.append('rect').attr('x', 0).attr('y', P.y(Vrail)).attr('width', P.innerW).attr('height', P.y(-Vrail) - P.y(Vrail))
            .attr('fill', P.colors.fixed).attr('opacity', 0.04);
        [Vrail, -Vrail].forEach(function (v) {
            P.g.append('line').attr('x1', 0).attr('x2', P.innerW).attr('y1', P.y(v)).attr('y2', P.y(v))
                .attr('stroke', P.colors.distort).attr('stroke-dasharray', '6 4').attr('stroke-width', 1.2).attr('opacity', 0.7);
        });
        P.g.append('text').attr('x', P.innerW - 8).attr('y', P.y(Vrail) - 6).attr('text-anchor', 'end').attr('fill', P.colors.distort)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('+V_rail');
        P.g.append('text').attr('x', P.innerW - 8).attr('y', P.y(-Vrail) + 14).attr('text-anchor', 'end').attr('fill', P.colors.distort)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('-V_rail');

        var saturated = Math.abs(VoutOff) + gain * 1.3e-3 > Vrail;
        window.WCGW.drawLine(P, data, function (d) { return d.t; }, function (d) { return d.sig; }, 'clean faint', P.y);
        window.WCGW.drawLine(P, data, function (d) { return d.t; }, function (d) { return d.out; }, saturated ? 'distort' : 'fixed', P.y);

        var info = 'V_e = ' + (Voff * 1000).toFixed(2) + ' mV   ·   G·V_e = ' + VoutOff.toFixed(2) + ' V';
        P.g.append('text').attr('x', 14).attr('y', P.innerH - 10).attr('fill', saturated ? P.colors.distort : P.colors.fg)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text(info);

        window.WCGW.legend(P.svg, [
            { key: 'clean', label: 'amplified signal (offset removed)' },
            { key: saturated ? 'distort' : 'fixed', label: 'output with DC errors' }
        ], P.margin.left + 12, P.margin.top + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        rsSlider = document.getElementById('dc-rs-slider');
        ibSlider = document.getElementById('dc-ib-slider');
        gainSlider = document.getElementById('dc-gain-slider');
        rsReadout = document.getElementById('dc-rs-val');
        ibReadout = document.getElementById('dc-ib-val');
        gainReadout = document.getElementById('dc-gain-val');
        if (!rsSlider) return;
        rsSlider.addEventListener('input', draw);
        ibSlider.addEventListener('input', draw);
        gainSlider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
