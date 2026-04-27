// KaTeX-into-SVG helper. Inlined per the file_layout convention.
(function () {
    window.renderKatex = function (parent, latex, x, y, opts) {
        opts = opts || {};
        var w = opts.width || 200;
        var h = opts.height || 28;
        var fo = parent.append('foreignObject')
            .attr('x', x - w / 2).attr('y', y - h / 2)
            .attr('width', w).attr('height', h)
            .style('overflow', 'visible');
        if (opts.rotate) {
            fo.attr('transform', 'rotate(' + opts.rotate + ' ' + x + ' ' + y + ')');
        }

        if (opts.pill) {
            // Pill mode: outer container is a full-size flex centring frame
            // anchored on (x, y); inner pill is inline-block with no-wrap so
            // it auto-sizes to its content and the text is never clipped.
            var holder = fo.append('xhtml:div')
                .style('width', '100%')
                .style('height', '100%')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('justify-content', 'center');
            var pill = holder.append('xhtml:div')
                .style('color', opts.color || '#1a1a1e')
                .style('font-size', (opts.size || 14) + 'px')
                .style('line-height', '1')
                .style('white-space', 'nowrap')
                .style('display', 'inline-block')
                .style('background', opts.pillBg || 'rgba(255,255,255,0.96)')
                .style('border', '1px solid rgba(0,0,0,0.18)')
                .style('border-radius', '999px')
                .style('padding', opts.pillPad || '2px 8px')
                .style('box-shadow', '0 1px 2px rgba(0,0,0,0.18)');
            if (window.katex) {
                window.katex.render(latex, pill.node(), { throwOnError: false, displayMode: !!opts.display });
            } else {
                pill.text(latex);
            }
        } else {
            var div = fo.append('xhtml:div')
                .style('color', opts.color || window.T.text)
                .style('text-align', 'center')
                .style('font-size', (opts.size || 14) + 'px')
                .style('width', '100%')
                .style('height', '100%')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('justify-content', 'center')
                .style('line-height', '1');
            if (window.katex) {
                window.katex.render(latex, div.node(), { throwOnError: false, displayMode: !!opts.display });
            } else {
                div.text(latex);
            }
        }
        return fo;
    };
})();
