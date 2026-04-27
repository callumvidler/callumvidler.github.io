// Section 04 · Notch filter for mains hum.
// An ECG-like signal is corrupted by a 50 Hz sinusoid representing
// power-line interference. A second-order biquad notch removes a
// narrow band centred at the mains frequency. The user can move the
// notch frequency and tune the quality factor; the magnitude response
// shows the depth and width of the notch alongside the time traces.
(function () {
    var S = window.Signals;
    var P = window.PlotHelpers;

    var selTime = '#plot-notch-time';
    var selMag  = '#plot-notch-mag';
    var sliderF0 = document.getElementById('notch-f0-slider');
    var sliderQ  = document.getElementById('notch-q-slider');
    var valF0    = document.getElementById('notch-f0-val');
    var valQ     = document.getElementById('notch-q-val');
    var pillHum  = document.getElementById('notch-hum-toggle');

    var state = { f0: 50, Q: 12, humOn: true };

    var fs = 1000;
    var dur = 1.6;
    var N = Math.round(fs * dur);
    var t = S.timeAxis(N, fs);

    var ecg = S.ecgSignal(t, { period: 0.85, t0: 0.45, amp: 1.0 });
    var hum = S.sineWave(t, 50, 0.45, 0.0);

    function fmtHz(f) {
        if (f >= 100) return f.toFixed(0) + ' Hz';
        if (f >= 10)  return f.toFixed(1) + ' Hz';
        return f.toFixed(2) + ' Hz';
    }

    function renderTime() {
        var H = P.setupTimePlot({
            sel: selTime,
            xDomain: [0, dur],
            yDomain: [-1.2, 1.8],
            xTitle: 't \\, [\\mathrm{s}]',
            yTitle: '\\text{ECG amplitude} \\, [\\mathrm{mV}]',
            xTicks: [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6],
            yTicks: [-1.0, -0.5, 0, 0.5, 1.0, 1.5]
        });

        var x = H.x, y = H.y;
        var input = state.humOn ? S.addArrays(ecg, hum) : ecg.slice();

        var line = d3.line()
            .x(function (d, k) { return x(t[k]); })
            .y(function (d) { return y(Math.max(-1.2, Math.min(1.8, d))); });

        H.g.append('path').datum(input)
            .attr('class', 'trace noisy').attr('d', line)
            .attr('opacity', 0.85);

        H.g.append('path').datum(ecg)
            .attr('class', 'trace clean faint').attr('d', line);

        var c = S.notchCoeffs(state.f0, state.Q, fs);
        var filt = S.filtfiltBiquad(input, c);
        H.g.append('path').datum(filt)
            .attr('class', 'trace filtered').attr('d', line);

        drawLegend(H, [
            { color: getColor('--c-noisy'),    label: 'ECG + 50 Hz hum',  dashed: false, faint: false,
              show: state.humOn },
            { color: getColor('--c-noisy'),    label: 'ECG (no hum)',     dashed: false, faint: false,
              show: !state.humOn },
            { color: getColor('--c-clean'),    label: 'clean reference',  dashed: true,  faint: true },
            { color: getColor('--c-filtered'), label: 'notch output',     dashed: false, faint: false }
        ]);
    }

    function renderMag() {
        var fMax = 200;
        var H = P.setupMagPlot({
            sel: selMag,
            xDomain: [0, fMax],
            yDomain: [0, 1.1],
            xTitle: 'f \\, [\\mathrm{Hz}]',
            yTitle: '|H(f)|',
            xTicks: [0, 25, 50, 75, 100, 125, 150, 175, 200],
            yTicks: [0, 0.25, 0.5, 0.75, 1.0],
            margin: { top: 80, right: 36, bottom: 50, left: 60 }
        });

        var x = H.x, y = H.y;
        var c = S.notchCoeffs(state.f0, state.Q, fs);

        var pts = [];
        for (var k = 0; k <= 800; k++) {
            var f = (k / 800) * fMax;
            pts.push({ f: f, m: S.magBiquad(f, c, fs) });
        }
        H.g.append('path').datum(pts)
            .attr('class', 'trace filtered')
            .attr('d', d3.line()
                .x(function (d) { return x(d.f); })
                .y(function (d) { return y(Math.min(1.1, d.m)); }));

        // Mark 50 Hz hum location (upper label row, fixed)
        var xHum = x(50);
        H.g.append('line')
            .attr('x1', xHum).attr('x2', xHum)
            .attr('y1', 0).attr('y2', H.innerH)
            .attr('stroke', getColor('--c-noisy')).attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '3 3').attr('opacity', 0.7);
        var humLabelX = Math.min(Math.max(xHum, 60), H.innerW - 60);
        window.renderKatex(H.g, '50\\,\\mathrm{Hz}\\;\\text{hum}',
            humLabelX, -46,
            { width: 110, height: 16, size: 11, color: getColor('--c-noisy') });

        // Notch centre marker (lower label row to avoid the hum label).
        // If the slider lands on 50 Hz the two markers coincide; clamp the
        // label horizontally so it never spills outside the plot frame.
        var xn = x(state.f0);
        H.g.append('line')
            .attr('class', 'marker-line')
            .attr('x1', xn).attr('x2', xn)
            .attr('y1', 0).attr('y2', H.innerH);
        var f0LabelX = Math.min(Math.max(xn, 24), H.innerW - 24);
        window.renderKatex(H.g, 'f_0', f0LabelX, -18,
            { width: 50, height: 16, size: 12, color: getColor('--c-mark') });
    }

    function drawLegend(H, items) {
        var visible = items.filter(function (it) { return it.show !== false; });
        var pad = 8;
        var rowH = 14;
        var w = 170;
        var h = pad * 2 + rowH * visible.length;
        var x0 = H.innerW - w - 8;
        var y0 = 8;
        var grp = H.g.append('g');
        grp.append('rect')
            .attr('x', x0).attr('y', y0)
            .attr('width', w).attr('height', h)
            .attr('rx', 6).attr('ry', 6)
            .attr('fill', window.T.panelBg)
            .attr('stroke', window.T.gridStrong);
        visible.forEach(function (it, i) {
            var yy = y0 + pad + 6 + i * rowH;
            grp.append('line')
                .attr('x1', x0 + pad).attr('x2', x0 + pad + 18)
                .attr('y1', yy - 3).attr('y2', yy - 3)
                .attr('stroke', it.color).attr('stroke-width', 2.2)
                .attr('stroke-dasharray', it.dashed ? '4 4' : null)
                .attr('opacity', it.faint ? 0.65 : 1);
            grp.append('text')
                .attr('x', x0 + pad + 24).attr('y', yy)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 10).attr('fill', window.T.text)
                .text(it.label);
        });
    }

    function getColor(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    function renderAll() { renderTime(); renderMag(); }

    function onSliderF0() {
        state.f0 = parseFloat(sliderF0.value);
        if (valF0) valF0.textContent = fmtHz(state.f0);
        renderAll();
    }
    function onSliderQ() {
        state.Q = parseFloat(sliderQ.value);
        if (valQ) valQ.textContent = 'Q = ' + state.Q.toFixed(0);
        renderAll();
    }

    function init() {
        if (sliderF0) sliderF0.addEventListener('input', onSliderF0);
        if (sliderQ)  sliderQ.addEventListener('input', onSliderQ);
        if (sliderF0) onSliderF0();
        if (sliderQ)  onSliderQ();
        if (pillHum) pillHum.addEventListener('click', function () {
            state.humOn = !state.humOn;
            pillHum.classList.toggle('active', state.humOn);
            pillHum.textContent = state.humOn ? '50 Hz hum on' : '50 Hz hum off';
            renderAll();
        });
        renderAll();
        window.addEventListener('themechange', renderAll);
        window.addEventListener('resize', renderAll);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
