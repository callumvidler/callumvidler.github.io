// Section 02 · Sallen-Key low-pass schematic.
// Unity-gain configuration: R1 in series, R2 in series, C2 from V+ to ground,
// C1 from node A to Vout (the positive-feedback element), op-amp wired as a
// voltage follower with V- shorted to Vout.
(function () {
    var T = window.T;
    var sel = '#circuit-sk';

    function render() {
        var svg = d3.select(sel);
        svg.selectAll('*').remove();

        // Geometry rails
        var railY = 150;     // signal rail
        var fbY   = 92;      // raised C1 feedback path
        var gndY  = 260;     // ground rail

        function wire(x1, y1, x2, y2, cls) {
            return svg.append('line').attr('class', cls || 'wire')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
        }
        function dot(x, y) {
            return svg.append('circle').attr('class', 'node-dot')
                .attr('cx', x).attr('cy', y).attr('r', 3);
        }
        function resistor(cx, cy, label) {
            var w = 44, h = 18;
            svg.append('rect').attr('class', 'resistor')
                .attr('x', cx - w / 2).attr('y', cy - h / 2)
                .attr('width', w).attr('height', h).attr('rx', 2.5);
            svg.append('text')
                .attr('x', cx).attr('y', cy - h / 2 - 6)
                .attr('text-anchor', 'middle').attr('font-size', 12).text(label);
        }
        // Vertical capacitor (plates horizontal). Wires connect at top and bottom.
        function capacitorV(cx, cy, label, opts) {
            opts = opts || {};
            var gap = 5, plate = 16;
            var cls = opts.highlight ? 'cap-plate feedback-hi-cap' : 'cap-plate';
            svg.append('line').attr('class', cls)
                .attr('x1', cx - plate / 2).attr('x2', cx + plate / 2)
                .attr('y1', cy - gap / 2).attr('y2', cy - gap / 2);
            svg.append('line').attr('class', cls)
                .attr('x1', cx - plate / 2 + 3).attr('x2', cx + plate / 2 - 3)
                .attr('y1', cy + gap / 2).attr('y2', cy + gap / 2);
            svg.append('text')
                .attr('x', cx + plate / 2 + 6).attr('y', cy + 4)
                .attr('text-anchor', 'start').attr('font-size', 12).text(label);
        }
        // Horizontal capacitor (plates vertical). Wires connect at left and right.
        function capacitorH(cx, cy, label, opts) {
            opts = opts || {};
            var gap = 6, plate = 14;
            var cls = opts.highlight ? 'cap-plate feedback-hi-cap' : 'cap-plate';
            svg.append('line').attr('class', cls)
                .attr('x1', cx - gap / 2).attr('x2', cx - gap / 2)
                .attr('y1', cy - plate / 2).attr('y2', cy + plate / 2);
            svg.append('line').attr('class', cls)
                .attr('x1', cx + gap / 2).attr('x2', cx + gap / 2)
                .attr('y1', cy - plate / 2 + 2).attr('y2', cy + plate / 2 - 2);
            svg.append('text')
                .attr('x', cx).attr('y', cy - plate / 2 - 6)
                .attr('text-anchor', 'middle').attr('font-size', 12).text(label);
        }
        function gnd(cx, cy) {
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 9).attr('x2', cx + 9)
                .attr('y1', cy).attr('y2', cy);
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 6).attr('x2', cx + 6)
                .attr('y1', cy + 4).attr('y2', cy + 4);
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 3).attr('x2', cx + 3)
                .attr('y1', cy + 8).attr('y2', cy + 8);
        }

        // ── Source on the far left ───────────────────────────────
        var srcX = 60, srcY = 200;
        wire(srcX, srcY - 18, srcX, railY);              // top lead → rail
        wire(srcX, srcY + 18, srcX, gndY);               // bottom lead → ground rail
        svg.append('circle').attr('class', 'source')
            .attr('cx', srcX).attr('cy', srcY).attr('r', 18);
        svg.append('text').attr('x', srcX).attr('y', srcY - 4)
            .attr('text-anchor', 'middle').attr('font-size', 12).text('+');
        svg.append('text').attr('x', srcX).attr('y', srcY + 12)
            .attr('text-anchor', 'middle').attr('font-size', 12).text('−');
        svg.append('text').attr('x', srcX - 26).attr('y', srcY + 4)
            .attr('text-anchor', 'end').attr('font-size', 12).text('Vin');

        // ── R1: source to node A ─────────────────────────────────
        wire(srcX, railY, 118, railY);
        resistor(140, railY, 'R1');
        wire(162, railY, 240, railY);

        // ── Node A junction ──────────────────────────────────────
        dot(240, railY);
        svg.append('text').attr('x', 240).attr('y', railY + 22)
            .attr('text-anchor', 'middle').attr('font-size', 11)
            .attr('class', 'muted').text('node A');

        // C1 raised path leaves node A and returns to op-amp output.
        wire(240, railY, 240, fbY, 'feedback-hi');         // up from A
        wire(240, fbY, 372, fbY, 'feedback-hi');           // across to C1 left plate
        capacitorH(378, fbY, 'C1', { highlight: true });
        wire(384, fbY, 510, fbY, 'feedback-hi');           // across to output rail
        wire(510, fbY, 510, railY, 'feedback-hi');         // down to output rail

        // Annotation: positive feedback through C1
        svg.append('text').attr('x', 378).attr('y', fbY - 26)
            .attr('text-anchor', 'middle').attr('font-size', 11)
            .attr('fill', T.text).text('positive feedback');

        // ── R2: node A to op-amp non-inverting input ─────────────
        wire(240, railY, 268, railY);
        resistor(290, railY, 'R2');
        wire(312, railY, 360, railY);

        // ── C2 junction (between R2 and V+) drops to ground ──────
        dot(360, railY);
        wire(360, railY, 360, 175);
        capacitorV(360, 180, 'C2');                        // plates at y=178, y=183 approx
        wire(360, 184, 360, gndY);

        // ── Step-up from rail to V+ pin ──────────────────────────
        wire(360, railY, 392, railY);
        wire(392, railY, 392, railY - 9);
        wire(392, railY - 9, 406, railY - 9);

        // ── Op-amp body (triangle, V+ top, V- bottom) ────────────
        var lx = 406, rx = 446;
        var top = railY - 22, bot = railY + 22;
        var inYp = railY - 9, inYm = railY + 9;
        svg.append('polygon').attr('class', 'opamp-body')
            .attr('points', lx + ',' + top + ' ' + lx + ',' + bot + ' ' + rx + ',' + railY);
        svg.append('text').attr('x', lx + 6).attr('y', inYp + 4)
            .attr('font-size', 12).attr('fill', T.text).text('+');
        svg.append('text').attr('x', lx + 6).attr('y', inYm + 4)
            .attr('font-size', 12).attr('fill', T.text).text('−');

        // ── Feedback path: output → V- (unity gain) ──────────────
        var fb2Y = bot + 18;                               // routed below body
        wire(rx, railY, rx, fb2Y);
        wire(rx, fb2Y, lx - 8, fb2Y);
        wire(lx - 8, fb2Y, lx - 8, inYm);
        wire(lx - 8, inYm, lx, inYm);

        // ── Output rail to Vout terminal ─────────────────────────
        wire(rx, railY, 510, railY);
        dot(510, railY);                                   // C1 feedback junction
        wire(510, railY, 610, railY);
        svg.append('circle').attr('class', 'node-dot')
            .attr('cx', 610).attr('cy', railY).attr('r', 4);
        svg.append('text').attr('x', 622).attr('y', railY + 4)
            .attr('text-anchor', 'start').attr('font-size', 12).text('Vout');

        // ── Ground rail across the bottom ────────────────────────
        wire(srcX, gndY, 610, gndY);
        gnd(335, gndY);

        // ── Caption strip at the top ─────────────────────────────
        svg.append('text').attr('x', 360).attr('y', 28)
            .attr('text-anchor', 'middle').attr('font-size', 13)
            .attr('fill', T.text).text('Sallen-Key low-pass · op-amp as unity-gain buffer');
    }

    function init() {
        render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
