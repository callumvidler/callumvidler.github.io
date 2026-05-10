// Scene 01 · Logic gate explorer.
// Defines window.DL with shared drawing primitives used by every scene on this
// page (gate symbols, wires, bit toggles, frame setup). Then renders the eight
// canonical gates (NOT, BUF, AND, OR, NAND, NOR, XOR, XNOR) as a grid: each
// cell shows the symbol, Boolean expression, two-input truth table and a
// highlighted row for the current state of the global A and B toggles.
(function () {

    // ===================== shared library =====================
    var DL = {};

    // logic helpers ----------------------------------------------------------
    DL.NOT  = function (a) { return a ? 0 : 1; };
    DL.AND  = function (a, b) { return (a && b) ? 1 : 0; };
    DL.OR   = function (a, b) { return (a || b) ? 1 : 0; };
    DL.NAND = function (a, b) { return DL.NOT(DL.AND(a, b)); };
    DL.NOR  = function (a, b) { return DL.NOT(DL.OR(a, b)); };
    DL.XOR  = function (a, b) { return (a ^ b) ? 1 : 0; };
    DL.XNOR = function (a, b) { return DL.NOT(DL.XOR(a, b)); };

    // bit-toggle button helper. Reads/writes the data-on attribute and updates
    // the visible label. The caller passes a callback fired on every toggle.
    DL.bindBitButton = function (btn, onChange) {
        if (!btn) return;
        btn.addEventListener('click', function () {
            var cur = btn.getAttribute('data-on') === '1' ? 1 : 0;
            var nxt = cur ? 0 : 1;
            btn.setAttribute('data-on', String(nxt));
            // Default label is the bit value, but mode buttons keep ADD/SUB.
            if (!btn.classList.contains('mode-btn')) {
                btn.textContent = String(nxt);
            } else {
                btn.textContent = nxt ? 'SUB' : 'ADD';
            }
            if (onChange) onChange(nxt);
        });
    };

    DL.readBit = function (btn) {
        return btn && btn.getAttribute('data-on') === '1' ? 1 : 0;
    };

    // SVG frame setup, mirroring the analog pages.
    DL.frame = function (svg, opts) {
        opts = opts || {};
        var W = opts.W || 720;
        var H = opts.H || 360;
        svg.attr('viewBox', '0 0 ' + W + ' ' + H).classed('dig', true);
        svg.selectAll('*').remove();
        var g = svg.append('g');
        return { g: g, W: W, H: H };
    };

    // wire draws an orthogonal polyline between (x1,y1) and (x2,y2). If the
    // points share an axis a single segment is drawn, otherwise an L bend.
    DL.wire = function (g, x1, y1, x2, y2, hi) {
        var pts;
        if (x1 === x2 || y1 === y2) {
            pts = x1 + ',' + y1 + ' ' + x2 + ',' + y2;
        } else {
            pts = x1 + ',' + y1 + ' ' + x2 + ',' + y1 + ' ' + x2 + ',' + y2;
        }
        g.append('polyline').attr('class', 'wire' + (hi ? ' hi' : ''))
            .attr('points', pts);
    };

    DL.dot = function (g, x, y, hi) {
        g.append('circle').attr('class', 'pin-dot' + (hi ? ' hi' : ''))
            .attr('cx', x).attr('cy', y).attr('r', 3);
    };

    // Output bubble (small circle on a gate output) for negated gates.
    DL.bubble = function (g, x, y, hi) {
        g.append('circle').attr('class', 'bubble' + (hi ? ' hi' : ''))
            .attr('cx', x).attr('cy', y).attr('r', 5);
    };

    // ---- gate symbol primitives -------------------------------------------
    // Each symbol is drawn into a logical 60x40 box anchored at (x,y) (top-left
    // corner). Returns the input pin coords and output pin coord. The optional
    // hi flag highlights the body when the gate is asserting high.
    DL.gateAND = function (g, x, y, w, h, hi) {
        w = w || 60; h = h || 40;
        var d = 'M ' + x + ',' + y +
                ' L ' + (x + w / 2) + ',' + y +
                ' A ' + (h / 2) + ',' + (h / 2) + ' 0 0 1 ' + (x + w / 2) + ',' + (y + h) +
                ' L ' + x + ',' + (y + h) + ' Z';
        g.append('path').attr('class', 'gate' + (hi ? ' hi' : '')).attr('d', d);
        return {
            inA: { x: x,           y: y + h * 0.25 },
            inB: { x: x,           y: y + h * 0.75 },
            out: { x: x + w / 2 + h / 2, y: y + h / 2 }
        };
    };

    DL.gateOR = function (g, x, y, w, h, hi) {
        w = w || 60; h = h || 40;
        // Curved-back shield approximation.
        var d = 'M ' + x + ',' + y +
                ' Q ' + (x + 18) + ',' + (y + h / 2) + ' ' + x + ',' + (y + h) +
                ' Q ' + (x + w * 0.55) + ',' + (y + h) +
                ' '   + (x + w)        + ',' + (y + h / 2) +
                ' Q ' + (x + w * 0.55) + ',' + y +
                ' '   + x + ',' + y + ' Z';
        g.append('path').attr('class', 'gate' + (hi ? ' hi' : '')).attr('d', d);
        // Pins land past the curved back so input wires meet the body cleanly.
        return {
            inA: { x: x + 10, y: y + h * 0.25 },
            inB: { x: x + 10, y: y + h * 0.75 },
            out: { x: x + w, y: y + h / 2 }
        };
    };

    DL.gateXOR = function (g, x, y, w, h, hi) {
        w = w || 60; h = h || 40;
        // OR shield + extra back-curve to denote exclusive.
        var orPin = DL.gateOR(g, x + 6, y, w - 6, h, hi);
        g.append('path').attr('class', 'gate')
            .attr('d',
                'M ' + x + ',' + y +
                ' Q ' + (x + 18) + ',' + (y + h / 2) + ' ' + x + ',' + (y + h))
            .attr('fill', 'none');
        // Pins land past both back-arcs so input wires meet the body cleanly.
        return {
            inA: { x: x + 14, y: y + h * 0.25 },
            inB: { x: x + 14, y: y + h * 0.75 },
            out: orPin.out
        };
    };

    DL.gateNOT = function (g, x, y, w, h, hi) {
        w = w || 50; h = h || 36;
        var d = 'M ' + x + ',' + y +
                ' L ' + x + ',' + (y + h) +
                ' L ' + (x + w - 8) + ',' + (y + h / 2) + ' Z';
        g.append('path').attr('class', 'gate' + (hi ? ' hi' : '')).attr('d', d);
        DL.bubble(g, x + w - 4, y + h / 2, hi);
        return {
            inA: { x: x,         y: y + h / 2 },
            out: { x: x + w + 1, y: y + h / 2 }
        };
    };

    DL.gateBUF = function (g, x, y, w, h, hi) {
        w = w || 50; h = h || 36;
        var d = 'M ' + x + ',' + y +
                ' L ' + x + ',' + (y + h) +
                ' L ' + (x + w) + ',' + (y + h / 2) + ' Z';
        g.append('path').attr('class', 'gate' + (hi ? ' hi' : '')).attr('d', d);
        return {
            inA: { x: x,     y: y + h / 2 },
            out: { x: x + w, y: y + h / 2 }
        };
    };

    // negated forms add a bubble on the output of the base gate
    DL.gateNAND = function (g, x, y, w, h, hi) {
        var p = DL.gateAND(g, x, y, w, h, hi);
        DL.bubble(g, p.out.x + 5, p.out.y, hi);
        p.out = { x: p.out.x + 10, y: p.out.y };
        return p;
    };
    DL.gateNOR = function (g, x, y, w, h, hi) {
        var p = DL.gateOR(g, x, y, w, h, hi);
        DL.bubble(g, p.out.x + 5, p.out.y, hi);
        p.out = { x: p.out.x + 10, y: p.out.y };
        return p;
    };
    DL.gateXNOR = function (g, x, y, w, h, hi) {
        var p = DL.gateXOR(g, x, y, w, h, hi);
        DL.bubble(g, p.out.x + 5, p.out.y, hi);
        p.out = { x: p.out.x + 10, y: p.out.y };
        return p;
    };

    window.DL = DL;

    // ===================== scene 01: gate explorer =====================
    var aBtn = document.getElementById('dl-g-a');
    var bBtn = document.getElementById('dl-g-b');
    var svg  = d3.select('#plot-dl-gates');

    // gate descriptors. fn1 takes one input, fn2 takes two.  The optional
    // `note` is rendered as a small footnote at the bottom of the cell to
    // explain the symbols used in the Boolean expression.  Each note is an
    // array of segments; segments marked `big: true` are emphasised at a
    // larger font size so the symbol stands out from the surrounding prose.
    var gates = [
        { name: 'NOT',  expr: 'Y = Ā',          arity: 1, sym: DL.gateNOT,  fn: function (a) { return DL.NOT(a); },
          note: [
              { text: 'Ā', big: true },
              { text: ': logical negation of A' }
          ] },
        { name: 'BUF',  expr: 'Y = A',          arity: 1, sym: DL.gateBUF,  fn: function (a) { return a; } },
        { name: 'AND',  expr: 'Y = A · B',      arity: 2, sym: DL.gateAND,  fn: DL.AND  },
        { name: 'OR',   expr: 'Y = A + B',      arity: 2, sym: DL.gateOR,   fn: DL.OR   },
        { name: 'NAND', expr: 'Y = ¬(A · B)',    arity: 2, sym: DL.gateNAND, fn: DL.NAND,
          note: [
              { text: '¬', big: true },
              { text: ': logical negation' }
          ] },
        { name: 'NOR',  expr: 'Y = ¬(A + B)',    arity: 2, sym: DL.gateNOR,  fn: DL.NOR,
          note: [
              { text: '¬', big: true },
              { text: ': logical negation' }
          ] },
        { name: 'XOR',  expr: 'Y = A ⊕ B',       arity: 2, sym: DL.gateXOR,  fn: DL.XOR,
          note: [
              { text: '⊕', big: true },
              { text: ': exclusive-OR (1 when A ≠ B)' }
          ] },
        { name: 'XNOR', expr: 'Y = ¬(A ⊕ B)',    arity: 2, sym: DL.gateXNOR, fn: DL.XNOR,
          note: [
              { text: '⊕', big: true },
              { text: ': exclusive-OR. ' },
              { text: '¬', big: true },
              { text: ': negation' }
          ] }
    ];

    function drawGates() {
        // topPad reserves vertical space at the top of the SVG so the floating
        // ".label" overlay (which is absolutely positioned in the box) does not
        // sit on top of the first row of gate cells.
        var topPad = 36;
        var f = DL.frame(svg, { W: 600, H: 820 + topPad });
        var COLS = 2, ROWS = 4;
        var cellW = f.W / COLS, cellH = (f.H - topPad) / ROWS;
        var a = DL.readBit(aBtn);
        var b = DL.readBit(bBtn);

        gates.forEach(function (g, i) {
            var col = i % COLS, row = Math.floor(i / COLS);
            var ox = col * cellW, oy = topPad + row * cellH;
            var cell = f.g.append('g').attr('transform', 'translate(' + ox + ',' + oy + ')');

            // cell border
            cell.append('rect').attr('x', 6).attr('y', 6)
                .attr('width', cellW - 12).attr('height', cellH - 12)
                .attr('rx', 8).attr('fill', 'none')
                .attr('stroke', 'var(--border)').attr('stroke-width', 1);

            // title and expression (top of cell)
            cell.append('text').attr('class', 'gate-title')
                .attr('x', 22).attr('y', 28).text(g.name);
            cell.append('text').attr('class', 'gate-expr')
                .attr('x', 22).attr('y', 46).text(g.expr);

            // gate symbol on left half.  symX is shifted right of the cell
            // border so the "A=" / "B=" input labels do not get clipped.
            var symX = 70, symY = 78;
            var symW = 56, symH = 38;
            var hi;
            if (g.arity === 1) hi = !!g.fn(a);
            else hi = !!g.fn(a, b);
            var pins = g.sym(cell, symX, symY, symW, symH, hi);

            // input wires/labels
            if (g.arity === 1) {
                var inHi = !!a;
                DL.wire(cell, symX - 28, pins.inA.y, pins.inA.x, pins.inA.y, inHi);
                cell.append('text').attr('x', symX - 32).attr('y', pins.inA.y + 4)
                    .attr('text-anchor', 'end')
                    .attr('class', 'lbl' + (inHi ? ' lit' : '')).text('A=' + a);
            } else {
                var inAhi = !!a, inBhi = !!b;
                DL.wire(cell, symX - 28, pins.inA.y, pins.inA.x, pins.inA.y, inAhi);
                DL.wire(cell, symX - 28, pins.inB.y, pins.inB.x, pins.inB.y, inBhi);
                cell.append('text').attr('x', symX - 32).attr('y', pins.inA.y + 4)
                    .attr('text-anchor', 'end')
                    .attr('class', 'lbl' + (inAhi ? ' lit' : '')).text('A=' + a);
                cell.append('text').attr('x', symX - 32).attr('y', pins.inB.y + 4)
                    .attr('text-anchor', 'end')
                    .attr('class', 'lbl' + (inBhi ? ' lit' : '')).text('B=' + b);
            }

            // output wire/label
            var yOut = g.arity === 1 ? g.fn(a) : g.fn(a, b);
            var outX2 = pins.out.x + 12;
            DL.wire(cell, pins.out.x, pins.out.y, outX2, pins.out.y, !!yOut);
            cell.append('text').attr('x', outX2 + 4).attr('y', pins.out.y + 4)
                .attr('class', 'lbl' + (yOut ? ' lit' : '')).text('Y=' + yOut);

            // truth table on right half.  Header text needs extra room above
            // so the outline does not clip the top of the glyphs.
            var tx = 184, ty = 78;
            var rows;
            if (g.arity === 1) rows = [[0], [1]];
            else rows = [[0,0],[0,1],[1,0],[1,1]];
            var rowH = 18;
            var headerPad = 22;
            var tableW = cellW - tx - 22;
            // header
            cell.append('text').attr('x', tx + 8).attr('y', ty - 8)
                .attr('class', 'lbl').text(g.arity === 1 ? 'A' : 'A B');
            cell.append('text').attr('x', tx + tableW - 8).attr('y', ty - 8)
                .attr('text-anchor', 'end').attr('class', 'lbl').text('Y');
            // body
            rows.forEach(function (row, ri) {
                var ry = ty + ri * rowH;
                var match = g.arity === 1 ? row[0] === a : (row[0] === a && row[1] === b);
                if (match) {
                    cell.append('rect').attr('class', 'truth-row-hl')
                        .attr('x', tx).attr('y', ry).attr('width', tableW).attr('height', rowH);
                }
                var inStr = g.arity === 1 ? String(row[0]) : (row[0] + ' ' + row[1]);
                var out = g.arity === 1 ? g.fn(row[0]) : g.fn(row[0], row[1]);
                cell.append('text').attr('x', tx + 8).attr('y', ry + 13)
                    .attr('class', 'truth-cell' + (match ? ' hi' : '')).text(inStr);
                cell.append('text').attr('x', tx + tableW - 8).attr('y', ry + 13)
                    .attr('text-anchor', 'end')
                    .attr('class', 'truth-cell' + (out ? ' hi' : '')).text(out);
            });
            // table outline (extra top padding so the header glyphs are not
            // clipped by the upper border).
            cell.append('rect').attr('x', tx).attr('y', ty - headerPad)
                .attr('width', tableW).attr('height', rows.length * rowH + headerPad)
                .attr('fill', 'none').attr('stroke', 'var(--c-cell-bd)');

            // footnote explaining the special symbols used in this gate's
            // Boolean expression (¬, ⊕, overbar).  Symbol segments are drawn
            // larger so they read clearly against the smaller prose around
            // them.  The whole footnote uses the foreground colour rather
            // than the formula colour so it remains readable.
            if (g.note) {
                var noteT = cell.append('text')
                    .attr('x', cellW / 2).attr('y', cellH - 18)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'var(--fg)')
                    .attr('font-size', 11);
                g.note.forEach(function (part) {
                    var ts = noteT.append('tspan').text(part.text);
                    if (part.big) {
                        ts.attr('font-size', 13).attr('font-weight', 600);
                    }
                });
            }
        });
    }

    function init() {
        DL.bindBitButton(aBtn, drawGates);
        DL.bindBitButton(bBtn, drawGates);
        drawGates();
        window.addEventListener('themechange', drawGates);
        window.addEventListener('resize', drawGates);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
