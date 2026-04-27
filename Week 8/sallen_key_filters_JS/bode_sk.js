// Section 03 · Bode plot for the Sallen-Key low-pass with adjustable Q.
// Compares the active second-order response against:
//   · the passive two-stage RC cascade (with loading)
//   · Bessel    (Q = 1/sqrt(3) ≈ 0.577)
//   · Butterworth (Q = 1/sqrt(2) ≈ 0.707)
//   · Chebyshev-like peaking (Q = 2)
// All curves share natural frequency ω0 = 1 rad/s for direct comparison.
(function () {
    var T = window.T;
    var sel = '#plot-bode-sk';
    var slider = document.getElementById('q-slider');
    var valLabel = document.getElementById('q-val');
    var pillPassive = document.getElementById('show-passive');
    var pillRefs = document.getElementById('show-references');
    var H_helpers = window.BodeHelpers;

    var state = {
        Q: 1 / Math.sqrt(2),
        showPassive: true,
        showRefs: true
    };

    // Sample H(jω) for a 2nd-order LP with given Q at ω0 = 1.
    function biquadSamples(Q, n) {
        n = n || 480;
        var wMin = 0.01, wMax = 100;
        var pts = [];
        var phaseRads = [];
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);
            // 1 / (1 - w^2 + j w / Q)
            var re = 1 - w * w;
            var im = w / Q;
            var mag = 1 / Math.sqrt(re * re + im * im);
            var phRad = -Math.atan2(im, re);
            pts.push({ w: w, magDb: 20 * Math.log10(mag), phaseRad: phRad });
            phaseRads.push(phRad);
        }
        var unwrapped = H_helpers.unwrapPhase(phaseRads);
        for (var j = 0; j < pts.length; j++) {
            pts[j].phase = unwrapped[j] * 180 / Math.PI;
        }
        return pts;
    }

    // Passive two-stage RC, R1=R2=R, C1=C2=C (no impedance scaling).
    function passiveSamples(n) {
        n = n || 480;
        var wMin = 0.01, wMax = 100;
        var stages = [{ R: 1, C: 1 }, { R: 1, C: 1 }];
        var pts = [];
        var phaseRads = [];
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);
            var Hjw = H_helpers.cascadeABCD(w, stages);
            pts.push({ w: w, magDb: 20 * Math.log10(H_helpers.cAbs(Hjw)) });
            phaseRads.push(H_helpers.cArg(Hjw));
        }
        var unwrapped = H_helpers.unwrapPhase(phaseRads);
        for (var j = 0; j < pts.length; j++) {
            pts[j].phase = unwrapped[j] * 180 / Math.PI;
        }
        return pts;
    }

    function fmtQ(q) {
        if (q >= 10) return q.toFixed(1);
        if (q >= 1)  return q.toFixed(2);
        return q.toFixed(2);
    }

    function render() {
        var H = H_helpers.setupBode({
            sel: sel,
            xDomain: [0.01, 100],
            magDomain: [-80, 18],
            phaseDomain: [-200, 10],
            magTicks: [-80, -60, -40, -20, -3, 0, 6, 12, 18],
            phaseTicks: [-180, -135, -90, -45, 0]
        });

        var x = H.x, yMag = H.yMag, yPhase = H.yPhase;
        var magMin = yMag.domain()[0];
        var magMax = yMag.domain()[1];
        var clipM = function (d) { return Math.min(Math.max(d, magMin), magMax); };

        var lineMag = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yMag(clipM(d.magDb)); });
        var linePhase = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yPhase(d.phase); });

        // Reference traces (drawn first so the active SK curve sits on top).
        var refTraces = [];
        if (state.showRefs) {
            var bessel = biquadSamples(1 / Math.sqrt(3));
            var butter = biquadSamples(1 / Math.sqrt(2));
            var cheby  = biquadSamples(2);
            H.gMag.append('path').datum(bessel).attr('class', 'trace bessel').attr('d', lineMag);
            H.gPhase.append('path').datum(bessel).attr('class', 'trace bessel').attr('d', linePhase);
            H.gMag.append('path').datum(butter).attr('class', 'trace butter').attr('d', lineMag);
            H.gPhase.append('path').datum(butter).attr('class', 'trace butter').attr('d', linePhase);
            H.gMag.append('path').datum(cheby).attr('class', 'trace cheby').attr('d', lineMag);
            H.gPhase.append('path').datum(cheby).attr('class', 'trace cheby').attr('d', linePhase);
            refTraces.push({ name: 'Bessel  Q=0.58', cssClass: 'bessel', pts: bessel });
            refTraces.push({ name: 'Butter  Q=0.71', cssClass: 'butter', pts: butter });
            refTraces.push({ name: 'Cheby   Q=2.00', cssClass: 'cheby',  pts: cheby  });
        }

        // Passive cascade reference.
        var passiveTraces = [];
        if (state.showPassive) {
            var passive = passiveSamples();
            H.gMag.append('path').datum(passive).attr('class', 'trace passive').attr('d', lineMag);
            H.gPhase.append('path').datum(passive).attr('class', 'trace passive').attr('d', linePhase);
            passiveTraces.push({ name: 'passive 2RC', cssClass: 'passive', pts: passive });
        }

        // Active Sallen-Key trace at user-selected Q.
        var sk = biquadSamples(state.Q);
        H.gMag.append('path').datum(sk).attr('class', 'trace active').attr('d', lineMag);
        H.gPhase.append('path').datum(sk).attr('class', 'trace active').attr('d', linePhase);

        // ── ω0 marker ────────────────────────────────────────────
        var x0 = x(1);
        H.gMag.append('line')
            .attr('x1', x0).attr('x2', x0)
            .attr('y1', 0).attr('y2', H.innerH)
            .attr('stroke', T.fg(0.35))
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3');
        H.gPhase.append('line')
            .attr('x1', x0).attr('x2', x0)
            .attr('y1', 0).attr('y2', H.innerH)
            .attr('stroke', T.fg(0.35))
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3');
        H.gMag.append('text')
            .attr('x', x0 - 6).attr('y', 14)
            .attr('text-anchor', 'end')
            .attr('fill', T.fg(0.55))
            .attr('font-size', 11)
            .attr('font-family', "'JetBrains Mono', monospace")
            .text('ω0');

        // ── Peak marker on the active curve (for Q > 1/sqrt(2)) ──
        if (state.Q > 1 / Math.sqrt(2) + 1e-3) {
            var wPeak = Math.sqrt(1 - 1 / (2 * state.Q * state.Q));
            // |H_peak| = 1 / (2/Q · sqrt(1 - 1/(4Q^2)))
            // simpler: evaluate the closed form magnitude at wPeak
            var rePk = 1 - wPeak * wPeak;
            var imPk = wPeak / state.Q;
            var magPk = 1 / Math.sqrt(rePk * rePk + imPk * imPk);
            var magPkDb = 20 * Math.log10(magPk);
            if (wPeak > 0 && magPkDb < magMax - 0.5) {
                var px = x(wPeak);
                var py = yMag(magPkDb);
                H.gMag.append('circle')
                    .attr('cx', px).attr('cy', py).attr('r', 4)
                    .attr('fill', T.text)
                    .attr('stroke', T.text).attr('stroke-width', 1.2)
                    .attr('fill-opacity', 0);
                H.gMag.append('text')
                    .attr('x', px + 8).attr('y', py - 6)
                    .attr('fill', T.text)
                    .attr('font-size', 11)
                    .attr('font-family', "'JetBrains Mono', monospace")
                    .text('peak ' + magPkDb.toFixed(1) + ' dB');
            }
        }

        // ── Hover crosshair + readout ─────────────────────────────
        var hoverTraces = [{ name: 'Sallen-Key Q=' + fmtQ(state.Q), cssClass: 'active', pts: sk }];
        for (var p = 0; p < passiveTraces.length; p++) hoverTraces.push(passiveTraces[p]);
        for (var r = 0; r < refTraces.length; r++) hoverTraces.push(refTraces[r]);
        H_helpers.attachHover(H, hoverTraces);

        // ── Legend (top-right of magnitude panel) ─────────────────
        var entries = [{ c: 'active', label: 'Sallen-Key  Q = ' + fmtQ(state.Q) }];
        if (state.showPassive) entries.push({ c: 'passive', label: 'passive 2-stage RC' });
        if (state.showRefs) {
            entries.push({ c: 'bessel', label: 'Bessel  Q = 0.58' });
            entries.push({ c: 'butter', label: 'Butterworth  Q = 0.71' });
            entries.push({ c: 'cheby',  label: 'Chebyshev  Q = 2.00' });
        }
        var lg = H.gMag.append('g').attr('transform', 'translate(' + (H.innerW - 12) + ',12)');
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
        var v = parseFloat(slider.value);
        state.Q = Math.pow(10, v);
        if (valLabel) valLabel.textContent = fmtQ(state.Q);
        render();
    }

    function attachPill(pill, key) {
        if (!pill) return;
        pill.addEventListener('click', function () {
            state[key] = !state[key];
            pill.classList.toggle('active', state[key]);
            render();
        });
    }

    function init() {
        if (slider) {
            slider.addEventListener('input', onSlider);
            onSlider();
        } else {
            render();
        }
        attachPill(pillPassive, 'showPassive');
        attachPill(pillRefs, 'showRefs');
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
