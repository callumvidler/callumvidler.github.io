// Shared tooltip helper for circuit diagrams. Owns a single fixed-position
// DOM element that is shown / positioned / hidden in response to hover
// events on SVG selections. Pages call `window.CircuitTip.attach(selection,
// html)` or `window.CircuitTip.hotspot(svg, x, y, w, h, html)` to wire a
// description onto a component drawing.
//
// Style is defined in components/circuit_tooltip.css. Pages that consume
// this helper must link both files.
(function () {
    if (window.CircuitTip) return;

    var tip = null;

    function ensure() {
        if (tip) return tip;
        tip = document.createElement('div');
        tip.className = 'circuit-tooltip';
        tip.setAttribute('role', 'tooltip');
        tip.setAttribute('aria-hidden', 'true');
        document.body.appendChild(tip);
        return tip;
    }

    function position(ev) {
        if (!tip) return;
        var pad = 14;
        var w = tip.offsetWidth;
        var h = tip.offsetHeight;
        var x = ev.clientX + pad;
        var y = ev.clientY + pad;
        if (x + w + 8 > window.innerWidth)  x = ev.clientX - w - pad;
        if (y + h + 8 > window.innerHeight) y = ev.clientY - h - pad;
        if (x < 8) x = 8;
        if (y < 8) y = 8;
        tip.style.left = x + 'px';
        tip.style.top  = y + 'px';
    }

    function show(html, ev) {
        var el = ensure();
        el.innerHTML = html;
        el.classList.add('is-visible');
        el.setAttribute('aria-hidden', 'false');
        position(ev);
    }

    function hide() {
        if (!tip) return;
        tip.classList.remove('is-visible');
        tip.setAttribute('aria-hidden', 'true');
    }

    function attach(sel, html) {
        sel.classed('circuit-hot', true)
            .on('mouseenter', function (ev) { show(html, ev); })
            .on('mousemove',  function (ev) { position(ev); })
            .on('mouseleave', hide);
        return sel;
    }

    // Build a transparent rectangle hit area on top of an existing
    // component drawing. (x, y, w, h) is the bounding box; html is the
    // tooltip body. Returns the d3 selection so callers can adjust it.
    function hotspot(svg, x, y, w, h, html) {
        var rect = svg.append('rect')
            .attr('x', x).attr('y', y)
            .attr('width', w).attr('height', h)
            .attr('rx', 6).attr('ry', 6);
        attach(rect, html);
        return rect;
    }

    // Format a one-component tooltip body. `name` is rendered as a small
    // accent-coloured eyebrow above the description.
    function fmt(name, body) {
        return '<div class="tip-title">' + name + '</div>' +
               '<div class="tip-body">' + body + '</div>';
    }

    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);

    window.CircuitTip = {
        attach:  attach,
        hotspot: hotspot,
        fmt:     fmt,
        hide:    hide
    };
})();
