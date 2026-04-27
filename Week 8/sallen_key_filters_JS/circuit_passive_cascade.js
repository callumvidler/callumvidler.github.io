// Section 01 · Two-stage passive RC cascade.
// R1 = R2 = R, C1 = C2 = C. The two stages are wired directly so the second
// stage's input impedance loads the first capacitor.
(function () {
    var T = window.T;
    var sel = '#circuit-passive';

    function render() {
        var svg = d3.select(sel);
        svg.selectAll('*').remove();

        var W = 720;
        var rail = 220;
        var top = 110;
        var xVin = 60;
        var xR1 = 170;
        var xV1 = 280;
        var xR2 = 400;
        var xVout = 510;
        var xLoad = 620;

        function wire(x1, y1, x2, y2) {
            return svg.append('line').attr('class', 'wire')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
        }
        function dot(x, y) {
            return svg.append('circle').attr('class', 'node-dot')
                .attr('cx', x).attr('cy', y).attr('r', 3.5);
        }
        function resistor(cx, cy, label) {
            var w = 56, h = 20;
            svg.append('rect').attr('class', 'resistor')
                .attr('x', cx - w / 2).attr('y', cy - h / 2)
                .attr('width', w).attr('height', h).attr('rx', 3);
            svg.append('text')
                .attr('x', cx).attr('y', cy - h / 2 - 8)
                .attr('text-anchor', 'middle').attr('font-size', 12).text(label);
        }
        function capacitor(cx, cy, label) {
            var gap = 6, plate = 22;
            svg.append('line').attr('class', 'cap-plate')
                .attr('x1', cx - plate / 2).attr('x2', cx + plate / 2)
                .attr('y1', cy - gap / 2).attr('y2', cy - gap / 2);
            svg.append('line').attr('class', 'cap-plate')
                .attr('x1', cx - plate / 2 + 4).attr('x2', cx + plate / 2 - 4)
                .attr('y1', cy + gap / 2).attr('y2', cy + gap / 2);
            svg.append('text')
                .attr('x', cx + plate / 2 + 6).attr('y', cy + 4)
                .attr('text-anchor', 'start').attr('font-size', 12).text(label);
        }
        function gnd(cx, cy) {
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 10).attr('x2', cx + 10)
                .attr('y1', cy + 12).attr('y2', cy + 12);
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 6).attr('x2', cx + 6)
                .attr('y1', cy + 16).attr('y2', cy + 16);
            svg.append('line').attr('class', 'gnd')
                .attr('x1', cx - 2).attr('x2', cx + 2)
                .attr('y1', cy + 20).attr('y2', cy + 20);
            wire(cx, cy, cx, cy + 12);
        }

        // Source
        wire(xVin, top, xVin, top + 18);
        svg.append('circle').attr('class', 'source')
            .attr('cx', xVin).attr('cy', top + 40).attr('r', 22);
        svg.append('text').attr('x', xVin).attr('y', top + 36)
            .attr('text-anchor', 'middle').attr('font-size', 13).text('+');
        svg.append('text').attr('x', xVin).attr('y', top + 54)
            .attr('text-anchor', 'middle').attr('font-size', 13).text('−');
        svg.append('text').attr('x', xVin - 30).attr('y', top + 44)
            .attr('text-anchor', 'end').attr('font-size', 12).text('Vin');
        wire(xVin, top + 62, xVin, rail);

        // Top rail wires
        wire(xVin, top, xR1 - 28, top);
        wire(xR1 + 28, top, xV1, top);
        wire(xV1, top, xR2 - 28, top);
        wire(xR2 + 28, top, xVout, top);
        wire(xVout, top, xLoad, top);

        // Resistors
        resistor(xR1, top, 'R1');
        resistor(xR2, top, 'R2');

        // Capacitors to ground
        wire(xV1, top, xV1, top + 28);
        capacitor(xV1, top + 38, 'C1');
        wire(xV1, top + 44, xV1, rail);
        wire(xVout, top, xVout, top + 28);
        capacitor(xVout, top + 38, 'C2');
        wire(xVout, top + 44, xVout, rail);

        // Junction dots
        dot(xV1, top);
        dot(xVout, top);
        dot(xVin, rail);
        dot(xV1, rail);
        dot(xVout, rail);

        // Loading arrow: highlight current drawn from C1 by R2
        var arrowY = top - 30;
        svg.append('text').attr('x', (xV1 + xR2) / 2).attr('y', arrowY)
            .attr('text-anchor', 'middle').attr('font-size', 11)
            .attr('fill', T.fg(0.7)).text('R2 draws current from C1');
        svg.append('path')
            .attr('d', 'M ' + (xV1 + 20) + ' ' + (arrowY + 6) +
                       ' L ' + (xR2 - 32) + ' ' + (arrowY + 6))
            .attr('stroke', T.fg(0.55))
            .attr('stroke-width', 1.4).attr('fill', 'none')
            .attr('marker-end', 'url(#arrow-passive)');
        var defs = svg.append('defs');
        defs.append('marker').attr('id', 'arrow-passive')
            .attr('viewBox', '0 0 10 10').attr('refX', 8).attr('refY', 5)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,0 L10,5 L0,10 z')
            .attr('fill', T.fg(0.55));

        // Output terminal
        svg.append('circle').attr('class', 'node-dot')
            .attr('cx', xLoad).attr('cy', top).attr('r', 4);
        svg.append('text').attr('x', xLoad + 12).attr('y', top + 4)
            .attr('font-size', 12).attr('fill', T.text).text('Vout');

        // Ground rail
        wire(xVin, rail, xLoad, rail);
        gnd((xVin + xLoad) / 2, rail);

        // Caption
        svg.append('text')
            .attr('x', W / 2).attr('y', 28)
            .attr('text-anchor', 'middle').attr('font-size', 13)
            .attr('fill', T.text).text('Two passive RC sections in direct cascade');
        svg.append('text')
            .attr('x', W / 2).attr('y', 46)
            .attr('text-anchor', 'middle').attr('font-size', 11)
            .attr('fill', T.fg(0.6)).text('R1 = R2 = R   ·   C1 = C2 = C');
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
