// Section 04 · Buffered vs unbuffered cascade Bode comparison.
(function () {
    var T = window.T;
    var sel = '#plot-bode-buffered';
    var slider = document.getElementById('nbuf-slider');
    var valLabel = document.getElementById('nbuf-val');
    var pillP = document.getElementById('show-passive');
    var pillB = document.getElementById('show-buffered');
    var H_helpers = window.BodeHelpers;

    var state = { N: 3, showPassive: true, showBuffered: true };

    function render() {
        var N = state.N;
        var H = H_helpers.setupBode({
            sel: sel,
            xDomain: [0.01, 100],
            magDomain: [-120, 6],
            phaseDomain: [-540, 10],
            magTicks: [-120, -100, -80, -60, -40, -20, -3, 0],
            phaseTicks: [-540, -450, -360, -270, -180, -90, 0]
        });

        var x = H.x, yMag = H.yMag, yPhase = H.yPhase;
        var wMin = 0.01, wMax = 100, n = 480;

        var bufPts = [];
        var passivePts = [];

        var stages = [];
        for (var k = 0; k < N; k++) stages.push({ R: 1, C: 1 });

        var passivePhases = [];

        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);

            // Buffered: ideal product of identical first-order stages.
            var u = w;
            var stageMag = 1 / Math.sqrt(1 + u * u);
            var stagePhase = -Math.atan(u);
            var bufMag = Math.pow(stageMag, N);
            var bufPhase = stagePhase * N;
            bufPts.push({ w: w, magDb: 20 * Math.log10(bufMag), phase: bufPhase * 180 / Math.PI });

            // Passive (unbuffered) cascade by ABCD chain.
            var Hjw = H_helpers.cascadeABCD(w, stages);
            var pmag = H_helpers.cAbs(Hjw);
            var pphaseRad = H_helpers.cArg(Hjw);
            passivePts.push({ w: w, magDb: 20 * Math.log10(pmag), phaseRad: pphaseRad });
            passivePhases.push(pphaseRad);
        }

        var unwrapped = H_helpers.unwrapPhase(passivePhases);
        for (var j = 0; j < passivePts.length; j++) {
            passivePts[j].phase = unwrapped[j] * 180 / Math.PI;
        }

        var magMin = yMag.domain()[0];
        var clip = function (d) { return Math.max(d, magMin); };
        var lineMag = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yMag(clip(d.magDb)); });
        var linePhase = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yPhase(d.phase); });

        if (state.showPassive) {
            H.gMag.append('path').datum(passivePts)
                .attr('class', 'trace passive').attr('d', lineMag);
            H.gPhase.append('path').datum(passivePts)
                .attr('class', 'trace passive').attr('d', linePhase);
        }
        if (state.showBuffered) {
            H.gMag.append('path').datum(bufPts)
                .attr('class', 'trace buffered').attr('d', lineMag);
            H.gPhase.append('path').datum(bufPts)
                .attr('class', 'trace buffered').attr('d', linePhase);
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

        // ── Stopband-slope annotation ───────────────────────────
        // Mark the asymptotic slope of buffered curve: -20N dB/decade.
        var slopeText = '−' + (20 * N) + ' dB/dec';
        H.gMag.append('text')
            .attr('x', H.innerW - 12).attr('y', H.innerH - 12)
            .attr('text-anchor', 'end')
            .attr('fill', T.fg(0.6))
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 11)
            .text('asymptote: ' + slopeText);

        // ── Hover crosshair + readout ───────────────────────────
        var hoverTraces = [];
        if (state.showBuffered) hoverTraces.push({ name: 'buffered', cssClass: 'buffered', pts: bufPts });
        if (state.showPassive)  hoverTraces.push({ name: 'passive',  cssClass: 'passive',  pts: passivePts });
        window.BodeHelpers.attachHover(H, hoverTraces);

        // ── Legend ──────────────────────────────────────────────
        var lg = H.gMag.append('g').attr('transform', 'translate(' + (H.innerW - 12) + ',12)');
        var entries = [];
        if (state.showBuffered) entries.push({ c: 'buffered', label: 'buffered  H = 1/(1+sRC)^' + N });
        if (state.showPassive)  entries.push({ c: 'passive',  label: 'passive cascade  N=' + N });
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
        state.N = parseInt(slider.value, 10);
        if (valLabel) valLabel.textContent = String(state.N);
        render();
    }

    function init() {
        if (slider) slider.addEventListener('input', onSlider);
        if (pillP) pillP.addEventListener('click', function () {
            state.showPassive = !state.showPassive;
            pillP.classList.toggle('active', state.showPassive);
            render();
        });
        if (pillB) pillB.addEventListener('click', function () {
            state.showBuffered = !state.showBuffered;
            pillB.classList.toggle('active', state.showBuffered);
            render();
        });
        if (slider) onSlider(); else render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
