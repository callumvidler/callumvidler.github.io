// Section 03 · Two-stage passive RC cascade circuit diagram.
(function () {
    var T = window.T;
    var sel = '#circuit-loading';

    function render() {
        var svg = d3.select(sel);
        svg.selectAll('*').remove();

        // viewBox is fixed at 0 0 720 280 in the HTML.
        var W = 720, Hgt = 280;

        // Layout coordinates
        var rail = 220;          // ground rail y
        var top  = 100;           // signal rail y
        var xVin = 60;
        var xR1  = 160;
        var xV1  = 250;
        var xR2  = 360;
        var xVout = 460;
        var xLoad = 560;

        // Shared style helpers via SVG classes from cascading_filters.css.
        function wire(x1, y1, x2, y2) {
            return svg.append('line').attr('class', 'wire')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
        }
        function dot(x, y) {
            return svg.append('circle').attr('class', 'node-dot').attr('cx', x).attr('cy', y).attr('r', 3.5);
        }
        function resistor(cx, cy, label) {
            var w = 60, h = 22;
            svg.append('rect').attr('class', 'resistor')
                .attr('x', cx - w / 2).attr('y', cy - h / 2)
                .attr('width', w).attr('height', h)
                .attr('rx', 3);
            svg.append('text')
                .attr('x', cx).attr('y', cy - h / 2 - 8)
                .attr('text-anchor', 'middle')
                .text(label);
        }
        function capacitor(cx, cy, label) {
            // vertical capacitor, two horizontal plates
            var gap = 6;
            var plate = 22;
            svg.append('line').attr('class', 'cap-plate')
                .attr('x1', cx - plate / 2).attr('x2', cx + plate / 2)
                .attr('y1', cy - gap / 2).attr('y2', cy - gap / 2);
            svg.append('line').attr('class', 'cap-plate')
                .attr('x1', cx - plate / 2 + 4).attr('x2', cx + plate / 2 - 4)
                .attr('y1', cy + gap / 2).attr('y2', cy + gap / 2);
            svg.append('text')
                .attr('x', cx + plate / 2 + 6).attr('y', cy + 4)
                .attr('text-anchor', 'start')
                .text(label);
        }
        function gnd(cx, cy) {
            // wire down to small ground triangle
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
        function source(cx, cy, label) {
            svg.append('circle').attr('class', 'source')
                .attr('cx', cx).attr('cy', cy).attr('r', 22);
            svg.append('text')
                .attr('x', cx).attr('y', cy - 4).attr('text-anchor', 'middle')
                .attr('font-size', 14).text('+');
            svg.append('text')
                .attr('x', cx).attr('y', cy + 14).attr('text-anchor', 'middle')
                .attr('font-size', 14).text('−');
            svg.append('text')
                .attr('x', cx - 32).attr('y', cy + 4).attr('text-anchor', 'end')
                .text(label);
        }

        // ── Top signal rail wires ───────────────────────────────
        wire(xVin, top, xR1 - 30, top);
        wire(xR1 + 30, top, xV1, top);
        wire(xV1, top, xR2 - 30, top);
        wire(xR2 + 30, top, xVout, top);
        wire(xVout, top, xLoad, top);   // open-circuit load endpoint

        // ── Resistors ───────────────────────────────────────────
        resistor(xR1, top, 'R₁');
        resistor(xR2, top, 'R₂');

        // ── Capacitors to ground ────────────────────────────────
        // C1 on V1 node
        wire(xV1, top, xV1, top + 30);
        capacitor(xV1, top + 40, 'C₁');
        wire(xV1, top + 46, xV1, rail);
        // C2 on Vout node
        wire(xVout, top, xVout, top + 30);
        capacitor(xVout, top + 40, 'C₂');
        wire(xVout, top + 46, xVout, rail);

        // ── Node dots ───────────────────────────────────────────
        dot(xV1, top);
        dot(xVout, top);
        dot(xV1, rail);
        dot(xVout, rail);

        // ── Source on left ──────────────────────────────────────
        wire(xVin, top, xVin, top + 18);
        source(xVin, top + 40, 'Vin');
        wire(xVin, top + 62, xVin, rail);
        dot(xVin, rail);

        // ── Ground rail ─────────────────────────────────────────
        wire(xVin, rail, xLoad, rail);
        gnd((xVin + xLoad) / 2, rail);

        // ── Node labels ─────────────────────────────────────────
        svg.append('text')
            .attr('x', xV1 + 10).attr('y', top - 10)
            .attr('font-size', 12).attr('fill', T.textDim).text('V₁');
        svg.append('text')
            .attr('x', xVout + 10).attr('y', top - 10)
            .attr('font-size', 12).attr('fill', T.textDim).text('Vout');

        // ── Load endpoint terminal ──────────────────────────────
        svg.append('circle').attr('class', 'node-dot')
            .attr('cx', xLoad).attr('cy', top).attr('r', 4);
        svg.append('text')
            .attr('x', xLoad + 12).attr('y', top + 4)
            .attr('font-size', 12).attr('fill', T.text).text('to next stage');

        // ── Section caption ─────────────────────────────────────
        svg.append('text')
            .attr('x', W / 2).attr('y', 28)
            .attr('text-anchor', 'middle')
            .attr('font-size', 13).attr('fill', T.text)
            .text('Two passive RC sections in direct cascade');
        svg.append('text')
            .attr('x', W / 2).attr('y', 48)
            .attr('text-anchor', 'middle')
            .attr('font-size', 11).attr('fill', T.textMuted)
            .text('R₁ = R,  C₁ = C    R₂ = kR,  C₂ = C/k');
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
