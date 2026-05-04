// Section 03 · Full Wien bridge schematic with selectable filter section.
// Reuses the canonical layout from plot_wien_circuit.js but groups the
// network into a series arm (high-pass) and a parallel arm (low-pass) so
// the selected mode highlights the contributing components. The mode is
// shared via window.WienMode so the bode panel can highlight the
// corresponding response curve in step.
(function () {
    var sel = '#plot-wien-decomp';
    var rootSel = '#wien-decomp-wrap';

    // Outer schematic uses a 600×600 design grid; populated content sits
    // between y≈70 (R4 label) and y≈502 (ground triangle). Crop tightly so
    // the plot box can run at ~1.4:1 — matching the bode panel beside it.
    var VB_X = 0;
    var VB_Y = 65;
    var VB_W = 600;
    var VB_H = 440;

    var TRI = {
        topLeft:  [240, 150],
        botLeft:  [240, 290],
        apex:     [400, 220]
    };
    var Y_INV  = 180;
    var Y_NINV = 260;

    var X_NEG_NODE   = 180;
    var X_POS_NODE   = 210;
    var X_C2         = 170;
    var X_R2         = 250;
    var X_VOUT_END   = 520;
    var TAP_R4       = 490;
    var TAP_SER      = 450;
    var Y_R4_RAIL    = 105;
    var Y_SER_RAIL   = 340;
    var Y_PAR_TOP    = 400;
    var Y_PAR_BOT    = 480;

    // Shared mode store so the filter-response plot can mirror the toolbar.
    window.WienMode = window.WienMode || { value: 'high-pass' };

    function setMode(m) {
        window.WienMode.value = m;
        window.dispatchEvent(new CustomEvent('wienmodechange', { detail: { mode: m } }));
    }

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var svg = root.attr('viewBox',
                VB_X + ' ' + VB_Y + ' ' + VB_W + ' ' + VB_H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var wire = window.T.wire;
        var fill = window.CMP.cssVar('--bg-2');
        var text = window.T.text;
        var dim  = window.T.textDim;
        var stroke = 2;

        var hpColor = window.CMP.cssVar('--c-input');    // blue
        var lpColor = window.CMP.cssVar('--c-output2');  // green

        var mode = window.WienMode.value;
        var hpActive = (mode === 'high-pass' || mode === 'band-pass');
        var lpActive = (mode === 'low-pass'  || mode === 'band-pass');

        var hpStroke = hpActive ? hpColor : wire;
        var lpStroke = lpActive ? lpColor : wire;
        var hpWidth  = hpActive ? 2.8 : stroke;
        var lpWidth  = lpActive ? 2.8 : stroke;
        var hpOp     = hpActive ? 1.0 : 0.30;
        var lpOp     = lpActive ? 1.0 : 0.30;

        function lineSeg(g, x1, y1, x2, y2, s, w) {
            g.append('line')
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', s || wire).attr('stroke-width', w || stroke)
                .attr('stroke-linecap', 'square');
        }
        function dot(g, cx, cy, s) {
            g.append('circle')
                .attr('cx', cx).attr('cy', cy).attr('r', 4)
                .attr('fill', s || wire).attr('stroke', 'none');
        }
        function resistorH(g, xL, xR, y, s, w) {
            var bodyH = 16;
            g.append('rect')
                .attr('x', xL).attr('y', y - bodyH / 2)
                .attr('width', xR - xL).attr('height', bodyH)
                .attr('fill', fill).attr('stroke', s || wire).attr('stroke-width', w || stroke);
        }
        function resistorV(g, x, yT, yB, s, w) {
            var bodyW = 16;
            g.append('rect')
                .attr('x', x - bodyW / 2).attr('y', yT)
                .attr('width', bodyW).attr('height', yB - yT)
                .attr('fill', fill).attr('stroke', s || wire).attr('stroke-width', w || stroke);
        }
        function capacitorH(g, xCenter, y, s, w) {
            var gap = 6;
            var plateLen = 28;
            var x1 = xCenter - gap / 2;
            var x2 = xCenter + gap / 2;
            g.append('line')
                .attr('x1', x1).attr('y1', y - plateLen / 2)
                .attr('x2', x1).attr('y2', y + plateLen / 2)
                .attr('stroke', s || wire).attr('stroke-width', (w || stroke) + 0.4)
                .attr('stroke-linecap', 'round');
            g.append('line')
                .attr('x1', x2).attr('y1', y - plateLen / 2)
                .attr('x2', x2).attr('y2', y + plateLen / 2)
                .attr('stroke', s || wire).attr('stroke-width', (w || stroke) + 0.4)
                .attr('stroke-linecap', 'round');
            return { left: x1, right: x2 };
        }
        function capacitorV(g, x, yCenter, s, w) {
            var gap = 6;
            var plateLen = 28;
            var y1 = yCenter - gap / 2;
            var y2 = yCenter + gap / 2;
            g.append('line')
                .attr('x1', x - plateLen / 2).attr('y1', y1)
                .attr('x2', x + plateLen / 2).attr('y2', y1)
                .attr('stroke', s || wire).attr('stroke-width', (w || stroke) + 0.4)
                .attr('stroke-linecap', 'round');
            g.append('line')
                .attr('x1', x - plateLen / 2).attr('y1', y2)
                .attr('x2', x + plateLen / 2).attr('y2', y2)
                .attr('stroke', s || wire).attr('stroke-width', (w || stroke) + 0.4)
                .attr('stroke-linecap', 'round');
            return { top: y1, bottom: y2 };
        }
        function groundArrow(g, cx, yTop, s) {
            var halfW = 8;
            var triH  = 12;
            g.append('polygon')
                .attr('points',
                    [[cx - halfW, yTop],
                     [cx + halfW, yTop],
                     [cx, yTop + triH]]
                    .map(function (p) { return p.join(','); }).join(' '))
                .attr('fill', s || wire).attr('stroke', s || wire)
                .attr('stroke-width', 1.4).attr('stroke-linejoin', 'round');
        }

        // ── highlight backdrops behind the active arm(s) ───────────
        if (hpActive) {
            // Series arm sits along the top of the divider, between +input
            // drop column and the output tap.
            svg.append('rect')
                .attr('x', X_POS_NODE - 18)
                .attr('y', Y_SER_RAIL - 32)
                .attr('width', (TAP_SER + 18) - (X_POS_NODE - 18))
                .attr('height', 60)
                .attr('rx', 10).attr('ry', 10)
                .attr('fill', hpColor).attr('fill-opacity', 0.08)
                .attr('stroke', hpColor).attr('stroke-opacity', 0.35)
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4 4');
        }
        if (lpActive) {
            svg.append('rect')
                .attr('x', X_C2 - 26)
                .attr('y', Y_PAR_TOP - 18)
                .attr('width', (X_R2 + 26) - (X_C2 - 26))
                .attr('height', (Y_PAR_BOT + 18) - (Y_PAR_TOP - 18))
                .attr('rx', 10).attr('ry', 10)
                .attr('fill', lpColor).attr('fill-opacity', 0.08)
                .attr('stroke', lpColor).attr('stroke-opacity', 0.35)
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4 4');
        }

        // ── grouped layers ─────────────────────────────────────────
        var gCommon   = svg.append('g');                         // op-amp, R3, R4 path, output rail, +input drop
        var gSeries   = svg.append('g').attr('opacity', hpOp);   // C1, R1, series rail, output tap riser
        var gParallel = svg.append('g').attr('opacity', lpOp);   // C2, R2, parallel rails, ground
        var gLabels   = svg.append('g');

        // ── COMMON: op-amp triangle ────────────────────────────────
        gCommon.append('polygon')
            .attr('points', [TRI.topLeft, TRI.botLeft, TRI.apex]
                .map(function (p) { return p.join(','); }).join(' '))
            .attr('fill', fill)
            .attr('stroke', wire)
            .attr('stroke-width', stroke)
            .attr('stroke-linejoin', 'round');

        // +/− pin markers
        gCommon.append('line')
            .attr('x1', TRI.topLeft[0] + 10).attr('y1', Y_INV)
            .attr('x2', TRI.topLeft[0] + 22).attr('y2', Y_INV)
            .attr('stroke', text).attr('stroke-width', 2)
            .attr('stroke-linecap', 'round');
        gCommon.append('line')
            .attr('x1', TRI.topLeft[0] + 10).attr('y1', Y_NINV)
            .attr('x2', TRI.topLeft[0] + 22).attr('y2', Y_NINV)
            .attr('stroke', text).attr('stroke-width', 2)
            .attr('stroke-linecap', 'round');
        gCommon.append('line')
            .attr('x1', TRI.topLeft[0] + 16).attr('y1', Y_NINV - 6)
            .attr('x2', TRI.topLeft[0] + 16).attr('y2', Y_NINV + 6)
            .attr('stroke', text).attr('stroke-width', 2)
            .attr('stroke-linecap', 'round');

        // Output rail
        lineSeg(gCommon, TRI.apex[0], TRI.apex[1], X_VOUT_END, TRI.apex[1], wire, stroke);
        dot(gCommon, TAP_SER, TRI.apex[1], wire);
        dot(gCommon, TAP_R4,  TRI.apex[1], wire);
        dot(gCommon, X_VOUT_END, TRI.apex[1], wire);

        // R4 feedback path
        lineSeg(gCommon, TAP_R4, TRI.apex[1], TAP_R4, Y_R4_RAIL, wire, stroke);
        var R4_xR = 370, R4_xL = 310;
        lineSeg(gCommon, TAP_R4, Y_R4_RAIL, R4_xR, Y_R4_RAIL, wire, stroke);
        resistorH(gCommon, R4_xL, R4_xR, Y_R4_RAIL, wire, stroke);
        lineSeg(gCommon, R4_xL, Y_R4_RAIL, X_NEG_NODE, Y_R4_RAIL, wire, stroke);
        lineSeg(gCommon, X_NEG_NODE, Y_R4_RAIL, X_NEG_NODE, Y_INV, wire, stroke);
        lineSeg(gCommon, X_NEG_NODE, Y_INV, TRI.topLeft[0], Y_INV, wire, stroke);
        dot(gCommon, X_NEG_NODE, Y_INV, wire);

        // R3 grounding the inverting input
        var R3_xR = 160, R3_xL = 105;
        lineSeg(gCommon, X_NEG_NODE, Y_INV, R3_xR, Y_INV, wire, stroke);
        resistorH(gCommon, R3_xL, R3_xR, Y_INV, wire, stroke);
        lineSeg(gCommon, R3_xL, Y_INV, 70, Y_INV, wire, stroke);
        lineSeg(gCommon, 70, Y_INV, 70, 200, wire, stroke);
        groundArrow(gCommon, 70, 200, wire);

        // +input wire from triangle to drop column
        lineSeg(gCommon, X_POS_NODE, Y_NINV, TRI.topLeft[0], Y_NINV, wire, stroke);
        // Drop column from +input down to the divider output node
        lineSeg(gCommon, X_POS_NODE, Y_NINV, X_POS_NODE, Y_SER_RAIL, wire, stroke);
        dot(gCommon, X_POS_NODE, Y_SER_RAIL, wire);

        // ── SERIES ARM (high-pass): +input node → C1 → R1 → up to TAP_SER ──
        var C1 = capacitorH(gSeries, 300, Y_SER_RAIL, hpStroke, hpWidth);
        lineSeg(gSeries, X_POS_NODE, Y_SER_RAIL, C1.left, Y_SER_RAIL, hpStroke, hpWidth);
        var R1_xL = 350, R1_xR = 420;
        lineSeg(gSeries, C1.right, Y_SER_RAIL, R1_xL, Y_SER_RAIL, hpStroke, hpWidth);
        resistorH(gSeries, R1_xL, R1_xR, Y_SER_RAIL, hpStroke, hpWidth);
        lineSeg(gSeries, R1_xR, Y_SER_RAIL, TAP_SER, Y_SER_RAIL, hpStroke, hpWidth);
        lineSeg(gSeries, TAP_SER, Y_SER_RAIL, TAP_SER, TRI.apex[1], hpStroke, hpWidth);

        // ── PARALLEL ARM (low-pass): +input node → split → C2 || R2 → ground
        lineSeg(gParallel, X_POS_NODE, Y_SER_RAIL, X_POS_NODE, Y_PAR_TOP, lpStroke, lpWidth);
        lineSeg(gParallel, X_C2, Y_PAR_TOP, X_R2, Y_PAR_TOP, lpStroke, lpWidth);
        var C2 = capacitorV(gParallel, X_C2, 433, lpStroke, lpWidth);
        lineSeg(gParallel, X_C2, Y_PAR_TOP, X_C2, C2.top, lpStroke, lpWidth);
        lineSeg(gParallel, X_C2, C2.bottom, X_C2, Y_PAR_BOT, lpStroke, lpWidth);
        var R2_yT = 425, R2_yB = 465;
        lineSeg(gParallel, X_R2, Y_PAR_TOP, X_R2, R2_yT, lpStroke, lpWidth);
        resistorV(gParallel, X_R2, R2_yT, R2_yB, lpStroke, lpWidth);
        lineSeg(gParallel, X_R2, R2_yB, X_R2, Y_PAR_BOT, lpStroke, lpWidth);
        lineSeg(gParallel, X_C2, Y_PAR_BOT, X_R2, Y_PAR_BOT, lpStroke, lpWidth);
        lineSeg(gParallel, X_POS_NODE, Y_PAR_BOT, X_POS_NODE, 493, lpStroke, lpWidth);
        groundArrow(gParallel, X_POS_NODE, 493, lpStroke);

        // ── KaTeX labels ────────────────────────────────────────────
        // Output terminal
        window.renderKatex(gLabels, 'V_\\text{out}',
            555, TRI.apex[1],
            { width: 80, height: 24, size: 16, color: text });

        // R4, R3 (always common)
        window.renderKatex(gLabels, 'R_4',
            (R4_xL + R4_xR) / 2, Y_R4_RAIL - 28,
            { width: 40, height: 22, size: 14, color: text });
        window.renderKatex(gLabels, 'R_3',
            (R3_xL + R3_xR) / 2, Y_INV - 28,
            { width: 40, height: 22, size: 14, color: text });

        // Series-arm components: tinted when active
        window.renderKatex(gLabels, 'C_1',
            300, Y_SER_RAIL - 32,
            { width: 40, height: 22, size: 14,
              color: hpActive ? hpColor : dim });
        window.renderKatex(gLabels, 'R_1',
            (R1_xL + R1_xR) / 2, Y_SER_RAIL - 28,
            { width: 40, height: 22, size: 14,
              color: hpActive ? hpColor : dim });

        // Parallel-arm components: tinted when active
        window.renderKatex(gLabels, 'C_2',
            130, 425,
            { width: 40, height: 22, size: 14,
              color: lpActive ? lpColor : dim });
        window.renderKatex(gLabels, 'R_2',
            285, 437,
            { width: 40, height: 22, size: 14,
              color: lpActive ? lpColor : dim });

        // Resonant-frequency annotation
        window.renderKatex(gLabels, '\\omega_0 = \\dfrac{1}{RC}',
            500, 470,
            { width: 160, height: 36, size: 14, color: text });
    }

    function attachToolbar() {
        var wrap = document.querySelector(rootSel);
        if (!wrap) return;
        var btns = wrap.querySelectorAll('[data-wien-mode]');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var m = btn.getAttribute('data-wien-mode');
                btns.forEach(function (b) {
                    b.classList.toggle('active',
                        b.getAttribute('data-wien-mode') === m);
                });
                setMode(m);
            });
        });
        // Sync initial active button with the stored mode (in case scripts
        // load in a different order or the mode is restored elsewhere).
        btns.forEach(function (b) {
            b.classList.toggle('active',
                b.getAttribute('data-wien-mode') === window.WienMode.value);
        });
    }

    function init() {
        attachToolbar();
        render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
        window.addEventListener('wienmodechange', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
