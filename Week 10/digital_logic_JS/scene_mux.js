// Scene 05 · Multiplexers.
// Two diagrams.
//   1. 2:1 mux at the gate level: NOT on S, two ANDs gating D_0 and D_1, OR on
//      the outputs.
//   2. 4:1 mux drawn at block level with the routed channel highlighted.  The
//      four data inputs and the two select bits are user-toggled.
(function () {
    var DL = window.DL;
    var bar = document.getElementById('dl-mux-bits');
    var btns = bar.querySelectorAll('button.bit-btn');
    var rdSel   = document.getElementById('dl-mux-sel');
    var rdRoute = document.getElementById('dl-mux-route');
    var rdY     = document.getElementById('dl-mux-y');

    var svg2 = d3.select('#plot-dl-mux2');
    var svg4 = d3.select('#plot-dl-mux4');

    function readBits() {
        var obj = {};
        btns.forEach(function (b) { obj[b.getAttribute('data-key')] = DL.readBit(b); });
        return obj;
    }

    // ---------------- 2:1 mux ----------------
    function drawMux2() {
        var f = DL.frame(svg2, { W: 720, H: 280 });
        var bits = readBits();
        var d0 = bits.d0, d1 = bits.d1, s = bits.s0;
        var sBar = DL.NOT(s);
        var topAnd = DL.AND(sBar, d0);
        var botAnd = DL.AND(s, d1);
        var y = DL.OR(topAnd, botAnd);

        var inX = 60;
        f.g.append('text').attr('x', inX - 8).attr('y', 64)
            .attr('text-anchor', 'end').attr('class', 'lbl' + (d0 ? ' lit' : '')).text('D0 = ' + d0);
        f.g.append('text').attr('x', inX - 8).attr('y', 204)
            .attr('text-anchor', 'end').attr('class', 'lbl' + (d1 ? ' lit' : '')).text('D1 = ' + d1);
        f.g.append('text').attr('x', inX - 8).attr('y', 244)
            .attr('text-anchor', 'end').attr('class', 'lbl' + (s ? ' lit' : '')).text('S = ' + s);

        // NOT inverter for S sits between the two AND rows.
        var notG = DL.gateNOT(f.g, 240, 96, 36, 28, !!sBar);
        // S column on the left of the AND gates carries S to the NOT input
        // and to the bottom AND's S pin.
        var sColX = 210;
        DL.wire(f.g, inX, 240, sColX, 240, !!s);
        DL.wire(f.g, sColX, 240, sColX, notG.inA.y, !!s);
        DL.wire(f.g, sColX, notG.inA.y, notG.inA.x, notG.inA.y, !!s);

        var topAndG = DL.gateAND(f.g, 300, 50,  70, 50, !!topAnd);
        var botAndG = DL.gateAND(f.g, 300, 170, 70, 50, !!botAnd);
        var orG     = DL.gateOR (f.g, 440, 110, 70, 50, !!y);

        // D0 → topAND.inA
        DL.wire(f.g, inX, 60, topAndG.inA.x, 60, !!d0);
        DL.wire(f.g, topAndG.inA.x, 60, topAndG.inA.x, topAndG.inA.y, !!d0);

        // D1 → botAND.inA
        DL.wire(f.g, inX, 200, botAndG.inA.x, 200, !!d1);
        DL.wire(f.g, botAndG.inA.x, 200, botAndG.inA.x, botAndG.inA.y, !!d1);

        // NOT output → topAND.inB
        DL.wire(f.g, notG.out.x, notG.out.y, topAndG.inB.x, notG.out.y, !!sBar);
        DL.wire(f.g, topAndG.inB.x, notG.out.y, topAndG.inB.x, topAndG.inB.y, !!sBar);

        // S column tap → botAND.inB
        DL.wire(f.g, sColX, 240, botAndG.inB.x, 240, !!s);
        DL.wire(f.g, botAndG.inB.x, 240, botAndG.inB.x, botAndG.inB.y, !!s);
        DL.dot(f.g, sColX, 240, !!s);

        // ANDs → OR
        DL.wire(f.g, topAndG.out.x, topAndG.out.y, orG.inA.x, topAndG.out.y, !!topAnd);
        DL.wire(f.g, orG.inA.x, topAndG.out.y, orG.inA.x, orG.inA.y, !!topAnd);
        DL.wire(f.g, botAndG.out.x, botAndG.out.y, orG.inB.x, botAndG.out.y, !!botAnd);
        DL.wire(f.g, orG.inB.x, botAndG.out.y, orG.inB.x, orG.inB.y, !!botAnd);

        // Output
        DL.wire(f.g, orG.out.x, orG.out.y, 580, orG.out.y, !!y);
        f.g.append('text').attr('x', 588).attr('y', orG.out.y + 4)
            .attr('class', 'lbl' + (y ? ' lit' : '')).text('Y = ' + y);
    }

    // ---------------- 4:1 mux ----------------
    function drawMux4() {
        var f = DL.frame(svg4, { W: 720, H: 380 });
        var bits = readBits();
        var d = [bits.d0, bits.d1, bits.d2, bits.d3];
        var s1 = bits.s1, s0 = bits.s0;
        var sel = (s1 << 1) | s0;
        var y = d[sel];

        // Trapezoidal mux block
        var bx = 320, by = 80, bw = 130, bh = 240;
        var taper = 30;
        var path = 'M ' + bx + ',' + by +
                   ' L ' + (bx + bw) + ',' + (by + taper) +
                   ' L ' + (bx + bw) + ',' + (by + bh - taper) +
                   ' L ' + bx + ',' + (by + bh) + ' Z';
        f.g.append('path').attr('class', 'gate' + (y ? ' hi' : '')).attr('d', path);
        f.g.append('text').attr('x', bx + bw / 2 - 6).attr('y', by + bh / 2 + 4)
            .attr('text-anchor', 'middle').attr('class', 'gate-title').text('4:1 MUX');

        // Four data inputs into the left edge, evenly spaced.
        var inX = 60;
        for (var i = 0; i < 4; i++) {
            var py = by + 30 + i * 60;
            var di = d[i];
            var litRoute = (i === sel);
            f.g.append('text').attr('x', inX - 8).attr('y', py + 4)
                .attr('text-anchor', 'end').attr('class', 'lbl' + (di ? ' lit' : ''))
                .text('D' + i + ' = ' + di);
            DL.wire(f.g, inX, py, bx, py, !!di);
            if (litRoute) {
                f.g.append('circle').attr('cx', bx + 18).attr('cy', py)
                    .attr('r', 5).attr('fill', 'var(--c-hi)');
            }
        }

        // Output on the right
        var outY = by + bh / 2;
        DL.wire(f.g, bx + bw, outY, 600, outY, !!y);
        f.g.append('text').attr('x', 608).attr('y', outY + 4)
            .attr('class', 'lbl' + (y ? ' lit' : '')).text('Y = D' + sel + ' = ' + y);

        // Select inputs from below
        var s1x = bx + 40, s0x = bx + bw - 40;
        f.g.append('text').attr('x', s1x).attr('y', by + bh + 36)
            .attr('text-anchor', 'middle').attr('class', 'lbl' + (s1 ? ' lit' : ''))
            .text('S1 = ' + s1);
        f.g.append('text').attr('x', s0x).attr('y', by + bh + 36)
            .attr('text-anchor', 'middle').attr('class', 'lbl' + (s0 ? ' lit' : ''))
            .text('S0 = ' + s0);
        DL.wire(f.g, s1x, by + bh + 24, s1x, by + bh - 8, !!s1);
        DL.wire(f.g, s0x, by + bh + 24, s0x, by + bh - 8, !!s0);

        // Boolean expression near the top of the box
        f.g.append('text').attr('x', bx + bw / 2).attr('y', by - 10)
            .attr('text-anchor', 'middle').attr('class', 'gate-expr')
            .text('Y = ¬S1·¬S0·D0 + ¬S1·S0·D1 + S1·¬S0·D2 + S1·S0·D3');

        rdSel.textContent = '' + s1 + s0;
        rdRoute.textContent = 'D' + sel;
        rdY.textContent = String(y);
    }

    function drawAll() {
        drawMux2();
        drawMux4();
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
