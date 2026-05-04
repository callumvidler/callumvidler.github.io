// Section 03 · Op-amp monostable multivibrator. R is the feedback resistor
// at the top from the - input to Vout; capacitor C and clamping diode D
// hang from the - input bus and share a single rail to ground; Vin is a
// labelled wire that drives the + input through a step path and is also
// the tap of the R1, R2 divider that runs from Vout down to ground on
// the right.
(function () {
    var sel = '#plot-monostable-circuit';

    var VB_W = 780;
    var VB_H = 600;

    // Op-amp triangle. - input on top, + input on bottom.
    var TRI = {
        topLeft: [290, 230],
        botLeft: [290, 340],
        apex:    [440, 285]
    };
    var Y_NEG = 254;
    var Y_POS = 316;
    var pinX  = TRI.topLeft[0] + 14;

    // Vertical columns
    var X_LEFT   = 70;        // diode column / left bus up to top R row
    var X_C      = 180;       // capacitor column
    var X_STEP   = 230;       // where the + input feed turns down to Vin bus
    var X_RIGHT  = 600;       // output column / R1 / R2

    // Horizontal rows
    var Y_TOP        = 110;
    var Y_OUT        = TRI.apex[1];
    var Y_RAIL_LEFT  = 350;       // rail combining cap and diode bottoms
    var Y_GND_LEFT   = 380;       // ground symbol for the combined rail
    var Y_VIN        = 460;
    var Y_GND_RIGHT  = 580;

    var R_THICK = 14;
    var R_LEN   = 70;         // 5:1 length-to-thickness ratio for every resistor

    // Each resistor sits centred on the wire it interrupts.
    // R is on the horizontal wire from X_LEFT to X_RIGHT at Y_TOP.
    var X_R_MID = (X_LEFT + X_RIGHT) / 2;                  // = 335
    var X_R_L = X_R_MID - R_LEN / 2, X_R_R = X_R_MID + R_LEN / 2;

    // R1 is on the vertical wire from Y_OUT (= TRI.apex y) down to Y_VIN at X_RIGHT.
    var Y_R1_MID = (Y_OUT + Y_VIN) / 2;                    // = 372.5
    var Y_R1_T = Y_R1_MID - R_LEN / 2, Y_R1_B = Y_R1_T + R_LEN;

    // R2 is on the vertical wire from Y_VIN down to Y_GND_RIGHT at X_RIGHT.
    var Y_R2_MID = (Y_VIN + Y_GND_RIGHT) / 2;              // = 520
    var Y_R2_T = Y_R2_MID - R_LEN / 2, Y_R2_B = Y_R2_T + R_LEN;

    // Output dot and label
    var X_VOUT_DOT = 680;

    // Capacitor / diode body 28 px tall, with a 26 px stub from the bus
    var Y_BODY_TOP = Y_NEG + 26;       // 280
    var Y_BODY_BOT = Y_BODY_TOP + 28;  // 308

    // Combined ground for cap / diode sits at the rail midpoint
    var X_GND_LEFT = (X_LEFT + X_C) / 2;   // 125

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var svg = root.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var T = window.T;
        var wire   = T.wire;
        var fill   = window.CMP.cssVar('--bg-2');
        var text   = T.text;
        var muted  = T.textMuted;
        var rcol   = window.CMP.cssVar('--c-resistor');
        var output = window.CMP.cssVar('--c-output');
        var trig   = window.CMP.cssVar('--c-trigger');

        function ln(x1, y1, x2, y2, color, w) {
            svg.append('line')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
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
                .attr('fill', rcol).attr('stroke', wire).attr('stroke-width', 1.2);
        }
        function vres(x, yT, yB) {
            svg.append('rect')
                .attr('x', x - R_THICK / 2).attr('y', yT)
                .attr('width', R_THICK).attr('height', yB - yT)
                .attr('fill', rcol).attr('stroke', wire).attr('stroke-width', 1.2);
        }
        // Capacitor on a VERTICAL wire. Self-contained 28 px tall body.
        function capV(cx, cy) {
            ln(cx, cy - 14, cx, cy - 3, wire, 2);
            ln(cx, cy + 3,  cx, cy + 14, wire, 2);
            ln(cx - 14, cy - 3, cx + 14, cy - 3, wire, 2);
            ln(cx - 14, cy + 3, cx + 14, cy + 3, wire, 2);
        }
        // Diode pointing down. Anode at top, cathode bar at bottom; 28 px
        // tall to match capV.
        function diodeDown(cx, cy) {
            svg.append('polygon')
                .attr('points', [
                    [cx - 9, cy - 14], [cx + 9, cy - 14], [cx, cy + 12]
                ].map(function (p) { return p.join(','); }).join(' '))
                .attr('fill', wire).attr('stroke', wire).attr('stroke-width', 1);
            ln(cx - 11, cy + 14, cx + 11, cy + 14, wire, 2);
        }
        // Standard ground: three horizontal lines of decreasing length, with
        // (cx, cy) at the centre of the top line.
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

        // Pin markers: - on top (single bar), + on bottom (cross).
        ln(pinX - 7, Y_NEG, pinX + 7, Y_NEG, text);
        ln(pinX - 7, Y_POS, pinX + 7, Y_POS, text);
        ln(pinX, Y_POS - 7, pinX, Y_POS + 7, text);

        // ── Output wire from apex right to Vout label ──
        ln(TRI.apex[0], Y_OUT, X_RIGHT, Y_OUT);
        ln(X_RIGHT, Y_OUT, X_VOUT_DOT, Y_OUT);
        dot(X_RIGHT, Y_OUT);

        // ── R-feedback path: -input bus → up → across through R → down to output column ──
        ln(X_LEFT, Y_NEG, X_LEFT, Y_TOP);
        ln(X_LEFT, Y_TOP, X_R_L, Y_TOP);
        hres(X_R_L, X_R_R, Y_TOP);
        ln(X_R_R, Y_TOP, X_RIGHT, Y_TOP);
        ln(X_RIGHT, Y_TOP, X_RIGHT, Y_OUT);

        // ── -input bus from left column to - pin ──
        ln(X_LEFT, Y_NEG, TRI.topLeft[0], Y_NEG);
        dot(X_LEFT, Y_NEG);
        dot(X_C, Y_NEG);

        // ── Capacitor C: -input bus down through cap body to combined rail ──
        ln(X_C, Y_NEG, X_C, Y_BODY_TOP);
        capV(X_C, Y_BODY_TOP + 14);
        ln(X_C, Y_BODY_BOT, X_C, Y_RAIL_LEFT);

        // ── Diode D: -input bus down through diode body to combined rail ──
        ln(X_LEFT, Y_NEG, X_LEFT, Y_BODY_TOP);
        diodeDown(X_LEFT, Y_BODY_TOP + 14);
        ln(X_LEFT, Y_BODY_BOT, X_LEFT, Y_RAIL_LEFT);

        // ── Combined rail and single ground ──
        ln(X_LEFT, Y_RAIL_LEFT, X_C, Y_RAIL_LEFT);
        ln(X_GND_LEFT, Y_RAIL_LEFT, X_GND_LEFT, Y_GND_LEFT);
        ground(X_GND_LEFT, Y_GND_LEFT);

        // ── + input feed: exits the LEFT edge of the triangle at Y_POS,
        //    then drops down to the Vin bus. ──
        ln(TRI.topLeft[0], Y_POS, X_STEP, Y_POS);
        ln(X_STEP, Y_POS, X_STEP, Y_VIN);

        // ── Vin bus: labelled wire from the left across to the divider tap ──
        var X_VIN_BUS_L = 90;
        ln(X_VIN_BUS_L, Y_VIN, X_RIGHT, Y_VIN);
        dot(X_STEP, Y_VIN);
        dot(X_RIGHT, Y_VIN);

        // ── R1, R2 vertical resistors on the right column ──
        ln(X_RIGHT, Y_OUT, X_RIGHT, Y_R1_T);
        vres(X_RIGHT, Y_R1_T, Y_R1_B);
        ln(X_RIGHT, Y_R1_B, X_RIGHT, Y_VIN);
        ln(X_RIGHT, Y_VIN, X_RIGHT, Y_R2_T);
        vres(X_RIGHT, Y_R2_T, Y_R2_B);
        ln(X_RIGHT, Y_R2_B, X_RIGHT, Y_GND_RIGHT);
        ground(X_RIGHT, Y_GND_RIGHT);

        // ── Labels ──
        window.renderKatex(svg, 'R',
            (X_R_L + X_R_R) / 2, Y_TOP - 22,
            { width: 28, height: 20, size: 14, color: text });

        window.renderKatex(svg, 'C',
            X_C + 32, Y_BODY_TOP + 14,
            { width: 28, height: 20, size: 14, color: text });

        window.renderKatex(svg, 'R_1',
            X_RIGHT + 28, (Y_R1_T + Y_R1_B) / 2,
            { width: 36, height: 20, size: 14, color: text });
        window.renderKatex(svg, 'R_2',
            X_RIGHT + 28, (Y_R2_T + Y_R2_B) / 2,
            { width: 36, height: 20, size: 14, color: text });

        window.renderKatex(svg, 'V_\\text{trig}',
            X_VIN_BUS_L - 30, Y_VIN,
            { width: 70, height: 22, size: 16, color: trig });

        // Trigger pulse glyph above the Vin label: a single negative-going
        // pulse drawn as a polyline, indicating that Vin is a trigger pulse.
        var pgcx = X_VIN_BUS_L - 30;
        var pgcy = Y_VIN - 32;
        var pulsePath = 'M ' + (pgcx - 22) + ' ' + (pgcy - 7) +
                        ' L ' + (pgcx - 6)  + ' ' + (pgcy - 7) +
                        ' L ' + (pgcx - 6)  + ' ' + (pgcy + 7) +
                        ' L ' + (pgcx + 6)  + ' ' + (pgcy + 7) +
                        ' L ' + (pgcx + 6)  + ' ' + (pgcy - 7) +
                        ' L ' + (pgcx + 22) + ' ' + (pgcy - 7);
        svg.append('path')
            .attr('d', pulsePath)
            .attr('fill', 'none')
            .attr('stroke', trig)
            .attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round');
        window.renderKatex(svg, 'V_\\text{out}',
            X_VOUT_DOT + 40, Y_OUT,
            { width: 70, height: 22, size: 16, color: output });

        // node label
        window.renderKatex(svg, 'v_C',
            X_C + 32, Y_NEG - 18,
            { width: 36, height: 18, size: 12, color: muted });

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
                'Comparator. The inverting input watches the capacitor voltage; the non-inverting input is held at the divider tap. The output saturates to whichever rail makes the differential input non-zero.');

            // Feedback resistor R at the top
            tip(X_R_L - 6, Y_TOP - R_THICK / 2 - 6,
                R_LEN + 12, R_THICK + 12,
                'R',
                'Timing resistor. After a trigger, the output discharges C through R toward &minus;V<sub>sat</sub>. The traversal sets the pulse width T = RC&middot;ln(1/(1&minus;&beta;)).');

            // Capacitor C
            tip(X_C - 20, Y_BODY_TOP - 6, 40, 40,
                'C',
                'Timing capacitor on the inverting node. Its voltage v<sub>C</sub> is the slow state variable. At rest the diode clamps v<sub>C</sub> at one diode drop above ground; during the pulse it ramps toward &minus;V<sub>sat</sub>.');

            // Diode D
            tip(X_LEFT - 16, Y_BODY_TOP - 6, 32, 40,
                'D',
                'Clamping diode. In the stable state the diode is forward-biased and pins v<sub>C</sub> at V<sub>D</sub>. When the output flips negative the diode reverse-biases and frees C to discharge through R.');

            // R_1 vertical
            tip(X_RIGHT - R_THICK / 2 - 6, Y_R1_T - 6,
                R_THICK + 12, R_LEN + 12,
                'R<sub>1</sub>',
                'Upper arm of the positive-feedback divider. With R<sub>2</sub> sets &beta; = R<sub>2</sub>/(R<sub>1</sub>+R<sub>2</sub>), which fixes the threshold V<sub>TL</sub> = &minus;&beta;V<sub>sat</sub> the capacitor must reach to end the pulse.');

            // R_2 vertical
            tip(X_RIGHT - R_THICK / 2 - 6, Y_R2_T - 6,
                R_THICK + 12, R_LEN + 12,
                'R<sub>2</sub>',
                'Lower arm of the divider, returned to ground. Together with R<sub>1</sub> sets &beta; and therefore the switching threshold at the non-inverting input.');

            // V_trig (label + pulse glyph)
            tip(0, 410, 100, 70,
                'V<sub>trig</sub>',
                'Trigger input on the non-inverting node. A brief negative pulse pulls v<sub>+</sub> below v<sub>C</sub>, flipping the comparator and starting the timing excursion.');

            // V_out
            tip(X_VOUT_DOT + 4, Y_OUT - 16, 80, 32,
                'V<sub>out</sub>',
                'Comparator output. Rests at +V<sub>sat</sub>, snaps to &minus;V<sub>sat</sub> on a trigger, and returns to +V<sub>sat</sub> after T = RC&middot;ln(1/(1&minus;&beta;)).');
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
