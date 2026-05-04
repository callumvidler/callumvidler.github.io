// Section 02 · Op-amp bistable multivibrator (inverting Schmitt trigger).
// The signal under test enters the inverting input. The non-inverting
// input receives a fraction beta = R2/(R1+R2) of the output through a
// resistive divider, providing positive feedback.
//
// Layout note: node B sits to the LEFT of the v_in source so the R2
// vertical leg can drop straight to ground without crossing the v_in /
// R_in horizontal wire on the inverting input.
(function () {
    var sel = '#plot-bistable-circuit';

    var VB_W = 800;
    var VB_H = 600;

    var TRI = {
        topLeft: [350, 240],
        botLeft: [350, 360],
        apex:    [490, 300]
    };
    var Y_PLUS  = 264;
    var Y_MINUS = 336;

    var R_THICK   = 14;
    var R_LEN     = 70;       // 5:1 length-to-thickness ratio for every resistor

    var X_B        = 60;      // node B column, far left, clear of the v_in source
    var X_VIN      = 130;     // v_in source dot, right of node B and its label
    var X_OUT_TAP  = 600;
    var X_VOUT_DOT = 700;
    var Y_R1       = 120;
    var Y_GND      = 540;

    // R_in sits centred on the v_in -> minus pin wire.
    var X_R_IN_MID = (X_VIN + TRI.topLeft[0]) / 2;
    var X_R_IN_L = X_R_IN_MID - R_LEN / 2, X_R_IN_R = X_R_IN_MID + R_LEN / 2;

    // R1 sits centred on the horizontal wire from node B to the output tap.
    var X_R1_MID = (X_OUT_TAP + X_B) / 2;
    var X_R1_L = X_R1_MID - R_LEN / 2, X_R1_R = X_R1_MID + R_LEN / 2;

    // R2 sits on the vertical wire from node B down to ground.
    var Y_R2_MID = (Y_PLUS + (Y_GND - 6)) / 2;
    var Y_R2_T = Y_R2_MID - R_LEN / 2;
    var Y_R2_B = Y_R2_T + R_LEN;

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
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', color || wire)
                .attr('stroke-width', w || 2)
                .attr('stroke-linecap', 'square');
        }
        function dot(cx, cy, color) {
            svg.append('circle')
                .attr('cx', cx).attr('cy', cy).attr('r', 4)
                .attr('fill', color || wire).attr('stroke', 'none');
        }
        function hres(xL, xR, y) {
            svg.append('rect')
                .attr('x', xL).attr('y', y - R_THICK / 2)
                .attr('width', xR - xL).attr('height', R_THICK)
                .attr('fill', rcol)
                .attr('stroke', wire).attr('stroke-width', 1.2);
        }
        function vres(x, yT, yB) {
            svg.append('rect')
                .attr('x', x - R_THICK / 2).attr('y', yT)
                .attr('width', R_THICK).attr('height', yB - yT)
                .attr('fill', rcol)
                .attr('stroke', wire).attr('stroke-width', 1.2);
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
            .attr('stroke', wire)
            .attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round');

        // +/- pin markers (geometric: + on top side, - on bottom side)
        var pinX = TRI.topLeft[0] + 14;
        ln(pinX - 7, Y_PLUS, pinX + 7, Y_PLUS, text);
        ln(pinX, Y_PLUS - 7, pinX, Y_PLUS + 7, text);
        ln(pinX - 7, Y_MINUS, pinX + 7, Y_MINUS, text);

        // ── Inverting-input path: v_in -> R_in -> - pin ──
        ln(X_VIN, Y_MINUS, X_R_IN_L, Y_MINUS);
        hres(X_R_IN_L, X_R_IN_R, Y_MINUS);
        ln(X_R_IN_R, Y_MINUS, TRI.topLeft[0], Y_MINUS);
        dot(X_VIN, Y_MINUS);

        // ── Output wire ──
        ln(TRI.apex[0], TRI.apex[1], X_OUT_TAP, TRI.apex[1]);
        ln(X_OUT_TAP, TRI.apex[1], X_VOUT_DOT, TRI.apex[1]);
        dot(X_OUT_TAP, TRI.apex[1]);
        dot(X_VOUT_DOT, TRI.apex[1]);

        // ── Positive-feedback divider ──
        // Output tap rises to Y_R1, runs left through R1 to node B's
        // column, then drops to the + pin row. From node B the wire runs
        // right into the + pin and a vertical R2 leg drops to ground. With
        // node B at the far left, the R2 leg sits clear of the v_in wire.
        ln(X_OUT_TAP, TRI.apex[1], X_OUT_TAP, Y_R1);     // up from output tap
        ln(X_OUT_TAP, Y_R1, X_R1_R, Y_R1);               // across to R1 right
        hres(X_R1_L, X_R1_R, Y_R1);                      // R1
        ln(X_R1_L, Y_R1, X_B, Y_R1);                     // across to node B column
        ln(X_B, Y_R1, X_B, Y_PLUS);                      // down to + pin level
        ln(X_B, Y_PLUS, TRI.topLeft[0], Y_PLUS);         // across to + pin
        dot(X_B, Y_PLUS);                                // node B junction

        // R2 vertical from node B downward to ground.
        ln(X_B, Y_PLUS, X_B, Y_R2_T);
        vres(X_B, Y_R2_T, Y_R2_B);
        ln(X_B, Y_R2_B, X_B, Y_GND - 6);
        ground(X_B, Y_GND);

        // ── Labels ──
        window.renderKatex(svg, 'R_\\text{in}',
            (X_R_IN_L + X_R_IN_R) / 2, Y_MINUS + 24,
            { width: 60, height: 20, size: 13, color: text });

        window.renderKatex(svg, 'R_1',
            (X_R1_L + X_R1_R) / 2, Y_R1 - 22,
            { width: 36, height: 20, size: 14, color: text });

        // R2 label sits to the right of the R2 body, in the empty column
        // between node B and the v_in source dot.
        window.renderKatex(svg, 'R_2',
            X_B + 26, (Y_R2_T + Y_R2_B) / 2,
            { width: 32, height: 20, size: 14, color: text });

        window.renderKatex(svg, 'v_\\text{in}',
            X_VIN - 28, Y_MINUS,
            { width: 50, height: 22, size: 16, color: text });
        window.renderKatex(svg, 'v_\\text{out}',
            X_VOUT_DOT + 40, TRI.apex[1],
            { width: 70, height: 22, size: 16, color: text });

        // beta v_out tap label sits above node B, between the + pin row
        // and the R1 row.
        window.renderKatex(svg, '\\beta\\,v_\\text{out}',
            X_B + 56, Y_PLUS - 18,
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
                'Open-loop comparator. Drives the output to whichever saturation rail makes the differential input non-zero. With positive feedback through R<sub>1</sub> and R<sub>2</sub>, this becomes an inverting Schmitt trigger with two stable states.');

            // R_in
            tip(X_R_IN_L - 6, Y_MINUS - R_THICK / 2 - 6,
                R_LEN + 12, R_THICK + 12,
                'R<sub>in</sub>',
                'Series input resistor on the inverting terminal. Limits input current and isolates the source impedance from the comparator. Has no influence on the switching thresholds.');

            // R_1
            tip(X_R1_L - 6, Y_R1 - R_THICK / 2 - 6,
                R_LEN + 12, R_THICK + 12,
                'R<sub>1</sub>',
                'Upper arm of the positive-feedback divider. With R<sub>2</sub> sets the feedback ratio &beta; = R<sub>2</sub>/(R<sub>1</sub>+R<sub>2</sub>), the fraction of v<sub>out</sub> returned to the non-inverting input.');

            // R_2
            tip(X_B - R_THICK / 2 - 6, Y_R2_T - 6,
                R_THICK + 12, R_LEN + 12,
                'R<sub>2</sub>',
                'Lower arm of the positive-feedback divider, returned to ground. Together with R<sub>1</sub> sets &beta; and therefore the switching thresholds at &plusmn;&beta;V<sub>sat</sub>.');

            // v_in
            tip(X_VIN - 28, Y_MINUS - 16, 64, 32,
                'v<sub>in</sub>',
                'Signal applied to the inverting terminal. The output flips only when v<sub>in</sub> rises above the upper threshold or falls below the lower threshold.');

            // v_out
            tip(X_OUT_TAP - 6, TRI.apex[1] - 16, (X_VOUT_DOT - X_OUT_TAP) + 80, 32,
                'v<sub>out</sub>',
                'Saturated comparator output. Sits at +V<sub>sat</sub> or &minus;V<sub>sat</sub>; both rails are stable. The output flips only on a threshold crossing at the inverting input.');
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
