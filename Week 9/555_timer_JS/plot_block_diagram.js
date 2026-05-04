// Section 01 · Internal architecture of the 555 timer.
//
// Six functional blocks: a 5 kΩ-5 kΩ-5 kΩ resistive divider that fixes the
// thresholds at 1/3 V_CC and 2/3 V_CC; an upper comparator that resets the
// latch when v_THRES exceeds 2/3 V_CC; a lower comparator that sets the
// latch when v_TRIG falls below 1/3 V_CC; an SR latch with an active-low
// CLR fed by the RESET pin; an output buffer that drives the OUT pin;
// and an NPN discharge transistor that grounds the DISCH pin while the
// latch is in the reset state. CTRL exposes the 2/3 V_CC tap externally.
//
// Layout (viewBox 800 x 600):
//   x ~ 140       voltage divider column
//   x ~ 270..370  upper / lower comparators
//   x ~ 460..580  SR latch
//   x ~ 640..720  output buffer + discharge transistor
// Pin labels sit on the left edge (inputs) and right edge (outputs).
(function () {
    var sel = '#plot-block-diagram';

    var VB_W = 800, VB_H = 600;
    var Y_VCC = 80, Y_GND = 520;
    var X_RAIL_L = 80, X_RAIL_R = 740;
    var X_DIV = 140;
    var R_THICK = 14, R_LEN = 50;

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
        var blockFill = window.CMP.cssVar('--c-chip-fill') || T.fg(0.05);

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
        function ground(cx, cy) {
            ln(cx - 16, cy,      cx + 16, cy,      wire, 2.4);
            ln(cx - 11, cy + 6,  cx + 11, cy + 6,  wire, 2);
            ln(cx - 6,  cy + 12, cx + 6,  cy + 12, wire, 1.8);
        }
        function pinLabel(x, y, n, name, side, latex) {
            // Pin label at left or right edge with a stub into the diagram.
            // Pin number rendered as a tiny digit near the stub, function
            // name rendered as a larger label outside the stub.
            var dx = (side === 'left') ? 14 : -14;
            ln(x, y, x + dx, y, wire, 2);
            dot(x + dx, y);
            window.renderKatex(svg, String(n),
                x + (side === 'left' ? -8 : 8), y - 12,
                { width: 16, height: 12, size: 10, color: muted });
            window.renderKatex(svg, latex || ('\\mathrm{' + name + '}'),
                x + (side === 'left' ? -38 : 38), y,
                { width: 60, height: 18, size: 12, color: text,
                  align: side === 'left' ? 'right' : 'left' });
        }

        // Rails
        ln(X_RAIL_L, Y_VCC, X_RAIL_R, Y_VCC, vccCol, 2.6);
        ln(X_RAIL_L, Y_GND, X_RAIL_R, Y_GND, wire,   2.6);

        // Pin 8 (VCC) and pin 1 (GND) on the rails. Match the pinLabel
        // layout: tiny pin number near the stub, larger function name on
        // the outside.
        ln(X_RAIL_L - 14, Y_VCC, X_RAIL_L, Y_VCC, wire, 2);
        dot(X_RAIL_L, Y_VCC);
        window.renderKatex(svg, '8', X_RAIL_L - 8, Y_VCC - 12,
            { width: 16, height: 12, size: 10, color: muted });
        window.renderKatex(svg, 'V_{CC}', X_RAIL_L - 38, Y_VCC,
            { width: 60, height: 18, size: 12, color: text, align: 'right' });

        ln(X_RAIL_L - 14, Y_GND, X_RAIL_L, Y_GND, wire, 2);
        dot(X_RAIL_L, Y_GND);
        window.renderKatex(svg, '1', X_RAIL_L - 8, Y_GND - 12,
            { width: 16, height: 12, size: 10, color: muted });
        window.renderKatex(svg, '\\mathrm{GND}', X_RAIL_L - 38, Y_GND,
            { width: 60, height: 18, size: 12, color: text, align: 'right' });

        // Voltage divider at X_DIV
        // Connection points along the divider:
        //   y=80   VCC rail
        //   y=110..160  R_top (length 50)
        //   y=180  Tap A (2/3 V_CC) -- to upper comparator (-) and CTRL pin
        //   y=200..250  R_mid
        //   y=270  Tap B (1/3 V_CC) -- to lower comparator (+)
        //   y=290..340  R_bot
        //   y=520  GND rail
        var Y_RT_T = 110, Y_RT_B = 160;
        var Y_TAPA = 180;
        var Y_RM_T = 200, Y_RM_B = 250;
        var Y_TAPB = 270;
        var Y_RB_T = 290, Y_RB_B = 340;

        ln(X_DIV, Y_VCC, X_DIV, Y_RT_T);
        vres(X_DIV, Y_RT_T, Y_RT_B);
        ln(X_DIV, Y_RT_B, X_DIV, Y_RM_T);
        dot(X_DIV, Y_TAPA);
        vres(X_DIV, Y_RM_T, Y_RM_B);
        ln(X_DIV, Y_RM_B, X_DIV, Y_RB_T);
        dot(X_DIV, Y_TAPB);
        vres(X_DIV, Y_RB_T, Y_RB_B);
        ln(X_DIV, Y_RB_B, X_DIV, Y_GND);

        // Resistor labels (5 kΩ each)
        window.renderKatex(svg, '5\\,\\mathrm{k\\Omega}',
            X_DIV - 38, (Y_RT_T + Y_RT_B) / 2,
            { width: 60, height: 16, size: 11, color: muted });
        window.renderKatex(svg, '5\\,\\mathrm{k\\Omega}',
            X_DIV - 38, (Y_RM_T + Y_RM_B) / 2,
            { width: 60, height: 16, size: 11, color: muted });
        window.renderKatex(svg, '5\\,\\mathrm{k\\Omega}',
            X_DIV - 38, (Y_RB_T + Y_RB_B) / 2,
            { width: 60, height: 16, size: 11, color: muted });

        // Tap A label (2/3 V_CC), placed above its horizontal wire
        window.renderKatex(svg, '\\tfrac{2}{3}V_{CC}',
            X_DIV + 50, Y_TAPA - 18,
            { width: 80, height: 18, size: 12, color: text });
        // Tap B label (1/3 V_CC), placed above its horizontal wire to keep
        // it clear of the jog vertical at x = 220 that routes Tap B down
        // into the lower comparator's + input.
        window.renderKatex(svg, '\\tfrac{1}{3}V_{CC}',
            X_DIV + 50, Y_TAPB - 18,
            { width: 80, height: 18, size: 12, color: text });

        // ── External pin labels ──
        // Pin 5 (CTRL) connects directly to Tap A
        pinLabel(X_RAIL_L, Y_TAPA, 5, 'CTRL', 'left');
        ln(X_RAIL_L + 14, Y_TAPA, X_DIV, Y_TAPA);   // wire to tap A
        dot(X_DIV, Y_TAPA);

        // Pin 6 (THRES) → + input of upper comparator
        var Y_THRES = 260;
        pinLabel(X_RAIL_L, Y_THRES, 6, 'THRES', 'left');

        // Pin 2 (TRIG) → − input of lower comparator
        var Y_TRIG = 400;
        pinLabel(X_RAIL_L, Y_TRIG, 2, 'TRIG', 'left');

        // Pin 4 (RESET) → ~CLR of latch. Use the LaTeX overload to render
        // the active-low overline.
        var Y_RST = 470;
        pinLabel(X_RAIL_L, Y_RST, 4, 'RESET', 'left', '\\overline{\\mathrm{RESET}}');

        // ── Upper comparator (triangle, apex right) ──
        // − input = Tap A (top-left of triangle), + input = THRES (bottom-left)
        var UCOMP = { tl: [270, 160], bl: [270, 280], apex: [370, 220] };
        svg.append('polygon')
            .attr('points', UCOMP.tl.join(',') + ' ' + UCOMP.bl.join(',') + ' ' + UCOMP.apex.join(','))
            .attr('fill', blockFill).attr('stroke', wire).attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round');
        // + and − markers near the input edges
        window.renderKatex(svg, '-', UCOMP.tl[0] + 14, 180, { width: 14, height: 14, size: 13, color: text });
        window.renderKatex(svg, '+', UCOMP.bl[0] + 14, 260, { width: 14, height: 14, size: 13, color: text });
        // Wires into upper comparator
        ln(X_DIV, Y_TAPA, UCOMP.tl[0], 180);             // tap A → − input (y=180)
        // Tap A is at y=180 already; horizontal at y=180 from X_DIV to triangle
        ln(X_RAIL_L + 14, Y_THRES, UCOMP.bl[0], Y_THRES); // THRES → + input (y=260) crosses divider (no dot)

        // ── Lower comparator ──
        // + input = Tap B (top-left), − input = TRIG (bottom-left)
        var LCOMP = { tl: [270, 320], bl: [270, 440], apex: [370, 380] };
        svg.append('polygon')
            .attr('points', LCOMP.tl.join(',') + ' ' + LCOMP.bl.join(',') + ' ' + LCOMP.apex.join(','))
            .attr('fill', blockFill).attr('stroke', wire).attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round');
        window.renderKatex(svg, '+', LCOMP.tl[0] + 14, 340, { width: 14, height: 14, size: 13, color: text });
        window.renderKatex(svg, '-', LCOMP.bl[0] + 14, 420, { width: 14, height: 14, size: 13, color: text });

        // Tap B → + input of lower comparator (jog right then down)
        ln(X_DIV, Y_TAPB, 220, Y_TAPB);
        ln(220, Y_TAPB, 220, 340);
        ln(220, 340, LCOMP.tl[0], 340);
        // TRIG → − input of lower comparator (straight, crosses divider)
        ln(X_RAIL_L + 14, Y_TRIG, 240, Y_TRIG);
        ln(240, Y_TRIG, 240, 420);
        ln(240, 420, LCOMP.bl[0], 420);

        // ── SR latch (rectangle) ──
        var LATCH = { x: 460, y: 290, w: 120, h: 110 };
        svg.append('rect')
            .attr('x', LATCH.x).attr('y', LATCH.y)
            .attr('width', LATCH.w).attr('height', LATCH.h)
            .attr('rx', 6).attr('ry', 6)
            .attr('fill', blockFill).attr('stroke', wire).attr('stroke-width', 2);
        window.renderKatex(svg, '\\text{SR latch}',
            LATCH.x + LATCH.w / 2, LATCH.y + 14,
            { width: 100, height: 18, size: 12, color: text });

        // S, R, ~CLR, Q, ~Q labels and pin positions
        var S_y = 320, R_y = 380, CLR_y = LATCH.y + LATCH.h, Q_y = 320, NQ_y = 380;
        window.renderKatex(svg, 'S', LATCH.x + 14, S_y, { width: 16, height: 14, size: 11, color: text });
        window.renderKatex(svg, 'R', LATCH.x + 14, R_y, { width: 16, height: 14, size: 11, color: text });
        window.renderKatex(svg, '\\overline{\\mathrm{CLR}}',
            LATCH.x + LATCH.w / 2, CLR_y - 14,
            { width: 56, height: 16, size: 11, color: text });
        window.renderKatex(svg, 'Q', LATCH.x + LATCH.w - 14, Q_y, { width: 16, height: 14, size: 11, color: text });
        window.renderKatex(svg, '\\overline{Q}',
            LATCH.x + LATCH.w - 14, NQ_y, { width: 16, height: 14, size: 11, color: text });

        // Wires from comparators to latch:
        //   Lower comparator apex (370, 380) → S input (460, 320)
        //   Upper comparator apex (370, 220) → R input (460, 380)
        // Use jog routes that cross between comparators and latch.
        ln(LCOMP.apex[0], LCOMP.apex[1], 420, LCOMP.apex[1]);
        ln(420, LCOMP.apex[1], 420, S_y);
        ln(420, S_y, LATCH.x, S_y);

        ln(UCOMP.apex[0], UCOMP.apex[1], 430, UCOMP.apex[1]);
        ln(430, UCOMP.apex[1], 430, R_y);
        ln(430, R_y, LATCH.x, R_y);

        // RESET pin → ~CLR (path: pin → right past the latch's bottom edge → up)
        ln(X_RAIL_L + 14, Y_RST, LATCH.x + LATCH.w / 2, Y_RST);
        ln(LATCH.x + LATCH.w / 2, Y_RST, LATCH.x + LATCH.w / 2, CLR_y);

        // ── Output buffer (triangle, apex right) ──
        var OBUF = { tl: [630, 300], bl: [630, 340], apex: [690, 320] };
        svg.append('polygon')
            .attr('points', OBUF.tl.join(',') + ' ' + OBUF.bl.join(',') + ' ' + OBUF.apex.join(','))
            .attr('fill', blockFill).attr('stroke', wire).attr('stroke-width', 2)
            .attr('stroke-linejoin', 'round');
        // Q → buffer input
        ln(LATCH.x + LATCH.w, Q_y, OBUF.tl[0], Q_y);
        // buffer output → OUT pin (3) on the right edge
        ln(OBUF.apex[0], OBUF.apex[1], X_RAIL_R, OBUF.apex[1]);
        dot(X_RAIL_R, OBUF.apex[1]);
        window.renderKatex(svg, '3', X_RAIL_R + 8, OBUF.apex[1] - 12,
            { width: 16, height: 12, size: 10, color: muted });
        window.renderKatex(svg, '\\mathrm{OUT}', X_RAIL_R + 38, OBUF.apex[1],
            { width: 60, height: 18, size: 12, color: text, align: 'left' });

        // ── Discharge NPN transistor ──
        // Drawn as a circle with internal symbol. Base from latch ~Q, collector
        // up to DISCH pin (right edge), emitter down to GND rail.
        var TX_C = { x: 660, y: 430, r: 22 };
        svg.append('circle')
            .attr('cx', TX_C.x).attr('cy', TX_C.y).attr('r', TX_C.r)
            .attr('fill', blockFill).attr('stroke', wire).attr('stroke-width', 2);
        // Vertical base bar inside
        ln(TX_C.x, TX_C.y - 12, TX_C.x, TX_C.y + 12, wire, 2.6);
        // Base lead (horizontal in from left)
        ln(TX_C.x - TX_C.r, TX_C.y, TX_C.x, TX_C.y, wire, 2);
        // Collector lead (angled, from top of base bar to upper right of circle)
        ln(TX_C.x, TX_C.y - 6, TX_C.x + 14, TX_C.y - 14, wire, 2);
        // Continue collector outside the circle vertically up to DISCH pin level
        ln(TX_C.x + 14, TX_C.y - 14, TX_C.x + 14, TX_C.y - TX_C.r, wire, 2);
        // Emitter lead (angled, from bottom of base bar to lower right of circle, with arrow)
        ln(TX_C.x, TX_C.y + 6, TX_C.x + 14, TX_C.y + 14, wire, 2);
        // Emitter arrow head (NPN: arrow points OUT, away from base)
        svg.append('polygon')
            .attr('points',
                (TX_C.x + 14) + ',' + (TX_C.y + 14) + ' ' +
                (TX_C.x + 8) + ',' + (TX_C.y + 14) + ' ' +
                (TX_C.x + 14) + ',' + (TX_C.y + 8))
            .attr('fill', wire);
        // Continue emitter outside the circle down to GND rail
        ln(TX_C.x + 14, TX_C.y + 14, TX_C.x + 14, Y_GND, wire, 2);

        // Wire ~Q → base of transistor
        ln(LATCH.x + LATCH.w, NQ_y, TX_C.x - TX_C.r - 16, NQ_y);
        ln(TX_C.x - TX_C.r - 16, NQ_y, TX_C.x - TX_C.r - 16, TX_C.y);
        ln(TX_C.x - TX_C.r - 16, TX_C.y, TX_C.x - TX_C.r, TX_C.y);

        // Collector continues up and right to DISCH pin (7)
        var Y_DISCH = TX_C.y - TX_C.r - 30;
        ln(TX_C.x + 14, TX_C.y - TX_C.r, TX_C.x + 14, Y_DISCH);
        ln(TX_C.x + 14, Y_DISCH, X_RAIL_R, Y_DISCH);
        dot(X_RAIL_R, Y_DISCH);
        window.renderKatex(svg, '7', X_RAIL_R + 8, Y_DISCH - 12,
            { width: 16, height: 12, size: 10, color: muted });
        window.renderKatex(svg, '\\mathrm{DISCH}', X_RAIL_R + 38, Y_DISCH,
            { width: 60, height: 18, size: 12, color: text, align: 'left' });

        // Hover tooltips
        if (window.CircuitTip) {
            var CT = window.CircuitTip;
            function tip(x, y, w, h, name, body) {
                CT.hotspot(svg, x, y, w, h, CT.fmt(name, body));
            }
            tip(X_DIV - 22, Y_RT_T - 6, 44, (Y_RB_B - Y_RT_T) + 12,
                'Resistive divider',
                'Three nominally-identical 5 k&Omega; resistors set the upper threshold at &#8532;V<sub>CC</sub> and the lower threshold at &#8531;V<sub>CC</sub>. Both thresholds scale with V<sub>CC</sub>, so timing is independent of supply voltage.');
            tip(UCOMP.tl[0] - 6, UCOMP.tl[1] - 6,
                UCOMP.apex[0] - UCOMP.tl[0] + 12, UCOMP.bl[1] - UCOMP.tl[1] + 12,
                'Upper comparator',
                'Output goes high when v<sub>THRES</sub> exceeds &#8532;V<sub>CC</sub>. Drives the R input of the latch, which clears the latch and ends the high portion of the cycle.');
            tip(LCOMP.tl[0] - 6, LCOMP.tl[1] - 6,
                LCOMP.apex[0] - LCOMP.tl[0] + 12, LCOMP.bl[1] - LCOMP.tl[1] + 12,
                'Lower comparator',
                'Output goes high when v<sub>TRIG</sub> falls below &#8531;V<sub>CC</sub>. Drives the S input of the latch, setting Q and starting the high portion of the cycle.');
            tip(LATCH.x - 4, LATCH.y - 4, LATCH.w + 8, LATCH.h + 8,
                'SR latch',
                'Single-bit memory. S sets Q high, R clears Q low, and the active-low CLR input from RESET pin overrides both.');
            tip(OBUF.tl[0] - 6, OBUF.tl[1] - 6,
                OBUF.apex[0] - OBUF.tl[0] + 12, OBUF.bl[1] - OBUF.tl[1] + 12,
                'Output buffer',
                'Drives the OUT pin from the latch state Q. Bipolar 555 variants source and sink up to ~200 mA so the OUT pin can drive small loads directly.');
            tip(TX_C.x - TX_C.r - 6, TX_C.y - TX_C.r - 6,
                TX_C.r * 2 + 12, TX_C.r * 2 + 12,
                'Discharge transistor',
                'NPN that grounds the DISCH pin while the latch is in the reset state. External timing capacitors connect to DISCH so the transistor sinks their charge during the low portion of the cycle.');
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
