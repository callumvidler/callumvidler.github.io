// Section 03 · High-pass filter for baseline wander removal.
// An ECG-like beat train is corrupted by a slow drift modelling the
// respiratory baseline shift. A first-order high-pass at a user-set
// cutoff removes the drift while preserving the QRS complexes. Both
// the contaminated input and the recovered output are plotted on the
// same time axis with a faint clean reference for comparison.
(function () {
    var S = window.Signals;
    var P = window.PlotHelpers;

    var selTime = '#plot-hpf-time';
    var selMag  = '#plot-hpf-mag';
    var slider  = document.getElementById('hpf-fc-slider');
    var valLab  = document.getElementById('hpf-fc-val');
    var pillTruth = document.getElementById('hpf-show-truth');

    var state = { fc: 0.7, showTruth: true };

    var fs = 500;
    var dur = 4.0;
    var N = Math.round(fs * dur);
    var t = S.timeAxis(N, fs);

    var clean = S.ecgSignal(t, { period: 0.85, t0: 0.4, amp: 1.0 });
    // Baseline drift: a slow sinusoid plus an even slower component.
    var drift = new Array(N);
    for (var i = 0; i < N; i++) {
        drift[i] = 0.55 * Math.sin(2 * Math.PI * 0.30 * t[i] + 0.4)
                 + 0.30 * Math.cos(2 * Math.PI * 0.12 * t[i] + 1.1);
    }
    var contaminated = S.addArrays(clean, drift);

    function fmtFreq(f) {
        if (f >= 10) return f.toFixed(1) + ' Hz';
        if (f >= 1)  return f.toFixed(2) + ' Hz';
        return f.toFixed(2) + ' Hz';
    }

    function renderTime() {
        var H = P.setupTimePlot({
            sel: selTime,
            xDomain: [0, dur],
            yDomain: [-1.2, 1.8],
            xTitle: 't \\, [\\mathrm{s}]',
            yTitle: '\\text{ECG amplitude} \\, [\\mathrm{mV}]',
            xTicks: [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
            yTicks: [-1.0, -0.5, 0, 0.5, 1.0, 1.5]
        });

        var x = H.x, y = H.y;
        var line = d3.line()
            .x(function (d, k) { return x(t[k]); })
            .y(function (d) { return y(Math.max(-1.2, Math.min(1.8, d))); });

        // Drift baseline (faint dashed) so the wander is visible
        H.g.append('path').datum(drift)
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', getColor('--muted'))
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3')
            .attr('opacity', 0.7);

        H.g.append('path').datum(contaminated)
            .attr('class', 'trace noisy').attr('d', line)
            .attr('opacity', 0.85);

        if (state.showTruth) {
            H.g.append('path').datum(clean)
                .attr('class', 'trace clean faint').attr('d', line);
        }

        var filt = S.filtfiltHPF(contaminated, state.fc, fs);
        H.g.append('path').datum(filt)
            .attr('class', 'trace filtered').attr('d', line);

        drawLegend(H, [
            { color: getColor('--muted'),       label: 'baseline drift', dashed: true,  faint: true },
            { color: getColor('--c-noisy'),     label: 'recorded ECG',   dashed: false, faint: false },
            { color: getColor('--c-clean'),     label: 'clean reference', dashed: true, faint: true,
              show: state.showTruth },
            { color: getColor('--c-filtered'),  label: 'high-pass output', dashed: false, faint: false }
        ]);
    }

    function renderMag() {
        var fMax = 50;
        var H = P.setupMagPlot({
            sel: selMag,
            xDomain: [0, fMax],
            yDomain: [0, 1.05],
            xTitle: 'f \\, [\\mathrm{Hz}]',
            yTitle: '|H(f)|',
            xTicks: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
            yTicks: [0, 0.25, 0.5, 0.707, 1.0],
            margin: { top: 80, right: 36, bottom: 50, left: 60 }
        });

        var x = H.x, y = H.y;

        var pts = [];
        for (var k = 0; k <= 400; k++) {
            var f = (k / 400) * fMax;
            pts.push({ f: f, m: S.magHPF(f, state.fc) });
        }
        H.g.append('path').datum(pts)
            .attr('class', 'trace filtered')
            .attr('d', d3.line()
                .x(function (d) { return x(d.f); })
                .y(function (d) { return y(d.m); }));

        // Mark the dominant drift frequency and a typical QRS frequency.
        // Static markers go on the upper row above the plot frame; the
        // dynamic cutoff label sits on a lower row to avoid collisions.
        function vmark(freq, color, label) {
            if (freq < 0 || freq > fMax) return;
            var xc = x(freq);
            H.g.append('line')
                .attr('x1', xc).attr('x2', xc)
                .attr('y1', 0).attr('y2', H.innerH)
                .attr('stroke', color).attr('stroke-width', 1.2)
                .attr('stroke-dasharray', '3 3').attr('opacity', 0.7);
            window.renderKatex(H.g, label, xc, -46,
                { width: 100, height: 16, size: 11, color: color });
        }
        vmark(0.30, getColor('--muted'),  '\\text{drift}');
        vmark(10,   getColor('--c-clean'), '\\text{QRS band}');

        // Cutoff marker (own row, clamped inside the plot horizontally)
        var xc = x(state.fc);
        if (state.fc <= fMax) {
            H.g.append('line')
                .attr('class', 'marker-line')
                .attr('x1', xc).attr('x2', xc)
                .attr('y1', 0).attr('y2', H.innerH);
            var fcLabelX = Math.min(Math.max(xc, 24), H.innerW - 24);
            window.renderKatex(H.g, 'f_c', fcLabelX, -18,
                { width: 50, height: 16, size: 12, color: getColor('--c-mark') });
        }
    }

    function drawLegend(H, items) {
        var visible = items.filter(function (it) { return it.show !== false; });
        var pad = 8;
        var rowH = 14;
        var w = 180;
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

    function onSlider() {
        var v = parseFloat(slider.value); // log10
        state.fc = Math.pow(10, v);
        if (valLab) valLab.textContent = fmtFreq(state.fc);
        renderAll();
    }

    function init() {
        if (slider) {
            slider.addEventListener('input', onSlider);
            onSlider();
        } else {
            renderAll();
        }
        if (pillTruth) pillTruth.addEventListener('click', function () {
            state.showTruth = !state.showTruth;
            pillTruth.classList.toggle('active', state.showTruth);
            renderAll();
        });
        window.addEventListener('themechange', renderAll);
        window.addEventListener('resize', renderAll);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
