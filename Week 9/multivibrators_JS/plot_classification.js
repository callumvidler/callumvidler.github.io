// Section 01 · Three side-by-side panels showing the conceptual state
// diagram of each multivibrator family. Each panel shows the two output
// rails as horizontal bars and indicates which are stable, which are
// quasi-stable, and what causes a transition.
(function () {
    var sel = '#plot-classification';

    var VB_W = 900;
    var VB_H = 520;

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var svg = root.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var T = window.T;
        var text = T.text;
        var dim = T.textDim;
        var muted = T.textMuted;
        var grid = T.gridLight;
        var axis = T.gridAxis;
        var hi = window.CMP.cssVar('--c-output');
        var lo = window.CMP.cssVar('--c-cap');
        var trig = window.CMP.cssVar('--c-trigger');
        var rail = window.CMP.cssVar('--c-rail');

        var pad = 32;
        var panelW = (VB_W - 4 * pad) / 3;
        var panelH = VB_H - 110;
        var panelY = 70;

        var panels = [
            { x: pad, title: 'Bistable', subtitle: '2 stable states',
              path: bistablePath },
            { x: pad * 2 + panelW, title: 'Monostable', subtitle: '1 stable, 1 quasi-stable',
              path: monostablePath },
            { x: pad * 3 + panelW * 2, title: 'Astable', subtitle: '0 stable states',
              path: astablePath }
        ];

        panels.forEach(function (p) {
            // Panel border
            svg.append('rect')
                .attr('x', p.x).attr('y', panelY)
                .attr('width', panelW).attr('height', panelH)
                .attr('fill', 'none')
                .attr('stroke', grid)
                .attr('stroke-width', 1)
                .attr('rx', 6);

            // Panel title and subtitle
            window.renderKatex(svg, '\\text{' + p.title + '}',
                p.x + panelW / 2, panelY - 36,
                { width: panelW, height: 22, size: 16, color: text });
            window.renderKatex(svg, '\\text{' + p.subtitle + '}',
                p.x + panelW / 2, panelY - 16,
                { width: panelW, height: 18, size: 11, color: muted });

            // Trace span. Reserve room on the left for the rail labels so
            // they sit clear of any state labels on the trace itself.
            var hiY = panelY + panelH * 0.32;
            var loY = panelY + panelH * 0.72;
            var x0  = p.x + 60;
            var x1  = p.x + panelW - 18;

            // Rail dashed lines
            [hiY, loY].forEach(function (y) {
                svg.append('line')
                    .attr('x1', x0).attr('x2', x1)
                    .attr('y1', y).attr('y2', y)
                    .attr('stroke', rail)
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '3 4');
            });

            // Rail labels, anchored to the left margin of each panel.
            window.renderKatex(svg, '+V_\\text{sat}',
                p.x + 30, hiY - 12,
                { width: 52, height: 14, size: 11, color: hi, align: 'right' });
            window.renderKatex(svg, '-V_\\text{sat}',
                p.x + 30, loY + 12,
                { width: 52, height: 14, size: 11, color: lo, align: 'right' });

            // Caller draws the trajectory and any state / trigger overlays.
            p.path(svg, p.x, panelY, panelW, panelH, hiY, loY, x0, x1,
                   { hi: hi, lo: lo, trig: trig, dim: dim, muted: muted, axis: axis });
        });

        // Legend
        var legY = VB_H - 22;
        var legends = [
            { c: hi, text: 'output trace' },
            { c: trig, text: 'external trigger' },
            { c: rail, text: 'saturation rail' }
        ];
        var legX = pad;
        legends.forEach(function (item) {
            svg.append('line')
                .attr('x1', legX).attr('x2', legX + 22)
                .attr('y1', legY).attr('y2', legY)
                .attr('stroke', item.c).attr('stroke-width', 2.4);
            window.renderKatex(svg, '\\text{' + item.text + '}',
                legX + 24 + 50, legY,
                { width: 110, height: 18, size: 11, color: muted, align: 'left' });
            legX += 22 + 110 + 28;
        });
    }

    // Bistable: output stays at one rail until a single trigger flips it.
    function bistablePath(svg, px, py, w, h, hiY, loY, x0, x1, c) {
        var span = x1 - x0;
        var trigX = x0 + span * 0.55;
        var path = 'M ' + x0 + ' ' + loY +
                   ' L ' + trigX + ' ' + loY +
                   ' L ' + trigX + ' ' + hiY +
                   ' L ' + x1 + ' ' + hiY;
        svg.append('path').attr('d', path)
            .attr('stroke', c.hi).attr('stroke-width', 2.6)
            .attr('fill', 'none').attr('stroke-linejoin', 'round');

        // Trigger marker: short arrow above the high rail, offset to the
        // left of the vertical leg so it never sits on top of the trace.
        defineArrow(svg, 'arrow-trig-bi', c.trig);
        var arrX = trigX - 18;
        svg.append('line')
            .attr('x1', arrX).attr('x2', arrX)
            .attr('y1', hiY - 42).attr('y2', hiY - 6)
            .attr('stroke', c.trig).attr('stroke-width', 1.8)
            .attr('marker-end', 'url(#arrow-trig-bi)');
        window.renderKatex(svg, '\\text{trigger}',
            arrX, hiY - 54,
            { width: 70, height: 14, size: 11, color: c.trig });

        // State labels — only on the horizontal segments.
        window.renderKatex(svg, '\\text{state A}',
            (x0 + trigX) / 2, loY + 22,
            { width: 80, height: 14, size: 11, color: c.muted });
        window.renderKatex(svg, '\\text{state B}',
            (trigX + x1) / 2, hiY - 22,
            { width: 80, height: 14, size: 11, color: c.muted });
    }

    // Monostable: rest at one rail, trigger jumps to the other rail for a
    // fixed time T = RC ln(1/(1-β)), then auto-returns.
    function monostablePath(svg, px, py, w, h, hiY, loY, x0, x1, c) {
        var span = x1 - x0;
        var trigX = x0 + span * 0.25;
        var returnX = x0 + span * 0.75;
        var path = 'M ' + x0 + ' ' + hiY +
                   ' L ' + trigX + ' ' + hiY +
                   ' L ' + trigX + ' ' + loY +
                   ' L ' + returnX + ' ' + loY +
                   ' L ' + returnX + ' ' + hiY +
                   ' L ' + x1 + ' ' + hiY;
        svg.append('path').attr('d', path)
            .attr('stroke', c.hi).attr('stroke-width', 2.6)
            .attr('fill', 'none').attr('stroke-linejoin', 'round');

        // Trigger marker: short arrow above the high rail, offset to the
        // RIGHT of the vertical leg (the "stable" label sits on the high
        // rail to the left of trigX, so the arrow is clear on the right).
        defineArrow(svg, 'arrow-trig-mono', c.trig);
        var arrX = trigX + 18;
        svg.append('line')
            .attr('x1', arrX).attr('x2', arrX)
            .attr('y1', hiY - 42).attr('y2', hiY - 6)
            .attr('stroke', c.trig).attr('stroke-width', 1.8)
            .attr('marker-end', 'url(#arrow-trig-mono)');
        window.renderKatex(svg, '\\text{trigger}',
            arrX, hiY - 54,
            { width: 70, height: 14, size: 11, color: c.trig });

        // Period bracket: spans the low-rail interval, sits below it.
        defineArrow(svg, 'arrow-T-mono-l', c.dim, true);
        defineArrow(svg, 'arrow-T-mono-r', c.dim);
        var midX = (trigX + returnX) / 2;
        svg.append('line')
            .attr('x1', trigX + 4).attr('x2', returnX - 4)
            .attr('y1', loY + 18).attr('y2', loY + 18)
            .attr('stroke', c.dim).attr('stroke-width', 1)
            .attr('marker-start', 'url(#arrow-T-mono-l)')
            .attr('marker-end', 'url(#arrow-T-mono-r)');
        window.renderKatex(svg, 'T = RC\\,\\ln\\frac{1}{1-\\beta}',
            midX, loY + 38,
            { width: 170, height: 22, size: 12, color: c.dim });

        // State labels — placed on horizontal segments, narrow enough that
        // the vertical legs sit just outside their bounding boxes.
        window.renderKatex(svg, '\\text{stable}',
            (x0 + trigX) / 2, hiY - 22,
            { width: 70, height: 14, size: 11, color: c.muted });
        window.renderKatex(svg, '\\text{quasi-stable}',
            midX, loY - 22,
            { width: 90, height: 14, size: 11, color: c.muted });
    }

    // Astable: continuous toggling between the rails, no triggers.
    function astablePath(svg, px, py, w, h, hiY, loY, x0, x1, c) {
        var n = 4;
        var step = (x1 - x0) / n;
        var path = 'M ' + x0 + ' ' + loY;
        for (var i = 0; i < n; i++) {
            var xL = x0 + i * step;
            var xR = x0 + (i + 1) * step;
            var topY = (i % 2 === 0) ? hiY : loY;
            path += ' L ' + xL + ' ' + topY;
            path += ' L ' + xR + ' ' + topY;
        }
        svg.append('path').attr('d', path)
            .attr('stroke', c.hi).attr('stroke-width', 2.6)
            .attr('fill', 'none').attr('stroke-linejoin', 'round');

        // Period bracket spans one full cycle.
        defineArrow(svg, 'arrow-T-ast-l', c.dim, true);
        defineArrow(svg, 'arrow-T-ast-r', c.dim);
        var x2 = x0 + step;
        var x4 = x0 + 3 * step;
        svg.append('line')
            .attr('x1', x2 + 4).attr('x2', x4 - 4)
            .attr('y1', loY + 18).attr('y2', loY + 18)
            .attr('stroke', c.dim).attr('stroke-width', 1)
            .attr('marker-start', 'url(#arrow-T-ast-l)')
            .attr('marker-end', 'url(#arrow-T-ast-r)');
        window.renderKatex(svg, 'T',
            (x2 + x4) / 2, loY + 36,
            { width: 28, height: 18, size: 13, color: c.dim });

        // State summary above the trace, in the empty band between the
        // panel title and the high rail.
        window.renderKatex(svg, '\\text{both rails quasi-stable}',
            (x0 + x1) / 2, py + 32,
            { width: 200, height: 14, size: 11, color: c.muted });
    }

    function defineArrow(svg, id, color, reverse) {
        var defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
        if (!defs.select('#' + id).empty()) return;
        var marker = defs.append('marker')
            .attr('id', id)
            .attr('viewBox', '0 0 10 10')
            .attr('refX', reverse ? 0 : 10).attr('refY', 5)
            .attr('markerWidth', 7).attr('markerHeight', 7)
            .attr('orient', reverse ? 'auto-start-reverse' : 'auto');
        marker.append('path')
            .attr('d', reverse ? 'M 10 0 L 0 5 L 10 10 z' : 'M 0 0 L 10 5 L 0 10 z')
            .attr('fill', color);
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
