// Interactive grid map for complex multiplication and division. The accent
// handle is the image of the unit vector at 1 under multiplication by a.
(function () {
    const AXIS_EXT = 3;
    const GRID_EXT = 3;
    const GRID_STEP = 0.5;
    const A_MIN = 0.45;
    const SNAP_PX = 14;

    const state = {
        mode: 'mul',
        z1: { x: 1.0, y: 1.0 },
        z2: { x: 1.0, y: -1.0 },
        a: { x: 1.0, y: 0.0 },
        divBase: { x: 1.0, y: -1.0 }
    };

    const root = document.querySelector('#plot-transform');
    const btnMul = document.getElementById('transform-mode-mul');
    const btnDiv = document.getElementById('transform-mode-div');
    const btnSnap = document.getElementById('transform-snap-z1');
    const btnReset = document.getElementById('transform-reset');
    const readout = document.getElementById('transform-readout');

    const margin = { top: 44, right: 60, bottom: 28, left: 28 };
    let svg, svgNode, g, x, y;
    let W, H, innerW, innerH;

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function mag(z) {
        return Math.hypot(z.x, z.y);
    }

    function angle(z) {
        return Math.atan2(z.y, z.x);
    }

    function fmtComplex(z) {
        const sign = z.y >= 0 ? '+' : '−';
        return z.x.toFixed(2) + ' ' + sign + ' ' + Math.abs(z.y).toFixed(2) + 'i';
    }

    function fmtAngle(rad) {
        let d = rad * 180 / Math.PI;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        const sign = d >= 0 ? '+' : '−';
        return sign + Math.abs(d).toFixed(0) + '°';
    }

    function multiply(a, w) {
        return {
            x: a.x * w.x - a.y * w.y,
            y: a.x * w.y + a.y * w.x
        };
    }

    function divide(w, a) {
        const den = a.x * a.x + a.y * a.y;
        return {
            x: (w.x * a.x + w.y * a.y) / den,
            y: (w.y * a.x - w.x * a.y) / den
        };
    }

    function transformPoint(w) {
        return state.mode === 'mul' ? multiply(state.a, w) : divide(w, state.a);
    }

    function transformGridPoint(w) {
        const factor = state.mode === 'mul' ? state.a : divide(state.a, state.divBase);
        return multiply(factor, w);
    }

    function selectedPair() {
        const d1 = Math.hypot(state.a.x - state.z1.x, state.a.y - state.z1.y);
        const d2 = Math.hypot(state.a.x - state.z2.x, state.a.y - state.z2.y);
        if (d1 <= d2) {
            return {
                carrierLabel: 'z₁',
                subject: state.z2,
                subjectLabel: 'z₂',
                subjectClass: 'z2',
                resultLabel: state.mode === 'mul' ? 'az₂' : 'z₂/a'
            };
        }
        return {
            carrierLabel: 'z₂',
            subject: state.z1,
            subjectLabel: 'z₁',
            subjectClass: 'z1',
            resultLabel: state.mode === 'mul' ? 'az₁' : 'z₁/a'
        };
    }

    function px(z) {
        return [x(z.x), y(z.y)];
    }

    function snapToGridPoint(z) {
        const snapped = {
            x: Math.round(z.x / GRID_STEP) * GRID_STEP,
            y: Math.round(z.y / GRID_STEP) * GRID_STEP
        };
        if (mag(snapped) < A_MIN) return z;

        const p = px(z);
        const q = px(snapped);
        return Math.hypot(p[0] - q[0], p[1] - q[1]) <= SNAP_PX ? snapped : z;
    }

    function snapToGridLines(z) {
        const snapped = { x: z.x, y: z.y };
        const gridX = Math.round(z.x / GRID_STEP) * GRID_STEP;
        const gridY = Math.round(z.y / GRID_STEP) * GRID_STEP;

        if (Math.abs(x(z.x) - x(gridX)) <= SNAP_PX) snapped.x = gridX;
        if (Math.abs(y(z.y) - y(gridY)) <= SNAP_PX) snapped.y = gridY;
        return snapped;
    }

    function snapToVectorEnds(z) {
        const p = px(z);
        const candidates = [state.z1, state.z2];
        let nearest = null;
        let nearestDist = Infinity;

        candidates.forEach(function (candidate) {
            const q = px(candidate);
            const dist = Math.hypot(p[0] - q[0], p[1] - q[1]);
            if (dist < nearestDist) {
                nearest = candidate;
                nearestDist = dist;
            }
        });

        return nearestDist <= SNAP_PX ? { x: nearest.x, y: nearest.y } : z;
    }

    function setup() {
        const rect = root.getBoundingClientRect();
        W = rect.width || 480;
        H = rect.height || W;
        innerW = W - margin.left - margin.right;
        innerH = H - margin.top - margin.bottom;

        const sv = d3.select(root);
        sv.selectAll('*').remove();
        sv.attr('viewBox', '0 0 ' + W + ' ' + H);
        svg = sv;
        svgNode = sv.node();

        const span = Math.min(innerW, innerH);
        const cx = innerW / 2;
        const cy = innerH / 2;
        x = d3.scaleLinear().domain([-AXIS_EXT, AXIS_EXT]).range([cx - span / 2, cx + span / 2]);
        y = d3.scaleLinear().domain([-AXIS_EXT, AXIS_EXT]).range([cy + span / 2, cy - span / 2]);

        g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    }

    function arrowhead(parent, x1, y1, x2, y2, className) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 1) return;
        const ux = dx / len;
        const uy = dy / len;
        const pxn = -uy;
        const pyn = ux;
        const s = 9;
        const back = 0.9 * s;
        const ax = x2 - back * ux + 0.5 * s * pxn;
        const ay = y2 - back * uy + 0.5 * s * pyn;
        const bx = x2 - back * ux - 0.5 * s * pxn;
        const by = y2 - back * uy - 0.5 * s * pyn;
        parent.append('path')
            .attr('class', className)
            .attr('d', 'M' + x2 + ',' + y2 + ' L' + ax + ',' + ay + ' L' + bx + ',' + by + ' Z');
    }

    function drawVector(parent, cls, from, to) {
        const p0 = px(from);
        const p1 = px(to);
        parent.append('line')
            .attr('class', 'vec ' + cls)
            .attr('x1', p0[0]).attr('y1', p0[1])
            .attr('x2', p1[0]).attr('y2', p1[1]);
        arrowhead(parent, p0[0], p0[1], p1[0], p1[1], 'handle ' + cls);
    }

    function drawGrid(parent, mapped) {
        const values = d3.range(-GRID_EXT, GRID_EXT + GRID_STEP / 2, GRID_STEP);
        values.forEach(function (v) {
            const major = Math.abs(v - Math.round(v)) < 1e-6;
            const verticalA = { x: v, y: -GRID_EXT };
            const verticalB = { x: v, y: GRID_EXT };
            const horizontalA = { x: -GRID_EXT, y: v };
            const horizontalB = { x: GRID_EXT, y: v };
            const va = mapped ? transformGridPoint(verticalA) : verticalA;
            const vb = mapped ? transformGridPoint(verticalB) : verticalB;
            const ha = mapped ? transformGridPoint(horizontalA) : horizontalA;
            const hb = mapped ? transformGridPoint(horizontalB) : horizontalB;
            const v0 = px(va);
            const v1 = px(vb);
            const h0 = px(ha);
            const h1 = px(hb);
            parent.append('line')
                .attr('class', major ? 'major' : null)
                .attr('x1', v0[0]).attr('y1', v0[1])
                .attr('x2', v1[0]).attr('y2', v1[1]);
            parent.append('line')
                .attr('class', major ? 'major' : null)
                .attr('x1', h0[0]).attr('y1', h0[1])
                .attr('x2', h1[0]).attr('y2', h1[1]);
        });
    }

    function label(parent, z, text, cls, dx, dy) {
        const p = px(z);
        parent.append('text')
            .attr('class', 'lbl ' + cls)
            .attr('x', p[0] + dx)
            .attr('y', p[1] + dy)
            .attr('text-anchor', dx < 0 ? 'end' : 'start')
            .attr('dominant-baseline', 'middle')
            .text(text);
    }

    function renderReadout() {
        const pair = selectedPair();
        const transformed = transformPoint(pair.subject);
        const rows = [
            ['operation', state.mode === 'mul' ? 'w ↦ aw' : 'grid: w ↦ (a/a₀)w; point: w ↦ w/a'],
            ['a near', pair.carrierLabel + ', transforming ' + pair.subjectLabel],
            ['handle a', fmtComplex(state.a) + ', |a| = ' + mag(state.a).toFixed(2) + ', arg(a) = ' + fmtAngle(angle(state.a))],
            [pair.subjectLabel + ' image', fmtComplex(pair.subject) + ' ↦ ' + fmtComplex(transformed)]
        ];

        readout.replaceChildren();
        rows.forEach(function (row) {
            const div = document.createElement('div');
            const lab = document.createElement('div');
            const val = document.createElement('div');
            div.className = 'row';
            lab.className = 'lab';
            val.className = 'val';
            lab.textContent = row[0];
            val.textContent = row[1];
            div.append(lab, val);
            readout.appendChild(div);
        });
    }

    function render() {
        if (!svg) return;
        g.selectAll('*').remove();
        const T = window.T;
        const ox = x(0);
        const oy = y(0);
        const pair = selectedPair();
        const subjectImage = transformPoint(pair.subject);
        const resultStart = state.mode === 'div' ? pair.subject : { x: 0, y: 0 };

        svg.selectAll('defs').remove();
        const clipId = 'transform-clip-' + Math.round(W) + '-' + Math.round(H);
        svg.append('defs')
            .append('clipPath')
            .attr('id', clipId)
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', innerW)
            .attr('height', innerH);

        const clipped = g.append('g').attr('clip-path', 'url(#' + clipId + ')');
        drawGrid(clipped.append('g').attr('class', 'source-grid'), false);
        drawGrid(clipped.append('g').attr('class', 'mapped-grid'), true);

        const axes = g.append('g').attr('class', 'axis-tick');
        g.append('line').attr('class', 'axis-line')
            .attr('x1', x(-AXIS_EXT)).attr('x2', x(AXIS_EXT))
            .attr('y1', oy).attr('y2', oy);
        g.append('line').attr('class', 'axis-line')
            .attr('x1', ox).attr('x2', ox)
            .attr('y1', y(-AXIS_EXT)).attr('y2', y(AXIS_EXT));

        for (let i = -AXIS_EXT; i <= AXIS_EXT; i++) {
            if (i === 0) continue;
            axes.append('line')
                .attr('x1', x(i)).attr('x2', x(i))
                .attr('y1', oy - 4).attr('y2', oy + 4);
            axes.append('text')
                .attr('x', x(i)).attr('y', oy + 14)
                .attr('text-anchor', 'middle')
                .text(i);
            axes.append('line')
                .attr('y1', y(i)).attr('y2', y(i))
                .attr('x1', ox - 4).attr('x2', ox + 4);
            axes.append('text')
                .attr('x', ox - 8).attr('y', y(i))
                .attr('text-anchor', 'end')
                .attr('dominant-baseline', 'middle')
                .text(i);
        }

        const vecs = g.append('g').attr('class', 'vecs');
        drawVector(vecs, 'z1', { x: 0, y: 0 }, state.z1);
        drawVector(vecs, 'z2', { x: 0, y: 0 }, state.z2);
        drawVector(vecs, 'transform', { x: 0, y: 0 }, state.a);
        drawVector(vecs, 'result result-' + pair.subjectClass, resultStart, subjectImage);

        g.append('circle')
            .attr('class', 'unit-start')
            .attr('cx', x(1)).attr('cy', y(0))
            .attr('r', 5);

        g.append('circle')
            .attr('class', 'mapped-point result-' + pair.subjectClass)
            .attr('cx', px(subjectImage)[0]).attr('cy', px(subjectImage)[1])
            .attr('r', 6);

        const handles = g.append('g').attr('class', 'handles');
        const h1 = handles.append('circle').attr('class', 'handle z1')
            .attr('cx', px(state.z1)[0]).attr('cy', px(state.z1)[1]).attr('r', 8);
        const h2 = handles.append('circle').attr('class', 'handle z2')
            .attr('cx', px(state.z2)[0]).attr('cy', px(state.z2)[1]).attr('r', 8);
        const ha = handles.append('circle').attr('class', 'handle transform')
            .attr('cx', px(state.a)[0]).attr('cy', px(state.a)[1]).attr('r', 9);

        attachDrag(h1, 'z1');
        attachDrag(h2, 'z2');
        attachDrag(ha, 'a');

        label(g, state.z1, 'z₁', 'z1', 10, -12);
        label(g, state.z2, 'z₂', 'z2', 10, 14);
        label(g, state.a, 'a', 'transform', 12, -16);
        label(g, subjectImage, pair.resultLabel, 'result result-' + pair.subjectClass, 12, 16);
        label(g, { x: 1, y: 0 }, '1', 'transform', 8, 16);

        const yTop = y(AXIS_EXT);
        const xRight = x(AXIS_EXT);
        renderKatex(g, '\\mathrm{Im}', ox, yTop - 20, { width: 36, height: 20, size: 14, color: T.text });
        renderKatex(g, '\\mathrm{Re}', xRight + 36, oy, { width: 30, height: 20, size: 14, color: T.text });

        renderReadout();
    }

    function attachDrag(node, which) {
        node.call(d3.drag()
            .container(function () { return svgNode; })
            .on('start', function () { d3.select(this).classed('dragging', true); })
            .on('drag', function (event) {
                if (!isFinite(event.x) || !isFinite(event.y)) return;
                const next = {
                    x: clamp(x.invert(event.x - margin.left), -2.2, 2.2),
                    y: clamp(y.invert(event.y - margin.top), -2.2, 2.2)
                };
                let target = snapToGridLines(next);
                if (which === 'a') {
                    target = snapToVectorEnds(next);
                    if (target === next) target = snapToGridPoint(snapToGridLines(next));
                    if (mag(target) < A_MIN) {
                        const t = angle(target) || 0;
                        target.x = A_MIN * Math.cos(t);
                        target.y = A_MIN * Math.sin(t);
                    }
                }
                state[which].x = target.x;
                state[which].y = target.y;
                if (which === 'z2' && state.mode === 'div') {
                    state.a.x = target.x;
                    state.a.y = target.y;
                    state.divBase.x = target.x;
                    state.divBase.y = target.y;
                }
                render();
            })
            .on('end', function () { d3.select(this).classed('dragging', false); })
        );
    }

    function setMode(mode) {
        state.mode = mode;
        if (mode === 'div') {
            state.divBase.x = state.z2.x;
            state.divBase.y = state.z2.y;
            state.a.x = state.z2.x;
            state.a.y = state.z2.y;
        }
        btnMul.classList.toggle('active', mode === 'mul');
        btnDiv.classList.toggle('active', mode === 'div');
        render();
    }

    btnMul.addEventListener('click', function () { setMode('mul'); });
    btnDiv.addEventListener('click', function () { setMode('div'); });
    btnSnap.addEventListener('click', function () {
        state.a.x = state.z1.x;
        state.a.y = state.z1.y;
        render();
    });
    btnReset.addEventListener('click', function () {
        state.mode = 'mul';
        state.z1 = { x: 1.0, y: 1.0 };
        state.z2 = { x: 1.0, y: -1.0 };
        state.a = { x: 1.0, y: 0.0 };
        state.divBase = { x: 1.0, y: -1.0 };
        btnMul.classList.add('active');
        btnDiv.classList.remove('active');
        render();
    });

    setup();
    render();
    window.addEventListener('resize', function () { setup(); render(); });
    window.addEventListener('themechange', render);
})();
