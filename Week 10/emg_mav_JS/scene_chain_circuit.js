// scene_chain_circuit.js  ·  Slide 5
// Block diagram of the MAV signal chain. Pre-amp -> precision rectifier
// -> low-pass filter. Single output line carries the running mean
// absolute value.
(function () {
    var SVG = '#plot-mav-chain-circuit';
    var svg = d3.select(SVG);
    if (svg.empty()) return;

    var VB_W = 980, VB_H = 320;
    var g;

    function clear() {
        svg.selectAll('*').remove();
        svg.attr('viewBox', '0 0 ' + VB_W + ' ' + VB_H);
        svg.attr('preserveAspectRatio', 'xMidYMid meet');
        g = svg.append('g');
    }

    function block(x, y, w, h, title, sub) {
        g.append('rect')
            .attr('x', x).attr('y', y).attr('width', w).attr('height', h)
            .attr('rx', 6)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', 'var(--text)')
            .attr('stroke-width', 1.6);
        g.append('text')
            .attr('x', x + w / 2)
            .attr('y', y + h / 2 + (sub ? -6 : 5))
            .attr('text-anchor', 'middle')
            .attr('font-family', "'Inter', sans-serif")
            .attr('font-size', 14)
            .attr('font-weight', 600)
            .attr('fill', 'var(--text)')
            .text(title);
        if (sub) {
            g.append('text')
                .attr('x', x + w / 2)
                .attr('y', y + h / 2 + 13)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .attr('fill', 'var(--text-dim)')
                .text(sub);
        }
        return { x: x, y: y, w: w, h: h, l: x, r: x + w, t: y, b: y + h, cx: x + w / 2, cy: y + h / 2 };
    }

    function arrowHead(x, y) {
        var s = 6;
        var d = 'M ' + (x - s) + ' ' + (y - s) + ' L ' + x + ' ' + y + ' L ' + (x - s) + ' ' + (y + s);
        g.append('path')
            .attr('d', d)
            .attr('fill', 'none')
            .attr('stroke', 'var(--text)')
            .attr('stroke-width', 1.6)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round');
    }

    function flowH(x1, y, x2) {
        g.append('line')
            .attr('x1', x1).attr('y1', y).attr('x2', x2 - 6).attr('y2', y)
            .attr('stroke', 'var(--text)').attr('stroke-width', 1.6);
        arrowHead(x2, y);
    }

    function tagLabel(x, y, txt, color, weight) {
        g.append('text')
            .attr('x', x).attr('y', y)
            .attr('text-anchor', 'start')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 11)
            .attr('font-weight', weight || 600)
            .attr('fill', color || 'var(--text-dim)')
            .text(txt);
    }

    function draw() {
        clear();

        g.append('text')
            .attr('x', VB_W / 2).attr('y', 24)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10.5)
            .attr('letter-spacing', '0.18em')
            .attr('fill', 'var(--muted)')
            .text('MAV SIGNAL CHAIN · BLOCK DIAGRAM');

        var BH = 64;
        var midY = 170;

        var inB = block(20,  midY - BH / 2, 130, BH, 'EMG input', 'x(t) = A·sin(ωt)');
        var amp = block(190, midY - BH / 2, 150, BH, 'Pre-amp',   'instrumentation');
        var rec = block(380, midY - BH / 2, 180, BH, 'Precision rectifier', '|x(t)|');
        var lpf = block(600, midY - BH / 2, 180, BH, 'Low-pass filter', 'f_c ≪ 2f_sig');

        flowH(inB.r, midY, amp.l);
        flowH(amp.r, midY, rec.l);
        flowH(rec.r, midY, lpf.l);

        var outX = lpf.r + 90;
        g.append('line')
            .attr('x1', lpf.r).attr('y1', midY)
            .attr('x2', outX - 6).attr('y2', midY)
            .attr('stroke', 'var(--text)').attr('stroke-width', 1.6);
        arrowHead(outX, midY);
        tagLabel(outX + 8, midY - 4, 'y(t) ≈ 2A/π', 'var(--c-output2)');
        tagLabel(outX + 8, midY + 14, 'MAV output', 'var(--muted)', 400);

        // Annotations under each stage
        var annY = midY + BH / 2 + 28;
        function ann(b, txt) {
            g.append('text')
                .attr('x', b.cx).attr('y', annY)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 10.5)
                .attr('fill', 'var(--muted)')
                .text(txt);
        }
        ann(amp, 'lift mV → V');
        ann(rec, 'take |·|');
        ann(lpf, 'take ⟨·⟩');
    }

    function init() {
        draw();
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', draw);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
