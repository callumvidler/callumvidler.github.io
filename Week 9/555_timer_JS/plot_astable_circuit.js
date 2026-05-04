// Section 02 · 555 in astable mode. R1 from VCC to DISCH (pin 7), R2 from
// DISCH to the THRES/TRIG node (pins 6 and 2 tied externally), and timing
// capacitor C from that node to ground. CTRL bypassed via 10 nF; RESET
// tied to VCC. Output appears on pin 3.
(function () {
    var sel = '#plot-astable-circuit';

    var VB_W = 800, VB_H = 600;
    var Y_VCC = 80, Y_GND = 540;
    var X_RAIL_L = 140, X_RAIL_R = 660;
    var R_THICK = 14, R_LEN = 70;

    var X_TIMING = 292;          // vertical wire that holds R1, R2, pin 7, pin 6, pin 2, C

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

        // Rails
        ln(X_RAIL_L, Y_VCC, X_RAIL_R, Y_VCC, vccCol, 2.6);
        ln(X_RAIL_L, Y_GND, X_RAIL_R, Y_GND, wire,   2.6);
        window.renderKatex(svg, 'V_{CC}', X_RAIL_R - 60, Y_VCC - 18,
            { width: 56, height: 20, size: 13, color: text });
        ground(X_RAIL_R - 30, Y_GND + 6);

        // Chip
        var chip = window.Chip555.draw(svg);

        // Pin coordinates
        var p1 = chip.pin(1), p2 = chip.pin(2), p3 = chip.pin(3),
            p4 = chip.pin(4), p5 = chip.pin(5), p6 = chip.pin(6),
            p7 = chip.pin(7), p8 = chip.pin(8);

        // Pin 8 (VCC) up to VCC rail
        ln(p8.outX, p8.outY, p8.outX, Y_VCC);
        // Pin 4 (RESET) up to VCC rail (tied high)
        ln(p4.outX, p4.outY, p4.outX, Y_VCC);
        // Pin 1 (GND) down to GND rail
        ln(p1.outX, p1.outY, p1.outX, Y_GND);

        // Pin 5 (CTRL) bypass: 10 nF cap from pin 5 to GND rail
        var Y_CB = 505;
        ln(p5.outX, p5.outY, p5.outX, Y_CB - 14);
        capV(p5.outX, Y_CB);
        ln(p5.outX, Y_CB + 14, p5.outX, Y_GND);

        // Timing column at X_TIMING:
        //   VCC rail (y=80) -> R1 -> pin 7 (y=230) -> R2 -> pin 6 (y=310)
        //   pin 6 -> pin 2 (y=390) directly (THRES tied to TRIG)
        //   pin 2 -> C -> GND rail
        var Y_R1_T = 120, Y_R1_B = 190;
        var Y_R2_T = 235, Y_R2_B = 305;
        var Y_C   = 465;

        // pin 7, pin 6, pin 2 stubs already drawn by Chip555.draw().
        // Connect their outer endpoints into the X_TIMING vertical column.
        ln(p7.outX, p7.outY, X_TIMING, p7.outY);
        ln(p6.outX, p6.outY, X_TIMING, p6.outY);
        ln(p2.outX, p2.outY, X_TIMING, p2.outY);

        // Vertical column wires:
        ln(X_TIMING, Y_VCC, X_TIMING, Y_R1_T);
        vres(X_TIMING, Y_R1_T, Y_R1_B);
        ln(X_TIMING, Y_R1_B, X_TIMING, p7.outY);
        dot(X_TIMING, p7.outY);

        ln(X_TIMING, p7.outY, X_TIMING, Y_R2_T);
        vres(X_TIMING, Y_R2_T, Y_R2_B);
        ln(X_TIMING, Y_R2_B, X_TIMING, p6.outY);
        dot(X_TIMING, p6.outY);

        ln(X_TIMING, p6.outY, X_TIMING, p2.outY);
        dot(X_TIMING, p2.outY);

        ln(X_TIMING, p2.outY, X_TIMING, Y_C - 14);
        capV(X_TIMING, Y_C);
        ln(X_TIMING, Y_C + 14, X_TIMING, Y_GND);

        // Pin 3 (OUT) to output dot and label
        var X_OUT_DOT = 640;
        ln(p3.outX, p3.outY, X_OUT_DOT, p3.outY);
        dot(X_OUT_DOT, p3.outY);
        window.renderKatex(svg, 'v_{\\text{out}}',
            X_OUT_DOT + 50, p3.outY,
            { width: 70, height: 22, size: 16, color: text });

        // Component labels (placed clear of the resistor and capacitor symbols)
        window.renderKatex(svg, 'R_1',
            X_TIMING - 40, (Y_R1_T + Y_R1_B) / 2,
            { width: 36, height: 20, size: 14, color: text });
        window.renderKatex(svg, 'R_2',
            X_TIMING - 40, (Y_R2_T + Y_R2_B) / 2,
            { width: 36, height: 20, size: 14, color: text });
        window.renderKatex(svg, 'C',
            X_TIMING - 40, Y_C,
            { width: 28, height: 20, size: 14, color: text });
        window.renderKatex(svg, '10\\,\\mathrm{nF}',
            p5.outX + 60, Y_CB,
            { width: 64, height: 18, size: 11, color: muted });

        // Hover tooltips
        if (window.CircuitTip) {
            var CT = window.CircuitTip;
            function tip(x, y, w, h, name, body) {
                CT.hotspot(svg, x, y, w, h, CT.fmt(name, body));
            }
            tip(X_TIMING - R_THICK, Y_R1_T - 6, R_THICK * 2 + 12, R_LEN + 12,
                'R<sub>1</sub>',
                'Charging-path resistor between V<sub>CC</sub> and the discharge pin. The capacitor charges through R<sub>1</sub>+R<sub>2</sub> and discharges through R<sub>2</sub> alone, which fixes the duty cycle above 50%.');
            tip(X_TIMING - R_THICK, Y_R2_T - 6, R_THICK * 2 + 12, R_LEN + 12,
                'R<sub>2</sub>',
                'Resistor between the discharge pin and the timing node. Carries charge current with R<sub>1</sub> on the rising portion of v<sub>C</sub>, and discharge current alone on the falling portion.');
            tip(X_TIMING - 18, Y_C - 16, 36, 32,
                'C',
                'Timing capacitor. v<sub>C</sub> oscillates between &#8531;V<sub>CC</sub> and &#8532;V<sub>CC</sub>; the time taken to traverse this band sets the period T = ln(2)(R<sub>1</sub>+2R<sub>2</sub>)C.');
            tip(p3.outX - 4, p3.outY - 14, X_OUT_DOT - p3.outX + 8, 28,
                'v<sub>out</sub> (pin 3)',
                'Square-wave output. High while the capacitor charges, low while it discharges; 0&nbsp;V or V<sub>CC</sub> with no intermediate values.');
            tip(p5.outX - 18, Y_CB - 18, 36, 36,
                '10 nF bypass',
                'Decouples the internal divider node at the CTRL pin. Without it, supply noise modulates both thresholds and produces frequency jitter on the output.');
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
