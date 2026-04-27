// Argand-plane plot factory used by both the multiplication and the division
// scenes on this page. Renders two input vectors z1, z2, the result vector
// (z1*z2 or z1/z2), three angular arcs and the magnitude labels. Exposes
// drag handles for z1 and z2 and an animate() method.
//
// The plot is four-quadrant; axis titles follow the four-quadrant rule from
// CLAUDE.md (y-title above plot centred on the y-axis, x-title to the right
// centred on the x-axis, neither rotated).
(function () {
    const AXIS_EXT = 3;            // visible domain in both real and imaginary axes
    const ARC_PX_1 = 26;           // pixel radius of arc 1 (angle of z1)
    const ARC_PX_2 = 44;           // pixel radius of arc 2 (added/subtracted angle)
    const ARC_PX_R = 64;           // pixel radius of arc 3 (resulting angle)
    const GRID_STEP = 1;
    const SNAP_PX = 14;

    function deg(rad) { return rad * 180 / Math.PI; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function wrap(t) { while (t > Math.PI) t -= 2 * Math.PI; while (t <= -Math.PI) t += 2 * Math.PI; return t; }

    window.createArgandPlot = function (opts) {
        const sel = opts.selector;
        const root = document.querySelector(sel);
        const mode = opts.mode;                  // 'mul' or 'div'
        const state = opts.state;                // mutated in place
        const onChange = opts.onChange || function () { };
        const r2Min = (mode === 'div') ? 0.45 : 0.2;
        const r1Min = 0.2;
        const rMax = 1.8;

        const margin = { top: 44, right: 60, bottom: 28, left: 28 };

        let svg, svgNode, g, x, y;
        let W, H, innerW, innerH;
        let animState = null;

        function compute() {
            const ghostT = (animState && animState.active) ? animState.t : null;
            const ghostR = (animState && animState.active) ? animState.r : null;
            const z1 = { r: state.r1, t: state.t1 };
            const z2 = { r: state.r2, t: state.t2 };
            let rr, tt;
            if (mode === 'mul') { rr = z1.r * z2.r; tt = z1.t + z2.t; }
            else { rr = z1.r / z2.r; tt = z1.t - z2.t; }
            const result = { r: rr, t: wrap(tt), tRaw: tt };
            return { z1, z2, result, ghost: (ghostT == null) ? null : { r: ghostR, t: ghostT } };
        }

        function pxFromZ(z) { return [x(z.r * Math.cos(z.t)), y(z.r * Math.sin(z.t))]; }

        function snapToGridLines(point) {
            const snapped = { x: point.x, y: point.y };
            const gridX = Math.round(point.x / GRID_STEP) * GRID_STEP;
            const gridY = Math.round(point.y / GRID_STEP) * GRID_STEP;

            if (Math.abs(x(point.x) - x(gridX)) <= SNAP_PX) snapped.x = gridX;
            if (Math.abs(y(point.y) - y(gridY)) <= SNAP_PX) snapped.y = gridY;
            return snapped;
        }

        function setup() {
            const rect = root.getBoundingClientRect();
            W = rect.width || 480;
            H = rect.height || W;
            innerW = W - margin.left - margin.right;
            innerH = H - margin.top - margin.bottom;

            const sv = d3.select(sel);
            sv.selectAll('*').remove();
            sv.attr('viewBox', '0 0 ' + W + ' ' + H);
            svg = sv;
            svgNode = sv.node();

            // The data scales preserve aspect ratio (square box, equal extents),
            // so unit circles stay circular.
            const span = Math.min(innerW, innerH);
            const cx = innerW / 2;
            const cy = innerH / 2;
            x = d3.scaleLinear().domain([-AXIS_EXT, AXIS_EXT]).range([cx - span / 2, cx + span / 2]);
            y = d3.scaleLinear().domain([-AXIS_EXT, AXIS_EXT]).range([cy + span / 2, cy - span / 2]);

            g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        }

        function arrowhead(parent, x1, y1, x2, y2, color, size, opacity) {
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            if (len < 1) return;
            const ux = dx / len, uy = dy / len;
            const px = -uy, py = ux;
            const s = size || 9;
            const back = 0.9 * s;
            const ax = x2 - back * ux + 0.5 * s * px;
            const ay = y2 - back * uy + 0.5 * s * py;
            const bx = x2 - back * ux - 0.5 * s * px;
            const by = y2 - back * uy - 0.5 * s * py;
            parent.append('path')
                .attr('d', 'M' + x2 + ',' + y2 + ' L' + ax + ',' + ay + ' L' + bx + ',' + by + ' Z')
                .attr('fill', color)
                .attr('stroke', 'none')
                .attr('opacity', opacity == null ? 1 : opacity);
        }

        function vec(parent, cls, color, x1, y1, x2, y2) {
            const isResult = (cls === 'result');
            const isGhost = (cls === 'ghost');
            const op = isResult ? 1 : (isGhost ? 0.4 : 0.55);
            parent.append('line')
                .attr('class', 'vec ' + cls)
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', color);
            arrowhead(parent, x1, y1, x2, y2, color, 9, op);
        }

        // SVG arc path with a literal angular sweep dt from tFrom in math
        // convention (anticlockwise positive). The arc length is the absolute
        // value of dt; the direction is its sign. This is required so that
        // arc3 of the multiplication construction shows the literal sum
        // theta1 + theta2 even when that sum exceeds pi, rather than the
        // shorter equivalent angle. Math anticlockwise corresponds to
        // anticlockwise on the screen (because the angle is negated in
        // rendering to compensate for the y-down SVG convention), which is
        // SVG sweep flag 0; clockwise in math becomes sweep flag 1.
        function arcPath(cx0, cy0, rPx, tFrom, dt) {
            const a0 = -tFrom;
            const a1 = -(tFrom + dt);
            const x0 = cx0 + rPx * Math.cos(a0);
            const y0 = cy0 + rPx * Math.sin(a0);
            const x1 = cx0 + rPx * Math.cos(a1);
            const y1 = cy0 + rPx * Math.sin(a1);
            const largeArc = Math.abs(dt) > Math.PI ? 1 : 0;
            const sweep = dt > 0 ? 0 : 1;
            return 'M' + x0 + ',' + y0 + ' A' + rPx + ',' + rPx + ' 0 ' + largeArc + ' ' + sweep + ' ' + x1 + ',' + y1;
        }

        // Place a label at a given angle and pixel radius around the origin
        function labelAtArc(parent, cx0, cy0, rPx, tMid, text, cls, color) {
            const a = -tMid;
            const lx = cx0 + (rPx + 12) * Math.cos(a);
            const ly = cy0 + (rPx + 12) * Math.sin(a);
            parent.append('text')
                .attr('class', 'lbl ' + cls)
                .attr('x', lx).attr('y', ly)
                .attr('fill', color)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .text(text);
        }

        function render() {
            if (!svg) return;
            g.selectAll('*').remove();

            const T = window.T;
            const cssZ1 = getComputedStyle(root).getPropertyValue('--z1-color').trim() || '#58a6ff';
            const cssZ2 = getComputedStyle(root).getPropertyValue('--z2-color').trim() || '#7be089';
            const cssRes = getComputedStyle(root).getPropertyValue('--result-color').trim() || '#7be089';

            // ── grid ──────────────────────────────────────────────
            const grid = g.append('g').attr('class', 'grid');
            const gridStep = 1;
            for (let i = -AXIS_EXT; i <= AXIS_EXT; i += gridStep) {
                if (i === 0) continue;
                grid.append('line')
                    .attr('x1', x(i)).attr('x2', x(i))
                    .attr('y1', y(-AXIS_EXT)).attr('y2', y(AXIS_EXT));
                grid.append('line')
                    .attr('y1', y(i)).attr('y2', y(i))
                    .attr('x1', x(-AXIS_EXT)).attr('x2', x(AXIS_EXT));
            }

            // ── unit circle ───────────────────────────────────────
            const ux = x(0) - x(-1);
            g.append('circle').attr('class', 'unit-circle')
                .attr('cx', x(0)).attr('cy', y(0))
                .attr('r', ux);

            // ── axis lines crossing at origin ─────────────────────
            g.append('line').attr('class', 'axis-line')
                .attr('x1', x(-AXIS_EXT)).attr('x2', x(AXIS_EXT))
                .attr('y1', y(0)).attr('y2', y(0));
            g.append('line').attr('class', 'axis-line')
                .attr('x1', x(0)).attr('x2', x(0))
                .attr('y1', y(-AXIS_EXT)).attr('y2', y(AXIS_EXT));

            // ── ticks on the axes ─────────────────────────────────
            const ticks = g.append('g').attr('class', 'axis-tick');
            for (let i = -AXIS_EXT; i <= AXIS_EXT; i++) {
                if (i === 0) continue;
                // x-axis ticks (real axis)
                ticks.append('line')
                    .attr('x1', x(i)).attr('x2', x(i))
                    .attr('y1', y(0) - 4).attr('y2', y(0) + 4);
                ticks.append('text')
                    .attr('x', x(i)).attr('y', y(0) + 14)
                    .attr('text-anchor', 'middle')
                    .text(i);
                // y-axis ticks (imaginary axis)
                ticks.append('line')
                    .attr('y1', y(i)).attr('y2', y(i))
                    .attr('x1', x(0) - 4).attr('x2', x(0) + 4);
                ticks.append('text')
                    .attr('x', x(0) - 8).attr('y', y(i))
                    .attr('text-anchor', 'end')
                    .attr('dominant-baseline', 'middle')
                    .text(i);
            }

            // ── data ──────────────────────────────────────────────
            const d = compute();
            const ox = x(0), oy = y(0);
            const z1xy = pxFromZ(d.z1);
            const z2xy = pxFromZ(d.z2);
            const rxy = pxFromZ(d.result);

            // ── angle arcs ────────────────────────────────────────
            // arc1: 0 -> theta1, in z1 colour
            // arc2: theta1 -> theta1 + sign*theta2, in z2 colour (visualises the
            //       added or subtracted angle starting from theta1)
            // arc3: 0 -> resulting angle, in result colour
            const t1 = d.z1.t;
            const t2 = d.z2.t;
            const tResRaw = (mode === 'mul') ? (t1 + t2) : (t1 - t2);

            // All three arcs are anchored at the positive real axis so that
            // each one independently displays its complex number's argument
            // measured from Re. Arc 1 spans theta1, arc 2 spans theta2, and
            // arc 3 spans the resulting argument (sum or difference).
            const arcs = g.append('g').attr('class', 'arcs');
            arcs.append('path').attr('class', 'vec-arc a1')
                .attr('stroke', cssZ1)
                .attr('d', arcPath(ox, oy, ARC_PX_1, 0, t1));
            arcs.append('path').attr('class', 'vec-arc a2')
                .attr('stroke', cssZ2)
                .attr('d', arcPath(ox, oy, ARC_PX_2, 0, t2));
            arcs.append('path').attr('class', 'vec-arc ar')
                .attr('stroke', cssRes)
                .attr('d', arcPath(ox, oy, ARC_PX_R, 0, tResRaw));

            // arc labels at each arc's midpoint
            labelAtArc(arcs, ox, oy, ARC_PX_1, t1 / 2, 'θ₁', 'z1', cssZ1);
            labelAtArc(arcs, ox, oy, ARC_PX_2, t2 / 2, 'θ₂', 'z2', cssZ2);
            labelAtArc(arcs, ox, oy, ARC_PX_R, tResRaw / 2,
                (mode === 'mul') ? 'θ₁+θ₂' : 'θ₁−θ₂', 'result', cssRes);

            // ── vectors ───────────────────────────────────────────
            const vecs = g.append('g').attr('class', 'vecs');
            // ghost (animation) drawn behind the live vectors
            if (d.ghost) {
                const gx = x(d.ghost.r * Math.cos(d.ghost.t));
                const gy = y(d.ghost.r * Math.sin(d.ghost.t));
                vec(vecs, 'ghost', cssRes, ox, oy, gx, gy);
                // dashed circle showing the radius the ghost is sweeping at
                const gpx = Math.hypot(gx - ox, gy - oy);
                vecs.append('circle')
                    .attr('cx', ox).attr('cy', oy).attr('r', gpx)
                    .attr('fill', 'none')
                    .attr('stroke', cssRes)
                    .attr('stroke-dasharray', '2 4')
                    .attr('opacity', 0.25);
            }
            vec(vecs, 'z1', cssZ1, ox, oy, z1xy[0], z1xy[1]);
            vec(vecs, 'z2', cssZ2, ox, oy, z2xy[0], z2xy[1]);
            vec(vecs, 'result', cssRes, ox, oy, rxy[0], rxy[1]);

            // ── magnitude labels at each vector tip, rotated to align ──
            magLabel(vecs, ox, oy, z1xy, '|z₁| = ' + d.z1.r.toFixed(2), 'z1', cssZ1);
            magLabel(vecs, ox, oy, z2xy, '|z₂| = ' + d.z2.r.toFixed(2), 'z2', cssZ2);
            magLabel(vecs, ox, oy, rxy,
                (mode === 'mul' ? '|z₁·z₂| = ' : '|z₁/z₂| = ') + d.result.r.toFixed(2),
                'result', cssRes);

            // ── handles (drag for z1, z2; non-interactive for result) ──
            const handles = g.append('g').attr('class', 'handles');
            handles.append('circle').attr('class', 'handle result')
                .attr('cx', rxy[0]).attr('cy', rxy[1]).attr('r', 6)
                .attr('pointer-events', 'none')
                .attr('fill', cssRes);

            const h1 = handles.append('circle').attr('class', 'handle z1')
                .attr('cx', z1xy[0]).attr('cy', z1xy[1]).attr('r', 8)
                .attr('fill', cssZ1);
            const h2 = handles.append('circle').attr('class', 'handle z2')
                .attr('cx', z2xy[0]).attr('cy', z2xy[1]).attr('r', 8)
                .attr('fill', cssZ2);

            attachDrag(h1, 'z1');
            attachDrag(h2, 'z2');

            // ── axis titles (four-quadrant rule) ──────────────────
            // Im sits above the top end of the y-axis, horizontally centred
            // on it. Re sits to the right of the x-axis, vertically centred
            // on it. The top and right margins reserve this label space.
            const yTop = y(AXIS_EXT);          // pixel y of the y-axis top end
            const xRight = x(AXIS_EXT);        // pixel x of the x-axis right end
            renderKatex(g, '\\mathrm{Im}',
                ox, yTop - 20,
                { width: 36, height: 20, size: 14, color: T.text });
            renderKatex(g, '\\mathrm{Re}',
                xRight + 36, oy,
                { width: 30, height: 20, size: 14, color: T.text });
        }

        function magLabel(parent, ox, oy, tip, txt, cls, color) {
            const dx = tip[0] - ox, dy = tip[1] - oy;
            const len = Math.hypot(dx, dy);
            if (len < 14) return;            // too short to label
            const ux = dx / len, uy = dy / len;
            // place the label a few pixels past the vector tip so the
            // arrowhead is not obscured, then rotate it to lie along the
            // vector direction
            const offset = 14;
            const mx = tip[0] + offset * ux;
            const my = tip[1] + offset * uy;
            let angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
            let anchor = 'start';
            // keep text readable: when the vector points leftward in screen
            // coordinates, flip the rotation by 180 and end-anchor so the
            // characters still extend past the tip rather than back over it
            if (angleDeg > 90 || angleDeg < -90) {
                angleDeg += 180;
                anchor = 'end';
            }
            parent.append('text')
                .attr('class', 'lbl ' + cls)
                .attr('x', mx).attr('y', my)
                .attr('fill', color)
                .attr('text-anchor', anchor)
                .attr('dominant-baseline', 'middle')
                .attr('transform', 'rotate(' + angleDeg.toFixed(2) + ',' + mx.toFixed(2) + ',' + my.toFixed(2) + ')')
                .text(txt);
        }

        function attachDrag(node, which) {
            // The drag container is pinned to the SVG root, which persists
            // across renders. Without this, render() removes the handle's
            // parent group and detaches the container reference, leaving
            // event.x/y stale during the gesture. Event coords arrive in
            // SVG-root space and are translated into the inner-group's
            // coordinate system by subtracting the margin offset.
            node.call(d3.drag()
                .container(function () { return svgNode; })
                .on('start', function () { d3.select(this).classed('dragging', true); })
                .on('drag', function (event) {
                    if (!isFinite(event.x) || !isFinite(event.y)) return;
                    const point = snapToGridLines({
                        x: x.invert(event.x - margin.left),
                        y: y.invert(event.y - margin.top)
                    });
                    const r = Math.hypot(point.x, point.y);
                    const t = Math.atan2(point.y, point.x);
                    const rmin = (which === 'z2') ? r2Min : r1Min;
                    if (which === 'z1') {
                        state.r1 = clamp(r, rmin, rMax);
                        state.t1 = t;
                    } else {
                        state.r2 = state.unitLock ? 1.0 : clamp(r, rmin, rMax);
                        state.t2 = t;
                    }
                    onChange();
                    render();
                })
                .on('end', function () { d3.select(this).classed('dragging', false); })
            );
        }

        function animate() {
            if (animState && animState.active) return;
            const start = { r: state.r1, t: state.t1 };
            const sign = (mode === 'mul') ? +1 : -1;
            const endR = (mode === 'mul') ? state.r1 * state.r2 : state.r1 / state.r2;
            const endT = state.t1 + sign * state.t2;
            const dur = 1400;
            const t0 = performance.now();
            animState = { active: true, r: start.r, t: start.t };

            function frame(now) {
                const u = clamp((now - t0) / dur, 0, 1);
                // ease in-out
                const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                animState.r = start.r + (endR - start.r) * e;
                animState.t = start.t + (endT - start.t) * e;
                render();
                if (u < 1) {
                    requestAnimationFrame(frame);
                } else {
                    animState.active = false;
                    setTimeout(function () { animState = null; render(); }, 350);
                }
            }
            requestAnimationFrame(frame);
        }

        setup();
        render();

        const onResize = function () { setup(); render(); };
        const onTheme = function () { render(); };
        window.addEventListener('resize', onResize);
        window.addEventListener('themechange', onTheme);

        return { render: render, animate: animate };
    };
})();
