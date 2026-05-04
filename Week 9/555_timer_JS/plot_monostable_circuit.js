// Section 03 · 555 in monostable mode. Single resistor R from VCC to the
// THRES/DISCH net (pins 6 and 7 tied externally), capacitor C from that
// net to ground. TRIG (pin 2) held high through a pull-up R_T and pulsed
// low to start the timing cycle. RESET tied to VCC; CTRL bypassed.
(function () {
    var sel = '#plot-monostable-circuit';

    var VB_W = 800, VB_H = 600;
    var Y_VCC = 80, Y_GND = 540;
    var X_RAIL_L = 140, X_RAIL_R = 660;
    var R_THICK = 14, R_LEN = 70;

    // The R + cap column sits LEFT of the chip's pin endpoints (which are at
    // x = chip.left - PIN_LEN = 292) so the timing wire does not pass
    // through pin 2's endpoint at (292, 390); pin 2 is on the trigger net,
    // not the timing net, so a coincident wire would imply a false connection.
    var X_TIMING = 260;
    var X_TRIG   = 180;

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var svg = root.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var T = window.T;
        var wire = T.wire;
        var text = T.text;
        var muted = T.textMuted;
        var rcol = window.CMP.cssVar('--c-resistor') || T.fg(0.45);
        var vccCol = window.CMP.cssVar('--c-vcc-rail') || T.yellowA(0.5);
        var trigCol = window.CMP.cssVar('--c-trigger') || '#7be089';

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
        function vres(x, yT, yB) {
            svg.append('rect')
                .attr('x', x - R_THICK / 2).attr('y', yT)
                .attr('width', R_THICK).attr('height', yB - yT)
                .attr('fill', rcol).attr('stroke', wire).attr('stroke-width', 1.2);
        }
        function capV(cx, cy) {
            ln(cx, cy - 14, cx, cy - 3, wire, 2);
            ln(cx, cy + 3,  cx, cy + 14, wire, 2);
            ln(cx - 14, cy - 3, cx + 14, cy - 3, wire, 2.4);
            ln(cx - 14, cy + 3, cx + 14, cy + 3, wire, 2.4);
        }
        function ground(cx, cy) {
            ln(cx - 16, cy,      cx + 16, cy,      wire, 2.4);
            ln(cx - 11, cy + 6,  cx + 11, cy + 6,  wire, 2);
            ln(cx - 6,  cy + 12, cx + 6,  cy + 12, wire, 1.8);
        }
        function arrowLeft(x, y, len) {
            // Rightward-pointing arrow head at (x, y); shaft extends to x-len
            ln(x - len, y, x - 6, y, trigCol, 2);
            svg.append('polygon')
                .attr('points', (x - 6) + ',' + (y - 4) + ' ' + x + ',' + y + ' ' + (x - 6) + ',' + (y + 4))
                .attr('fill', trigCol);
        }

        // Rails
        ln(X_RAIL_L, Y_VCC, X_RAIL_R, Y_VCC, vccCol, 2.6);
        ln(X_RAIL_L, Y_GND, X_RAIL_R, Y_GND, wire,   2.6);
        window.renderKatex(svg, 'V_{CC}', X_RAIL_R - 60, Y_VCC - 18,
            { width: 56, height: 20, size: 13, color: text });
        ground(X_RAIL_R - 30, Y_GND + 6);

        // Chip
        var chip = window.Chip555.draw(svg);
        var p1 = chip.pin(1), p2 = chip.pin(2), p3 = chip.pin(3),
            p4 = chip.pin(4), p5 = chip.pin(5), p6 = chip.pin(6),
            p7 = chip.pin(7), p8 = chip.pin(8);

        // VCC / GND wires
        ln(p8.outX, p8.outY, p8.outX, Y_VCC);
        ln(p4.outX, p4.outY, p4.outX, Y_VCC);
        ln(p1.outX, p1.outY, p1.outX, Y_GND);

        // CTRL bypass
        var Y_CB = 505;
        ln(p5.outX, p5.outY, p5.outX, Y_CB - 14);
        capV(p5.outX, Y_CB);
        ln(p5.outX, Y_CB + 14, p5.outX, Y_GND);
        window.renderKatex(svg, '10\\,\\mathrm{nF}',
            p5.outX + 60, Y_CB,
            { width: 64, height: 18, size: 11, color: muted });

        // Timing column at X_TIMING:
        //   VCC rail -> R -> pin 7 (y=230) -> pin 6 (y=310) directly tied
        //   pin 6 net -> C -> GND rail
        var Y_R_T = 120, Y_R_B = 190;
        var Y_C   = 425;

        // Pin 7 and pin 6 stubs already drawn. Tie them through the column.
        ln(p7.outX, p7.outY, X_TIMING, p7.outY);
        ln(p6.outX, p6.outY, X_TIMING, p6.outY);

        ln(X_TIMING, Y_VCC, X_TIMING, Y_R_T);
        vres(X_TIMING, Y_R_T, Y_R_B);
        ln(X_TIMING, Y_R_B, X_TIMING, p7.outY);
        dot(X_TIMING, p7.outY);
        ln(X_TIMING, p7.outY, X_TIMING, p6.outY);
        dot(X_TIMING, p6.outY);
        ln(X_TIMING, p6.outY, X_TIMING, Y_C - 14);
        capV(X_TIMING, Y_C);
        ln(X_TIMING, Y_C + 14, X_TIMING, Y_GND);

        window.renderKatex(svg, 'R',
            X_TIMING - 40, (Y_R_T + Y_R_B) / 2,
            { width: 28, height: 20, size: 14, color: text });
        window.renderKatex(svg, 'C',
            X_TIMING - 40, Y_C,
            { width: 28, height: 20, size: 14, color: text });

        // Trigger column at X_TRIG:
        //   VCC rail -> R_T -> pin 2 net -> arrow input "V_trig"
        var Y_RT_T = 200, Y_RT_B = 270;
        ln(p2.outX, p2.outY, X_TRIG, p2.outY);
        ln(X_TRIG, Y_VCC, X_TRIG, Y_RT_T);
        vres(X_TRIG, Y_RT_T, Y_RT_B);
        ln(X_TRIG, Y_RT_B, X_TRIG, p2.outY);
        dot(X_TRIG, p2.outY);

        // Trigger signal arrow entering the pin 2 net from the left.
        // Shaft length is short so the V_trig label has clear space to the
        // left without crowding the arrow.
        var Y_TRIG_LBL = p2.outY + 60;
        arrowLeft(X_TRIG, Y_TRIG_LBL, 50);
        ln(X_TRIG, p2.outY, X_TRIG, Y_TRIG_LBL);
        window.renderKatex(svg, 'V_{\\text{trig}}',
            X_TRIG - 110, Y_TRIG_LBL,
            { width: 70, height: 20, size: 13, color: trigCol, align: 'right' });

        window.renderKatex(svg, 'R_T',
            X_TRIG - 40, (Y_RT_T + Y_RT_B) / 2,
            { width: 36, height: 20, size: 14, color: text });

        // Pin 3 (OUT)
        var X_OUT_DOT = 640;
        ln(p3.outX, p3.outY, X_OUT_DOT, p3.outY);
        dot(X_OUT_DOT, p3.outY);
        window.renderKatex(svg, 'v_{\\text{out}}',
            X_OUT_DOT + 50, p3.outY,
            { width: 70, height: 22, size: 16, color: text });

        // Hover tooltips
        if (window.CircuitTip) {
            var CT = window.CircuitTip;
            function tip(x, y, w, h, name, body) {
                CT.hotspot(svg, x, y, w, h, CT.fmt(name, body));
            }
            tip(X_TIMING - R_THICK, Y_R_T - 6, R_THICK * 2 + 12, R_LEN + 12,
                'R',
                'Single timing resistor between V<sub>CC</sub> and the THRES/DISCH net. While the discharge transistor is off, the capacitor charges through R toward V<sub>CC</sub>; the pulse ends when v<sub>C</sub> reaches &#8532;V<sub>CC</sub>.');
            tip(X_TIMING - 18, Y_C - 16, 36, 32,
                'C',
                'Timing capacitor. Idles at 0 V (held by the internal discharge transistor). When triggered the discharge transistor opens and v<sub>C</sub> rises along an exponential with time constant RC.');
            tip(X_TRIG - R_THICK, Y_RT_T - 6, R_THICK * 2 + 12, R_LEN + 12,
                'R<sub>T</sub>',
                'Pull-up resistor on the trigger pin. Holds TRIG above &#8531;V<sub>CC</sub> in the resting state so the chip is not retriggered by ambient noise; a brief active-low pulse on V<sub>trig</sub> initiates the timing cycle.');
            tip(p3.outX - 4, p3.outY - 14, X_OUT_DOT - p3.outX + 8, 28,
                'v<sub>out</sub> (pin 3)',
                'Output. Sits low at rest; pulses high for T &approx; 1.1RC after each negative trigger pulse, then returns to low and waits for the next trigger.');
            tip(p5.outX - 18, Y_CB - 18, 36, 36,
                '10 nF bypass',
                'Bypasses the CTRL pin. The internal divider node sits at &#8532;V<sub>CC</sub>; coupling supply noise into it would shift the upper threshold and produce a noisy pulse width.');
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
