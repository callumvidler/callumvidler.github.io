// Section 02 · Two RC stages each followed by a unity-gain op-amp buffer.
// The buffers isolate the stages, so the composite transfer function is
// the exact product (1+sRC)^2. The cost is two op-amps for one second-
// order section.
(function () {
    var T = window.T;
    var sel = '#circuit-buffered-cascade';

    function render() {
        var svg = d3.select(sel);
        svg.selectAll('*').remove();

        var W = 720, Hgt = 320;
        var rail = 270;
        var top = 120;

        function wire(x1, y1, x2, y2) {
            return svg.append('line').attr('class', 'wire')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
        }
        function dot(x, y) {
            return svg.append('circle').attr('class', 'node-dot')
                .attr('cx', x).attr('cy', y).attr('r', 3.5);
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
        function capacitor(cx, cy, label) {
            var gap = 6, plate = 18;
            svg.append('line').attr('class', 'cap-plate')
                .attr('x1', cx - plate / 2).attr('x2', cx + plate / 2)
                .attr('y1', cy - gap / 2).attr('y2', cy - gap / 2);
            svg.append('line').attr('class', 'cap-plate')
                .attr('x1', cx - plate / 2 + 3).attr('x2', cx + plate / 2 - 3)
                .attr('y1', cy + gap / 2).attr('y2', cy + gap / 2);
            svg.append('text')
                .attr('x', cx + plate / 2 + 6).attr('y', cy + 4)
                .attr('text-anchor', 'start').attr('font-size', 12).text(label);
        }
        function gnd(cx, cy) {
            wire(cx, cy, cx, cy + 12);
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 10).attr('x2', cx + 10)
                .attr('y1', cy + 12).attr('y2', cy + 12);
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 6).attr('x2', cx + 6)
                .attr('y1', cy + 16).attr('y2', cy + 16);
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 2).attr('x2', cx + 2)
                .attr('y1', cy + 20).attr('y2', cy + 20);
        }
        // Unity-gain buffer with V+ on top input. Returns the right-edge x.
        function buffer(cx, cy, label) {
            var bw = 42, bh = 36;
            var lx = cx - bw / 2, rx = cx + bw / 2;
            var inYp = cy - 9, inYm = cy + 9;
            svg.append('polygon').attr('class', 'opamp-body')
                .attr('points', lx + ',' + (cy - bh / 2) + ' ' +
                                lx + ',' + (cy + bh / 2) + ' ' +
                                rx + ',' + cy);
            svg.append('text').attr('x', lx + 6).attr('y', inYp + 4)
                .attr('font-size', 11).attr('fill', T.text).text('+');
            svg.append('text').attr('x', lx + 6).attr('y', inYm + 4)
                .attr('font-size', 11).attr('fill', T.text).text('−');
            // input pin step from rail to V+
            wire(lx - 12, cy, lx - 12, inYp);
            wire(lx - 12, inYp, lx, inYp);
            // feedback path output → V−
            var fbY = cy + bh / 2 + 14;
            wire(rx, cy, rx, fbY);
            wire(rx, fbY, lx - 8, fbY);
            wire(lx - 8, fbY, lx - 8, inYm);
            wire(lx - 8, inYm, lx, inYm);
            if (label) {
                svg.append('text')
                    .attr('x', cx).attr('y', cy - bh / 2 - 8)
                    .attr('text-anchor', 'middle').attr('font-size', 11)
                    .attr('fill', T.fg(0.7)).text(label);
            }
            return { left: lx, right: rx };
        }

        // ── Source ────────────────────────────────────────────────
        var xVin = 50;
        wire(xVin, top, xVin, top + 18);
        svg.append('circle').attr('class', 'source')
            .attr('cx', xVin).attr('cy', top + 38).attr('r', 18);
        svg.append('text').attr('x', xVin).attr('y', top + 35)
            .attr('text-anchor', 'middle').attr('font-size', 12).text('+');
        svg.append('text').attr('x', xVin).attr('y', top + 49)
            .attr('text-anchor', 'middle').attr('font-size', 12).text('−');
        svg.append('text').attr('x', xVin - 22).attr('y', top + 42)
            .attr('text-anchor', 'end').attr('font-size', 11).text('Vin');
        wire(xVin, top + 56, xVin, rail);
        dot(xVin, rail);

        // Stage 1: R1, C1, then buffer A
        var xR1 = 130;
        var xC1 = 200;
        var xBufA = 270;
        wire(xVin, top, xR1 - 22, top);
        resistor(xR1, top, 'R1');
        wire(xR1 + 22, top, xC1, top);
        wire(xC1, top, xC1, top + 22);
        capacitor(xC1, top + 30, 'C1');
        wire(xC1, top + 36, xC1, rail);
        dot(xC1, top);
        dot(xC1, rail);
        wire(xC1, top, xBufA - 33, top);
        var bufA = buffer(xBufA, top, 'op-amp #1');

        // Stage 2: R2, C2, then buffer B
        var xR2 = 410;
        var xC2 = 480;
        var xBufB = 550;
        wire(bufA.right, top, xR2 - 22, top);
        resistor(xR2, top, 'R2');
        wire(xR2 + 22, top, xC2, top);
        wire(xC2, top, xC2, top + 22);
        capacitor(xC2, top + 30, 'C2');
        wire(xC2, top + 36, xC2, rail);
        dot(xC2, top);
        dot(xC2, rail);
        wire(xC2, top, xBufB - 33, top);
        var bufB = buffer(xBufB, top, 'op-amp #2');

        // Output
        wire(bufB.right, top, 660, top);
        svg.append('circle').attr('class', 'node-dot')
            .attr('cx', 660).attr('cy', top).attr('r', 4);
        svg.append('text').attr('x', 668).attr('y', top + 4)
            .attr('font-size', 12).attr('fill', T.text).text('Vout');

        // Ground rail
        wire(xVin, rail, 660, rail);
        gnd((xVin + 660) / 2, rail);

        // Caption
        svg.append('text')
            .attr('x', W / 2).attr('y', 28)
            .attr('text-anchor', 'middle').attr('font-size', 13)
            .attr('fill', T.text).text('RC stages with unity-gain buffers between them');
        svg.append('text')
            .attr('x', W / 2).attr('y', 48)
            .attr('text-anchor', 'middle').attr('font-size', 11)
            .attr('fill', T.fg(0.65))
            .text('Two op-amps required for a second-order response');
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
