// Section 04 · Buffered cascade circuit diagram (3 stages shown).
// Each RC section is followed by a unity-gain op-amp buffer.
(function () {
    var T = window.T;
    var sel = '#circuit-buffered';

    function render() {
        var svg = d3.select(sel);
        svg.selectAll('*').remove();

        var W = 720, Hgt = 280;
        var top = 110;
        var rail = 230;

        function wire(x1, y1, x2, y2) {
            return svg.append('line').attr('class', 'wire')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
        }
        function dot(x, y) {
            return svg.append('circle').attr('class', 'node-dot').attr('cx', x).attr('cy', y).attr('r', 3);
        }
        function resistor(cx, cy, label) {
            var w = 36, h = 16;
            svg.append('rect').attr('class', 'resistor')
                .attr('x', cx - w / 2).attr('y', cy - h / 2)
                .attr('width', w).attr('height', h).attr('rx', 2.5);
            svg.append('text')
                .attr('x', cx).attr('y', cy - h / 2 - 6)
                .attr('text-anchor', 'middle').attr('font-size', 11).text(label);
        }
        function capacitor(cx, cy, label) {
            var gap = 5, plate = 16;
            svg.append('line').attr('class', 'cap-plate')
                .attr('x1', cx - plate / 2).attr('x2', cx + plate / 2)
                .attr('y1', cy - gap / 2).attr('y2', cy - gap / 2);
            svg.append('line').attr('class', 'cap-plate')
                .attr('x1', cx - plate / 2 + 3).attr('x2', cx + plate / 2 - 3)
                .attr('y1', cy + gap / 2).attr('y2', cy + gap / 2);
            svg.append('text')
                .attr('x', cx - plate / 2 - 6).attr('y', cy + 4)
                .attr('text-anchor', 'end').attr('font-size', 11).text(label);
        }
        function gnd(cx, cy) {
            wire(cx, cy, cx, cy + 18);
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 8).attr('x2', cx + 8)
                .attr('y1', cy + 18).attr('y2', cy + 18);
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 5).attr('x2', cx + 5)
                .attr('y1', cy + 21).attr('y2', cy + 21);
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 2).attr('x2', cx + 2)
                .attr('y1', cy + 24).attr('y2', cy + 24);
        }
        // Op-amp non-inverting unity buffer with body centred at y = cy.
        // V+ pin is 9 px above cy, V- pin 9 px below; V- is shorted to the
        // output for unity gain.
        function buffer(cx, cy, fbStartX) {
            var bw = 38, bh = 36;
            var lx = cx - bw / 2, rx = cx + bw / 2;
            fbStartX = fbStartX || rx;
            var pts = [lx + ',' + (cy - bh / 2), lx + ',' + (cy + bh / 2), rx + ',' + cy];
            svg.append('polygon').attr('class', 'opamp-body').attr('points', pts.join(' '));
            var inY1 = cy - 9;     // V+ pin
            var inY2 = cy + 9;     // V- pin
            // markers inside the body
            svg.append('text').attr('x', lx + 5).attr('y', inY1 + 4)
                .attr('font-size', 11).attr('fill', T.text).text('+');
            svg.append('text').attr('x', lx + 5).attr('y', inY2 + 4)
                .attr('font-size', 11).attr('fill', T.text).text('−');
            // feedback loop: output → down → left → up to V−
            var fbY = cy + bh / 2 + 12;
            wire(fbStartX, cy, fbStartX, fbY);
            wire(fbStartX, fbY, lx - 8, fbY);
            wire(lx - 8, fbY, lx - 8, inY2);
            wire(lx - 8, inY2, lx, inY2);
            return { left: lx, right: rx, inY1: inY1 };
        }

        // ── Stage layout (3 RC stages with buffers in between) ──
        // Stage geometry: R then C, then optional buffer.
        var startX = 90;
        var stageW = 160;
        var bufW = 50;

        // Source on far left
        wire(startX - 44, top, startX - 44, top + 14);
        svg.append('circle').attr('class', 'source')
            .attr('cx', startX - 44).attr('cy', top + 36).attr('r', 18);
        svg.append('text')
            .attr('x', startX - 44).attr('y', top + 33).attr('text-anchor', 'middle')
            .attr('font-size', 12).text('+');
        svg.append('text')
            .attr('x', startX - 44).attr('y', top + 47).attr('text-anchor', 'middle')
            .attr('font-size', 12).text('−');
        wire(startX - 44, top + 54, startX - 44, rail);
        svg.append('text')
            .attr('x', startX - 44 - 22).attr('y', top + 38)
            .attr('text-anchor', 'end').attr('font-size', 11).text('Vin');
        wire(startX - 44, top, startX, top);
        dot(startX - 44, rail);

        var x = startX;
        var midGndX = startX;
        for (var s = 0; s < 3; s++) {
            // R, then C to ground, then either buffer (s<2) or output terminal.
            var stageY = top + 9 * s;
            var xR = x + 30;
            var xC = x + 84;
            resistor(xR, stageY, 'R' + (s + 1));
            wire(x, stageY, xR - 18, stageY);
            wire(xR + 18, stageY, xC, stageY);
            // capacitor down to ground
            wire(xC, stageY, xC, stageY + 18);
            capacitor(xC, stageY + 26, 'C' + (s + 1));
            wire(xC, stageY + 30, xC, rail);
            dot(xC, stageY);
            dot(xC, rail);

            if (s === 1) midGndX = xC;

            if (s < 2) {
                // buffer between this stage's output and next stage's input.
                // Op-amp output defines the next stage rail.
                var xBuf = x + stageW - 15;
                var bufY = stageY + 9;
                var bLx = xBuf - 19;             // buffer body left edge
                var nodeX = xBuf + 19 + 8;
                wire(xC, stageY, bLx, stageY);
                var b = buffer(xBuf, bufY, nodeX);
                wire(b.right, bufY, nodeX, bufY);
                dot(nodeX, bufY);
                var nextStart = x + stageW + bufW;
                wire(nodeX, bufY, nextStart, bufY);
                x = nextStart;
            } else {
                // last stage output extends to right
                wire(xC, stageY, x + stageW, stageY);
                svg.append('circle').attr('class', 'node-dot')
                    .attr('cx', x + stageW).attr('cy', stageY).attr('r', 4);
                svg.append('text')
                    .attr('x', x + stageW + 8).attr('y', stageY + 4)
                    .attr('font-size', 12).attr('fill', T.text).text('Vout(+)');
                svg.append('circle').attr('class', 'node-dot')
                    .attr('cx', x + stageW).attr('cy', rail).attr('r', 4);
                svg.append('text')
                    .attr('x', x + stageW + 8).attr('y', rail + 4)
                    .attr('font-size', 12).attr('fill', T.text).text('Vout(−)');
            }
        }

        // ── Ground rail across the bottom ───────────────────────
        wire(startX - 44, rail, x + stageW, rail);
        gnd(midGndX, rail);

        // ── Caption ─────────────────────────────────────────────
        svg.append('text')
            .attr('x', W / 2).attr('y', 30)
            .attr('text-anchor', 'middle')
            .attr('font-size', 13).attr('fill', T.text)
            .text('Cascade with unity-gain buffers between RC stages');
        svg.append('text')
            .attr('x', W / 2).attr('y', 48)
            .attr('text-anchor', 'middle')
            .attr('font-size', 11).attr('fill', T.textMuted)
            .text('Each stage drives only the buffer input, so no current is drawn from its capacitor');
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
