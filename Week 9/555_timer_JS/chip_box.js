// Shared 555-chip drawing helper used by the three configuration plots
// (astable, monostable, bistable). Renders the chip body, pin stubs, pin
// numbers, and pin function labels with a single consistent layout so all
// three circuits read as the same package in different external networks.
//
// Layout (viewBox 800 x 600):
//
//                       +-- VCC rail (y = 80)
//   pin 8 (VCC)  o-------+--- pin 4 (RESET)
//                 +------+------+
//                 |             |
//   pin 7 -----o  |             |
//   pin 6 -----o  |    555      |  o----- pin 3 (OUT)
//   pin 2 -----o  |             |
//                 |             |
//                 +------+------+
//   pin 1 (GND) o-------+--- pin 5 (CTRL)
//                       +-- GND rail (y = 540)
//
// Pin numbers are placed outside the chip on each stub. Pin function names
// sit just inside the chip body. The chip rectangle is filled with the
// page's --c-chip-fill token so the chip reads as a distinct block against
// the surrounding wires.
(function () {
    if (window.Chip555) return;

    var BODY = { x: 320, y: 180, w: 200, h: 260 };
    var PIN_LEN = 28;

    // Pin coordinates. Each entry has {n: pin number, name, side, x, y}
    // where (x, y) is the OUTER endpoint of the pin stub (the point where
    // an external wire attaches).
    // Left-side pins evenly spaced at offsets 50, 130, 210 from chip top
    // (separation 80 px so a 70-long resistor fits cleanly between them).
    var PINS = [
        { n: 1, name: 'GND',   side: 'bottom', innerX: BODY.x + 50,  innerY: BODY.y + BODY.h, outX: BODY.x + 50,  outY: BODY.y + BODY.h + PIN_LEN },
        { n: 2, name: 'TRIG',  side: 'left',   innerX: BODY.x,       innerY: BODY.y + 210,    outX: BODY.x - PIN_LEN, outY: BODY.y + 210 },
        { n: 3, name: 'OUT',   side: 'right',  innerX: BODY.x + BODY.w, innerY: BODY.y + 130, outX: BODY.x + BODY.w + PIN_LEN, outY: BODY.y + 130 },
        { n: 4, name: 'RESET', side: 'top',    innerX: BODY.x + 150, innerY: BODY.y,          outX: BODY.x + 150, outY: BODY.y - PIN_LEN },
        { n: 5, name: 'CTRL',  side: 'bottom', innerX: BODY.x + 150, innerY: BODY.y + BODY.h, outX: BODY.x + 150, outY: BODY.y + BODY.h + PIN_LEN },
        { n: 6, name: 'THRES', side: 'left',   innerX: BODY.x,       innerY: BODY.y + 130,    outX: BODY.x - PIN_LEN, outY: BODY.y + 130 },
        { n: 7, name: 'DISCH', side: 'left',   innerX: BODY.x,       innerY: BODY.y + 50,     outX: BODY.x - PIN_LEN, outY: BODY.y + 50 },
        { n: 8, name: 'VCC',   side: 'top',    innerX: BODY.x + 50,  innerY: BODY.y,          outX: BODY.x + 50,  outY: BODY.y - PIN_LEN }
    ];

    function pinByNumber(n) {
        for (var i = 0; i < PINS.length; i++) if (PINS[i].n === n) return PINS[i];
        return null;
    }

    // Render the chip body and pin stubs onto the supplied svg selection.
    // Returns { body, pin } where pin(n) -> the entry from PINS above so
    // callers can route external wires to pin coordinates without copying
    // numbers around.
    function draw(svg) {
        var T = window.T;
        var wire = T.wire;
        var text = T.text;
        var muted = T.textMuted;
        var chipFill = window.CMP.cssVar('--c-chip-fill') || T.fg(0.05);
        var pinStub = window.CMP.cssVar('--c-pin-stub') || T.fg(0.55);

        // Chip body
        svg.append('rect')
            .attr('x', BODY.x).attr('y', BODY.y)
            .attr('width', BODY.w).attr('height', BODY.h)
            .attr('rx', 8).attr('ry', 8)
            .attr('fill', chipFill)
            .attr('stroke', wire).attr('stroke-width', 2);

        // 555 label, placed in the upper-middle gap between the pin 7 and
        // pin 6 horizontal name rows so it does not overlap the pin name
        // labels that span the chip interior at y = 230, 310, 390.
        window.renderKatex(svg, '555',
            BODY.x + BODY.w / 2, BODY.y + 90,
            { width: 80, height: 32, size: 26, color: text });

        // Each pin: stub line, pin number outside, function name inside
        for (var i = 0; i < PINS.length; i++) {
            var p = PINS[i];

            svg.append('line')
                .attr('x1', p.innerX).attr('y1', p.innerY)
                .attr('x2', p.outX).attr('y2', p.outY)
                .attr('stroke', pinStub).attr('stroke-width', 2)
                .attr('stroke-linecap', 'square');

            // Tiny solder dot at the outer end of the pin
            svg.append('circle')
                .attr('cx', p.outX).attr('cy', p.outY).attr('r', 3.2)
                .attr('fill', wire);

            // Pin number, placed just OUTSIDE the chip on the stub
            var nx = p.innerX, ny = p.innerY;
            if (p.side === 'left')   { nx = p.innerX - 12; ny = p.innerY - 12; }
            if (p.side === 'right')  { nx = p.innerX + 12; ny = p.innerY - 12; }
            if (p.side === 'top')    { nx = p.innerX + 12; ny = p.innerY - 14; }
            if (p.side === 'bottom') { nx = p.innerX + 12; ny = p.innerY + 14; }
            window.renderKatex(svg, String(p.n),
                nx, ny,
                { width: 22, height: 16, size: 11, color: muted });

            // Function name, inside the chip body
            var lx = p.innerX, ly = p.innerY;
            if (p.side === 'left')   { lx = p.innerX + 36; ly = p.innerY; }
            if (p.side === 'right')  { lx = p.innerX - 36; ly = p.innerY; }
            if (p.side === 'top')    { lx = p.innerX;      ly = p.innerY + 18; }
            if (p.side === 'bottom') { lx = p.innerX;      ly = p.innerY - 18; }
            // Use KaTeX for RESET so the bar can be drawn; plain text works
            // for others but stay consistent with KaTeX text rendering.
            var nameLatex = (p.name === 'RESET')
                ? '\\overline{\\mathrm{RESET}}'
                : '\\mathrm{' + p.name + '}';
            window.renderKatex(svg, nameLatex,
                lx, ly,
                { width: 64, height: 18, size: 11, color: text });
        }

        return {
            body: BODY,
            pin: pinByNumber,
            pins: PINS
        };
    }

    window.Chip555 = {
        draw: draw,
        BODY: BODY,
        PIN_LEN: PIN_LEN,
        pin: pinByNumber
    };
})();
