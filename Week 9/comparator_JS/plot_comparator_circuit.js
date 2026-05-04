// Section 01 · Basic op-amp comparator schematic, drawn in D3 SVG.
// The CircuiTikZ source for the same diagram lives alongside this file in
// comparator_circuit.tex for offline LaTeX rendering. This script reproduces
// it in plain SVG so the circuit honours the project conventions: orthogonal
// wires, theme-aware strokes, KaTeX labels.
(function () {
    var sel = '#plot-comparator-circuit';

    // Logical layout in viewBox units. The viewBox is sized so the diagram
    // sits comfortably inside the .plot-box.circuit aspect ratio (2.2 / 1).
    var VB_W = 700;
    var VB_H = 320;

    // Op-amp triangle (apex on the right). Coordinates chosen to centre the
    // schematic with room for input labels on the left and output on the right.
    var TRI = {
        topLeft:  [260,  80],
        botLeft:  [260, 240],
        apex:     [440, 160]
    };
    // Input pin y-coordinates on the left edge of the triangle.
    var Y_INV   = 115;   // inverting input (top)
    var Y_NINV  = 205;   // non-inverting input (bottom)

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var svg = root.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var wire   = window.T.wire;
        var fill   = window.CMP.cssVar('--bg-2');
        var text   = window.T.text;
        var dim    = window.T.textDim;
        var stroke = 2;

        // ── Op-amp triangle ───────────────────────────────────────────
        svg.append('polygon')
            .attr('points', [TRI.topLeft, TRI.botLeft, TRI.apex]
                .map(function (p) { return p.join(','); }).join(' '))
            .attr('fill', fill)
            .attr('stroke', wire)
            .attr('stroke-width', stroke)
            .attr('stroke-linejoin', 'round');

        // ── Input pin stubs (drawn from the wire end up to the triangle edge)
        // Inverting input wire: from left to triangle pin
        svg.append('line')
            .attr('x1', 130).attr('y1', Y_INV)
            .attr('x2', TRI.topLeft[0]).attr('y2', Y_INV)
            .attr('stroke', wire).attr('stroke-width', stroke)
            .attr('stroke-linecap', 'square');
        // Non-inverting input wire
        svg.append('line')
            .attr('x1', 130).attr('y1', Y_NINV)
            .attr('x2', TRI.topLeft[0]).attr('y2', Y_NINV)
            .attr('stroke', wire).attr('stroke-width', stroke)
            .attr('stroke-linecap', 'square');

        // ── +/− pin markers, drawn just inside the triangle edge ──────
        // Minus sign (inverting)
        svg.append('line')
            .attr('x1', TRI.topLeft[0] + 10).attr('y1', Y_INV)
            .attr('x2', TRI.topLeft[0] + 22).attr('y2', Y_INV)
            .attr('stroke', text).attr('stroke-width', 2)
            .attr('stroke-linecap', 'round');
        // Plus sign (non-inverting)
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

        // ── Output wire ──────────────────────────────────────────────
        svg.append('line')
            .attr('x1', TRI.apex[0]).attr('y1', TRI.apex[1])
            .attr('x2', 600).attr('y2', TRI.apex[1])
            .attr('stroke', wire).attr('stroke-width', stroke)
            .attr('stroke-linecap', 'square');

        // ── Supply rails ──────────────────────────────────────────────
        // Compute where the rails leave the triangle edges.
        // Top edge runs from topLeft to apex; bottom edge from apex to botLeft.
        var supplyX = 320;
        var topEdgeY = TRI.topLeft[1] + (supplyX - TRI.topLeft[0]) /
            (TRI.apex[0] - TRI.topLeft[0]) * (TRI.apex[1] - TRI.topLeft[1]);
        var botEdgeY = TRI.botLeft[1] + (supplyX - TRI.botLeft[0]) /
            (TRI.apex[0] - TRI.botLeft[0]) * (TRI.apex[1] - TRI.botLeft[1]);

        svg.append('line')
            .attr('x1', supplyX).attr('y1', topEdgeY)
            .attr('x2', supplyX).attr('y2', 50)
            .attr('stroke', wire).attr('stroke-width', stroke)
            .attr('stroke-linecap', 'square');
        svg.append('line')
            .attr('x1', supplyX).attr('y1', botEdgeY)
            .attr('x2', supplyX).attr('y2', 270)
            .attr('stroke', wire).attr('stroke-width', stroke)
            .attr('stroke-linecap', 'square');

        // ── Terminal dots at input and output wire ends ───────────────
        function dot(cx, cy) {
            svg.append('circle')
                .attr('cx', cx).attr('cy', cy).attr('r', 4)
                .attr('fill', wire).attr('stroke', 'none');
        }
        dot(130, Y_INV);
        dot(130, Y_NINV);
        dot(600, TRI.apex[1]);

        // ── Labels (KaTeX) ────────────────────────────────────────────
        // Input labels sit to the left of the terminal dots.
        window.renderKatex(svg, 'V_\\text{ref}',
            85, Y_INV,
            { width: 80, height: 24, size: 16, color: text });
        window.renderKatex(svg, 'v_\\text{in}',
            85, Y_NINV,
            { width: 80, height: 24, size: 16, color: text });

        // Output label sits to the right of the terminal dot.
        window.renderKatex(svg, 'v_\\text{out}',
            645, TRI.apex[1],
            { width: 90, height: 24, size: 16, color: text });

        // Supply rail labels sit above and below the rail terminations.
        window.renderKatex(svg, 'V_{CC}^{+}',
            supplyX, 30,
            { width: 90, height: 24, size: 14, color: dim });
        window.renderKatex(svg, 'V_{CC}^{-}',
            supplyX, 295,
            { width: 90, height: 24, size: 14, color: dim });
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
