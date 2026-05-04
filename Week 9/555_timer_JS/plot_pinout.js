// Section 01 (companion) · 8-pin DIP pinout for the standard 555 package.
// Notch at the top centre indicates the orientation. Pin 1 is to the left
// of the notch, with numbering proceeding anticlockwise: pins 1..4 down
// the left edge, pins 5..8 up the right edge.
(function () {
    var sel = '#plot-pinout';

    var VB_W = 720, VB_H = 460;

    function render() {
        var root = d3.select(sel);
        root.selectAll('*').remove();

        var svg = root.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        var T = window.T;
        var wire = T.wire;
        var text = T.text;
        var muted = T.textMuted;
        var pkgFill = window.CMP.cssVar('--c-chip-fill') || T.fg(0.06);
        var pinStub = window.CMP.cssVar('--c-pin-stub') || T.fg(0.55);

        // Package body: rounded rectangle, ~280×360
        var BODY = { x: 220, y: 50, w: 280, h: 360 };

        // Notch at top centre: a small semicircle cut out
        var NOTCH = { cx: BODY.x + BODY.w / 2, cy: BODY.y, r: 14 };

        // Build the package outline as a path with a notch in the top edge.
        // Path: start at top-left corner (after rounded corner), trace top
        // edge to notch, draw semicircle inward, continue to top-right
        // corner, down right edge, across bottom, up left edge to start.
        var rad = 10;     // corner radius
        var pathD = [
            'M', BODY.x + rad, BODY.y,
            'L', NOTCH.cx - NOTCH.r, BODY.y,
            'A', NOTCH.r, NOTCH.r, 0, 0, 0, NOTCH.cx + NOTCH.r, BODY.y,
            'L', BODY.x + BODY.w - rad, BODY.y,
            'Q', BODY.x + BODY.w, BODY.y, BODY.x + BODY.w, BODY.y + rad,
            'L', BODY.x + BODY.w, BODY.y + BODY.h - rad,
            'Q', BODY.x + BODY.w, BODY.y + BODY.h, BODY.x + BODY.w - rad, BODY.y + BODY.h,
            'L', BODY.x + rad, BODY.y + BODY.h,
            'Q', BODY.x, BODY.y + BODY.h, BODY.x, BODY.y + BODY.h - rad,
            'L', BODY.x, BODY.y + rad,
            'Q', BODY.x, BODY.y, BODY.x + rad, BODY.y,
            'Z'
        ].join(' ');

        svg.append('path')
            .attr('d', pathD)
            .attr('fill', pkgFill)
            .attr('stroke', wire).attr('stroke-width', 2);

        // Pin 1 indicator dot: small filled circle near pin 1 (top-left
        // inside the package, to the left of the notch).
        svg.append('circle')
            .attr('cx', BODY.x + 22).attr('cy', BODY.y + 24).attr('r', 5)
            .attr('fill', wire);

        // Pin pads. 4 on each side, evenly spaced down the body.
        // Left side (pins 1..4 top to bottom). Right side (pins 8..5 top to bottom).
        var pinW = 28, pinH = 18;
        var ySlots = [];
        for (var i = 0; i < 4; i++) {
            ySlots.push(BODY.y + 60 + i * 80);
        }

        // Pin label data, anticlockwise from notch: pin 1 top-left, going
        // down the left side (1, 2, 3, 4), then up the right side (5, 6, 7, 8).
        var leftPins  = [
            { n: 1, name: 'GND',   latex: '\\mathrm{GND}' },
            { n: 2, name: 'TRIG',  latex: '\\mathrm{TRIG}' },
            { n: 3, name: 'OUT',   latex: '\\mathrm{OUT}' },
            { n: 4, name: 'RESET', latex: '\\overline{\\mathrm{RESET}}' }
        ];
        var rightPins = [
            { n: 8, name: 'VCC',   latex: 'V_{CC}' },
            { n: 7, name: 'DISCH', latex: '\\mathrm{DISCH}' },
            { n: 6, name: 'THRES', latex: '\\mathrm{THRES}' },
            { n: 5, name: 'CTRL',  latex: '\\mathrm{CTRL}' }
        ];

        // Draw left-side pins
        for (var i2 = 0; i2 < 4; i2++) {
            var p = leftPins[i2];
            var py = ySlots[i2];
            // Pin pad
            svg.append('rect')
                .attr('x', BODY.x - pinW).attr('y', py - pinH / 2)
                .attr('width', pinW).attr('height', pinH)
                .attr('rx', 2).attr('ry', 2)
                .attr('fill', pinStub).attr('stroke', wire).attr('stroke-width', 1.2);
            // Pin number outside the pad
            window.renderKatex(svg, String(p.n),
                BODY.x - pinW - 18, py,
                { width: 22, height: 16, size: 12, color: muted });
            // Pin function name inside the package, near the pin
            window.renderKatex(svg, p.latex,
                BODY.x + 56, py,
                { width: 100, height: 18, size: 13, color: text, align: 'left' });
        }

        // Draw right-side pins
        for (var i3 = 0; i3 < 4; i3++) {
            var p2 = rightPins[i3];
            var py2 = ySlots[i3];
            svg.append('rect')
                .attr('x', BODY.x + BODY.w).attr('y', py2 - pinH / 2)
                .attr('width', pinW).attr('height', pinH)
                .attr('rx', 2).attr('ry', 2)
                .attr('fill', pinStub).attr('stroke', wire).attr('stroke-width', 1.2);
            window.renderKatex(svg, String(p2.n),
                BODY.x + BODY.w + pinW + 18, py2,
                { width: 22, height: 16, size: 12, color: muted });
            window.renderKatex(svg, p2.latex,
                BODY.x + BODY.w - 56, py2,
                { width: 100, height: 18, size: 13, color: text, align: 'right' });
        }

        // Package label inside, centred
        window.renderKatex(svg, '\\mathrm{NE555}',
            BODY.x + BODY.w / 2, BODY.y + BODY.h / 2,
            { width: 120, height: 28, size: 22, color: text });

        // Top reference: small label "top view" near the notch
        window.renderKatex(svg, '\\text{top view}',
            NOTCH.cx, BODY.y - 24,
            { width: 80, height: 16, size: 11, color: muted });
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
