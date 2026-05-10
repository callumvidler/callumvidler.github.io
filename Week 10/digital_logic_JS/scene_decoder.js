// Scene 06 · Binary decoder.
// Two diagrams.
//   1. 2-to-4 decoder at the gate level: two inverters forming Ā1, Ā0, four
//      AND gates whose input pattern matches the binary index of each output.
//   2. 3-to-8 decoder drawn as a block with a one-hot output bus; the asserted
//      line is highlighted.  An enable input forces every output low.
(function () {
    var DL = window.DL;
    var bar = document.getElementById('dl-dec-bits');
    var btns = bar.querySelectorAll('button.bit-btn');
    var rdAddr = document.getElementById('dl-dec-addr');
    var rdInt  = document.getElementById('dl-dec-int');
    var rdLine = document.getElementById('dl-dec-line');

    var svg24 = d3.select('#plot-dl-dec24');
    var svg38 = d3.select('#plot-dl-dec38');

    function readBits() {
        var obj = {};
        btns.forEach(function (b) { obj[b.getAttribute('data-key')] = DL.readBit(b); });
        return obj;
    }

    // ---------------- 2-to-4 decoder ----------------
    function drawDec24() {
        var f = DL.frame(svg24, { W: 720, H: 380 });
        var bits = readBits();
        // Use the low two address bits A1, A0; the third address bit feeds
        // only the 3-to-8 view.
        var a1 = bits.a1, a0 = bits.a0, en = bits.en;
        var a1Bar = DL.NOT(a1), a0Bar = DL.NOT(a0);

        // Bus rows.  A1, Ā1 sit above the AND row; A0, Ā0 sit below.
        var a1Y = 80, a1BarY = 110, a0Y = 260, a0BarY = 290;
        var busLeft = 60, busRight = 660;

        // Input labels and rails
        f.g.append('text').attr('x', 52).attr('y', a1Y + 4)
            .attr('text-anchor', 'end').attr('class', 'lbl' + (a1 ? ' lit' : '')).text('A1 = ' + a1);
        f.g.append('text').attr('x', 52).attr('y', a0Y + 4)
            .attr('text-anchor', 'end').attr('class', 'lbl' + (a0 ? ' lit' : '')).text('A0 = ' + a0);

        // A1 bus
        DL.wire(f.g, busLeft, a1Y, busRight, a1Y, !!a1);
        // NOT for Ā1: tap A1 down at x=100 into the inverter, output forms Ā1 bus.
        var notA1 = DL.gateNOT(f.g, 110, a1BarY - 12, 36, 24, !!a1Bar);
        DL.wire(f.g, 100, a1Y, 100, notA1.inA.y, !!a1);
        DL.wire(f.g, 100, notA1.inA.y, notA1.inA.x, notA1.inA.y, !!a1);
        DL.dot(f.g, 100, a1Y, !!a1);
        DL.wire(f.g, notA1.out.x, notA1.out.y, busRight, notA1.out.y, !!a1Bar);

        // A0 bus + Ā0
        DL.wire(f.g, busLeft, a0Y, busRight, a0Y, !!a0);
        var notA0 = DL.gateNOT(f.g, 110, a0BarY - 12, 36, 24, !!a0Bar);
        DL.wire(f.g, 100, a0Y, 100, notA0.inA.y, !!a0);
        DL.wire(f.g, 100, notA0.inA.y, notA0.inA.x, notA0.inA.y, !!a0);
        DL.dot(f.g, 100, a0Y, !!a0);
        DL.wire(f.g, notA0.out.x, notA0.out.y, busRight, notA0.out.y, !!a0Bar);

        // Bus labels at the right end
        f.g.append('text').attr('x', busRight + 8).attr('y', a1Y + 4)
            .attr('class', 'lbl' + (a1 ? ' lit' : '')).text('A1');
        f.g.append('text').attr('x', busRight + 8).attr('y', a1BarY + 4)
            .attr('class', 'lbl' + (a1Bar ? ' lit' : '')).text('Ā1');
        f.g.append('text').attr('x', busRight + 8).attr('y', a0Y + 4)
            .attr('class', 'lbl' + (a0 ? ' lit' : '')).text('A0');
        f.g.append('text').attr('x', busRight + 8).attr('y', a0BarY + 4)
            .attr('class', 'lbl' + (a0Bar ? ' lit' : '')).text('Ā0');

        // Four AND gates, each picking one of {A1, Ā1} and one of {A0, Ā0}.
        var defs = [
            { name: 'Y0', i1: a1Bar, i0: a0Bar, topY: a1BarY, botY: a0BarY, x: 160 },
            { name: 'Y1', i1: a1Bar, i0: a0,    topY: a1BarY, botY: a0Y,    x: 300 },
            { name: 'Y2', i1: a1,    i0: a0Bar, topY: a1Y,    botY: a0BarY, x: 440 },
            { name: 'Y3', i1: a1,    i0: a0,    topY: a1Y,    botY: a0Y,    x: 580 }
        ];

        defs.forEach(function (gd) {
            var out = en ? DL.AND(gd.i1, gd.i0) : 0;
            var gate = DL.gateAND(f.g, gd.x, 170, 60, 30, !!out);
            // inA drop from the relevant top bus
            DL.wire(f.g, gd.x, gd.topY, gd.x, gate.inA.y, !!gd.i1);
            DL.dot(f.g, gd.x, gd.topY, !!gd.i1);
            // inB rise from the relevant bottom bus
            DL.wire(f.g, gd.x, gd.botY, gd.x, gate.inB.y, !!gd.i0);
            DL.dot(f.g, gd.x, gd.botY, !!gd.i0);
            // output extension and label
            DL.wire(f.g, gate.out.x, gate.out.y, gate.out.x + 30, gate.out.y, !!out);
            f.g.append('text').attr('x', gate.out.x + 34).attr('y', gate.out.y + 4)
                .attr('class', 'lbl' + (out ? ' lit' : ''))
                .text(gd.name + ' = ' + out);
        });

        // EN annotation below
        f.g.append('text').attr('x', 52).attr('y', 354)
            .attr('text-anchor', 'end').attr('class', 'lbl' + (en ? ' lit' : '')).text('EN = ' + en);
        f.g.append('text').attr('x', 60).attr('y', 354)
            .attr('class', 'gate-expr')
            .text('when EN = 0, every Y_k is forced to 0');
    }

    // ---------------- 3-to-8 decoder ----------------
    function drawDec38() {
        var f = DL.frame(svg38, { W: 720, H: 460 });
        var bits = readBits();
        var a2 = bits.a2, a1 = bits.a1, a0 = bits.a0;
        var en = bits.en;
        var addr = (a2 << 2) | (a1 << 1) | a0;

        // Block diagram: trapezoid with three address inputs on the left, an
        // enable line, and eight outputs on the right.
        var bx = 220, by = 60, bw = 160, bh = 360;
        var path = 'M ' + bx + ',' + (by + 20) +
                   ' L ' + (bx + bw) + ',' + by +
                   ' L ' + (bx + bw) + ',' + (by + bh) +
                   ' L ' + bx + ',' + (by + bh - 20) + ' Z';
        f.g.append('path').attr('class', 'gate' + (en ? ' hi' : '')).attr('d', path);
        f.g.append('text').attr('x', bx + bw / 2).attr('y', by + bh / 2 + 4)
            .attr('text-anchor', 'middle').attr('class', 'gate-title').text('3-to-8 DECODER');

        // Address inputs at left
        var inX = 60;
        var addrY = [by + 80, by + 140, by + 200];
        var addrBits = [a2, a1, a0];
        var addrLabels = ['A2', 'A1', 'A0'];
        for (var i = 0; i < 3; i++) {
            f.g.append('text').attr('x', inX - 8).attr('y', addrY[i] + 4)
                .attr('text-anchor', 'end').attr('class', 'lbl' + (addrBits[i] ? ' lit' : ''))
                .text(addrLabels[i] + ' = ' + addrBits[i]);
            DL.wire(f.g, inX, addrY[i], bx, addrY[i], !!addrBits[i]);
        }
        // Enable input
        var enY = by + 280;
        f.g.append('text').attr('x', inX - 8).attr('y', enY + 4)
            .attr('text-anchor', 'end').attr('class', 'lbl' + (en ? ' lit' : ''))
            .text('EN = ' + en);
        DL.wire(f.g, inX, enY, bx, enY, !!en);

        // Eight outputs on the right
        var outX = bx + bw;
        for (var k = 0; k < 8; k++) {
            var oy = by + 24 + k * ((bh - 48) / 7);
            var asserted = en && (k === addr);
            DL.wire(f.g, outX, oy, outX + 80, oy, !!asserted);
            f.g.append('text').attr('x', outX + 86).attr('y', oy + 4)
                .attr('class', 'lbl' + (asserted ? ' lit' : '')).text('Y' + k + ' = ' + (asserted ? 1 : 0));
            if (asserted) {
                f.g.append('circle').attr('cx', outX - 14).attr('cy', oy)
                    .attr('r', 5).attr('fill', 'var(--c-hi)');
            }
        }

        // expression below
        f.g.append('text').attr('x', bx + bw / 2).attr('y', by + bh + 30)
            .attr('text-anchor', 'middle').attr('class', 'gate-expr')
            .text('Y_k = 1 iff (A2 A1 A0) = k and EN = 1');

        rdAddr.textContent = '' + a2 + a1 + a0;
        rdInt.textContent = '' + addr;
        rdLine.textContent = en ? ('Y' + addr) : 'none';
    }

    function drawAll() {
        drawDec24();
        drawDec38();
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
