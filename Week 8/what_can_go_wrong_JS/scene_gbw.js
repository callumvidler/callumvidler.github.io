(function () {
    var gbwSlider, gainSlider, gbwReadout, gainReadout;
    var fcDesign = 100;
    var orderDesign = 2;

    function formatHz(f) {
        if (f >= 1e6) return (f / 1e6).toFixed(2) + ' MHz';
        if (f >= 1e3) return (f / 1e3).toFixed(1) + ' kHz';
        return f.toFixed(0) + ' Hz';
    }

    function magIdealDb(f) {
        var r = f / fcDesign;
        return -10 * Math.log10(1 + Math.pow(r, 2 * orderDesign));
    }

    function draw() {
        var sLog = parseFloat(gbwSlider.value);
        var gain = parseFloat(gainSlider.value);
        if (!isFinite(sLog)) sLog = 0;
        if (!isFinite(gain)) gain = 100;
        var gbw = Math.pow(10, sLog) * 1e6;
        gbwReadout.textContent = formatHz(gbw);
        gainReadout.textContent = gain.toFixed(0);

        var fCl = gbw / gain;

        var P = window.WCGW.setupPlot('#plot-gbw-mag', {
            xScale: d3.scaleLog(),
            xDomain: [1, 1e6],
            yDomain: [-60, 50],
            xLabel: 'f\\,[\\mathrm{Hz}]',
            yLabel: '|H(j2\\pi f)|\\,[\\mathrm{dB}]',
            yTicks: 6
        });

        var fs = d3.range(0, 280).map(function (i) { return Math.pow(10, 0 + 6 * i / 279); });
        var ideal = fs.map(function (f) { return { f: f, db: 20 * Math.log10(gain) + magIdealDb(f) }; });
        var realised = fs.map(function (f) {
            var r = f / fCl;
            var clDb = -10 * Math.log10(1 + r * r);
            return { f: f, db: 20 * Math.log10(gain) + magIdealDb(f) + clDb };
        });

        window.WCGW.drawLine(P, ideal, function (d) { return d.f; }, function (d) { return d.db; }, 'clean reference', P.y);
        window.WCGW.drawLine(P, realised, function (d) { return d.f; }, function (d) { return d.db; }, 'distort', P.y);

        P.g.append('line').attr('class', 'marker-line').attr('x1', P.x(fcDesign)).attr('x2', P.x(fcDesign)).attr('y1', 0).attr('y2', P.innerH);
        P.g.append('text').attr('x', P.x(fcDesign) + 6).attr('y', 14).attr('fill', P.colors.mark)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('design f_c = 100 Hz');
        if (fCl < 1e6) {
            P.g.append('line').attr('class', 'marker-line').attr('x1', P.x(fCl)).attr('x2', P.x(fCl)).attr('y1', 0).attr('y2', P.innerH)
                .attr('stroke', P.colors.distort).attr('opacity', 0.6);
            P.g.append('text').attr('x', P.x(fCl) + 6).attr('y', 30).attr('fill', P.colors.distort)
                .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('GBW/G = ' + formatHz(fCl));
        }

        window.WCGW.legend(P.svg, [
            { key: 'clean', label: 'ideal H(jω)·G' },
            { key: 'distort', label: 'with finite GBW' }
        ], P.margin.left + 12, P.margin.top + 18);
    }

    document.addEventListener('DOMContentLoaded', function () {
        gbwSlider = document.getElementById('gbw-slider');
        gainSlider = document.getElementById('gbw-gain-slider');
        gbwReadout = document.getElementById('gbw-val');
        gainReadout = document.getElementById('gbw-gain-val');
        if (!gbwSlider) return;
        gbwSlider.addEventListener('input', draw);
        gainSlider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
