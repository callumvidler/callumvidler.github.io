// Section 04 · Op-amp astable multivibrator. Inverting input is the top
// of a series RC network referenced to ground. Non-inverting input is the
// tap of a resistive divider R1, R2 from the output to ground.
(function () {
    var sel = '#plot-astable-circuit';

    var VB_W = 800;
    var VB_H = 600;

    var TRI = {
        topLeft: [380, 240],
        botLeft: [380, 360],
        apex:    [520, 300]
    };
    var Y_PLUS  = 264;
    var Y_MINUS = 336;

    var R_THICK = 14;
    var R_LEN   = 70;        // 5:1 length-to-thickness ratio for every resistor

    var Y_RF = 130;
    var X_NODE_A = 200;

    // Capacitor C from node A down to ground (vertical wire).
    var Y_C_T = Y_MINUS + 40;          // top of cap body (28 px tall, plates inside)
    var Y_GND_C = 530;

    // Positive-feedback divider on + input. R1 horizontal sits below the
    // op-amp; R2 vertical hangs from node B straight down to ground.
    var X_B = 340;
    var Y_R1 = 400;
    var Y_GND_R = 530;

    var X_OUT_TAP  = 620;
    var X_VOUT_DOT = 720;

    // Each resistor sits centred on the wire it interrupts.
    // R is on the horizontal wire from X_NODE_A to X_OUT_TAP at Y_RF.
    var X_RF_MID = (X_NODE_A + X_OUT_TAP) / 2;             // = 410
    var X_RF_L = X_RF_MID - R_LEN / 2, X_RF_R = X_RF_MID + R_LEN / 2;

    // R1 is on the horizontal wire from X_B to X_OUT_TAP at Y_R1.
    var X_R1_MID = (X_B + X_OUT_TAP) / 2;                  // = 480
    var X_R1_L = X_R1_MID - R_LEN / 2, X_R1_R = X_R1_MID + R_LEN / 2;

    // R2 is on the vertical wire from node B at Y_R1 down to ground (Y_GND_R - 6).
    var Y_R2_MID = (Y_R1 + (Y_GND_R - 6)) / 2;             // = 462
    var Y_R2_T = Y_R2_MID - R_LEN / 2, Y_R2_B = Y_R2_T + R_LEN;

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var svg = root.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var T = window.T;
        var wire = T.wire;
        var fill = window.CMP.cssVar('--bg-2');
        var text = T.text;
        var muted = T.textMuted;
        var rcol = window.CMP.cssVar('--c-resistor');

        function ln(x1, y1, x2, y2, color, w) {
            svg.append('line')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', color || wire)
                .attr('stroke-width', w || 2)
                .attr('stroke-linecap', 'square');
        }
        function dot(cx, cy) {
            svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 4)
                .attr('fill', wire);
        }
        function hres(xL, xR, y) {
            svg.append('rect')
                .attr('x', xL).attr('y', y - R_THICK / 2)
                .attr('width', xR - xL).attr('height', R_THICK)
                .attr('fill', rcol).attr('stroke', wire).attr('stroke-width', 1.2);
        }
        function vres(x, yT, yB) {
            svg.append('rect')
                .attr('x', x - R_THICK / 2).attr('y', yT)
                .attr('width', R_THICK).attr('height', yB - yT)
                .attr('fill', rcol).attr('stroke', wire).attr('stroke-width', 1.2);
        }
        // Capacitor symbol for a VERTICAL wire. Self-contained 28 px tall
        // block centred at (cx, cy).
        function capV(cx, cy) {
            ln(cx, cy - 14, cx, cy - 3, wire, 2);
            ln(cx, cy + 3,  cx, cy + 14, wire, 2);
            ln(cx - 14, cy - 3, cx + 14, cy - 3, wire, 2);
            ln(cx - 14, cy + 3, cx + 14, cy + 3, wire, 2);
        }
        function ground(cx, cy) {
            ln(cx - 18, cy,      cx + 18, cy,      wire, 2.4);
            ln(cx - 12, cy + 7,  cx + 12, cy + 7,  wire, 2);
            ln(cx - 6,  cy + 14, cx + 6,  cy + 14, wire, 1.8);
        }

        // ── Op-amp triangle ──
        svg.append('polygon')
            .attr('points', [TRI.topLeft, TRI.botLeft, TRI.apex]
                .map(function (p) { return p.join(','); }).join(' '))
            .attr('fill', fill)
            .attr('stroke', wire).attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round');

        var pinX = TRI.topLeft[0] + 14;
        ln(pinX - 7, Y_PLUS, pinX + 7, Y_PLUS, text);
        ln(pinX, Y_PLUS - 7, pinX, Y_PLUS + 7, text);
        ln(pinX - 7, Y_MINUS, pinX + 7, Y_MINUS, text);

        // ── Output ──
        ln(TRI.apex[0], TRI.apex[1], X_OUT_TAP, TRI.apex[1]);
        ln(X_OUT_TAP, TRI.apex[1], X_VOUT_DOT, TRI.apex[1]);
        dot(X_OUT_TAP, TRI.apex[1]);
        dot(X_VOUT_DOT, TRI.apex[1]);

        // ── Inverting branch: R from output up and across to node A,
        //     down to - input, capacitor C from node A to ground. ──
        ln(X_OUT_TAP, TRI.apex[1], X_OUT_TAP, Y_RF);
        ln(X_OUT_TAP, Y_RF, X_RF_R, Y_RF);
        hres(X_RF_L, X_RF_R, Y_RF);
        ln(X_RF_L, Y_RF, X_NODE_A, Y_RF);
        ln(X_NODE_A, Y_RF, X_NODE_A, Y_MINUS);
        ln(X_NODE_A, Y_MINUS, TRI.topLeft[0], Y_MINUS);
        dot(X_NODE_A, Y_MINUS);

        // Capacitor branch from node A to ground (vertical wire)
        ln(X_NODE_A, Y_MINUS, X_NODE_A, Y_C_T);
        capV(X_NODE_A, Y_C_T + 14);
        ln(X_NODE_A, Y_C_T + 28, X_NODE_A, Y_GND_C - 6);
        ground(X_NODE_A, Y_GND_C);

        // ── Positive-feedback divider on + input ──
        // Tap output, run down to Y_R1, across through R1 to node B,
        // up to + pin level, across to + pin. R2 vertical from node B to ground.
        ln(X_OUT_TAP, TRI.apex[1], X_OUT_TAP, Y_R1);
        ln(X_OUT_TAP, Y_R1, X_R1_R, Y_R1);
        hres(X_R1_L, X_R1_R, Y_R1);
        ln(X_R1_L, Y_R1, X_B, Y_R1);
        ln(X_B, Y_R1, X_B, Y_PLUS);
        ln(X_B, Y_PLUS, TRI.topLeft[0], Y_PLUS);
        dot(X_B, Y_PLUS);
        dot(X_B, Y_R1);

        ln(X_B, Y_R1, X_B, Y_R2_T);
        vres(X_B, Y_R2_T, Y_R2_B);
        ln(X_B, Y_R2_B, X_B, Y_GND_R - 6);
        ground(X_B, Y_GND_R);

        // ── Labels ──
        window.renderKatex(svg, 'R',
            (X_RF_L + X_RF_R) / 2, Y_RF - 22,
            { width: 28, height: 20, size: 14, color: text });

        window.renderKatex(svg, 'C',
            X_NODE_A - 30, Y_C_T + 14,
            { width: 28, height: 20, size: 14, color: text });

        window.renderKatex(svg, 'R_1',
            (X_R1_L + X_R1_R) / 2, Y_R1 + 24,
            { width: 36, height: 20, size: 14, color: text });
        window.renderKatex(svg, 'R_2',
            X_B + 30, (Y_R2_T + Y_R2_B) / 2,
            { width: 36, height: 20, size: 14, color: text });

        window.renderKatex(svg, 'v_\\text{out}',
            X_VOUT_DOT + 40, TRI.apex[1],
            { width: 70, height: 22, size: 16, color: text });

        window.renderKatex(svg, 'v_C',
            X_NODE_A + 30, Y_MINUS - 22,
            { width: 40, height: 18, size: 12, color: muted });
        window.renderKatex(svg, '\\beta\\,v_\\text{out}',
            X_B - 50, Y_PLUS - 22,
            { width: 80, height: 20, size: 12, color: muted });

        // ── Hover hotspots: one per component ──
        if (window.CircuitTip) {
            var CT = window.CircuitTip;
            function tip(x, y, w, h, name, body) {
                CT.hotspot(svg, x, y, w, h, CT.fmt(name, body));
            }

            // Op-amp triangle
            tip(TRI.topLeft[0] - 6, TRI.topLeft[1] - 6,
                (TRI.apex[0] - TRI.topLeft[0]) + 12,
                (TRI.botLeft[1] - TRI.topLeft[1]) + 12,
                'Op-amp comparator',
                'Comparator with positive feedback. Saturates at one rail until v<sub>C</sub> on the inverting input crosses the divider threshold, at which point the output flips to the opposite rail.');

            // Feedback resistor R (horizontal, top)
            tip(X_RF_L - 6, Y_RF - R_THICK / 2 - 6,
                R_LEN + 12, R_THICK + 12,
                'R',
                'Timing resistor between v<sub>out</sub> and the inverting node. The output drives C through R, charging it toward whichever saturation rail is currently active.');

            // Capacitor C (vertical)
            tip(X_NODE_A - 20, Y_C_T - 6, 40, 40,
                'C',
                'Timing capacitor on the inverting node, returned to ground. Its voltage v<sub>C</sub> oscillates between &plusmn;&beta;V<sub>sat</sub>; the traversal time sets the half-period.');

            // R_1 (horizontal)
            tip(X_R1_L - 6, Y_R1 - R_THICK / 2 - 6,
                R_LEN + 12, R_THICK + 12,
                'R<sub>1</sub>',
                'Upper arm of the positive-feedback divider. With R<sub>2</sub> sets &beta; = R<sub>2</sub>/(R<sub>1</sub>+R<sub>2</sub>) and the symmetric switching thresholds at &plusmn;&beta;V<sub>sat</sub>.');

            // R_2 (vertical)
            tip(X_B - R_THICK / 2 - 6, Y_R2_T - 6,
                R_THICK + 12, R_LEN + 12,
                'R<sub>2</sub>',
                'Lower arm of the divider, returned to ground. With R<sub>1</sub> sets &beta; and therefore the period T = 2RC&middot;ln((1+&beta;)/(1&minus;&beta;)).');

            // v_out
            tip(X_OUT_TAP - 6, TRI.apex[1] - 16, (X_VOUT_DOT - X_OUT_TAP) + 80, 32,
                'v<sub>out</sub>',
                'Square-wave output. Switches between +V<sub>sat</sub> and &minus;V<sub>sat</sub> each time v<sub>C</sub> crosses &plusmn;&beta;V<sub>sat</sub>. No external trigger is required.');
        }
    }

    function init() {
        render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
})();
