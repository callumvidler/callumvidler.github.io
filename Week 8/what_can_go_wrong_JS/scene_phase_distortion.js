(function () {
    var slider, readout;
    var fs = 500;
    var duration = 2.4;
    var butterQ = [0.5412, 1.3065];
    var besselQ = [0.522, 0.806];

    function analogSection(w, wc, q) {
        var r = w / wc;
        var dr = 1 - r * r;
        var di = r / q;
        var den = dr * dr + di * di;
        return { re: dr / den, im: -di / den };
    }

    function response(w, wc, qs) {
        var h = { re: 1, im: 0 };
        qs.forEach(function (q) {
            var s = analogSection(w, wc, q);
            h = { re: h.re * s.re - h.im * s.im, im: h.re * s.im + h.im * s.re };
        });
        return h;
    }

    function responseTrace(wc, qs) {
        var freqs = d3.range(0, 180).map(function (i) { return Math.pow(10, 0 + 3 * i / 179); });
        var phases = freqs.map(function (w) { return Math.atan2(response(w, wc, qs).im, response(w, wc, qs).re); });
        phases = window.BodeHelpers.unwrapPhase(phases);
        return freqs.map(function (w, i) {
            var h = response(w, wc, qs);
            var mag = Math.sqrt(h.re * h.re + h.im * h.im);
            return { w: w, magDb: 20 * Math.log10(mag + 1e-9), phase: phases[i] * 180 / Math.PI };
        });
    }

    function filteredEcg(fcHz, qs) {
        var clean = window.WCGW.ecgSeries(duration, fs, { st: 0.10 });
        var values = clean.map(function (p) { return p.y; });
        var sections = qs.map(function (q) { return window.WCGW.biquadLowpass(fcHz, q, fs); });
        var y = window.WCGW.cascadeFilterValues(values, sections, values[0]);
        return clean.map(function (p, i) { return { t: p.t, clean: p.y, y: y[i] }; });
    }

    function drawBode(wc) {
        var butter = responseTrace(wc, butterQ);
        var bessel = responseTrace(wc, besselQ);

        var mag = window.WCGW.setupPlot('#plot-phase-mag', {
            xScale: d3.scaleLog(),
            xDomain: [1, 1000],
            yDomain: [-70, 4],
            xLabel: '\\omega\\,[\\mathrm{rad/s}]',
            yLabel: '|H(j\\omega)|\\,[\\mathrm{dB}]',
            yTicks: 5,
            margin: { top: 40, right: 70, bottom: 56, left: 70 }
        });
        var phase = window.WCGW.setupPlot('#plot-phase-phase', {
            xScale: d3.scaleLog(),
            xDomain: [1, 1000],
            yDomain: [-420, 20],
            xLabel: '\\omega\\,[\\mathrm{rad/s}]',
            yLabel: '\\angle H(j\\omega)\\,[^\\circ]',
            yTicks: 5
        });

        window.WCGW.drawLine(mag, butter, function (d) { return d.w; }, function (d) { return d.magDb; }, 'distort', mag.y);
        window.WCGW.drawLine(mag, bessel, function (d) { return d.w; }, function (d) { return d.magDb; }, 'fixed', mag.y);
        window.WCGW.drawLine(phase, butter, function (d) { return d.w; }, function (d) { return d.phase; }, 'distort', phase.y);
        window.WCGW.drawLine(phase, bessel, function (d) { return d.w; }, function (d) { return d.phase; }, 'fixed', phase.y);

        mag.g.append('line').attr('class', 'marker-line').attr('x1', mag.x(wc)).attr('x2', mag.x(wc)).attr('y1', 0).attr('y2', mag.innerH);
        phase.g.append('line').attr('class', 'marker-line').attr('x1', phase.x(wc)).attr('x2', phase.x(wc)).attr('y1', 0).attr('y2', phase.innerH);

        window.WCGW.legend(mag.svg, [
            { key: 'distort', label: 'Butterworth' },
            { key: 'fixed', label: 'Bessel' }
        ], mag.W - 160, 14);
    }

    function drawSignal(fcHz) {
        var P = window.WCGW.setupPlot('#plot-phase-ecg', {
            xDomain: [0, duration],
            yDomain: [-0.45, 1.2],
            xLabel: 't\\,[\\mathrm{s}]',
            yLabel: 'v\\,[\\mathrm{mV}]'
        });
        var clean = window.WCGW.ecgSeries(duration, fs, { st: 0.10 });
        var butter = filteredEcg(fcHz, butterQ);
        var bessel = filteredEcg(fcHz, besselQ);
        window.WCGW.drawLine(P, clean, function (d) { return d.t; }, function (d) { return d.y; }, 'clean reference', P.y);
        window.WCGW.drawLine(P, butter, function (d) { return d.t; }, function (d) { return d.y; }, 'distort', P.y);
        window.WCGW.drawLine(P, bessel, function (d) { return d.t; }, function (d) { return d.y; }, 'fixed', P.y);
        drawTopLegend(P, [
            { key: 'clean', label: 'clean ECG', opacity: 0.38 },
            { key: 'distort', label: 'Butterworth output' },
            { key: 'fixed', label: 'Bessel output' }
        ]);
    }

    function drawTopLegend(P, items) {
        var C = window.WCGW.colors();
        var widths = [126, 210, 160];
        var total = widths.reduce(function (a, b) { return a + b; }, 0);
        var x = Math.max(P.margin.left + 190, P.W - total - 18);
        var g = P.svg.append('g').attr('transform', 'translate(' + x + ',18)');
        items.forEach(function (it, i) {
            var offset = widths.slice(0, i).reduce(function (a, b) { return a + b; }, 0);
            var row = g.append('g').attr('transform', 'translate(' + offset + ',0)');
            row.append('line')
                .attr('x1', 0).attr('x2', 22).attr('y1', 0).attr('y2', 0)
                .attr('stroke', C[it.key])
                .attr('stroke-width', 2.6)
                .attr('opacity', it.opacity || 1);
            row.append('text')
                .attr('x', 30).attr('y', 4)
                .attr('fill', C.fg)
                .attr('font-size', 11)
                .attr('font-family', "'JetBrains Mono', monospace")
                .text(it.label);
        });
    }

    function draw() {
        var wc = Math.pow(10, +slider.value);
        var fcHz = wc / (2 * Math.PI);
        readout.textContent = wc.toFixed(0) + ' rad/s';
        drawBode(wc);
        drawSignal(fcHz);
    }

    document.addEventListener('DOMContentLoaded', function () {
        slider = document.getElementById('phase-cutoff-slider');
        readout = document.getElementById('phase-cutoff-val');
        if (!slider) return;
        slider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
