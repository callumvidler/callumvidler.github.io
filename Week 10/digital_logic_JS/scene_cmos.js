// Scene 02 · CMOS construction.
// Three diagrams.
//   1. Inverter at the transistor level: PMOS pull-up to V_DD, NMOS pull-down
//      to ground, gates tied together as the input, drains tied together as
//      the output. Toggling the input flips which transistor conducts.
//   2. NAND at the transistor level: two PMOS in parallel between V_DD and the
//      output, two NMOS in series between the output and ground. Output is
//      pulled low only when both inputs are high.
//   3. Universality strip: NOT, AND and OR rebuilt from NAND only.
(function () {
    var DL = window.DL;
    var inBtn = document.getElementById('dl-c-a');
    var voutLbl = document.getElementById('dl-c-vout');
    var svgInv = d3.select('#plot-dl-cmos-inv');
    var svgNand = d3.select('#plot-dl-cmos-nand');
    var svgUni = d3.select('#plot-dl-universal');

    // MOSFET drawn as a switch: two terminal contacts joined by a movable arm.
    // When the device conducts, the arm is closed (straight, coloured);
    // otherwise it lifts away from the lower contact at an angle. The gate
    // stub and PMOS bubble are retained so P-channel and N-channel devices
    // remain distinguishable, and a dashed actuator line indicates that the
    // gate operates the switch. Returns { gate, top, bottom } pin coordinates.
    function mosfet(g, cx, cy, type, side, label, conducting) {
        side = side || 'left';
        var w = 38, h = 56;
        var bx = cx - w / 2, by = cy - h / 2;

        var rightSide = (side === 'right');
        var gateOuterX = rightSide ? bx + w + 22 : bx - 22;
        var gateBarX   = rightSide ? bx + w + 4  : bx - 4;
        var bubbleX    = rightSide ? bx + w + 8  : bx - 8;

        // Gate stub and (for PMOS) input-low bubble.
        g.append('line').attr('x1', gateOuterX).attr('y1', cy)
            .attr('x2', (type === 'p' ? (rightSide ? bx + w + 12 : bx - 12) : gateBarX)).attr('y2', cy)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        if (type === 'p') {
            g.append('circle').attr('cx', bubbleX).attr('cy', cy).attr('r', 4)
                .attr('fill', 'var(--bg-2)')
                .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        }
        // Vertical bar at the gate side acts as the switch's stationary
        // pivot post; preserves the visual "channel" cue from the transistor
        // symbol without claiming to be a channel.
        g.append('line').attr('x1', gateBarX).attr('y1', cy - h * 0.35)
            .attr('x2', gateBarX).attr('y2', cy + h * 0.35)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.0);

        // Dashed actuator showing the gate "pushes" the switch arm.
        g.append('line').attr('x1', gateBarX).attr('y1', cy)
            .attr('x2', cx).attr('y2', cy)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.0)
            .attr('stroke-dasharray', '3 3').attr('opacity', 0.55);

        // Drain/source leads out of the body.
        g.append('line').attr('x1', cx).attr('y1', by)
            .attr('x2', cx).attr('y2', by - 14)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line').attr('x1', cx).attr('y1', by + h)
            .attr('x2', cx).attr('y2', by + h + 14)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);

        // Switch contacts (small filled dots at top and bottom).
        var topY = by + 4;
        var botY = by + h - 4;
        g.append('circle').attr('cx', cx).attr('cy', topY).attr('r', 2.6)
            .attr('fill', 'var(--text-dim)');
        g.append('circle').attr('cx', cx).attr('cy', botY).attr('r', 2.6)
            .attr('fill', 'var(--text-dim)');

        // Switch arm: pivots at the top contact. Closed = straight to bottom
        // contact, coloured by device type. Open = tilted away from the gate.
        var armColor = conducting
            ? (type === 'p' ? 'var(--c-pmos)' : 'var(--c-nmos)')
            : 'var(--text-dim)';
        var armWidth = conducting ? 2.6 : 2.0;
        var endX, endY;
        if (conducting) {
            endX = cx;
            endY = botY;
        } else {
            var angle = 32 * Math.PI / 180;
            var armLen = botY - topY;
            var tilt = rightSide ? -1 : 1; // open away from the gate side
            endX = cx + tilt * armLen * Math.sin(angle);
            endY = topY + armLen * Math.cos(angle);
        }
        g.append('line').attr('x1', cx).attr('y1', topY)
            .attr('x2', endX).attr('y2', endY)
            .attr('stroke', armColor)
            .attr('stroke-width', armWidth)
            .attr('stroke-linecap', 'round')
            .attr('opacity', conducting ? 0.95 : 0.85);

        if (label) {
            // Labels sit opposite the gate so they never overlap the gate stub.
            var labelX = rightSide ? bx - 8 : bx + w + 8;
            var anchor = rightSide ? 'end' : 'start';
            g.append('text').attr('x', labelX).attr('y', cy + 4)
                .attr('text-anchor', anchor)
                .attr('class', 'lbl').text(label);
        }

        return {
            gate:   { x: gateOuterX, y: cy },
            top:    { x: cx,         y: by - 14 },
            bottom: { x: cx,         y: by + h + 14 }
        };
    }

    function rail(g, x1, x2, y, label) {
        g.append('line').attr('class', 'rail').attr('x1', x1).attr('y1', y)
            .attr('x2', x2).attr('y2', y);
        if (label) {
            g.append('text').attr('class', 'rail-lbl')
                .attr('x', x2 + 6).attr('y', y + 4).text(label);
        }
    }

    function ground(g, x, y) {
        g.append('line').attr('x1', x - 14).attr('y1', y).attr('x2', x + 14).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.8);
        g.append('line').attr('x1', x - 9).attr('y1', y + 5).attr('x2', x + 9).attr('y2', y + 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        g.append('line').attr('x1', x - 4).attr('y1', y + 10).attr('x2', x + 4).attr('y2', y + 10)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.2);
    }

    // ---------------- inverter ----------------
    function drawInverter() {
        var f = DL.frame(svgInv, { W: 600, H: 380 });
        var a = DL.readBit(inBtn);
        var out = DL.NOT(a);

        var cx = 320;
        var pmosY = 140, nmosY = 240;
        var vddY = 70, gndY = 320;

        rail(f.g, 220, 420, vddY, 'V_DD');
        var pm = mosfet(f.g, cx, pmosY, 'p', 'left', 'M_P', a === 0);
        var nm = mosfet(f.g, cx, nmosY, 'n', 'left', 'M_N', a === 1);
        ground(f.g, cx, gndY);

        // V_DD rail to PMOS top (source)
        DL.wire(f.g, cx, vddY, cx, pm.top.y);
        // PMOS bottom (drain) to NMOS top (drain): output node bus
        DL.wire(f.g, cx, pm.bottom.y, cx, nm.top.y, !!out);
        // NMOS bottom (source) to GND
        DL.wire(f.g, cx, nm.bottom.y, cx, gndY);

        // Common gate input bus on the left, joining PMOS and NMOS gates.
        var inBusX = pm.gate.x - 30;
        DL.wire(f.g, pm.gate.x, pm.gate.y, inBusX, pm.gate.y, !!a);
        DL.wire(f.g, nm.gate.x, nm.gate.y, inBusX, nm.gate.y, !!a);
        DL.wire(f.g, inBusX, pm.gate.y, inBusX, nm.gate.y, !!a);
        var midGateY = (pm.gate.y + nm.gate.y) / 2;
        DL.wire(f.g, inBusX, midGateY, inBusX - 70, midGateY, !!a);
        DL.dot(f.g, inBusX, midGateY, !!a);
        f.g.append('text').attr('x', inBusX - 76).attr('y', midGateY + 4)
            .attr('text-anchor', 'end')
            .attr('class', 'lbl' + (a ? ' lit' : '')).text('V_in = ' + (a ? 'V_DD' : 'GND'));

        // Output tap from the midpoint of the output bus.
        var outNodeY = (pm.bottom.y + nm.top.y) / 2;
        DL.wire(f.g, cx, outNodeY, cx + 100, outNodeY, !!out);
        DL.dot(f.g, cx, outNodeY, !!out);
        f.g.append('text').attr('x', cx + 106).attr('y', outNodeY + 4)
            .attr('class', 'lbl' + (out ? ' lit' : '')).text('V_out = ' + (out ? 'V_DD' : 'GND'));

        voutLbl.textContent = out ? 'V_DD' : 'GND';
    }

    // ---------------- NAND ----------------
    function drawNand() {
        var f = DL.frame(svgNand, { W: 720, H: 480 });
        var a = DL.readBit(inBtn);
        // Inputs A and B both follow the toggle so the output flips through
        // its NAND truth.  (A=0 → out=1, A=1 → out=0.)
        var b = a;
        var out = DL.NAND(a, b);

        var vddY = 100, gndY = 440;
        var pmY = 170;
        var nmAy = 270, nmBy = 360;
        var outNodeY = 220;
        var pmAx = 260, pmBx = 500, nmosX = 380;

        rail(f.g, 200, 580, vddY, 'V_DD');

        var pmA = mosfet(f.g, pmAx, pmY,  'p', 'left',  'P_A', a === 0);
        var pmB = mosfet(f.g, pmBx, pmY,  'p', 'right', 'P_B', b === 0);
        var nmA = mosfet(f.g, nmosX, nmAy, 'n', 'left',  'N_A', a === 1);
        var nmB = mosfet(f.g, nmosX, nmBy, 'n', 'right', 'N_B', b === 1);

        // V_DD to both PMOS tops (sources).
        DL.wire(f.g, pmAx, vddY, pmAx, pmA.top.y);
        DL.wire(f.g, pmBx, vddY, pmBx, pmB.top.y);

        // PMOS drains drop to the output bus, which feeds NMOS_A's drain.
        DL.wire(f.g, pmAx, pmA.bottom.y, pmAx, outNodeY, !!out);
        DL.wire(f.g, pmBx, pmB.bottom.y, pmBx, outNodeY, !!out);
        DL.wire(f.g, pmAx, outNodeY, pmBx, outNodeY, !!out);
        DL.wire(f.g, nmosX, outNodeY, nmosX, nmA.top.y, !!out);
        DL.dot(f.g, nmosX, outNodeY, !!out);

        // NMOS series chain.
        DL.wire(f.g, nmosX, nmA.bottom.y, nmosX, nmB.top.y);
        DL.wire(f.g, nmosX, nmB.bottom.y, nmosX, gndY);
        ground(f.g, nmosX, gndY);

        // A bus on the left.  Connects pmA gate (left side) to nmA gate (left
        // side) via a vertical column.  Tap to a label further left.
        var aBusX = pmA.gate.x - 30;
        DL.wire(f.g, pmA.gate.x, pmA.gate.y, aBusX, pmA.gate.y, !!a);
        DL.wire(f.g, nmA.gate.x, nmA.gate.y, aBusX, nmA.gate.y, !!a);
        DL.wire(f.g, aBusX, pmA.gate.y, aBusX, nmA.gate.y, !!a);
        var aLabelY = (pmA.gate.y + nmA.gate.y) / 2;
        DL.wire(f.g, aBusX, aLabelY, aBusX - 70, aLabelY, !!a);
        DL.dot(f.g, aBusX, aLabelY, !!a);
        f.g.append('text').attr('x', aBusX - 76).attr('y', aLabelY + 4)
            .attr('text-anchor', 'end')
            .attr('class', 'lbl' + (a ? ' lit' : '')).text('A = ' + a);

        // B bus on the right.  Connects pmB gate (right side) to nmB gate
        // (right side); a horizontal stub at y = nmB.gate.y reaches across the
        // empty space to the right of the NMOS body.
        var bBusX = pmB.gate.x + 30;
        DL.wire(f.g, pmB.gate.x, pmB.gate.y, bBusX, pmB.gate.y, !!b);
        DL.wire(f.g, nmB.gate.x, nmB.gate.y, bBusX, nmB.gate.y, !!b);
        DL.wire(f.g, bBusX, pmB.gate.y, bBusX, nmB.gate.y, !!b);
        var bLabelY = (pmB.gate.y + nmB.gate.y) / 2;
        DL.wire(f.g, bBusX, bLabelY, bBusX + 70, bLabelY, !!b);
        DL.dot(f.g, bBusX, bLabelY, !!b);
        f.g.append('text').attr('x', bBusX + 76).attr('y', bLabelY + 4)
            .attr('class', 'lbl' + (b ? ' lit' : '')).text('B = ' + b);

        // Output tap.  Drop from the output bus through the empty column
        // between nmosX and pmBx, route below the NMOS stack, and emerge at
        // the right margin so the label does not collide with the buses.
        var tapX = 440;
        var tapY = 410;
        DL.wire(f.g, tapX, outNodeY, tapX, tapY, !!out);
        DL.wire(f.g, tapX, tapY, 640, tapY, !!out);
        DL.dot(f.g, tapX, outNodeY, !!out);
        f.g.append('text').attr('x', 646).attr('y', tapY + 4)
            .attr('class', 'lbl' + (out ? ' lit' : '')).text('Y = ' + out);
    }

    // ---------------- universality strip: NOT, AND, OR from NAND ----------------
    function drawUniversal() {
        var f = DL.frame(svgUni, { W: 720, H: 260 });
        var a = DL.readBit(inBtn);
        var b = a;

        // NOT(A)    = NAND(A, A)
        // AND(A,B)  = NAND( NAND(A,B), NAND(A,B) )
        // OR(A,B)   = NAND( NAND(A,A), NAND(B,B) )

        function block(ox, title, build) {
            var g = f.g.append('g').attr('transform', 'translate(' + ox + ',0)');
            // Title sits low enough that the plot-box label band at the top
            // never overlaps it on narrower viewports.
            g.append('text').attr('class', 'gate-title').attr('x', 12).attr('y', 56).text(title);
            build(g);
        }

        block(0, 'NOT from NAND', function (g) {
            var p = DL.gateNAND(g, 70, 114, 60, 40, !!DL.NOT(a));
            // Tie both NAND inputs to A by joining inA and inB on a vertical
            // stub at x=40, then route a single input wire to the label.
            DL.wire(g, 40, p.inA.y, p.inA.x, p.inA.y, !!a);
            DL.wire(g, 40, p.inB.y, p.inA.x, p.inB.y, !!a);
            DL.wire(g, 40, p.inA.y, 40, p.inB.y, !!a);
            DL.wire(g, 40, (p.inA.y + p.inB.y) / 2, 18, (p.inA.y + p.inB.y) / 2, !!a);
            g.append('text').attr('x', 14).attr('y', (p.inA.y + p.inB.y) / 2 + 4)
                .attr('text-anchor', 'end')
                .attr('class', 'lbl' + (a ? ' lit' : '')).text('A=' + a);
            DL.wire(g, p.out.x, p.out.y, p.out.x + 26, p.out.y, !!DL.NOT(a));
            g.append('text').attr('x', p.out.x + 32).attr('y', p.out.y + 4)
                .attr('class', 'lbl' + (DL.NOT(a) ? ' lit' : '')).text('Y=' + DL.NOT(a));
        });

        block(220, 'AND from NAND', function (g) {
            var n1 = DL.gateNAND(g, 60, 114, 56, 40, !!DL.NAND(a, b));
            var n2 = DL.gateNAND(g, 160, 114, 56, 40, !!DL.AND(a, b));
            // A and B labels feed the first NAND.
            DL.wire(g, 30, n1.inA.y, n1.inA.x, n1.inA.y, !!a);
            DL.wire(g, 30, n1.inB.y, n1.inA.x, n1.inB.y, !!b);
            g.append('text').attr('x', 26).attr('y', n1.inA.y + 4)
                .attr('text-anchor', 'end').attr('class', 'lbl' + (a ? ' lit' : '')).text('A=' + a);
            g.append('text').attr('x', 26).attr('y', n1.inB.y + 4)
                .attr('text-anchor', 'end').attr('class', 'lbl' + (b ? ' lit' : '')).text('B=' + b);
            // n1 output ties to both n2 inputs.
            var joinX = n2.inA.x - 8;
            DL.wire(g, n1.out.x, n1.out.y, joinX, n1.out.y, !!DL.NAND(a, b));
            DL.wire(g, joinX, n2.inA.y, joinX, n2.inB.y, !!DL.NAND(a, b));
            DL.wire(g, joinX, n2.inA.y, n2.inA.x, n2.inA.y, !!DL.NAND(a, b));
            DL.wire(g, joinX, n2.inB.y, n2.inA.x, n2.inB.y, !!DL.NAND(a, b));
            DL.dot(g, joinX, n1.out.y, !!DL.NAND(a, b));
            DL.wire(g, n2.out.x, n2.out.y, n2.out.x + 24, n2.out.y, !!DL.AND(a, b));
            g.append('text').attr('x', n2.out.x + 30).attr('y', n2.out.y + 4)
                .attr('class', 'lbl' + (DL.AND(a, b) ? ' lit' : '')).text('Y=' + DL.AND(a, b));
        });

        block(460, 'OR from NAND', function (g) {
            var nA = DL.gateNAND(g, 60, 84, 50, 30, !!DL.NOT(a));
            var nB = DL.gateNAND(g, 60, 144, 50, 30, !!DL.NOT(b));
            var nO = DL.gateNAND(g, 170, 114, 56, 40, !!DL.OR(a, b));
            // Tie inputs of nA together to A; same for nB and B.
            DL.wire(g, 30, nA.inA.y, nA.inA.x, nA.inA.y, !!a);
            DL.wire(g, 30, nA.inB.y, nA.inA.x, nA.inB.y, !!a);
            DL.wire(g, 30, nA.inA.y, 30, nA.inB.y, !!a);
            g.append('text').attr('x', 26).attr('y', (nA.inA.y + nA.inB.y) / 2 + 4)
                .attr('text-anchor', 'end').attr('class', 'lbl' + (a ? ' lit' : '')).text('A=' + a);
            DL.wire(g, 30, nB.inA.y, nB.inA.x, nB.inA.y, !!b);
            DL.wire(g, 30, nB.inB.y, nB.inA.x, nB.inB.y, !!b);
            DL.wire(g, 30, nB.inA.y, 30, nB.inB.y, !!b);
            g.append('text').attr('x', 26).attr('y', (nB.inA.y + nB.inB.y) / 2 + 4)
                .attr('text-anchor', 'end').attr('class', 'lbl' + (b ? ' lit' : '')).text('B=' + b);
            // nA and nB outputs feed nO inputs.
            DL.wire(g, nA.out.x, nA.out.y, nO.inA.x, nA.out.y, !!DL.NOT(a));
            DL.wire(g, nO.inA.x, nA.out.y, nO.inA.x, nO.inA.y, !!DL.NOT(a));
            DL.wire(g, nB.out.x, nB.out.y, nO.inB.x, nB.out.y, !!DL.NOT(b));
            DL.wire(g, nO.inB.x, nB.out.y, nO.inB.x, nO.inB.y, !!DL.NOT(b));
            DL.wire(g, nO.out.x, nO.out.y, nO.out.x + 24, nO.out.y, !!DL.OR(a, b));
            g.append('text').attr('x', nO.out.x + 30).attr('y', nO.out.y + 4)
                .attr('class', 'lbl' + (DL.OR(a, b) ? ' lit' : '')).text('Y=' + DL.OR(a, b));
        });
    }

    function drawAll() {
        drawInverter();
        drawNand();
        drawUniversal();
    }

    function init() {
        DL.bindBitButton(inBtn, drawAll);
        drawAll();
        window.addEventListener('themechange', drawAll);
        window.addEventListener('resize', drawAll);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
