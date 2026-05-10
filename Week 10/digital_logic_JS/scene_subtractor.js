// Scene 04 · Two's-complement adder/subtractor.
// Four-bit ripple-carry adder with each B input passed through an XOR gate
// whose other input is the mode bit M.  The mode bit is also fed to the
// lowest stage's carry-in.  M = 0 gives A + B; M = 1 gives A + ~B + 1 = A - B
// in two's-complement arithmetic.
(function () {
    var DL = window.DL;
    var bar = document.getElementById('dl-sub-bits');
    var btns = bar.querySelectorAll('button.bit-btn');
    var rdA   = document.getElementById('dl-sub-a');
    var rdB   = document.getElementById('dl-sub-b');
    var rdBx  = document.getElementById('dl-sub-bx');
    var rdR   = document.getElementById('dl-sub-r');
    var rdDec = document.getElementById('dl-sub-dec');
    var rdOv  = document.getElementById('dl-sub-ov');

    var svg = d3.select('#plot-dl-addsub');

    function readBits() {
        var obj = {};
        btns.forEach(function (b) { obj[b.getAttribute('data-key')] = DL.readBit(b); });
        return obj;
    }

    function fullAdder(a, b, ci) {
        var s = DL.XOR(DL.XOR(a, b), ci);
        var c = (a & b) | (ci & (a ^ b));
        return { s: s, c: c ? 1 : 0 };
    }

    function signed4(bits) {
        var u = bits[0] + 2 * bits[1] + 4 * bits[2] + 8 * bits[3];
        return bits[3] ? u - 16 : u;
    }

    function drawAddSub() {
        var f = DL.frame(svg, { W: 720, H: 420 });
        var bits = readBits();
        var aArr = [bits.a0, bits.a1, bits.a2, bits.a3];
        var bArr = [bits.b0, bits.b1, bits.b2, bits.b3];
        var M = bits.m;

        var bxArr = bArr.map(function (b) { return DL.XOR(b, M); });
        var carry = M;
        var sums = [0, 0, 0, 0];
        var carries = [M, 0, 0, 0];
        for (var i = 0; i < 4; i++) {
            var fa = fullAdder(aArr[i], bxArr[i], carry);
            sums[i] = fa.s;
            carry = fa.c;
            if (i < 3) carries[i + 1] = carry;
        }
        var cOut = carry;
        var faMs = fullAdder(aArr[3], bxArr[3], carries[3]);
        var ovf = DL.XOR(carries[3], faMs.c);

        var boxW = 120, boxH = 100, spacing = 30;
        var startX = 90;        // explicit margin so C_out label fits on left
        var boxY = 210;
        var carryY = boxY + boxH / 2;
        var mBusY = 160;

        // M bus and label
        var mLabelEnd = 90;
        f.g.append('text').attr('x', mLabelEnd).attr('y', mBusY + 4)
            .attr('text-anchor', 'end').attr('class', 'lbl' + (M ? ' lit' : ''))
            .text('M = ' + M + (M ? ' (SUB)' : ' (ADD)'));
        var mBusLeft = mLabelEnd + 6;
        var cInTapX = startX + 3 * (boxW + spacing) + boxW + 22;  // right of FA0
        DL.wire(f.g, mBusLeft, mBusY, cInTapX, mBusY, !!M);

        // M bus drops at far right to feed FA0's carry-in.
        var fa0Right = startX + 3 * (boxW + spacing) + boxW;
        DL.wire(f.g, cInTapX, mBusY, cInTapX, carryY, !!M);
        DL.wire(f.g, cInTapX, carryY, fa0Right, carryY, !!M);
        DL.dot(f.g, cInTapX, mBusY, !!M);
        f.g.append('text').attr('x', cInTapX).attr('y', mBusY - 8)
            .attr('text-anchor', 'middle').attr('class', 'lbl' + (M ? ' lit' : ''))
            .text('C_in = M');

        for (var k = 3; k >= 0; k--) {
            var idx = 3 - k;
            var x = startX + idx * (boxW + spacing);
            var bit = k;
            var aBit = aArr[bit], bBit = bArr[bit], bxBit = bxArr[bit], sBit = sums[bit];
            var cOutBit = (bit === 3) ? cOut : carries[bit + 1];

            // Stage column positions.
            var bColX  = x + 35;
            var aColX  = x + 95;

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
                .text('A_' + bit + '  B⊕M  C_in');

            // XOR for B_bit ⊕ M.  inA aligns with the B drop column so the
            // wire from B drops cleanly into the XOR.
            var xor = DL.gateXOR(f.g, bColX - 14, 80, 36, 30, !!bxBit);
            var xorOutX = xor.out.x + 6;

            // B label and drop
            f.g.append('text').attr('x', bColX).attr('y', 40)
                .attr('text-anchor', 'middle').attr('class', 'lbl' + (bBit ? ' lit' : ''))
                .text('B' + bit + '=' + bBit);
            DL.wire(f.g, bColX, 50, bColX, xor.inA.y, !!bBit);

            // M bus tap up to xor.inB
            DL.wire(f.g, bColX, mBusY, bColX, xor.inB.y, !!M);
            DL.dot(f.g, bColX, mBusY, !!M);

            // XOR output drops to FA top edge.
            DL.wire(f.g, xor.out.x, xor.out.y, xorOutX, xor.out.y, !!bxBit);
            DL.wire(f.g, xorOutX, xor.out.y, xorOutX, boxY, !!bxBit);

            // A label and drop into FA top.
            f.g.append('text').attr('x', aColX).attr('y', 40)
                .attr('text-anchor', 'middle').attr('class', 'lbl' + (aBit ? ' lit' : ''))
                .text('A' + bit + '=' + aBit);
            DL.wire(f.g, aColX, 50, aColX, boxY, !!aBit);

            // R_i (= sum) output below.
            DL.wire(f.g, x + boxW / 2, boxY + boxH, x + boxW / 2, boxY + boxH + 22, !!sBit);
            f.g.append('text').attr('x', x + boxW / 2).attr('y', boxY + boxH + 38)
                .attr('text-anchor', 'middle').attr('class', 'lbl' + (sBit ? ' lit' : ''))
                .text('R' + bit + '=' + sBit);

            // C_out (final) on the leftmost stage's left edge.
            if (bit === 3) {
                DL.wire(f.g, x - 22, carryY, x, carryY, !!cOutBit);
                f.g.append('text').attr('x', x - 26).attr('y', carryY + 4)
                    .attr('text-anchor', 'end').attr('class', 'lbl' + (cOutBit ? ' lit' : ''))
                    .text('C_out=' + cOutBit);
            }
            // Inter-stage carry wire only in the gap to the LEFT (carry into
            // bit + 1), drawn solely between the boxes so it never enters a
            // box body.
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
        var bxStr = bxArr.slice().reverse().join('');
        var rStr = sums.slice().reverse().join('');
        rdA.textContent = aStr;
        rdB.textContent = bStr;
        rdBx.textContent = bxStr;
        rdR.textContent = rStr;
        var aSig = signed4(aArr), bSig = signed4(bArr);
        var rSig = signed4(sums);
        rdDec.textContent = aSig + (M ? ' − ' : ' + ') + bSig + ' = ' + rSig;
        rdOv.textContent = ovf ? 'overflow' : 'no';
        rdOv.className = ovf ? 'v warn' : 'v on';
    }

    function init() {
        btns.forEach(function (b) { DL.bindBitButton(b, drawAddSub); });
        drawAddSub();
        window.addEventListener('themechange', drawAddSub);
        window.addEventListener('resize', drawAddSub);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
