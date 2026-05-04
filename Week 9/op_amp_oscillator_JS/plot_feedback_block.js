// Section 01 · Feedback block diagram for the oscillator.
// Forward block A, feedback block beta(jw), summing junction with two + inputs,
// drawn in plain SVG with orthogonal connectors and KaTeX labels.
(function () {
    var sel = '#plot-feedback-block';

    var VB_W = 720;
    var VB_H = 340;

    // Layout constants (viewBox units)
    var SUM   = { cx: 170, cy: 140, r: 20 };
    var AMP   = { x: 250, y: 100, w: 130, h: 80 };          // forward gain block
    var FB    = { x: 270, y: 230, w: 130, h: 56 };          // feedback block
    var OUT_X = 640;                                         // output node x
    var TAP_X = 520;                                         // where output taps down

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var svg = root.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var wire = window.T.wire;
        var fill = window.CMP.cssVar('--bg-2');
        var text = window.T.text;
        var dim  = window.T.textDim;
        var accentSoft = window.CMP.cssVar('--accent-soft-faint');
        var accentEdge = window.CMP.cssVar('--accent-soft-edge');
        var stroke = 2;

        // Arrow marker
        var defs = svg.append('defs');
        defs.append('marker')
            .attr('id', 'arrowhead-block')
            .attr('viewBox', '0 0 10 10')
            .attr('refX', 8).attr('refY', 5)
            .attr('markerWidth', 7).attr('markerHeight', 7)
            .attr('orient', 'auto-start-reverse')
            .append('path')
                .attr('d', 'M0,0 L10,5 L0,10 z')
                .attr('fill', wire);

        // ── Forward amplifier block ──────────────────────────
        svg.append('rect')
            .attr('x', AMP.x).attr('y', AMP.y)
            .attr('width', AMP.w).attr('height', AMP.h)
            .attr('rx', 6).attr('ry', 6)
            .attr('fill', accentSoft)
            .attr('stroke', accentEdge)
            .attr('stroke-width', stroke);

        // ── Feedback block ───────────────────────────────────
        svg.append('rect')
            .attr('x', FB.x).attr('y', FB.y)
            .attr('width', FB.w).attr('height', FB.h)
            .attr('rx', 6).attr('ry', 6)
            .attr('fill', accentSoft)
            .attr('stroke', accentEdge)
            .attr('stroke-width', stroke);

        // ── Summing junction (circle) ────────────────────────
        svg.append('circle')
            .attr('cx', SUM.cx).attr('cy', SUM.cy).attr('r', SUM.r)
            .attr('fill', fill).attr('stroke', wire).attr('stroke-width', stroke);

        // ── Input wire (v_in) entering summing junction from left ───
        svg.append('line')
            .attr('x1', 50).attr('y1', SUM.cy)
            .attr('x2', SUM.cx - SUM.r).attr('y2', SUM.cy)
            .attr('stroke', wire).attr('stroke-width', stroke)
            .attr('marker-end', 'url(#arrowhead-block)');

        // ── Σ → forward block ────────────────────────────────
        svg.append('line')
            .attr('x1', SUM.cx + SUM.r).attr('y1', SUM.cy)
            .attr('x2', AMP.x).attr('y2', SUM.cy)
            .attr('stroke', wire).attr('stroke-width', stroke)
            .attr('marker-end', 'url(#arrowhead-block)');

        // ── forward block → output node ──────────────────────
        svg.append('line')
            .attr('x1', AMP.x + AMP.w).attr('y1', SUM.cy)
            .attr('x2', OUT_X).attr('y2', SUM.cy)
            .attr('stroke', wire).attr('stroke-width', stroke)
            .attr('marker-end', 'url(#arrowhead-block)');

        // ── tap-down at TAP_X to feedback block right side ───
        var fbInY = FB.y + FB.h / 2;
        var fbInX = FB.x + FB.w;
        svg.append('line')
            .attr('x1', TAP_X).attr('y1', SUM.cy)
            .attr('x2', TAP_X).attr('y2', fbInY)
            .attr('stroke', wire).attr('stroke-width', stroke);
        svg.append('line')
            .attr('x1', TAP_X).attr('y1', fbInY)
            .attr('x2', fbInX).attr('y2', fbInY)
            .attr('stroke', wire).attr('stroke-width', stroke)
            .attr('marker-end', 'url(#arrowhead-block)');

        // Tap dot
        svg.append('circle')
            .attr('cx', TAP_X).attr('cy', SUM.cy).attr('r', 4)
            .attr('fill', wire).attr('stroke', 'none');

        // ── feedback block → up to summing junction (bottom) ─
        var fbOutX = FB.x;
        svg.append('line')
            .attr('x1', fbOutX).attr('y1', fbInY)
            .attr('x2', SUM.cx).attr('y2', fbInY)
            .attr('stroke', wire).attr('stroke-width', stroke);
        svg.append('line')
            .attr('x1', SUM.cx).attr('y1', fbInY)
            .attr('x2', SUM.cx).attr('y2', SUM.cy + SUM.r)
            .attr('stroke', wire).attr('stroke-width', stroke)
            .attr('marker-end', 'url(#arrowhead-block)');

        // ── Plus signs inside summing junction ──────────────
        // Left input "+"
        var pY = SUM.cy;
        var pX = SUM.cx - SUM.r + 8;
        svg.append('text')
            .attr('x', pX).attr('y', pY - 6)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('fill', text).attr('font-size', 14)
            .attr('font-family', "'JetBrains Mono', monospace").text('+');
        // Bottom input "+"
        svg.append('text')
            .attr('x', SUM.cx + 8).attr('y', SUM.cy + SUM.r - 8)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('fill', text).attr('font-size', 14)
            .attr('font-family', "'JetBrains Mono', monospace").text('+');

        // ── KaTeX labels ─────────────────────────────────────
        // Forward block label A
        window.renderKatex(svg, 'A',
            AMP.x + AMP.w / 2, AMP.y + AMP.h / 2,
            { width: 60, height: 32, size: 22, color: text });

        // Feedback block label β(jω)
        window.renderKatex(svg, '\\beta(j\\omega)',
            FB.x + FB.w / 2, FB.y + FB.h / 2,
            { width: 110, height: 32, size: 18, color: text });

        // v_in (perturbation / start-up source) label, above input wire
        window.renderKatex(svg, 'v_\\text{in}',
            70, SUM.cy - 22,
            { width: 70, height: 22, size: 14, color: dim });

        // v_out label, above output wire near right end
        window.renderKatex(svg, 'v_\\text{out}',
            OUT_X - 30, SUM.cy - 22,
            { width: 80, height: 22, size: 14, color: text });

        // Loop gain annotation along feedback path
        window.renderKatex(svg, 'A\\,\\beta(j\\omega)',
            (FB.x + FB.w / 2), FB.y + FB.h + 26,
            { width: 140, height: 22, size: 13, color: dim });

        // Forward gain annotation above forward block
        window.renderKatex(svg, '\\text{forward gain}',
            AMP.x + AMP.w / 2, AMP.y - 14,
            { width: 160, height: 18, size: 11, color: dim });
        window.renderKatex(svg, '\\text{feedback network}',
            FB.x + FB.w / 2, FB.y - 14,
            { width: 180, height: 18, size: 11, color: dim });
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
