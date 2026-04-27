// Section 03 · Bode plot comparing real (loaded) vs ideal cascade.
// Two identical first-order stages, parameterised by impedance ratio
// k = R2/R1 = C1/C2, so each stage in isolation has the same cutoff.
(function () {
    var T = window.T;
    var sel = '#plot-bode-loading';
    var slider = document.getElementById('imp-ratio-slider');
    var valLabel = document.getElementById('imp-ratio-val');
    var H_helpers = window.BodeHelpers;

    // Normalised: R = 1 ohm, C = 1 F, so wc = 1 rad/s.
    // Frequency axis covers 0.01 ... 100 wc.
    var state = { k: 1 };

    function fmtK(k) {
        if (k >= 100) return k.toFixed(0) + '×';
        if (k >= 10)  return k.toFixed(1) + '×';
        return k.toFixed(2) + '×';
    }

    function render() {
        var k = state.k;
        var H = H_helpers.setupBode({
            sel: sel,
            xDomain: [0.01, 100],
            magDomain: [-80, 6],
            phaseDomain: [-200, 10],
            magTicks: [-80, -60, -40, -20, -3, 0],
            phaseTicks: [-180, -135, -90, -45, 0]
        });

        var x = H.x, yMag = H.yMag, yPhase = H.yPhase;
        var wMin = 0.01, wMax = 100, n = 480;

        var idealPts = [];
        var realPts = [];

        var stages = [
            { R: 1, C: 1 },
            { R: k, C: 1 / k }
        ];

        var realPhases = [];

        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);

            // Ideal product: 1 / (1 + jw)^2
            var u = w;
            var idealMag = 1 / (1 + u * u);
            var idealMagDb = 10 * Math.log10(idealMag);
            var idealPhase = -2 * Math.atan(u) * 180 / Math.PI;
            idealPts.push({ w: w, magDb: idealMagDb, phase: idealPhase });

            // Real cascade evaluated by ABCD chain.
            var Hjw = H_helpers.cascadeABCD(w, stages);
            var mag = H_helpers.cAbs(Hjw);
            var phaseRad = H_helpers.cArg(Hjw);
            realPts.push({ w: w, magDb: 20 * Math.log10(mag), phaseRad: phaseRad });
            realPhases.push(phaseRad);
        }

        // Unwrap real phase for a continuous trace, convert to degrees.
        var unwrapped = H_helpers.unwrapPhase(realPhases);
        for (var j = 0; j < realPts.length; j++) {
            realPts[j].phase = unwrapped[j] * 180 / Math.PI;
        }

        var magMin = yMag.domain()[0];
        var clip = function (d) { return Math.max(d, magMin); };
        var lineMag = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yMag(clip(d.magDb)); });
        var linePhase = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yPhase(d.phase); });

        // Ideal traces (blue, drawn first)
        H.gMag.append('path').datum(idealPts)
            .attr('class', 'trace ideal').attr('d', lineMag);
        H.gPhase.append('path').datum(idealPts)
            .attr('class', 'trace ideal').attr('d', linePhase);
        // Real traces (red, drawn on top)
        H.gMag.append('path').datum(realPts)
            .attr('class', 'trace real').attr('d', lineMag);
        H.gPhase.append('path').datum(realPts)
            .attr('class', 'trace real').attr('d', linePhase);

        // ── Passband-droop annotation ────────────────────────────
        // Find the frequency at which the ideal-vs-real gap is largest.
        var maxDelta = 0, wAtMax = 1, idxAtMax = 0;
        for (var i2 = 0; i2 < idealPts.length; i2++) {
            var dB = idealPts[i2].magDb - realPts[i2].magDb;
            if (dB > maxDelta) { maxDelta = dB; wAtMax = idealPts[i2].w; idxAtMax = i2; }
        }
        if (maxDelta > 0.05) {
            var xAt = x(wAtMax);
            var yIdeal = yMag(idealPts[idxAtMax].magDb);
            var yReal = yMag(realPts[idxAtMax].magDb);
            H.gMag.append('line')
                .attr('x1', xAt).attr('x2', xAt)
                .attr('y1', yIdeal).attr('y2', yReal)
                .attr('stroke', T.fg(0.55))
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '3 3');
            H.gMag.append('text')
                .attr('x', xAt + 8).attr('y', (yIdeal + yReal) / 2 + 4)
                .attr('fill', T.text)
                .attr('font-size', 11)
                .attr('font-family', "'JetBrains Mono', monospace")
                .text('Δ = ' + maxDelta.toFixed(2) + ' dB');
        }

        // ── Single-stage cutoff marker (green dashed verticals) ─
        var xc = x(1);
        H.gMag.append('line').attr('class', 'cutoff-single')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', H.innerH);
        H.gPhase.append('line').attr('class', 'cutoff-single')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', H.innerH);
        window.renderKatex(H.gPhase, '\\omega_c',
            xc, H.innerH - 16,
            { width: 50, height: 22, size: 12, pill: true });

        // ── Hover crosshair + readout ────────────────────────────
        window.BodeHelpers.attachHover(H, [
            { name: 'ideal', cssClass: 'ideal', pts: idealPts },
            { name: 'real',  cssClass: 'real',  pts: realPts  }
        ]);

        // ── Legend (top-right of magnitude panel) ────────────────
        var lg = H.gMag.append('g').attr('transform', 'translate(' + (H.innerW - 12) + ',12)');
        var entries = [
            { c: 'ideal', label: 'ideal product' },
            { c: 'real',  label: 'k = ' + fmtK(state.k) + '  (loaded)' }
        ];
        entries.forEach(function (e, idx) {
            var row = lg.append('g').attr('transform', 'translate(0,' + (idx * 18) + ')');
            row.append('line').attr('class', 'trace ' + e.c)
                .attr('x1', -36).attr('x2', -8)
                .attr('y1', 8).attr('y2', 8);
            row.append('text')
                .attr('x', -42).attr('y', 11)
                .attr('text-anchor', 'end')
                .attr('fill', T.text)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .text(e.label);
        });
    }

    function onSlider() {
        // map [0, 2] → k ∈ [1, 100] in log-space
        var v = parseFloat(slider.value);
        state.k = Math.pow(10, v);
        if (valLabel) valLabel.textContent = fmtK(state.k);
        render();
    }

    function init() {
        if (slider) {
            slider.addEventListener('input', onSlider);
            onSlider();
        } else {
            render();
        }
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
