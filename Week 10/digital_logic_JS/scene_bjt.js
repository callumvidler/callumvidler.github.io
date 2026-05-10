// Scene · BJT logic gates.
// Three resistor-transistor diagrams shown side by side in one panel:
//   1. NOT (inverter): one NPN with a collector pull-up resistor.
//   2. NOR: two NPNs in parallel between the output and ground.
//   3. NAND: two NPNs in series between the output and ground.
// In all three the transistor symbol "lights" when its base sits high
// enough to put the device into saturation.
(function () {
    var DL = window.DL;
    var aBtn = document.getElementById('dl-bjt-a');
    var bBtn = document.getElementById('dl-bjt-b');
    var svg  = d3.select('#plot-dl-bjt');

    // ------------------ primitives ------------------

    function rail(g, x1, x2, y, label) {
        g.append('line').attr('class', 'rail').attr('x1', x1).attr('y1', y)
            .attr('x2', x2).attr('y2', y);
        if (label) {
            g.append('text').attr('class', 'rail-lbl')
                .attr('x', x2).attr('y', y - 5)
                .attr('text-anchor', 'end').text(label);
        }
    }

    function ground(g, x, y) {
        g.append('line').attr('x1', x - 12).attr('y1', y).attr('x2', x + 12).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.8);
        g.append('line').attr('x1', x - 8).attr('y1', y + 4).attr('x2', x + 8).attr('y2', y + 4)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        g.append('line').attr('x1', x - 4).attr('y1', y + 8).attr('x2', x + 4).attr('y2', y + 8)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.2);
    }

    function resistorV(g, cx, yTop, length, label, labelSide) {
        var w = 12;
        labelSide = labelSide || 'right';
        g.append('rect').attr('x', cx - w / 2).attr('y', yTop)
            .attr('width', w).attr('height', length)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.5);
        if (label) {
            var lx = labelSide === 'right' ? cx + 12 : cx - 12;
            var anchor = labelSide === 'right' ? 'start' : 'end';
            g.append('text').attr('x', lx).attr('y', yTop + length / 2 + 4)
                .attr('text-anchor', anchor)
                .attr('class', 'lbl').text(label);
        }
        return { top: { x: cx, y: yTop }, bottom: { x: cx, y: yTop + length } };
    }

    function resistorH(g, xLeft, cy, length, label) {
        var h = 12;
        g.append('rect').attr('x', xLeft).attr('y', cy - h / 2)
            .attr('width', length).attr('height', h)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.5);
        if (label) {
            g.append('text').attr('x', xLeft + length / 2).attr('y', cy - 10)
                .attr('text-anchor', 'middle')
                .attr('class', 'lbl').text(label);
        }
        return { left: { x: xLeft, y: cy }, right: { x: xLeft + length, y: cy } };
    }

    // NPN BJT symbol. side='left' or 'right' chooses which side the base
    // protrudes from. Returns base/collector/emitter pin coordinates.
    function bjt(g, cx, cy, side, label, conducting) {
        side = side || 'left';
        var sx = (side === 'left') ? -1 : 1;
        var ox = -sx;

        var color = conducting ? 'var(--c-hi)' : 'var(--text-dim)';
        var bodyW = conducting ? 3.0 : 2.4;
        var leadW = conducting ? 2.0 : 1.6;
        var bodyHalf  = 14;
        var slopeYOff = 6;
        var slopeXOff = 8;
        var pinYOff   = 30;
        var baseLen   = 26;

        g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 19)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', color).attr('stroke-width', 1.0)
            .attr('opacity', 0.45);

        g.append('line').attr('x1', cx).attr('y1', cy - bodyHalf)
            .attr('x2', cx).attr('y2', cy + bodyHalf)
            .attr('stroke', color).attr('stroke-width', bodyW)
            .attr('stroke-linecap', 'round');

        var baseEndX = cx + sx * baseLen;
        g.append('line').attr('x1', cx).attr('y1', cy)
            .attr('x2', baseEndX).attr('y2', cy)
            .attr('stroke', color).attr('stroke-width', leadW);

        var slopeX  = cx + ox * slopeXOff;
        var collTop = cy - bodyHalf - slopeYOff;
        var collOut = cy - pinYOff;
        g.append('line').attr('x1', cx).attr('y1', cy - bodyHalf)
            .attr('x2', slopeX).attr('y2', collTop)
            .attr('stroke', color).attr('stroke-width', leadW);
        g.append('line').attr('x1', slopeX).attr('y1', collTop)
            .attr('x2', slopeX).attr('y2', collOut)
            .attr('stroke', color).attr('stroke-width', leadW);

        var emTop = cy + bodyHalf + slopeYOff;
        var emOut = cy + pinYOff;
        g.append('line').attr('x1', cx).attr('y1', cy + bodyHalf)
            .attr('x2', slopeX).attr('y2', emTop)
            .attr('stroke', color).attr('stroke-width', leadW);
        g.append('line').attr('x1', slopeX).attr('y1', emTop)
            .attr('x2', slopeX).attr('y2', emOut)
            .attr('stroke', color).attr('stroke-width', leadW);

        // Emitter arrow on the slope, pointing away from the body.
        var sdx = ox * slopeXOff, sdy = slopeYOff;
        var slen = Math.sqrt(sdx * sdx + sdy * sdy);
        var ux = sdx / slen, uy = sdy / slen;
        var perpX = -uy, perpY = ux;
        var ax = slopeX, ay = emTop;
        var s = 5;
        var p2x = ax - ux * s + perpX * s * 0.5;
        var p2y = ay - uy * s + perpY * s * 0.5;
        var p3x = ax - ux * s - perpX * s * 0.5;
        var p3y = ay - uy * s - perpY * s * 0.5;
        g.append('polygon')
            .attr('points', ax + ',' + ay + ' ' + p2x + ',' + p2y + ' ' + p3x + ',' + p3y)
            .attr('fill', color).attr('stroke', color);

        if (label) {
            var labelX = cx + ox * 25;
            var anchor = ox > 0 ? 'start' : 'end';
            g.append('text').attr('x', labelX).attr('y', cy + 4)
                .attr('text-anchor', anchor)
                .attr('class', 'lbl' + (conducting ? ' lit' : '')).text(label);
        }

        return {
            base:      { x: baseEndX, y: cy },
            collector: { x: slopeX,   y: collOut },
            emitter:   { x: slopeX,   y: emOut }
        };
    }

    // Base resistor + input wire + label coming in from the left.
    function inputLeft(g, basePin, label, value, rLabel) {
        var stub = 8, rLen = 20, wireLen = 18;
        var rb = resistorH(g, basePin.x - stub - rLen, basePin.y, rLen, rLabel);
        DL.wire(g, basePin.x, basePin.y, rb.right.x, basePin.y, !!value);
        DL.wire(g, rb.left.x, basePin.y, rb.left.x - wireLen, basePin.y, !!value);
        g.append('text').attr('x', rb.left.x - wireLen - 6).attr('y', basePin.y + 4)
            .attr('text-anchor', 'end')
            .attr('class', 'lbl' + (value ? ' lit' : '')).text(label);
    }

    function inputRight(g, basePin, label, value, rLabel) {
        var stub = 8, rLen = 20, wireLen = 18;
        var rb = resistorH(g, basePin.x + stub, basePin.y, rLen, rLabel);
        DL.wire(g, basePin.x, basePin.y, rb.left.x, basePin.y, !!value);
        DL.wire(g, rb.right.x, basePin.y, rb.right.x + wireLen, basePin.y, !!value);
        g.append('text').attr('x', rb.right.x + wireLen + 6).attr('y', basePin.y + 4)
            .attr('class', 'lbl' + (value ? ' lit' : '')).text(label);
    }

    // Connect the V_CC rail to the top of R_C with an explicit lead, then
    // build the resistor. Returns the resistor handle.
    function rcWithLead(g, col, label) {
        var rc = resistorV(g, col, VCC_Y + 14, 40, label, 'right');
        DL.wire(g, col, VCC_Y, col, rc.top.y);
        return rc;
    }

    // ------------------ sub-panels ------------------
    // Each sub-panel is rendered into a translated <g>, with sub-panel-
    // relative coordinates. Common rail, ground and rail-x bounds keep the
    // three diagrams visually aligned across the panel.

    var PANEL_W = 320;          // sub-panel width in viewBox units
    var PANEL_H = 540;
    var VCC_Y   = 170;          // V_CC rail (gives ample title-to-circuit gap)
    var GND_Y   = 480;
    var RAIL_X1 = 60;
    var RAIL_X2 = 260;
    var TITLE_Y = 60;           // sub-panel title sits below the plot-box
                                // label overlay band at the top of the box.
    var SUB_CY  = 325;          // BJT centre for NOT and NOR

    function drawNotPanel(g, a) {
        var col = 160;
        rail(g, RAIL_X1, RAIL_X2, VCC_Y, 'V_CC');
        var rc  = rcWithLead(g, col, 'R_C');
        var pin = bjt(g, col, SUB_CY, 'left', 'Q', a === 1);
        var out = DL.NOT(a);

        var outY = (rc.bottom.y + pin.collector.y) / 2;
        DL.wire(g, col, rc.bottom.y, col, outY, !!out);
        DL.wire(g, pin.collector.x, pin.collector.y, pin.collector.x, outY, !!out);
        DL.wire(g, pin.collector.x, outY, col, outY, !!out);
        DL.dot(g, col, outY, !!out);
        DL.wire(g, col, outY, col + 80, outY, !!out);
        g.append('text').attr('x', col + 86).attr('y', outY + 4)
            .attr('class', 'lbl' + (out ? ' lit' : '')).text('Y = ' + out);

        // Emitter drops straight down to its own GND symbol — no horizontal
        // bend, so the GND top bar lines up with the wire endpoint.
        DL.wire(g, pin.emitter.x, pin.emitter.y, pin.emitter.x, GND_Y);
        ground(g, pin.emitter.x, GND_Y);

        inputLeft(g, pin.base, 'A = ' + a, a, 'R_B');
    }

    function drawNorPanel(g, a, b) {
        var aCx = 110, bCx = 210, rcCx = 160;
        rail(g, RAIL_X1, RAIL_X2, VCC_Y, 'V_CC');
        var rc = rcWithLead(g, rcCx, 'R_C');

        var pinA = bjt(g, aCx, SUB_CY, 'left',  'Q_A', a === 1);
        var pinB = bjt(g, bCx, SUB_CY, 'right', 'Q_B', b === 1);
        var out = DL.NOR(a, b);

        var outY = (rc.bottom.y + pinA.collector.y) / 2;
        DL.wire(g, rcCx, rc.bottom.y, rcCx, outY, !!out);
        DL.wire(g, pinA.collector.x, pinA.collector.y, pinA.collector.x, outY, !!out);
        DL.wire(g, pinB.collector.x, pinB.collector.y, pinB.collector.x, outY, !!out);
        DL.wire(g, pinA.collector.x, outY, pinB.collector.x, outY, !!out);
        DL.dot(g, rcCx, outY, !!out);
        DL.dot(g, pinA.collector.x, outY, !!out);
        DL.dot(g, pinB.collector.x, outY, !!out);

        DL.wire(g, pinB.collector.x, outY, 250, outY, !!out);
        g.append('text').attr('x', 256).attr('y', outY + 4)
            .attr('class', 'lbl' + (out ? ' lit' : '')).text('Y = ' + out);

        // Common emitter (ground) bus sits 12 above the GND symbol so a
        // short lead clearly connects the bus to the symbol below.
        var busY = GND_Y - 12;
        DL.wire(g, pinA.emitter.x, pinA.emitter.y, pinA.emitter.x, busY);
        DL.wire(g, pinB.emitter.x, pinB.emitter.y, pinB.emitter.x, busY);
        DL.wire(g, pinA.emitter.x, busY, pinB.emitter.x, busY);
        DL.dot(g, pinA.emitter.x, busY);
        DL.dot(g, pinB.emitter.x, busY);
        DL.wire(g, rcCx, busY, rcCx, GND_Y);
        ground(g, rcCx, GND_Y);

        inputLeft (g, pinA.base, 'A = ' + a, a, 'R_A');
        inputRight(g, pinB.base, 'B = ' + b, b, 'R_B');
    }

    function drawNandPanel(g, a, b) {
        var col = 160;
        var topCY = 270, botCY = 380;
        rail(g, RAIL_X1, RAIL_X2, VCC_Y, 'V_CC');
        var rc = rcWithLead(g, col, 'R_C');

        var pinTop = bjt(g, col, topCY, 'left', 'Q_A', a === 1);
        var pinBot = bjt(g, col, botCY, 'left', 'Q_B', b === 1);
        var out = DL.NAND(a, b);

        var outY = (rc.bottom.y + pinTop.collector.y) / 2;
        DL.wire(g, col, rc.bottom.y, col, outY, !!out);
        DL.wire(g, pinTop.collector.x, pinTop.collector.y, pinTop.collector.x, outY, !!out);
        DL.wire(g, pinTop.collector.x, outY, col, outY, !!out);
        DL.dot(g, col, outY, !!out);
        DL.wire(g, col, outY, col + 80, outY, !!out);
        g.append('text').attr('x', col + 86).attr('y', outY + 4)
            .attr('class', 'lbl' + (out ? ' lit' : '')).text('Y = ' + out);

        // Inter-stage node carries current only when both devices conduct.
        var midActive = (a === 1 && b === 1);
        DL.wire(g, pinTop.emitter.x, pinTop.emitter.y,
                       pinBot.collector.x, pinBot.collector.y, midActive);

        // Bottom emitter drops straight down to its GND symbol; no
        // horizontal bend, so the GND top bar aligns with the wire end.
        DL.wire(g, pinBot.emitter.x, pinBot.emitter.y, pinBot.emitter.x, GND_Y);
        ground(g, pinBot.emitter.x, GND_Y);

        inputLeft(g, pinTop.base, 'A = ' + a, a, 'R_A');
        inputLeft(g, pinBot.base, 'B = ' + b, b, 'R_B');
    }

    function drawAll() {
        var f = DL.frame(svg, { W: 3 * PANEL_W, H: PANEL_H });
        var a = DL.readBit(aBtn);
        var b = DL.readBit(bBtn);

        // Vertical separators between sub-panels (start just below the
        // sub-panel titles).
        [PANEL_W, 2 * PANEL_W].forEach(function (x) {
            f.g.append('line')
                .attr('x1', x).attr('y1', TITLE_Y + 24).attr('x2', x).attr('y2', PANEL_H - 20)
                .attr('stroke', 'var(--c-cell-bd)').attr('stroke-width', 1);
        });

        var panels = [
            { title: 'NOT · inverter',           draw: function (g) { drawNotPanel(g, a);       } },
            { title: 'NOR · two NPN in parallel', draw: function (g) { drawNorPanel(g, a, b);    } },
            { title: 'NAND · two NPN in series',  draw: function (g) { drawNandPanel(g, a, b);   } }
        ];

        panels.forEach(function (p, i) {
            var sg = f.g.append('g')
                .attr('transform', 'translate(' + (i * PANEL_W) + ',0)');
            sg.append('text')
                .attr('x', PANEL_W / 2).attr('y', TITLE_Y)
                .attr('text-anchor', 'middle')
                .attr('class', 'gate-title')
                .text(p.title);
            p.draw(sg);
        });
    }

    function init() {
        DL.bindBitButton(aBtn, drawAll);
        DL.bindBitButton(bBtn, drawAll);
        drawAll();
        window.addEventListener('themechange', drawAll);
        window.addEventListener('resize', drawAll);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
