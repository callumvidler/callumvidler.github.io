(function () {
    var slider, readout;
    var foldTarget = null;
    var foldTimer = null;
    var foldEpoch = performance.now();

    function baseSignal(t) {
        var ecg = 0.52 * window.WCGW.ecg(t, { st: 0.04, period: 0.92 });
        var baseline = 0.10 * Math.sin(2 * Math.PI * 0.55 * t + 0.4);
        var respiration = 0.045 * Math.sin(2 * Math.PI * 1.7 * t + 1.1);
        return ecg + baseline + respiration;
    }

    function sig(t) {
        return baseSignal(t) + 0.22 * Math.sin(2 * Math.PI * 40 * t);
    }

    function aliasFreq(f, fs) {
        return Math.abs(f - Math.round(f / fs) * fs);
    }

    function signedAliasFreq(f, fs) {
        return f - Math.round(f / fs) * fs;
    }

    function sampleTimes(duration, fs) {
        var out = [];
        var nMax = Math.floor(duration * fs);
        for (var n = 0; n <= nMax; n++) out.push(n / fs);
        return out;
    }

    function mergedTimes(duration, fs, count) {
        var seen = {};
        var values = window.WCGW.linspace(0, duration, count).concat(sampleTimes(duration, fs));
        values.forEach(function (t) {
            seen[t.toFixed(6)] = t;
        });
        return Object.keys(seen).map(function (k) { return seen[k]; }).sort(function (a, b) { return a - b; });
    }

    function draw() {
        var fs = +slider.value;
        var fa = aliasFreq(40, fs);
        var faSigned = signedAliasFreq(40, fs);
        readout.textContent = fs.toFixed(0) + ' Hz, alias ' + fa.toFixed(1) + ' Hz';

        var time = window.WCGW.setupPlot('#plot-alias-time', {
            xDomain: [0, 1.1],
            yDomain: [-0.9, 1.0],
            xLabel: 't\\,[\\mathrm{s}]',
            yLabel: 'v\\,[\\mathrm{mV}]'
        });
        var spectrum = window.WCGW.setupPlot('#plot-alias-spectrum', {
            xDomain: [0, 70],
            yDomain: [0, 1],
            xLabel: 'f\\,[\\mathrm{Hz}]',
            yLabel: '|X(f)|'
        });
        var timeBase = mergedTimes(1.1, fs, 500);
        var dense = timeBase.map(function (t) { return { t: t, y: sig(t) }; });
        var samples = sampleTimes(1.1, fs).map(function (t) { return { t: t, y: sig(t) }; });
        if (samples.length < 2) {
            samples.push({ t: 1.1, y: sig(1.1) });
        }
        var apparent = timeBase.map(function (t) {
            return { t: t, y: baseSignal(t) + 0.22 * Math.sin(2 * Math.PI * faSigned * t) };
        });
        drawAliasLine(time, dense, 'clean faint');
        drawAliasLine(time, apparent, 'distort');
        time.g.selectAll('circle.sample').data(samples).join('circle')
            .attr('class', 'sample').attr('cx', function (d) { return time.x(d.t); }).attr('cy', function (d) { return time.y(d.y); })
            .attr('r', 3).attr('fill', time.colors.noise).attr('stroke', time.colors.bg).attr('stroke-width', 1);
        var fN = fs / 2;
        var spec = [
            { f: 1.2, y: 0.65, cls: 'clean' },
            { f: 40, y: 0.95, cls: fs >= 80 ? 'clean' : 'noise' },
            { f: fa, y: fs >= 80 ? 0.1 : 0.75, cls: 'distort' }
        ].filter(function (d) { return d.f >= 0 && d.f <= 70; });
        spectrum.g.selectAll('line.stem').data(spec).join('line')
            .attr('x1', function (d) { return spectrum.x(d.f); }).attr('x2', function (d) { return spectrum.x(d.f); })
            .attr('y1', spectrum.y(0)).attr('y2', function (d) { return spectrum.y(d.y); })
            .attr('stroke', function (d) { return spectrum.colors[d.cls]; }).attr('stroke-width', 3);
        spectrum.g.append('line').attr('class', 'marker-line').attr('x1', spectrum.x(fN)).attr('x2', spectrum.x(fN)).attr('y1', 0).attr('y2', spectrum.innerH);
        spectrum.g.append('text').attr('x', spectrum.x(fN) + 6).attr('y', 16).attr('fill', spectrum.colors.mark)
            .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text('Nyquist');
        drawSpectrumFold(spectrum, fs, fa);
        window.WCGW.legend(time.svg, [
            { key: 'clean', label: 'true signal' },
            { key: 'distort', label: 'apparent sampled signal' },
            { key: 'noise', label: 'sample points' }
        ], time.margin.left + 12, time.margin.top + 18);

        drawNyquist(fs, fa, faSigned);
    }

    function drawAliasLine(P, data, cls) {
        var line = d3.line()
            .x(function (d) { return P.x(d.t); })
            .y(function (d) { return P.y(d.y); });
        P.g.append('path')
            .datum(data)
            .attr('class', 'trace ' + cls)
            .attr('fill', 'none')
            .attr('d', line);
    }

    function drawSpectrumFold(P, fs, fa) {
        var fHigh = 40;
        var fN = fs / 2;
        if (fHigh <= fN || fa > 70) {
            foldTarget = null;
            P.g.append('text')
                .attr('x', P.x(Math.min(52, fN + 4)))
                .attr('y', P.innerH - 14)
                .attr('fill', P.colors.fixed)
                .attr('font-size', 11)
                .attr('font-family', "'JetBrains Mono', monospace")
                .text('40 Hz is below Nyquist');
            return;
        }

        var points = [
            [P.x(fHigh), P.y(0.93)],
            [P.x(fN), P.y(0.48)],
            [P.x(fa), P.y(0.75)]
        ];
        var foldLine = d3.line().curve(d3.curveLinear);
        var path = P.g.append('path')
            .datum(points)
            .attr('d', foldLine)
            .attr('fill', 'none')
            .attr('stroke', P.colors.distort)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5 4')
            .attr('opacity', 0.85);

        var len = path.node().getTotalLength();

        var mover = P.g.append('circle')
            .attr('r', 5)
            .attr('fill', P.colors.sample)
            .attr('stroke', P.colors.bg)
            .attr('stroke-width', 1.5);

        foldTarget = { mover: mover, pathNode: path.node(), len: len };
        ensureFoldTimer();
        updateFoldMarker();

        P.g.append('text')
            .attr('x', P.x(Math.max(1, fN)) + 8)
            .attr('y', P.y(0.47))
            .attr('fill', P.colors.mark)
            .attr('font-size', 11)
            .attr('font-family', "'JetBrains Mono', monospace")
            .text('fold at f_N');
        P.g.append('text')
            .attr('x', P.x(fa) + 8)
            .attr('y', P.y(0.72))
            .attr('fill', P.colors.fixed)
            .attr('font-size', 11)
            .attr('font-family', "'JetBrains Mono', monospace")
            .text('observed alias');
    }

    function ensureFoldTimer() {
        if (foldTimer) return;
        foldTimer = d3.timer(function () {
            updateFoldMarker();
        });
    }

    function updateFoldMarker() {
        if (!foldTarget || !document.body.contains(foldTarget.mover.node())) return;
        var period = 1700;
        var phase = ((performance.now() - foldEpoch) % period) / period;
        var u = phase < 0.5 ? phase * 2 : 2 - phase * 2;
        var p = foldTarget.pathNode.getPointAtLength(u * foldTarget.len);
        foldTarget.mover.attr('transform', 'translate(' + p.x + ',' + p.y + ')');
    }

    function drawNyquist(fs, fa, faSigned) {
        var fN = fs / 2;
        var fHigh = 40;
        var P = window.WCGW.setupPlot('#plot-alias-nyquist', {
            xDomain: [0, 0.32],
            yDomain: [-1.35, 1.35],
            xLabel: 't\\,[\\mathrm{s}]',
            yLabel: 'x(t)',
            yTicks: 5
        });
        var dense = mergedTimes(0.32, fs, 700);
        var high = dense.map(function (t) { return { t: t, y: Math.sin(2 * Math.PI * fHigh * t) }; });
        var alias = dense.map(function (t) { return { t: t, y: Math.sin(2 * Math.PI * faSigned * t) }; });
        var samples = sampleTimes(0.32, fs).map(function (t) {
            return { t: t, y: Math.sin(2 * Math.PI * fHigh * t) };
        });
        var samplePeriod = 1 / fs;
        var aperture = samplePeriod * 0.22;
        P.g.selectAll('rect.sample-window').data(samples).join('rect')
            .attr('class', 'sample-window')
            .attr('x', function (d) { return P.x(Math.max(0, d.t - aperture / 2)); })
            .attr('y', 0)
            .attr('width', function (d) {
                var left = Math.max(0, d.t - aperture / 2);
                var right = Math.min(0.32, d.t + aperture / 2);
                return Math.max(1, P.x(right) - P.x(left));
            })
            .attr('height', P.innerH)
            .attr('fill', P.colors.sample)
            .attr('opacity', 0.12);

        drawAliasLine(P, high, (fs >= 80 ? 'clean' : 'distort') + ' reference');
        drawAliasLine(P, alias, 'fixed');
        P.g.selectAll('line.sample-stem').data(samples).join('line')
            .attr('x1', function (d) { return P.x(d.t); }).attr('x2', function (d) { return P.x(d.t); })
            .attr('y1', P.y(0)).attr('y2', function (d) { return P.y(d.y); })
            .attr('stroke', P.colors.sample).attr('stroke-width', 1).attr('opacity', 0.65);
        P.g.selectAll('circle.sample').data(samples).join('circle')
            .attr('cx', function (d) { return P.x(d.t); }).attr('cy', function (d) { return P.y(d.y); })
            .attr('r', 4).attr('fill', P.colors.sample).attr('stroke', P.colors.bg).attr('stroke-width', 1.4);
        P.g.append('line').attr('x1', 0).attr('x2', P.innerW).attr('y1', P.y(0)).attr('y2', P.y(0)).attr('stroke', P.colors.axis);

        window.WCGW.legend(P.svg, [
            { key: fs >= 80 ? 'clean' : 'distort', label: '40 Hz input' },
            { key: 'fixed', label: fa.toFixed(1) + ' Hz alias' },
            { key: 'sample', label: 'sampled values' }
        ], P.margin.left + 12, P.margin.top + 18);

        var note = fs >= 80
            ? '40 Hz is below f_N = ' + fN.toFixed(1) + ' Hz, so it is represented uniquely'
            : '40 Hz is above f_N = ' + fN.toFixed(1) + ' Hz, so the samples also fit ' + fa.toFixed(1) + ' Hz';
        P.svg.append('text')
            .attr('x', P.margin.left + P.innerW - 390)
            .attr('y', P.margin.top + 18)
            .attr('fill', P.colors.fg)
            .attr('font-size', 12)
            .attr('font-family', "'JetBrains Mono', monospace")
            .text(note);
    }

    document.addEventListener('DOMContentLoaded', function () {
        slider = document.getElementById('alias-fs-slider');
        readout = document.getElementById('alias-fs-val');
        if (!slider) return;
        slider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
