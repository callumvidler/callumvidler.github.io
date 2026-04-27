(function () {
    var slider, readout;
    var fs = 500;
    var duration = 1.6;
    var state = null;

    function makeSignals() {
        var clean = window.WCGW.emgSeries(duration, fs, { low: 18, high: 140 });
        var noisy = window.WCGW.addMains(clean, 0.18, 50);
        return {
            clean: clean,
            noisy: noisy,
            noisyValues: noisy.map(function (p) { return p.y; }),
            specClean: window.WCGW.spectrum(clean, fs, 160, 120)
        };
    }

    function buildPlot() {
        var signals = makeSignals();
        var time = window.WCGW.setupPlot('#plot-noise-time', {
            xDomain: [0, duration],
            yDomain: [-0.75, 0.75],
            xLabel: 't\\,[\\mathrm{s}]',
            yLabel: 'v\\,[\\mathrm{mV}]',
            yTicks: 5
        });
        var spectrum = window.WCGW.setupPlot('#plot-noise-spectrum', {
            xDomain: [0, 160],
            yDomain: [-78, -18],
            xLabel: 'f\\,[\\mathrm{Hz}]',
            yLabel: '|X(f)|\\,[\\mathrm{dB}]',
            yTicks: 5
        });
        var bode = window.WCGW.setupPlot('#plot-noise-bode', {
            xDomain: [0, 160],
            yDomain: [-55, 3],
            xLabel: 'f\\,[\\mathrm{Hz}]',
            yLabel: '|H(f)|\\,[\\mathrm{dB}]',
            yTicks: 5
        });

        window.WCGW.drawLine(time, signals.clean, function (d) { return d.t; }, function (d) { return d.y; }, 'clean', time.y);
        window.WCGW.drawLine(time, signals.noisy, function (d) { return d.t; }, function (d) { return d.y; }, 'noise thin', time.y);
        window.WCGW.drawLine(spectrum, signals.specClean, function (d) { return d.f; }, function (d) { return d.y; }, 'clean faint', spectrum.y);
        spectrum.g.append('line').attr('class', 'marker-line').attr('x1', spectrum.x(50)).attr('x2', spectrum.x(50)).attr('y1', 0).attr('y2', spectrum.innerH);
        bode.g.append('line').attr('class', 'marker-line').attr('x1', bode.x(50)).attr('x2', bode.x(50)).attr('y1', 0).attr('y2', bode.innerH);

        window.WCGW.legend(time.svg, [
            { key: 'clean', label: 'clean EMG' },
            { key: 'noise', label: '50 Hz contaminated' },
            { key: 'fixed', label: 'notch output' }
        ], time.margin.left + 12, time.margin.top + 18);
        window.WCGW.legend(bode.svg, [
            { key: 'fixed', label: 'notch response' }
        ], bode.W - 170, 18);

        state = {
            time: time,
            spectrum: spectrum,
            bode: bode,
            signals: signals,
            topLine: d3.line()
                .x(function (d) { return time.x(d.t); })
                .y(function (d) { return time.y(d.y); })
                .curve(d3.curveCatmullRom.alpha(0.35)),
            bottomLine: d3.line()
                .x(function (d) { return spectrum.x(d.f); })
                .y(function (d) { return spectrum.y(d.y); })
                .curve(d3.curveCatmullRom.alpha(0.35)),
            bodeLine: d3.line()
                .x(function (d) { return bode.x(d.f); })
                .y(function (d) { return bode.y(d.magDb); })
                .curve(d3.curveCatmullRom.alpha(0.35)),
            filteredPath: time.g.append('path').attr('class', 'trace fixed').attr('fill', 'none'),
            spectrumPath: spectrum.g.append('path').attr('class', 'trace fixed').attr('fill', 'none'),
            bodePath: bode.g.append('path').attr('class', 'trace fixed').attr('fill', 'none')
        };

        update();
    }

    function update() {
        if (!state) {
            buildPlot();
            return;
        }
        var q = +slider.value;
        readout.textContent = q.toFixed(1);
        var coeff = window.WCGW.biquadNotch(50, q, fs);
        var filteredVals = window.WCGW.filterValues(state.signals.noisyValues, coeff, 0);
        var filtered = state.signals.noisy.map(function (p, i) { return { t: p.t, y: filteredVals[i] }; });
        var specFilt = window.WCGW.spectrum(filtered, fs, 160, 120);
        var bode = d3.range(0, 180).map(function (i) {
            var f = 160 * i / 179;
            var h = window.WCGW.sectionResponse([coeff], f, fs);
            var mag = Math.sqrt(h.re * h.re + h.im * h.im);
            return { f: f, magDb: Math.max(-55, 20 * Math.log10(mag + 1e-9)) };
        });

        state.filteredPath.datum(filtered).attr('d', state.topLine);
        state.spectrumPath.datum(specFilt).attr('d', state.bottomLine);
        state.bodePath.datum(bode).attr('d', state.bodeLine);
    }

    document.addEventListener('DOMContentLoaded', function () {
        slider = document.getElementById('noise-q-slider');
        readout = document.getElementById('noise-q-val');
        if (!slider) return;
        slider.addEventListener('input', update);
        window.addEventListener('themechange', buildPlot);
        window.addEventListener('resize', window.WCGW.debounceResize(buildPlot));
        buildPlot();
    });
})();
