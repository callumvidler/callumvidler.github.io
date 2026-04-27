// Section 01 · First-order RC low-pass Bode plot
(function () {
    var T = window.T;
    var sel = '#plot-bode-first';
    var slider = document.getElementById('fc1-slider');
    var valLabel = document.getElementById('fc1-val');

    var state = { wc: 10 };

    function fmtFreq(w) {
        if (w >= 100) return w.toFixed(0) + ' rad/s';
        if (w >= 10)  return w.toFixed(1) + ' rad/s';
        if (w >= 1)   return w.toFixed(2) + ' rad/s';
        return w.toFixed(3) + ' rad/s';
    }

    function render() {
        var H = window.BodeHelpers.setupBode({
            sel: sel,
            xDomain: [0.1, 1000],
            magDomain: [-50, 6],
            phaseDomain: [-100, 5],
            magTicks: [-50, -40, -30, -20, -10, -3, 0],
            phaseTicks: [-90, -75, -60, -45, -30, -15, 0]
        });

        var x = H.x, yMag = H.yMag, yPhase = H.yPhase;
        var wc = state.wc;

        // ── Sample H(jω) = 1/(1 + jω/ωc) ──────────────────
        var pts = [];
        var wMin = 0.1, wMax = 1000;
        var nSamples = 360;
        for (var i = 0; i <= nSamples; i++) {
            var t = i / nSamples;
            var w = wMin * Math.pow(wMax / wMin, t);
            var u = w / wc;
            var mag = 1 / Math.sqrt(1 + u * u);
            var phase = -Math.atan(u) * 180 / Math.PI;
            pts.push({ w: w, magDb: 20 * Math.log10(mag), phase: phase });
        }

        var magMin = yMag.domain()[0];
        var lineMag = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yMag(Math.max(d.magDb, magMin)); });
        var linePhase = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yPhase(d.phase); });

        H.gMag.append('path').datum(pts)
            .attr('class', 'trace ideal').attr('d', lineMag);
        H.gPhase.append('path').datum(pts)
            .attr('class', 'trace ideal').attr('d', linePhase);

        // ── Cutoff marker (dashed vertical, -3dB dot, -45° dot) ────
        var xc = x(wc);
        // Only draw the marker if it sits inside the plot.
        if (wc >= wMin && wc <= wMax) {
            H.gMag.append('line').attr('class', 'marker-line')
                .attr('x1', xc).attr('x2', xc)
                .attr('y1', 0).attr('y2', H.innerH);
            H.gPhase.append('line').attr('class', 'marker-line')
                .attr('x1', xc).attr('x2', xc)
                .attr('y1', 0).attr('y2', H.innerH);
            H.gMag.append('circle').attr('class', 'marker-dot')
                .attr('cx', xc).attr('cy', yMag(-3)).attr('r', 5);
            H.gPhase.append('circle').attr('class', 'marker-dot')
                .attr('cx', xc).attr('cy', yPhase(-45)).attr('r', 5);

            // Label the cutoff value as KaTeX pills, centred on the cutoff
            // line. Generous foreignObject; the inner pill auto-sizes to its
            // no-wrap content.
            var pillCx = Math.max(60,
                Math.min(H.innerW - 60, xc));
            window.renderKatex(H.gMag, '\\omega_c \\to -3\\,\\mathrm{dB}',
                pillCx, 14,
                { width: 200, height: 22, size: 9, pill: true, pillPad: '1px 6px' });
            window.renderKatex(H.gPhase, '\\omega_c \\to -45^{\\circ}',
                pillCx, 14,
                { width: 200, height: 22, size: 9, pill: true, pillPad: '1px 6px' });
        }

        // ── Asymptote dashed lines ─────────────────────────────────
        // Magnitude asymptote: 0 dB up to ωc, then -20 dB/dec.
        var asymPts = [
            { w: wMin, m: 0 },
            { w: wc, m: 0 },
            { w: wMax, m: -20 * Math.log10(wMax / wc) }
        ];
        H.gMag.append('path').datum(asymPts)
            .attr('class', 'trace faint')
            .attr('d', d3.line().x(function (d) { return x(d.w); }).y(function (d) { return yMag(Math.max(d.m, magMin)); }));

        // ── Hover crosshair + readout ─────────────────────────────
        window.BodeHelpers.attachHover(H, [
            { name: '|H(jω)|', cssClass: 'ideal', pts: pts }
        ]);
    }

    function onSlider() {
        var v = parseFloat(slider.value);
        state.wc = Math.pow(10, v);
        if (valLabel) valLabel.textContent = fmtFreq(state.wc);
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
