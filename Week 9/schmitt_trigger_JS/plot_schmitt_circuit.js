// Section 01 · Static reference schematic of the non-inverting Schmitt
// trigger. The signal of interest enters through R_1 to the
// non-inverting input. R_2 returns a fraction of the output to the same
// node, providing the positive feedback that gives hysteresis. The
// inverting input is grounded.
(function () {
    var sel = '#plot-schmitt-circuit';

    var VB_W = 800;
    var VB_H = 400;

    // Op-amp triangle, +input on top, -input on bottom.
    var TRI = {
        topLeft: [390, 160],
        botLeft: [390, 280],
        apex:    [510, 220]
    };
    var Y_PLUS  = 184;
    var Y_MINUS = 256;

    var X_VIN_DOT  = 60;
    var X_R1_L     = 140, X_R1_R = 220;
    var X_NODE     = 340;
    var X_R2_L     = 440, X_R2_R = 520;
    var Y_R2       = 80;
    var X_OUT_TAP  = 620;
    var X_VOUT_DOT = 700;
    var R_THICK    = 14;

    var X_GND = 350, Y_GND = 320;

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var svg = root.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var wire   = window.T.wire;
        var fill   = window.CMP.cssVar('--bg-2');
        var text   = window.T.text;
        var dim    = window.T.textDim;
        var rcol   = window.CMP.cssVar('--c-resistor');
        var stroke = 2;

        function ln(x1, y1, x2, y2, color, w) {
            svg.append('line')
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', color || wire)
                .attr('stroke-width', w || stroke)
                .attr('stroke-linecap', 'square');
        }
        function dot(cx, cy, color) {
            svg.append('circle')
                .attr('cx', cx).attr('cy', cy).attr('r', 4)
                .attr('fill', color || wire).attr('stroke', 'none');
        }

        // ── Op-amp triangle ──
        svg.append('polygon')
            .attr('points', [TRI.topLeft, TRI.botLeft, TRI.apex]
                .map(function (p) { return p.join(','); }).join(' '))
            .attr('fill', fill)
            .attr('stroke', wire)
            .attr('stroke-width', stroke)
            .attr('stroke-linejoin', 'round');

        // +/- pin markers
        ln(404 - 7, Y_PLUS, 404 + 7, Y_PLUS, text);
        ln(404, Y_PLUS - 7, 404, Y_PLUS + 7, text);
        ln(404 - 7, Y_MINUS, 404 + 7, Y_MINUS, text);

        // ── v_in path ──
        ln(X_VIN_DOT, Y_PLUS, X_R1_L, Y_PLUS);
        ln(X_R1_R, Y_PLUS, TRI.topLeft[0], Y_PLUS);
        dot(X_VIN_DOT, Y_PLUS);
        // R_1 rectangle
        svg.append('rect')
            .attr('x', X_R1_L).attr('y', Y_PLUS - R_THICK / 2)
            .attr('width', X_R1_R - X_R1_L).attr('height', R_THICK)
            .attr('fill', rcol)
            .attr('stroke', wire).attr('stroke-width', 1.2);

        // ── Feedback path ──
        ln(X_NODE, Y_PLUS, X_NODE, Y_R2);
        ln(X_NODE, Y_R2, X_R2_L, Y_R2);
        ln(X_R2_R, Y_R2, X_OUT_TAP, Y_R2);
        ln(X_OUT_TAP, Y_R2, X_OUT_TAP, TRI.apex[1]);
        // R_2 rectangle
        svg.append('rect')
            .attr('x', X_R2_L).attr('y', Y_R2 - R_THICK / 2)
            .attr('width', X_R2_R - X_R2_L).attr('height', R_THICK)
            .attr('fill', rcol)
            .attr('stroke', wire).attr('stroke-width', 1.2);

        // ── Output wire ──
        ln(TRI.apex[0], TRI.apex[1], X_OUT_TAP, TRI.apex[1]);
        ln(X_OUT_TAP, TRI.apex[1], X_VOUT_DOT, TRI.apex[1]);
        dot(X_VOUT_DOT, TRI.apex[1]);
        dot(X_OUT_TAP, TRI.apex[1]);

        // ── Junction dot at node A ──
        dot(X_NODE, Y_PLUS);

        // ── (-) input to GND ──
        ln(TRI.topLeft[0], Y_MINUS, X_GND, Y_MINUS);
        ln(X_GND, Y_MINUS, X_GND, Y_GND - 6);
        // Ground symbol (three horizontal lines)
        ln(X_GND - 18, Y_GND,      X_GND + 18, Y_GND,      wire, 2.4);
        ln(X_GND - 12, Y_GND + 7,  X_GND + 12, Y_GND + 7,  wire, 2);
        ln(X_GND - 6,  Y_GND + 14, X_GND + 6,  Y_GND + 14, wire, 1.8);

        // ── Labels (KaTeX) ──
        // R_1, R_2 inside their rectangles
        window.renderKatex(svg, 'R_1',
            (X_R1_L + X_R1_R) / 2, Y_PLUS,
            { width: 36, height: 22, size: 14, color: text });
        window.renderKatex(svg, 'R_2',
            (X_R2_L + X_R2_R) / 2, Y_R2,
            { width: 36, height: 22, size: 14, color: text });
        // V_+ tap label below node A
        window.renderKatex(svg, 'V_+',
            X_NODE, Y_PLUS + 22,
            { width: 36, height: 20, size: 13, color: dim });
        // Terminal labels
        window.renderKatex(svg, 'v_\\text{in}',
            X_VIN_DOT - 26, Y_PLUS,
            { width: 50, height: 24, size: 16, color: text });
        window.renderKatex(svg, 'v_\\text{out}',
            X_VOUT_DOT + 32, TRI.apex[1],
            { width: 60, height: 24, size: 16, color: text });
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
