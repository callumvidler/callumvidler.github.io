// Section 02 · Wien bridge oscillator schematic.
// Layout matches the canonical lab-style drawing: R4 spans the top as the
// feedback resistor from output to inverting input, R3 grounds the inverting
// input on the left, and the Wien network sits below the op-amp with the
// series arm (C1 and R1) running horizontally and the parallel arm
// (C2 in parallel with R2) dropping vertically to ground.
(function () {
    var sel = '#plot-wien-circuit';

    var VB_W = 600;
    var VB_H = 600;

    // Op-amp triangle (apex on the right, vertically centred in the upper half).
    var TRI = {
        topLeft: [240, 150],
        botLeft: [240, 290],
        apex: [400, 220]
    };
    var Y_INV = 180;
    var Y_NINV = 260;

    // Horizontal coordinates of vertical rails / nodes
    var X_NEG_NODE = 180;     // -input node, top of R4 drop, right end of R3
    var X_POS_NODE = 210;     // +input drop column, top of parallel arm
    var X_C2 = 170;           // C2 column (parallel arm, left)
    var X_R2 = 250;           // R2 column (parallel arm, right)
    var X_VOUT_END = 520;     // output terminal dot
    var TAP_R4 = 490;       // output tap for R4 path (up)
    var TAP_SER = 450;       // output tap for series arm (down)
    var Y_R4_RAIL = 105;      // top horizontal rail through R4
    var Y_SER_RAIL = 340;     // horizontal rail through C1, R1 (series arm)
    var Y_PAR_TOP = 400;      // top of parallel arm split
    var Y_PAR_BOT = 480;      // bottom merge of parallel arm

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var svg = root.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var wire = window.T.wire;
        var fill = window.CMP.cssVar('--bg-2');
        var text = window.T.text;
        var dim = window.T.textDim;
        var stroke = 2;

        function lineSeg(x1, y1, x2, y2) {
            svg.append('line')
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', wire).attr('stroke-width', stroke)
                .attr('stroke-linecap', 'square');
        }
        function dot(cx, cy) {
            svg.append('circle')
                .attr('cx', cx).attr('cy', cy).attr('r', 4)
                .attr('fill', wire).attr('stroke', 'none');
        }
        function resistorH(xL, xR, y) {
            var bodyH = 16;
            svg.append('rect')
                .attr('x', xL).attr('y', y - bodyH / 2)
                .attr('width', xR - xL).attr('height', bodyH)
                .attr('fill', fill).attr('stroke', wire).attr('stroke-width', stroke);
        }
        function resistorV(x, yT, yB) {
            var bodyW = 16;
            svg.append('rect')
                .attr('x', x - bodyW / 2).attr('y', yT)
                .attr('width', bodyW).attr('height', yB - yT)
                .attr('fill', fill).attr('stroke', wire).attr('stroke-width', stroke);
        }
        function capacitorH(xCenter, y) {
            var gap = 6;
            var plateLen = 28;
            var x1 = xCenter - gap / 2;
            var x2 = xCenter + gap / 2;
            svg.append('line')
                .attr('x1', x1).attr('y1', y - plateLen / 2)
                .attr('x2', x1).attr('y2', y + plateLen / 2)
                .attr('stroke', wire).attr('stroke-width', 2.4)
                .attr('stroke-linecap', 'round');
            svg.append('line')
                .attr('x1', x2).attr('y1', y - plateLen / 2)
                .attr('x2', x2).attr('y2', y + plateLen / 2)
                .attr('stroke', wire).attr('stroke-width', 2.4)
                .attr('stroke-linecap', 'round');
            return { left: x1, right: x2 };
        }
        function capacitorV(x, yCenter) {
            var gap = 6;
            var plateLen = 28;
            var y1 = yCenter - gap / 2;
            var y2 = yCenter + gap / 2;
            svg.append('line')
                .attr('x1', x - plateLen / 2).attr('y1', y1)
                .attr('x2', x + plateLen / 2).attr('y2', y1)
                .attr('stroke', wire).attr('stroke-width', 2.4)
                .attr('stroke-linecap', 'round');
            svg.append('line')
                .attr('x1', x - plateLen / 2).attr('y1', y2)
                .attr('x2', x + plateLen / 2).attr('y2', y2)
                .attr('stroke', wire).attr('stroke-width', 2.4)
                .attr('stroke-linecap', 'round');
            return { top: y1, bottom: y2 };
        }
        // Ground symbol drawn as a small downward-pointing triangle, matching
        // the convention in the reference schematic. The triangle sits below
        // a short stub at (cx, yTop).
        function groundArrow(cx, yTop) {
            var halfW = 8;
            var triH = 12;
            svg.append('polygon')
                .attr('points',
                    [[cx - halfW, yTop],
                    [cx + halfW, yTop],
                    [cx, yTop + triH]]
                        .map(function (p) { return p.join(','); }).join(' '))
                .attr('fill', wire).attr('stroke', wire)
                .attr('stroke-width', 1.4).attr('stroke-linejoin', 'round');
        }

        // ── Op-amp triangle ──────────────────────────────────────────
        svg.append('polygon')
            .attr('points', [TRI.topLeft, TRI.botLeft, TRI.apex]
                .map(function (p) { return p.join(','); }).join(' '))
            .attr('fill', fill)
            .attr('stroke', wire)
            .attr('stroke-width', stroke)
            .attr('stroke-linejoin', 'round');

        // ── +/− pin markers, just inside triangle ────────────────────
        // Minus sign (inverting input, top)
        svg.append('line')
            .attr('x1', TRI.topLeft[0] + 10).attr('y1', Y_INV)
            .attr('x2', TRI.topLeft[0] + 22).attr('y2', Y_INV)
            .attr('stroke', text).attr('stroke-width', 2)
            .attr('stroke-linecap', 'round');
        // Plus sign (non-inverting input, bottom)
        svg.append('line')
            .attr('x1', TRI.topLeft[0] + 10).attr('y1', Y_NINV)
            .attr('x2', TRI.topLeft[0] + 22).attr('y2', Y_NINV)
            .attr('stroke', text).attr('stroke-width', 2)
            .attr('stroke-linecap', 'round');
        svg.append('line')
            .attr('x1', TRI.topLeft[0] + 16).attr('y1', Y_NINV - 6)
            .attr('x2', TRI.topLeft[0] + 16).attr('y2', Y_NINV + 6)
            .attr('stroke', text).attr('stroke-width', 2)
            .attr('stroke-linecap', 'round');

        // ── Output wire (apex to terminal dot) ───────────────────────
        lineSeg(TRI.apex[0], TRI.apex[1], X_VOUT_END, TRI.apex[1]);
        dot(TAP_SER, TRI.apex[1]);
        dot(TAP_R4, TRI.apex[1]);
        dot(X_VOUT_END, TRI.apex[1]);

        // ── R4 path: output → up → R4 (horizontal) → down to -input node ─
        lineSeg(TAP_R4, TRI.apex[1], TAP_R4, Y_R4_RAIL);
        // wire to right end of R4
        var R4_xR = 370, R4_xL = 310;
        lineSeg(TAP_R4, Y_R4_RAIL, R4_xR, Y_R4_RAIL);
        resistorH(R4_xL, R4_xR, Y_R4_RAIL);
        // wire to drop column at X_NEG_NODE
        lineSeg(R4_xL, Y_R4_RAIL, X_NEG_NODE, Y_R4_RAIL);
        lineSeg(X_NEG_NODE, Y_R4_RAIL, X_NEG_NODE, Y_INV);

        // ── -input wire from junction to triangle ───────────────────
        lineSeg(X_NEG_NODE, Y_INV, TRI.topLeft[0], Y_INV);
        // junction dot at -input node (R4 down, R3 left, -input right)
        dot(X_NEG_NODE, Y_INV);

        // ── R3 path: -input node → left → R3 → wire → ground ────────
        var R3_xR = 160, R3_xL = 105;
        lineSeg(X_NEG_NODE, Y_INV, R3_xR, Y_INV);
        resistorH(R3_xL, R3_xR, Y_INV);
        lineSeg(R3_xL, Y_INV, 70, Y_INV);
        // ground stub then triangle
        lineSeg(70, Y_INV, 70, 200);
        groundArrow(70, 200);

        // ── +input wire from triangle to drop column ────────────────
        lineSeg(X_POS_NODE, Y_NINV, TRI.topLeft[0], Y_NINV);
        // drop down to series-arm rail
        lineSeg(X_POS_NODE, Y_NINV, X_POS_NODE, Y_SER_RAIL);
        // junction dot at +input node (drop meets series arm and parallel arm)
        dot(X_POS_NODE, Y_SER_RAIL);

        // ── Series arm: +input node → C1 → R1 → up to output tap ────
        var C1 = capacitorH(300, Y_SER_RAIL);
        lineSeg(X_POS_NODE, Y_SER_RAIL, C1.left, Y_SER_RAIL);
        // wire from C1 right plate to R1 left end
        var R1_xL = 350, R1_xR = 420;
        lineSeg(C1.right, Y_SER_RAIL, R1_xL, Y_SER_RAIL);
        resistorH(R1_xL, R1_xR, Y_SER_RAIL);
        // wire from R1 right end to series-down tap on output
        lineSeg(R1_xR, Y_SER_RAIL, TAP_SER, Y_SER_RAIL);
        // up from series rail to output wire
        lineSeg(TAP_SER, Y_SER_RAIL, TAP_SER, TRI.apex[1]);

        // ── Parallel arm: +input node → down → split → C2 || R2 → merge → ground
        lineSeg(X_POS_NODE, Y_SER_RAIL, X_POS_NODE, Y_PAR_TOP);
        // top split horizontal
        lineSeg(X_C2, Y_PAR_TOP, X_R2, Y_PAR_TOP);
        // C2 column (capacitor on the left)
        var C2 = capacitorV(X_C2, 433);
        lineSeg(X_C2, Y_PAR_TOP, X_C2, C2.top);
        lineSeg(X_C2, C2.bottom, X_C2, Y_PAR_BOT);
        // R2 column (resistor on the right)
        var R2_yT = 425, R2_yB = 465;
        lineSeg(X_R2, Y_PAR_TOP, X_R2, R2_yT);
        resistorV(X_R2, R2_yT, R2_yB);
        lineSeg(X_R2, R2_yB, X_R2, Y_PAR_BOT);
        // bottom merge
        lineSeg(X_C2, Y_PAR_BOT, X_R2, Y_PAR_BOT);
        // wire down to ground
        lineSeg(X_POS_NODE, Y_PAR_BOT, X_POS_NODE, 505);
        groundArrow(X_POS_NODE, 505);

        // ── KaTeX labels ─────────────────────────────────────────────
        // Output label
        window.renderKatex(svg, 'V_\\text{out}',
            555, TRI.apex[1],
            { width: 80, height: 24, size: 16, color: text });

        // R4 label (above body, with clearance from rectangle)
        window.renderKatex(svg, 'R_4',
            (R4_xL + R4_xR) / 2, Y_R4_RAIL - 28,
            { width: 40, height: 22, size: 14, color: text });
        // R3 label (above body)
        window.renderKatex(svg, 'R_3',
            (R3_xL + R3_xR) / 2, Y_INV - 28,
            { width: 40, height: 22, size: 14, color: text });
        // C1 label (above plates)
        window.renderKatex(svg, 'C_1',
            300, Y_SER_RAIL - 32,
            { width: 40, height: 22, size: 14, color: text });
        // R1 label (above body)
        window.renderKatex(svg, 'R_1',
            (R1_xL + R1_xR) / 2, Y_SER_RAIL - 28,
            { width: 40, height: 22, size: 14, color: text });
        // C2 label (left of plates, near top of C2)
        window.renderKatex(svg, 'C_2',
            130, 425,
            { width: 40, height: 22, size: 14, color: text });
        // R2 label (right of body, near top of R2)
        window.renderKatex(svg, 'R_2',
            285, 437,
            { width: 40, height: 22, size: 14, color: text });

        // Frequency annotation in empty space at the bottom right.
        // Assumes the design choice R_1 = R_2 = R and C_1 = C_2 = C.
        window.renderKatex(svg, '\\omega_0 = \\dfrac{1}{RC}',
            500, 470,
            { width: 160, height: 36, size: 14, color: text });
    }

    function init() {
        render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
