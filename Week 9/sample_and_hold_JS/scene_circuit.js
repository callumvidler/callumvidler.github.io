// Scene 03 · Circuit topology.
// Animated track-hold schematic. Input buffer → series MOSFET → hold capacitor
// to ground → output buffer. The MOSFET gate is driven by phi(t); auto-cycle
// or manual toggle via the clock slider/pill. Current arrows appear while the
// switch is closed.
(function () {
    var clkI    = document.getElementById('sh-circ-clk');
    var clkL    = document.getElementById('sh-circ-clk-val');
    var btnAuto = document.getElementById('sh-circ-auto');
    var rdPhase = document.getElementById('sh-circ-phase');
    var rdSw    = document.getElementById('sh-circ-sw');
    var rdVc    = document.getElementById('sh-circ-vc');

    var state = { phi: 0, vIn: 0, vC: 0, auto: true, t0: performance.now() };
    var T_PERIOD = 2000; // ms per cycle in auto mode
    var DUTY = 0.4;
    var TAU_FRAC = 0.06;

    var svg = d3.select('#plot-sh-circ').classed('ov', true);

    // Reference layout in a 900×520 viewBox
    var W0 = 900, H0 = 520;
    var nodes = {
        src:   { x:  80, y: 220 },
        bufIn: { x: 180, y: 220 },
        sw:    { x: 380, y: 220 },
        cap:   { x: 510, y: 220 },
        gnd:   { x: 510, y: 360 },
        bufOut:{ x: 620, y: 220 },
        out:   { x: 800, y: 220 }
    };

    function drawStatic() {
        svg.attr('viewBox', '0 0 ' + W0 + ' ' + H0);
        svg.selectAll('*').remove();

        var g = svg.append('g').attr('class', 'root');

        // ─── Input source: a small ac-symbol with a sinusoid wire heading right
        var src = g.append('g').attr('transform', 'translate(' + nodes.src.x + ',' + nodes.src.y + ')');
        src.append('circle')
            .attr('cx', 0).attr('cy', 0).attr('r', 22)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        // Sinusoid glyph inside the source circle
        src.append('path')
            .attr('d', 'M -12,0 Q -6,-12 0,0 T 12,0')
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-input)').attr('stroke-width', 1.6);
        src.append('text')
            .attr('x', 0).attr('y', 44).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--muted)').text('v_in');

        // Wire src → bufIn
        wire(g, nodes.src.x + 22, nodes.src.y, nodes.bufIn.x - 36, nodes.bufIn.y);

        // ─── Input buffer: op-amp triangle
        opamp(g, nodes.bufIn.x, nodes.bufIn.y, 'A1');

        // Wire bufIn → sw input
        wire(g, nodes.bufIn.x + 36, nodes.bufIn.y, nodes.sw.x - 60, nodes.sw.y);

        // ─── MOSFET switch
        mosfet(g, nodes.sw.x, nodes.sw.y);

        // Wire sw output → cap top
        wire(g, nodes.sw.x + 60, nodes.sw.y, nodes.cap.x, nodes.cap.y);

        // ─── Capacitor C_H (vertical between hold node and ground)
        capacitor(g, nodes.cap.x, nodes.cap.y, nodes.gnd.x, nodes.gnd.y);
        ground(g, nodes.gnd.x, nodes.gnd.y + 16);

        // Wire from cap top to bufOut input (horizontal across)
        wire(g, nodes.cap.x, nodes.cap.y, nodes.bufOut.x - 36, nodes.bufOut.y);

        // ─── Output buffer
        opamp(g, nodes.bufOut.x, nodes.bufOut.y, 'A2');

        // Wire bufOut → out
        wire(g, nodes.bufOut.x + 36, nodes.bufOut.y, nodes.out.x - 16, nodes.out.y);
        // Output dot
        g.append('circle')
            .attr('cx', nodes.out.x - 16).attr('cy', nodes.out.y).attr('r', 4)
            .attr('fill', 'var(--c-output)');
        g.append('text')
            .attr('x', nodes.out.x).attr('y', nodes.out.y + 4).attr('text-anchor', 'start')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', 'var(--c-output)').text('v_out');

        // ─── Clock source feeding gate
        var clkY = 440;
        var clkX = nodes.sw.x;
        g.append('rect')
            .attr('x', clkX - 60).attr('y', clkY - 24)
            .attr('width', 120).attr('height', 48).attr('rx', 6)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        // Clock symbol — three pulses
        g.append('path')
            .attr('d', 'M ' + (clkX - 44) + ',' + (clkY + 6) +
                       ' L ' + (clkX - 44) + ',' + (clkY - 8) +
                       ' L ' + (clkX - 28) + ',' + (clkY - 8) +
                       ' L ' + (clkX - 28) + ',' + (clkY + 6) +
                       ' L ' + (clkX - 12) + ',' + (clkY + 6) +
                       ' L ' + (clkX - 12) + ',' + (clkY - 8) +
                       ' L ' + (clkX +  4) + ',' + (clkY - 8) +
                       ' L ' + (clkX +  4) + ',' + (clkY + 6) +
                       ' L ' + (clkX + 20) + ',' + (clkY + 6) +
                       ' L ' + (clkX + 20) + ',' + (clkY - 8) +
                       ' L ' + (clkX + 36) + ',' + (clkY - 8))
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-thresh)').attr('stroke-width', 1.6);
        g.append('text')
            .attr('x', clkX).attr('y', clkY + 38).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--muted)').text('φ(t)');

        // Wire from clock source up to MOSFET gate (orthogonal)
        wire(g, clkX, clkY - 24, clkX, nodes.sw.y + 50);   // up to gate level
        // Note: mosfet() draws gate at (x, y+30); a short bit connects there.

        // Click handler on MOSFET gate area to toggle
        g.append('rect')
            .attr('x', nodes.sw.x - 20).attr('y', nodes.sw.y + 28)
            .attr('width', 40).attr('height', 22).attr('fill', 'transparent')
            .style('cursor', 'pointer')
            .on('click', function () {
                state.auto = false;
                btnAuto.classList.remove('active');
                state.phi = state.phi > 0.5 ? 0 : 1;
                clkI.value = state.phi;
                clkL.textContent = state.phi > 0.5 ? 'track' : 'hold';
                redrawDynamic();
            });

        // Animated layer placeholder
        svg.append('g').attr('class', 'dyn');
    }

    function wire(g, x1, y1, x2, y2) {
        // Orthogonal connection: horizontal then vertical (or v then h if axis-aligned).
        if (x1 === x2 || y1 === y2) {
            g.append('line')
                .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
                .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
            return;
        }
        // L-bend: horizontal first
        g.append('polyline')
            .attr('points', x1 + ',' + y1 + ' ' + x2 + ',' + y1 + ' ' + x2 + ',' + y2)
            .attr('fill', 'none')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
    }

    function opamp(g, cx, cy, label) {
        var w = 60, h = 60;
        g.append('polygon')
            .attr('points', (cx - w / 2) + ',' + (cy - h / 2) + ' ' +
                            (cx - w / 2) + ',' + (cy + h / 2) + ' ' +
                            (cx + w / 2) + ',' + cy)
            .attr('fill', 'var(--bg-panel)')
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        // Plus / minus pins
        g.append('text')
            .attr('x', cx - w / 2 + 8).attr('y', cy - 8)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', 'var(--text-dim)').text('+');
        g.append('text')
            .attr('x', cx - w / 2 + 8).attr('y', cy + 14)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('fill', 'var(--text-dim)').text('−');
        // Label
        g.append('text')
            .attr('x', cx).attr('y', cy + h / 2 + 18)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--muted)').text(label);
    }

    function mosfet(g, cx, cy) {
        // Drain on left, source on right, gate from below.
        // Channel rendered as a vertical bar; gate offset to the bottom.
        // Horizontal source/drain wires are drawn on the wire pass.

        // Drain lead
        g.append('line')
            .attr('x1', cx - 60).attr('y1', cy)
            .attr('x2', cx - 14).attr('y2', cy)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        // Source lead
        g.append('line')
            .attr('x1', cx + 14).attr('y1', cy)
            .attr('x2', cx + 60).attr('y2', cy)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        // Channel bar
        g.append('line')
            .attr('class', 'mos-channel')
            .attr('x1', cx - 14).attr('y1', cy - 16)
            .attr('x2', cx - 14).attr('y2', cy + 16)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.0);
        g.append('line')
            .attr('class', 'mos-channel')
            .attr('x1', cx + 14).attr('y1', cy - 16)
            .attr('x2', cx + 14).attr('y2', cy + 16)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.0);
        // Gate bar (shifted right to suggest gap)
        g.append('line')
            .attr('class', 'mos-gate-bar')
            .attr('x1', cx - 14).attr('y1', cy - 16)
            .attr('x2', cx - 14).attr('y2', cy + 16)
            .attr('transform', 'translate(' + 14 + ',0)')
            .attr('stroke', 'transparent');
        // Gate plate
        g.append('rect')
            .attr('x', cx - 6).attr('y', cy + 18)
            .attr('width', 12).attr('height', 4)
            .attr('fill', 'var(--text-dim)');
        // Gate connector down
        g.append('line')
            .attr('x1', cx).attr('y1', cy + 22)
            .attr('x2', cx).attr('y2', cy + 50)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        // Label
        g.append('text')
            .attr('x', cx).attr('y', cy - 26).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--muted)').text('M1');
    }

    function capacitor(g, cx, cy, gx, gy) {
        // Vertical wire from (cx,cy) down to top plate; gap; bottom plate; ground line
        var midY = (cy + gy) / 2;
        g.append('line')
            .attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', midY - 4)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        g.append('line')
            .attr('x1', cx - 14).attr('y1', midY - 4).attr('x2', cx + 14).attr('y2', midY - 4)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.2);
        g.append('line')
            .attr('x1', cx - 14).attr('y1', midY + 4).attr('x2', cx + 14).attr('y2', midY + 4)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 2.2);
        g.append('line')
            .attr('x1', cx).attr('y1', midY + 4).attr('x2', cx).attr('y2', gy)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.6);
        // Hold-node dot
        g.append('circle')
            .attr('cx', cx).attr('cy', cy).attr('r', 4)
            .attr('fill', 'var(--text-dim)');
        // Label
        g.append('text')
            .attr('x', cx + 22).attr('y', midY + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--muted)').text('C_H');
        // v_C node label above
        g.append('text')
            .attr('x', cx + 14).attr('y', cy - 10)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-output)').text('v_C');
    }

    function ground(g, x, y) {
        g.append('line')
            .attr('x1', x - 14).attr('y1', y).attr('x2', x + 14).attr('y2', y)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.8);
        g.append('line')
            .attr('x1', x - 9).attr('y1', y + 5).attr('x2', x + 9).attr('y2', y + 5)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.4);
        g.append('line')
            .attr('x1', x - 4).attr('y1', y + 10).attr('x2', x + 4).attr('y2', y + 10)
            .attr('stroke', 'var(--text-dim)').attr('stroke-width', 1.2);
    }

    function redrawDynamic() {
        var dyn = svg.select('g.dyn');
        dyn.selectAll('*').remove();

        var tracking = state.phi > 0.5;
        // Recolour MOSFET channel bars: green when tracking (closed), grey when open
        svg.selectAll('.mos-channel')
            .attr('stroke', tracking ? 'var(--c-output)' : 'var(--c-low)')
            .attr('stroke-dasharray', tracking ? null : '4 3')
            .attr('opacity', tracking ? 1 : 0.6);

        // Current-flow arrows along the signal path during track only
        if (tracking) {
            // From bufIn → MOSFET → cap node, animated dot
            var pathPts = [
                [nodes.bufIn.x + 36, nodes.bufIn.y],
                [nodes.sw.x - 60, nodes.sw.y],
                [nodes.sw.x + 60, nodes.sw.y],
                [nodes.cap.x, nodes.cap.y]
            ];
            var pathStr = 'M ' + pathPts.map(function (p) { return p.join(','); }).join(' L ');
            dyn.append('path')
                .attr('d', pathStr)
                .attr('fill', 'none')
                .attr('stroke', 'var(--c-output2)')
                .attr('stroke-width', 2.4)
                .attr('opacity', 0.55);

            // Three current arrowheads spaced along the path
            [0.3, 0.55, 0.8].forEach(function (frac) {
                var p = sampleAlong(pathPts, frac);
                var p2 = sampleAlong(pathPts, Math.min(0.95, frac + 0.04));
                var ang = Math.atan2(p2[1] - p[1], p2[0] - p[0]);
                arrowAt(dyn, p[0], p[1], ang);
            });
        }

        // Phase label badge near the MOSFET
        dyn.append('rect')
            .attr('x', nodes.sw.x - 36).attr('y', nodes.sw.y - 64)
            .attr('width', 72).attr('height', 22).attr('rx', 4)
            .attr('fill', tracking ? 'var(--c-output)' : 'var(--c-low)')
            .attr('opacity', 0.18);
        dyn.append('text')
            .attr('x', nodes.sw.x).attr('y', nodes.sw.y - 49).attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', tracking ? 'var(--c-output)' : 'var(--c-low)')
            .attr('font-weight', 'bold')
            .text(tracking ? 'TRACK' : 'HOLD');

        rdPhase.textContent = tracking ? 'TRACK' : 'HOLD';
        rdPhase.className = 'v ' + (tracking ? 'on' : 'off');
        rdSw.textContent = tracking ? 'closed' : 'open';
        rdVc.textContent = state.vC.toFixed(2) + ' V';
    }

    function sampleAlong(pts, frac) {
        // Total length
        var lens = [];
        var total = 0;
        for (var i = 1; i < pts.length; i++) {
            var dx = pts[i][0] - pts[i - 1][0];
            var dy = pts[i][1] - pts[i - 1][1];
            var L = Math.hypot(dx, dy);
            lens.push(L);
            total += L;
        }
        var target = total * frac;
        var acc = 0;
        for (var j = 0; j < lens.length; j++) {
            if (acc + lens[j] >= target) {
                var u = (target - acc) / lens[j];
                return [
                    pts[j][0] + u * (pts[j + 1][0] - pts[j][0]),
                    pts[j][1] + u * (pts[j + 1][1] - pts[j][1])
                ];
            }
            acc += lens[j];
        }
        return pts[pts.length - 1];
    }

    function arrowAt(sel, x, y, angle) {
        var g = sel.append('g').attr('transform', 'translate(' + x + ',' + y + ') rotate(' + (angle * 180 / Math.PI) + ')');
        g.append('polygon')
            .attr('points', '0,0 -10,-5 -10,5')
            .attr('fill', 'var(--c-output2)');
    }

    function tick() {
        if (state.auto) {
            var t = (performance.now() - state.t0) % T_PERIOD;
            var phase = t / T_PERIOD;
            state.phi = (phase < DUTY) ? 1 : 0;
            clkI.value = state.phi;
            clkL.textContent = state.phi > 0.5 ? 'track' : 'hold';
        }
        // simple v_C update
        state.vIn = 0.5 + 0.4 * Math.sin(2 * Math.PI * (performance.now() - state.t0) / 4000);
        if (state.phi > 0.5) {
            state.vC += 0.15 * (state.vIn - state.vC);
        }
        redrawDynamic();
        requestAnimationFrame(tick);
    }

    function init() {
        drawStatic();
        clkI.addEventListener('input', function () {
            state.auto = false;
            btnAuto.classList.remove('active');
            state.phi = parseFloat(clkI.value);
            clkL.textContent = state.phi > 0.5 ? 'track' : 'hold';
        });
        btnAuto.addEventListener('click', function () {
            state.auto = !state.auto;
            btnAuto.classList.toggle('active', state.auto);
            if (state.auto) state.t0 = performance.now();
        });
        window.addEventListener('themechange', function () { drawStatic(); });
        window.addEventListener('resize', function () { drawStatic(); });
        requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
