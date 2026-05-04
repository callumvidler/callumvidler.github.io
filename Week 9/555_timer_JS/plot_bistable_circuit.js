// Section 04 · 555 in bistable mode. THRES (pin 6) tied to ground so the
// upper comparator never fires. DISCH (pin 7) left open. The internal SR
// latch is therefore exposed directly through the active-low TRIG (pin 2)
// and active-low RESET (pin 4) inputs, both pulled up to V_CC and pulsed
// low to set or reset the output.
(function () {
    var sel = '#plot-bistable-circuit';

    var VB_W = 800, VB_H = 600;
    var Y_VCC = 80, Y_GND = 540;
    var X_RAIL_L = 140, X_RAIL_R = 660;
    var R_THICK = 14, R_LEN = 70;

    var X_TRIG  = 200;          // pull-up + SET signal column

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
        var rstCol  = window.CMP.cssVar('--c-thresh')  || '#ff5c7a';

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
        function hres(xL, xR, y) {
            svg.append('rect')
                .attr('x', xL).attr('y', y - R_THICK / 2)
                .attr('width', xR - xL).attr('height', R_THICK)
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
        function arrow(xFrom, xTo, y, color) {
            // Horizontal arrow with head at (xTo, y); shaft from (xFrom, y).
            ln(xFrom, y, xTo - 6 * Math.sign(xTo - xFrom), y, color, 2);
            var s = Math.sign(xTo - xFrom);
            svg.append('polygon')
                .attr('points',
                    (xTo - 6 * s) + ',' + (y - 4) + ' ' +
                    xTo + ',' + y + ' ' +
                    (xTo - 6 * s) + ',' + (y + 4))
                .attr('fill', color);
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
        ln(p1.outX, p1.outY, p1.outX, Y_GND);

        // CTRL bypass
        var Y_CB = 505;
        ln(p5.outX, p5.outY, p5.outX, Y_CB - 14);
        capV(p5.outX, Y_CB);
        ln(p5.outX, Y_CB + 14, p5.outX, Y_GND);
        window.renderKatex(svg, '10\\,\\mathrm{nF}',
            p5.outX + 60, Y_CB,
            { width: 64, height: 18, size: 11, color: muted });

        // Pin 7 (DISCH): not connected. Short stub ending in an open-circle
        // marker indicates "no connection".
        var X_NC = 240;
        ln(p7.outX, p7.outY, X_NC, p7.outY);
        svg.append('circle')
            .attr('cx', X_NC).attr('cy', p7.outY).attr('r', 5)
            .attr('fill', 'none').attr('stroke', wire).attr('stroke-width', 1.6);
        window.renderKatex(svg, '\\text{n.c.}',
            X_NC - 50, p7.outY,
            { width: 50, height: 16, size: 11, color: muted });

        // Pin 6 (THRES): tied to GND via a short wire and a local ground
        // triangle. A separate vertical to the GND rail would cross pin 2's
        // horizontal at (X_NC, 390) without an electrical connection, which
        // would be visually misleading.
        ln(p6.outX, p6.outY, X_NC, p6.outY);
        ln(X_NC, p6.outY, X_NC, p6.outY + 26);
        ground(X_NC, p6.outY + 26);

        // Pin 2 (TRIG = SET): pull-up to VCC, SET signal arrow into pin 2
        var Y_RS_T = 200, Y_RS_B = 270;
        ln(p2.outX, p2.outY, X_TRIG, p2.outY);
        ln(X_TRIG, Y_VCC, X_TRIG, Y_RS_T);
        vres(X_TRIG, Y_RS_T, Y_RS_B);
        ln(X_TRIG, Y_RS_B, X_TRIG, p2.outY);
        dot(X_TRIG, p2.outY);

        // SET signal arrow coming in from the left into pin 2 net
        var Y_SET_LBL = p2.outY + 60;
        arrow(X_TRIG - 60, X_TRIG, Y_SET_LBL, trigCol);
        ln(X_TRIG, p2.outY, X_TRIG, Y_SET_LBL);
        window.renderKatex(svg, '\\overline{\\text{SET}}',
            X_TRIG - 120, Y_SET_LBL,
            { width: 60, height: 20, size: 13, color: trigCol, align: 'right' });
        window.renderKatex(svg, 'R_S',
            X_TRIG - 40, (Y_RS_T + Y_RS_B) / 2,
            { width: 36, height: 20, size: 14, color: text });

        // Pin 4 (RESET): pull-up to VCC, RESET signal arrow into pin 4
        // pin 4 outX=470, outY=152. Branch the wire:
        //   pin 4 stub up to (p4.outX, 152) -- already there
        //   then at y=132 the wire splits: UP through pull-up R_R to VCC,
        //   and RIGHT to a RESET signal label that drives the wire low.
        var X_RST_R = 600;            // x of the RESET signal arrow start
        var Y_RST_BUS = 130;          // the horizontal bus into pin 4
        ln(p4.outX, p4.outY, p4.outX, Y_RST_BUS);

        // Pull-up R_R: vertical from Y_RST_BUS up to VCC at p4.outX, but
        // running R inline would crowd the VCC rail label. Instead route
        // pull-up to a x just LEFT of pin 4: vertical from (p4.outX - 60,
        // Y_RST_BUS) up through R_R to VCC rail.
        var X_RR = p4.outX - 60;
        var Y_RR_T = Y_VCC + 20;
        var Y_RR_B = Y_RR_T + R_LEN;
        ln(p4.outX, Y_RST_BUS, X_RR, Y_RST_BUS);
        ln(X_RR, Y_RST_BUS, X_RR, Y_RR_B);
        vres(X_RR, Y_RR_T, Y_RR_B);
        ln(X_RR, Y_RR_T, X_RR, Y_VCC);
        dot(p4.outX, Y_RST_BUS);

        // RESET signal arrow into the bus from the right. The label is set
        // well past the arrow head so it does not overlap the shaft.
        ln(p4.outX, Y_RST_BUS, X_RST_R, Y_RST_BUS);
        arrow(X_RST_R + 50, X_RST_R, Y_RST_BUS, rstCol);
        window.renderKatex(svg, '\\overline{\\text{RESET}}',
            X_RST_R + 110, Y_RST_BUS,
            { width: 80, height: 20, size: 13, color: rstCol, align: 'left' });
        window.renderKatex(svg, 'R_R',
            X_RR - 38, (Y_RR_T + Y_RR_B) / 2,
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
            tip(X_NC - 18, p7.outY - 14, 50, 28,
                'Pin 7 (DISCH), open',
                'In bistable mode the discharge transistor has no role; pin 7 is left disconnected. The latch is driven directly through TRIG and RESET.');
            tip(X_NC - 18, p6.outY - 6, 36, 40,
                'Pin 6 (THRES), to GND',
                'Held permanently below &#8532;V<sub>CC</sub> so the upper comparator never fires. With the upper comparator inactive, the latch state is set only by external SET and RESET pulses on pins 2 and 4.');
            tip(X_TRIG - R_THICK, Y_RS_T - 6, R_THICK * 2 + 12, R_LEN + 12,
                'R<sub>S</sub>',
                'Pull-up on the SET input. Holds pin 2 above &#8531;V<sub>CC</sub> at rest; an active-low pulse on SET drives the lower comparator and latches the output high.');
            tip(X_RR - R_THICK, Y_RR_T - 6, R_THICK * 2 + 12, R_LEN + 12,
                'R<sub>R</sub>',
                'Pull-up on the RESET input. Holds pin 4 high so the latch is free to hold its state; an active-low pulse on RESET clears the latch and drives the output low.');
            tip(p3.outX - 4, p3.outY - 14, X_OUT_DOT - p3.outX + 8, 28,
                'v<sub>out</sub> (pin 3)',
                'Latched output. SET drives v<sub>out</sub> to V<sub>CC</sub> indefinitely; RESET drives it to 0 V indefinitely. Holds its last state in the absence of either pulse.');
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
