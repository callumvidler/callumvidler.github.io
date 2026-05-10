// Scene 03 · Adders.
// Three diagrams driven by two four-bit operands A and B:
//   1. Half adder (XOR + AND).
//   2. Full adder (two half adders + OR).
//   3. Four-bit ripple-carry adder, drawn as a row of FA stages with carry
//      wires running only in the gaps between adjacent stages.
// The half and full adder diagrams are drawn for the lowest bit (A_0 / B_0).
(function () {
    var DL = window.DL;
    var bar = document.getElementById('dl-add-bits');
    var btns = bar.querySelectorAll('button.bit-btn');
    var rdA   = document.getElementById('dl-add-a');
    var rdB   = document.getElementById('dl-add-b');
    var rdS   = document.getElementById('dl-add-s');
    var rdDec = document.getElementById('dl-add-dec');

    var svgHalf   = d3.select('#plot-dl-half');
    var svgFull   = d3.select('#plot-dl-full');
    var svgRipple = d3.select('#plot-dl-ripple');

    function readBits() {
        var obj = {};
        btns.forEach(function (b) { obj[b.getAttribute('data-key')] = DL.readBit(b); });
        return obj;
    }

    function halfAdder(a, b) {
        return { s: DL.XOR(a, b), c: DL.AND(a, b) };
    }
    function fullAdder(a, b, ci) {
        var h1 = halfAdder(a, b);
        var h2 = halfAdder(h1.s, ci);
        return { s: h2.s, c: DL.OR(h1.c, h2.c) };
    }

    // ---------------- half adder ----------------
    function drawHalf() {
        var f = DL.frame(svgHalf, { W: 720, H: 280 });
        var bits = readBits();
        var a = bits.a0, b = bits.b0;
        var ha = halfAdder(a, b);

        // Gates positioned with the AND body's left edge clear of the bus
        // columns so input wires never run inside the gate body.
        var xor = DL.gateXOR(f.g, 280, 60,  70, 50, !!ha.s);
        var and = DL.gateAND(f.g, 280, 160, 70, 50, !!ha.c);

        // A bus and B bus are vertical columns left of the gate bodies, fed
        // from the top by labelled stubs.  Each bus has a horizontal stub at
        // the XOR row and another at the AND row.
        var aBusX = 120, bBusX = 200;
        var topY = 30;

        // labels at top
        f.g.append('text').attr('x', aBusX).attr('y', topY - 4)
            .attr('text-anchor', 'middle').attr('class', 'lbl' + (a ? ' lit' : '')).text('A = ' + a);
        f.g.append('text').attr('x', bBusX).attr('y', topY - 4)
            .attr('text-anchor', 'middle').attr('class', 'lbl' + (b ? ' lit' : '')).text('B = ' + b);

        // A bus
        DL.wire(f.g, aBusX, topY, aBusX, and.inA.y, !!a);
        DL.wire(f.g, aBusX, xor.inA.y, xor.inA.x, xor.inA.y, !!a);
        DL.wire(f.g, aBusX, and.inA.y, and.inA.x, and.inA.y, !!a);
        DL.dot(f.g, aBusX, xor.inA.y, !!a);

        // B bus
        DL.wire(f.g, bBusX, topY, bBusX, and.inB.y, !!b);
        DL.wire(f.g, bBusX, xor.inB.y, xor.inB.x, xor.inB.y, !!b);
        DL.wire(f.g, bBusX, and.inB.y, and.inB.x, and.inB.y, !!b);
        DL.dot(f.g, bBusX, xor.inB.y, !!b);

        // outputs
        var outX = 480;
        DL.wire(f.g, xor.out.x, xor.out.y, outX, xor.out.y, !!ha.s);
        f.g.append('text').attr('x', outX + 8).attr('y', xor.out.y + 4)
            .attr('class', 'lbl' + (ha.s ? ' lit' : '')).text('S = A ⊕ B = ' + ha.s);
        DL.wire(f.g, and.out.x, and.out.y, outX, and.out.y, !!ha.c);
        f.g.append('text').attr('x', outX + 8).attr('y', and.out.y + 4)
            .attr('class', 'lbl' + (ha.c ? ' lit' : '')).text('C_out = A · B = ' + ha.c);
    }

    // ---------------- full adder ----------------
    function drawFull() {
        var f = DL.frame(svgFull, { W: 720, H: 360 });
        var bits = readBits();
        var a = bits.a0, b = bits.b0, ci = 0;
        var fa = fullAdder(a, b, ci);
        var h1 = halfAdder(a, b);
        var h2 = halfAdder(h1.s, ci);

        // First half adder on the left, second half adder + OR on the right.
        var xor1 = DL.gateXOR(f.g, 200, 60,  60, 40, !!h1.s);
        var and1 = DL.gateAND(f.g, 200, 200, 60, 40, !!h1.c);
        var xor2 = DL.gateXOR(f.g, 400, 60,  60, 40, !!fa.s);
        var and2 = DL.gateAND(f.g, 400, 200, 60, 40, !!h2.c);
        var orG  = DL.gateOR (f.g, 540, 200, 60, 40, !!fa.c);

        // A and B fan out from bus columns at the far left.
        var aBusX = 70, bBusX = 140, topY = 30;
        f.g.append('text').attr('x', aBusX).attr('y', topY - 4)
            .attr('text-anchor', 'middle').attr('class', 'lbl' + (a ? ' lit' : '')).text('A = ' + a);
        f.g.append('text').attr('x', bBusX).attr('y', topY - 4)
            .attr('text-anchor', 'middle').attr('class', 'lbl' + (b ? ' lit' : '')).text('B = ' + b);

        // A bus from top down to and1.inA.y, with horizontal taps at the
        // XOR1 row and the AND1 row.
        DL.wire(f.g, aBusX, topY, aBusX, and1.inA.y, !!a);
        DL.wire(f.g, aBusX, xor1.inA.y, xor1.inA.x, xor1.inA.y, !!a);
        DL.wire(f.g, aBusX, and1.inA.y, and1.inA.x, and1.inA.y, !!a);
        DL.dot(f.g, aBusX, xor1.inA.y, !!a);

        // B bus
        DL.wire(f.g, bBusX, topY, bBusX, and1.inB.y, !!b);
        DL.wire(f.g, bBusX, xor1.inB.y, xor1.inB.x, xor1.inB.y, !!b);
        DL.wire(f.g, bBusX, and1.inB.y, and1.inB.x, and1.inB.y, !!b);
        DL.dot(f.g, bBusX, xor1.inB.y, !!b);

        // S1 = XOR1.out feeds XOR2.inA and AND2.inA via a vertical bus at
        // x=300 (between the two stages).  The bus spans from XOR2's input row
        // down to AND2's input row so taps on either end are flush.
        var s1BusX = 300;
        DL.wire(f.g, xor1.out.x, xor1.out.y, s1BusX, xor1.out.y, !!h1.s);
        DL.wire(f.g, s1BusX, xor2.inA.y, s1BusX, and2.inA.y, !!h1.s);
        DL.wire(f.g, s1BusX, xor2.inA.y, xor2.inA.x, xor2.inA.y, !!h1.s);
        DL.wire(f.g, s1BusX, and2.inA.y, and2.inA.x, and2.inA.y, !!h1.s);
        DL.dot(f.g, s1BusX, xor1.out.y, !!h1.s);

        // C_in enters at the bottom of the diagram, runs right under the gates,
        // then climbs up a column at x=340 to feed XOR2.inB and AND2.inB.
        var ciY = 320;
        var ciBusX = 340;
        f.g.append('text').attr('x', 50).attr('y', ciY + 4)
            .attr('text-anchor', 'end').attr('class', 'lbl' + (ci ? ' lit' : '')).text('C_in = ' + ci);
        DL.wire(f.g, 56, ciY, ciBusX, ciY, !!ci);
        DL.wire(f.g, ciBusX, ciY, ciBusX, xor2.inB.y, !!ci);
        DL.wire(f.g, ciBusX, xor2.inB.y, xor2.inB.x, xor2.inB.y, !!ci);
        DL.wire(f.g, ciBusX, and2.inB.y, and2.inB.x, and2.inB.y, !!ci);
        DL.dot(f.g, ciBusX, and2.inB.y, !!ci);

        // C1 = AND1.out → OR.inA.  Route below the gates to avoid AND2 body.
        DL.wire(f.g, and1.out.x, and1.out.y, and1.out.x + 30, and1.out.y, !!h1.c);
        DL.wire(f.g, and1.out.x + 30, and1.out.y, and1.out.x + 30, 280, !!h1.c);
        DL.wire(f.g, and1.out.x + 30, 280, 510, 280, !!h1.c);
        DL.wire(f.g, 510, 280, 510, orG.inA.y, !!h1.c);
        DL.wire(f.g, 510, orG.inA.y, orG.inA.x, orG.inA.y, !!h1.c);

        // C2 = AND2.out → OR.inB
        DL.wire(f.g, and2.out.x, and2.out.y, orG.inB.x - 10, and2.out.y, !!h2.c);
        DL.wire(f.g, orG.inB.x - 10, and2.out.y, orG.inB.x - 10, orG.inB.y, !!h2.c);
        DL.wire(f.g, orG.inB.x - 10, orG.inB.y, orG.inB.x, orG.inB.y, !!h2.c);

        // S = XOR2.out
        DL.wire(f.g, xor2.out.x, xor2.out.y, 640, xor2.out.y, !!fa.s);
        f.g.append('text').attr('x', 648).attr('y', xor2.out.y + 4)
            .attr('class', 'lbl' + (fa.s ? ' lit' : '')).text('S = ' + fa.s);

        // C_out = OR.out
        DL.wire(f.g, orG.out.x, orG.out.y, 640, orG.out.y, !!fa.c);
        f.g.append('text').attr('x', 648).attr('y', orG.out.y + 4)
            .attr('class', 'lbl' + (fa.c ? ' lit' : '')).text('C_out = ' + fa.c);
    }

    // ---------------- 4-bit ripple-carry ----------------
    function drawRipple() {
        var f = DL.frame(svgRipple, { W: 720, H: 300 });
        var bits = readBits();
        var aArr = [bits.a0, bits.a1, bits.a2, bits.a3];
        var bArr = [bits.b0, bits.b1, bits.b2, bits.b3];

        var carry = 0;
        var sums = [0, 0, 0, 0];
        var carries = [0, 0, 0, 0];
        for (var i = 0; i < 4; i++) {
            carries[i] = carry;
            var fa = fullAdder(aArr[i], bArr[i], carry);
            sums[i] = fa.s;
            carry = fa.c;
        }
        var cOut = carry;

        var boxW = 120, boxH = 110;
        var spacing = 30;
        var startX = 90;        // explicit margin so C_out label fits on left
        var boxY = 90;
        var carryY = boxY + boxH / 2;

        for (var k = 3; k >= 0; k--) {
            var idx = 3 - k;
            var x = startX + idx * (boxW + spacing);
            var bit = k;
            var aBit = aArr[bit], bBit = bArr[bit], sBit = sums[bit];
            var cInBit = carries[bit];
            var cOutBit = (bit === 3) ? cOut : carries[bit + 1];

            // FA box
            f.g.append('rect').attr('x', x).attr('y', boxY)
                .attr('width', boxW).attr('height', boxH)
                .attr('rx', 8).attr('fill', 'var(--bg-panel)')
                .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
            f.g.append('text').attr('x', x + boxW / 2).attr('y', boxY + 30)
                .attr('text-anchor', 'middle').attr('class', 'gate-title')
                .text('FA' + bit);
            f.g.append('text').attr('x', x + boxW / 2).attr('y', boxY + 50)
                .attr('text-anchor', 'middle').attr('class', 'gate-expr')
                .text('A_' + bit + ' B_' + bit + ' C_in');

            // A_i, B_i input stubs from above
            var aPinX = x + 30, bPinX = x + boxW - 30;
            f.g.append('text').attr('x', aPinX).attr('y', boxY - 30)
                .attr('text-anchor', 'middle').attr('class', 'lbl' + (aBit ? ' lit' : ''))
                .text('A' + bit + '=' + aBit);
            f.g.append('text').attr('x', bPinX).attr('y', boxY - 30)
                .attr('text-anchor', 'middle').attr('class', 'lbl' + (bBit ? ' lit' : ''))
                .text('B' + bit + '=' + bBit);
            DL.wire(f.g, aPinX, boxY - 18, aPinX, boxY, !!aBit);
            DL.wire(f.g, bPinX, boxY - 18, bPinX, boxY, !!bBit);

            // S_i output below
            DL.wire(f.g, x + boxW / 2, boxY + boxH, x + boxW / 2, boxY + boxH + 22, !!sBit);
            f.g.append('text').attr('x', x + boxW / 2).attr('y', boxY + boxH + 38)
                .attr('text-anchor', 'middle').attr('class', 'lbl' + (sBit ? ' lit' : ''))
                .text('S' + bit + '=' + sBit);

            // C_in label centred above the carry-in stub on the rightmost stage.
            if (bit === 0) {
                DL.wire(f.g, x + boxW, carryY, x + boxW + 22, carryY, !!cInBit);
                f.g.append('text').attr('x', x + boxW + 11).attr('y', carryY - 6)
                    .attr('text-anchor', 'middle').attr('class', 'lbl' + (cInBit ? ' lit' : ''))
                    .text('C_in=' + cInBit);
            }
            // C_out (final): the leftmost stage exports it on its left edge.
            if (bit === 3) {
                DL.wire(f.g, x - 22, carryY, x, carryY, !!cOutBit);
                f.g.append('text').attr('x', x - 26).attr('y', carryY + 4)
                    .attr('text-anchor', 'end').attr('class', 'lbl' + (cOutBit ? ' lit' : ''))
                    .text('C_out=' + cOutBit);
            }
            // Inter-stage carry: this stage's left edge connects to the right
            // edge of the box to the LEFT (which holds bit + 1).  Only valid
            // when bit < 3.  cOutBit here represents carries[bit + 1], the
            // carry from this FA into the next.
            if (bit < 3) {
                var leftIdx = 3 - (bit + 1);
                var leftBoxRight = startX + leftIdx * (boxW + spacing) + boxW;
                DL.wire(f.g, leftBoxRight, carryY, x, carryY, !!cOutBit);
                f.g.append('text').attr('x', (leftBoxRight + x) / 2)
                    .attr('y', carryY - 6)
                    .attr('text-anchor', 'middle').attr('class', 'lbl' + (cOutBit ? ' lit' : ''))
                    .text('C' + (bit + 1) + '=' + cOutBit);
            }
        }

        // readouts
        var aStr = aArr.slice().reverse().join('');
        var bStr = bArr.slice().reverse().join('');
        var sStr = String(cOut) + sums.slice().reverse().join('');
        var aDec = parseInt(aStr, 2), bDec = parseInt(bStr, 2);
        rdA.textContent = aStr;
        rdB.textContent = bStr;
        rdS.textContent = sStr;
        rdDec.textContent = aDec + ' + ' + bDec + ' = ' + (aDec + bDec);
    }

    function drawAll() {
        drawHalf();
        drawFull();
        drawRipple();
    }

    function init() {
        btns.forEach(function (b) { DL.bindBitButton(b, drawAll); });
        drawAll();
        window.addEventListener('themechange', drawAll);
        window.addEventListener('resize', drawAll);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
