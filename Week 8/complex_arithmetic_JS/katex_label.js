// KaTeX-into-SVG helper. Inlined here per the file_layout convention:
// promote to /components/ on second use.
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
        return fo;
    };
})();
