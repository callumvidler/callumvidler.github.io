// Section 03 · Loaded N-stage passive RC cascade.
// Bode magnitude and phase laid out side by side, with the s-plane pole
// locations of H_loaded(s) shown beneath. Loaded response computed via the
// shared ABCD chain helper; poles use the closed form for an N-stage
// identical RC ladder with open-circuited output.
(function () {
    var T = window.T;
    var bodeSel = '#plot-bode-loaded-cascade';
    var splaneSel = '#plot-splane-loaded';
    var slider = document.getElementById('nload-slider');
    var valLabel = document.getElementById('nload-val');
    var togglePill = document.getElementById('show-ideal-overlay');
    var H_helpers = window.BodeHelpers;

    // Normalised: each stage has R = 1 ohm, C = 1 F, so the single-stage
    // cutoff is wc = 1 rad/s.
    var state = { N: 3, showIdeal: true };

    // Shared semantic colours (match cascading_filters.css palette).
    var realColor = function () { return getCssVar('--c-real'); };
    var idealColor = function () { return getCssVar('--c-ideal'); };
    var markColor = function () { return getCssVar('--c-mark'); };
    function getCssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    // ────────────────────────────────────────────────────────
    //  Side-by-side Bode setup (mag on left, phase on right)
    // ────────────────────────────────────────────────────────
    function setupBodeSide(opts) {
        var sel = opts.sel;
        var xDomain = opts.xDomain;
        var magDomain = opts.magDomain;
        var phaseDomain = opts.phaseDomain;
        var magTicks = opts.magTicks;
        var phaseTicks = opts.phaseTicks;

        var root = d3.select(sel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || 360;

        var margin = { top: 42, right: 24, bottom: 60, left: 60 };
        var midGap = 70;
        var panelW = (W - margin.left - margin.right - midGap) / 2;
        var innerH = H - margin.top - margin.bottom;

        var svg = root.append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);

        var x = d3.scaleLog().domain(xDomain).range([0, panelW]).clamp(true);
        var yMag = d3.scaleLinear().domain(magDomain).range([innerH, 0]);
        var yPhase = d3.scaleLinear().domain(phaseDomain).range([innerH, 0]);
        var xLogTicks = H_helpers.generateLogTicks(xDomain[0], xDomain[1]);

        // Magnitude panel (left)
        var gMag = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        drawPanelGrid(gMag, x, yMag, magTicks || yMag.ticks(7), xLogTicks, panelW, innerH);
        var magYg = gMag.append('g').call(
            d3.axisLeft(yMag).tickValues(magTicks || yMag.ticks(7)).tickSizeOuter(0));
        var magXg = gMag.append('g').attr('transform', 'translate(0,' + innerH + ')').call(
            d3.axisBottom(x).tickValues(xLogTicks.major).tickFormat(fmtFreqTick).tickSizeOuter(0));
        H_helpers.styleAxis(magYg);
        H_helpers.styleAxis(magXg);

        // Phase panel (right)
        var phaseLeft = margin.left + panelW + midGap;
        var gPhase = svg.append('g')
            .attr('transform', 'translate(' + phaseLeft + ',' + margin.top + ')');
        drawPanelGrid(gPhase, x, yPhase, phaseTicks || yPhase.ticks(7), xLogTicks, panelW, innerH);
        var phYg = gPhase.append('g').call(
            d3.axisLeft(yPhase).tickValues(phaseTicks || yPhase.ticks(7)).tickSizeOuter(0));
        var phXg = gPhase.append('g').attr('transform', 'translate(0,' + innerH + ')').call(
            d3.axisBottom(x).tickValues(xLogTicks.major).tickFormat(fmtFreqTick).tickSizeOuter(0));
        H_helpers.styleAxis(phYg);
        H_helpers.styleAxis(phXg);

        // Axis titles (single-quadrant rule)
        window.renderKatex(svg, '|H(j\\omega)|\\,[\\mathrm{dB}]',
            20, margin.top + innerH / 2,
            { width: 200, height: 24, rotate: -90, size: 13 });
        window.renderKatex(svg, '\\angle H(j\\omega)\\,[^\\circ]',
            phaseLeft - 44, margin.top + innerH / 2,
            { width: 200, height: 24, rotate: -90, size: 13 });
        window.renderKatex(svg, '\\omega\\,[\\mathrm{rad/s}]',
            margin.left + panelW / 2, H - 14,
            { width: 220, height: 24, size: 13 });
        window.renderKatex(svg, '\\omega\\,[\\mathrm{rad/s}]',
            phaseLeft + panelW / 2, H - 14,
            { width: 220, height: 24, size: 13 });

        return {
            svg: svg, gMag: gMag, gPhase: gPhase,
            x: x, yMag: yMag, yPhase: yPhase,
            innerW: panelW, innerH: innerH,
            margin: margin, phaseLeft: phaseLeft, panelW: panelW,
            W: W, H: H
        };
    }

    function drawPanelGrid(g, x, y, yTicks, xLogTicks, w, h) {
        g.append('g').attr('class', 'grid')
            .selectAll('line.gy').data(yTicks).join('line')
            .attr('y1', function (d) { return y(d); })
            .attr('y2', function (d) { return y(d); })
            .attr('x1', 0).attr('x2', w)
            .attr('stroke', T.grid).attr('stroke-width', 1);
        g.append('g').attr('class', 'grid')
            .selectAll('line.gx').data(xLogTicks.major).join('line')
            .attr('class', 'major')
            .attr('x1', function (d) { return x(d); })
            .attr('x2', function (d) { return x(d); })
            .attr('y1', 0).attr('y2', h)
            .attr('stroke', T.grid).attr('stroke-width', 1);
        g.append('g').attr('class', 'grid')
            .selectAll('line.gxm').data(xLogTicks.minor).join('line')
            .attr('x1', function (d) { return x(d); })
            .attr('x2', function (d) { return x(d); })
            .attr('y1', 0).attr('y2', h)
            .attr('stroke', T.gridFine).attr('stroke-width', 1);
        g.append('rect')
            .attr('x', 0).attr('y', 0).attr('width', w).attr('height', h)
            .attr('fill', 'none').attr('stroke', T.gridStrong).attr('stroke-width', 1);
    }

    function fmtFreqTick(d) {
        if (d >= 1000) return (d / 1000) + 'k';
        if (d >= 1) return String(d);
        return d.toString();
    }

    // ────────────────────────────────────────────────────────
    //  Pole computation (closed form)
    //  For N identical normalised stages with R = C = 1, the loaded
    //  cascade poles are eigenvalues of the symmetric tridiagonal matrix
    //      diag = [-2, -2, ..., -2, -1],  off-diag = 1
    //  giving s_k = -2[1 - cos((2k-1)π/(2N+1))],  k = 1..N.
    // ────────────────────────────────────────────────────────
    function computePoles(N) {
        var poles = [];
        for (var k = 1; k <= N; k++) {
            var theta = (2 * k - 1) * Math.PI / (2 * N + 1);
            poles.push(-2 * (1 - Math.cos(theta)));
        }
        return poles;
    }

    // ────────────────────────────────────────────────────────
    //  S-plane plot (four-quadrant axes through origin)
    // ────────────────────────────────────────────────────────
    function setupSPlane(N) {
        var root = d3.select(splaneSel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || W;

        // Reserve padding for axis titles outside the plot area (Im{s} on top,
        // Re{s} on the right) and for tick labels along the in-plot axes.
        var pad = { top: 40, right: 96, bottom: 32, left: 38 };
        var availW = W - pad.left - pad.right;
        var availH = H - pad.top - pad.bottom;
        // Force a truly square inner plot by taking the smaller dimension
        // and centring the leftover space across the matching margin pair.
        var plotSize = Math.min(availW, availH);
        var extraX = (availW - plotSize) / 2;
        var extraY = (availH - plotSize) / 2;
        var margin = {
            top: pad.top + extraY,
            right: pad.right + extraX,
            bottom: pad.bottom + extraY,
            left: pad.left + extraX
        };
        var innerW = plotSize, innerH = plotSize;

        // Square data window: x ∈ [-4.5, 0.5] (5 units wide), y ∈ [-2.5, 2.5]
        // (5 units tall) → equal scaling on both axes since innerW == innerH.
        var xMin = -4.5, xMax = 0.5;
        var yHalf = (xMax - xMin) / 2;
        var yMin = -yHalf, yMax = yHalf;

        var svg = root.append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);

        var x = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
        var y = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

        var g = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // Light grid
        var xTicks = d3.range(Math.ceil(xMin), Math.floor(xMax) + 1, 1);
        var yTicks = y.ticks(4);
        g.append('g').attr('class', 'grid')
            .selectAll('line.gx').data(xTicks).join('line')
            .attr('x1', function (d) { return x(d); }).attr('x2', function (d) { return x(d); })
            .attr('y1', 0).attr('y2', innerH)
            .attr('stroke', T.grid).attr('stroke-width', 1);
        g.append('g').attr('class', 'grid')
            .selectAll('line.gy').data(yTicks).join('line')
            .attr('y1', function (d) { return y(d); }).attr('y2', function (d) { return y(d); })
            .attr('x1', 0).attr('x2', innerW)
            .attr('stroke', T.grid).attr('stroke-width', 1);

        // Plot frame
        g.append('rect')
            .attr('x', 0).attr('y', 0).attr('width', innerW).attr('height', innerH)
            .attr('fill', 'none').attr('stroke', T.gridStrong).attr('stroke-width', 1);

        // Bold real and imaginary axes through origin
        g.append('line')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', y(0)).attr('y2', y(0))
            .attr('stroke', T.gridAxis).attr('stroke-width', 1.4);
        g.append('line')
            .attr('y1', 0).attr('y2', innerH)
            .attr('x1', x(0)).attr('x2', x(0))
            .attr('stroke', T.gridAxis).attr('stroke-width', 1.4);

        // Real-axis tick labels (along the in-plot real axis)
        var realLabels = g.append('g');
        xTicks.forEach(function (v) {
            if (v === 0) return;
            realLabels.append('text')
                .attr('x', x(v)).attr('y', y(0) + 16)
                .attr('text-anchor', 'middle')
                .attr('fill', T.fg(0.55))
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .text(v);
        });

        // Imaginary-axis tick labels
        var imagLabels = g.append('g');
        yTicks.forEach(function (v) {
            if (v === 0) return;
            imagLabels.append('text')
                .attr('x', x(0) - 6).attr('y', y(v) + 4)
                .attr('text-anchor', 'end')
                .attr('fill', T.fg(0.55))
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .text(v.toFixed(1));
        });

        // Ideal pole at s = -1 with multiplicity N. Use a plus-sign marker so
        // the visual does not collide with the convention "○ = zero, × = pole",
        // and lift the label well above the pole with an arrow pointing down.
        if (state.showIdeal) {
            var idealPx = x(-1);
            var idealPy = y(0);
            var ic = idealColor();
            var idealG = g.append('g').attr('transform', 'translate(' + idealPx + ',' + idealPy + ')');
            var psz = 8;
            idealG.append('line')
                .attr('x1', -psz).attr('x2', psz).attr('y1', 0).attr('y2', 0)
                .attr('stroke', ic).attr('stroke-width', 2.2).attr('stroke-linecap', 'round');
            idealG.append('line')
                .attr('x1', 0).attr('x2', 0).attr('y1', -psz).attr('y2', psz)
                .attr('stroke', ic).attr('stroke-width', 2.2).attr('stroke-linecap', 'round');

            // Lifted text label with arrow pointing down to the pole marker.
            var labelDy = -52;
            idealG.append('text')
                .attr('x', 0).attr('y', labelDy)
                .attr('text-anchor', 'middle')
                .attr('fill', ic)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .text('×' + N + ' ideal at s = −1');

            // Arrow head shape (filled triangle), defined per-render so theme
            // changes pick up the live colour.
            var defs = svg.append('defs');
            defs.append('marker')
                .attr('id', 'idealPoleArrow')
                .attr('viewBox', '0 0 10 10')
                .attr('refX', 8).attr('refY', 5)
                .attr('markerWidth', 6).attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path').attr('d', 'M0,0 L10,5 L0,10 Z')
                .attr('fill', ic);
            idealG.append('line')
                .attr('x1', 0).attr('x2', 0)
                .attr('y1', labelDy + 8).attr('y2', -psz - 6)
                .attr('stroke', ic).attr('stroke-width', 1.2)
                .attr('marker-end', 'url(#idealPoleArrow)');
        }

        // Loaded poles (red X marks on the negative real axis)
        var poles = computePoles(N);
        var rc = realColor();
        var poleG = g.append('g');
        poles.forEach(function (p, idx) {
            var px = x(p);
            var py = y(0);
            var sz = 7;
            poleG.append('line')
                .attr('x1', px - sz).attr('x2', px + sz)
                .attr('y1', py - sz).attr('y2', py + sz)
                .attr('stroke', rc).attr('stroke-width', 2.4)
                .attr('stroke-linecap', 'round');
            poleG.append('line')
                .attr('x1', px - sz).attr('x2', px + sz)
                .attr('y1', py + sz).attr('y2', py - sz)
                .attr('stroke', rc).attr('stroke-width', 2.4)
                .attr('stroke-linecap', 'round');

            // Label only the slowest (rightmost) and fastest (leftmost) to
            // avoid stacked text on top of overlapping markers.
            if (idx === 0 || idx === poles.length - 1) {
                var below = (idx === 0);
                poleG.append('text')
                    .attr('x', px)
                    .attr('y', below ? py + sz + 16 : py - sz - 8)
                    .attr('text-anchor', 'middle')
                    .attr('fill', T.text)
                    .attr('font-family', "'JetBrains Mono', monospace")
                    .attr('font-size', 11)
                    .text('s = ' + p.toFixed(3));
            }
        });

        // Axis titles (four-quadrant rule per CLAUDE.md)
        // Im{s} above the plot, sitting just above the top of the y-axis.
        window.renderKatex(svg, '\\mathrm{Im}\\{s\\}',
            margin.left + x(0), margin.top - 12,
            { width: 80, height: 18, size: 13 });
        // Re{s} to the right of the plot, centred on the x-axis. Pushed
        // further right so it doesn't overlap the in-plot Im{s} axis.
        window.renderKatex(svg, '\\mathrm{Re}\\{s\\}',
            margin.left + innerW + 50, margin.top + y(0),
            { width: 70, height: 18, size: 13 });

        // Legend tucked into the upper-left of the plot area
        var lg = g.append('g').attr('transform', 'translate(8,8)');
        var entries = [{ kind: 'real', label: 'loaded poles' }];
        if (state.showIdeal) entries.unshift({ kind: 'ideal', label: 'ideal pole (×N)' });
        entries.forEach(function (e, idx) {
            var row = lg.append('g').attr('transform', 'translate(0,' + (idx * 16) + ')');
            if (e.kind === 'real') {
                row.append('line')
                    .attr('x1', 0).attr('x2', 12).attr('y1', 0).attr('y2', 12)
                    .attr('stroke', rc).attr('stroke-width', 2.4).attr('stroke-linecap', 'round');
                row.append('line')
                    .attr('x1', 0).attr('x2', 12).attr('y1', 12).attr('y2', 0)
                    .attr('stroke', rc).attr('stroke-width', 2.4).attr('stroke-linecap', 'round');
            } else {
                var ic2 = idealColor();
                row.append('line')
                    .attr('x1', 0).attr('x2', 12).attr('y1', 6).attr('y2', 6)
                    .attr('stroke', ic2).attr('stroke-width', 2.2).attr('stroke-linecap', 'round');
                row.append('line')
                    .attr('x1', 6).attr('x2', 6).attr('y1', 0).attr('y2', 12)
                    .attr('stroke', ic2).attr('stroke-width', 2.2).attr('stroke-linecap', 'round');
            }
            row.append('text')
                .attr('x', 18).attr('y', 10)
                .attr('fill', T.text)
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .text(e.label);
        });

        return { svg: svg, g: g, x: x, y: y, innerW: innerW, innerH: innerH };
    }

    // ────────────────────────────────────────────────────────
    //  Render: Bode pair + s-plane
    // ────────────────────────────────────────────────────────
    function render() {
        var N = state.N;

        var BD = setupBodeSide({
            sel: bodeSel,
            xDomain: [0.01, 100],
            magDomain: [-160, 6],
            phaseDomain: [-540, 10],
            magTicks: [-160, -120, -80, -40, -20, -3, 0],
            phaseTicks: [-540, -450, -360, -270, -180, -90, 0]
        });

        var x = BD.x, yMag = BD.yMag, yPhase = BD.yPhase;
        var wMin = 0.01, wMax = 100, n = 480;

        var idealPts = [], realPts = [], realPhases = [];
        var stages = [];
        for (var k = 0; k < N; k++) stages.push({ R: 1, C: 1 });

        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = wMin * Math.pow(wMax / wMin, t);
            var stageMag = 1 / Math.sqrt(1 + w * w);
            var stagePhase = -Math.atan(w);
            var idealMag = Math.pow(stageMag, N);
            var idealPhaseDeg = stagePhase * N * 180 / Math.PI;
            idealPts.push({ w: w, magDb: 20 * Math.log10(idealMag), phase: idealPhaseDeg });

            var Hjw = H_helpers.cascadeABCD(w, stages);
            var mag = H_helpers.cAbs(Hjw);
            realPts.push({ w: w, magDb: 20 * Math.log10(mag), phaseRad: H_helpers.cArg(Hjw) });
            realPhases.push(H_helpers.cArg(Hjw));
        }
        var unwrapped = H_helpers.unwrapPhase(realPhases);
        for (var j = 0; j < realPts.length; j++) realPts[j].phase = unwrapped[j] * 180 / Math.PI;

        var magMin = yMag.domain()[0];
        var clip = function (d) { return Math.max(d, magMin); };
        var lineMag = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yMag(clip(d.magDb)); });
        var linePhase = d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yPhase(d.phase); });

        if (state.showIdeal) {
            BD.gMag.append('path').datum(idealPts).attr('class', 'trace ideal').attr('d', lineMag);
            BD.gPhase.append('path').datum(idealPts).attr('class', 'trace ideal').attr('d', linePhase);
        }
        BD.gMag.append('path').datum(realPts).attr('class', 'trace real').attr('d', lineMag);
        BD.gPhase.append('path').datum(realPts).attr('class', 'trace real').attr('d', linePhase);

        // Single-stage cutoff marker on both panels (green dashed verticals)
        var xc = x(1);
        BD.gMag.append('line').attr('class', 'cutoff-single')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        BD.gPhase.append('line').attr('class', 'cutoff-single')
            .attr('x1', xc).attr('x2', xc).attr('y1', 0).attr('y2', BD.innerH);
        // single-stage cutoff label rendered as a KaTeX pill in both panels
        window.renderKatex(BD.gMag, '\\text{single-stage}\\ \\omega_c',
            xc, BD.innerH - 16,
            { width: 130, height: 22, size: 12, pill: true });
        window.renderKatex(BD.gPhase, '\\text{single-stage}\\ \\omega_c',
            xc, BD.innerH - 16,
            { width: 130, height: 22, size: 12, pill: true });

        // Composite -3 dB markers (loaded and ideal)
        function findCutoff(pts) {
            for (var ii = 0; ii < pts.length - 1; ii++) {
                if (pts[ii].magDb >= -3 && pts[ii + 1].magDb < -3) {
                    var a = pts[ii], b = pts[ii + 1];
                    var tt = (-3 - a.magDb) / (b.magDb - a.magDb);
                    return a.w * Math.pow(b.w / a.w, tt);
                }
            }
            return null;
        }
        var wReal3 = findCutoff(realPts);
        var wIdeal3 = state.showIdeal ? findCutoff(idealPts) : null;
        if (wReal3) {
            var xr = x(wReal3);
            BD.gMag.append('line').attr('class', 'marker-line')
                .attr('x1', xr).attr('x2', xr).attr('y1', 0).attr('y2', BD.innerH);
            BD.gPhase.append('line').attr('class', 'marker-line')
                .attr('x1', xr).attr('x2', xr).attr('y1', 0).attr('y2', BD.innerH);
            BD.gMag.append('circle').attr('class', 'marker-dot')
                .attr('cx', xr).attr('cy', yMag(-3)).attr('r', 5);
            // Pill centred on the composite cutoff line. The foreignObject is
            // generous; the pill inside auto-sizes to its no-wrap content.
            var pillCx3 = Math.max(60,
                Math.min(BD.innerW - 60, xr));
            window.renderKatex(BD.gMag, '\\text{loaded}\\ -3\\,\\mathrm{dB}',
                pillCx3, 14,
                { width: 200, height: 22, size: 9, pill: true, pillPad: '1px 6px' });
        }
        if (wIdeal3) {
            var xi = x(wIdeal3);
            BD.gMag.append('line').attr('x1', xi).attr('x2', xi)
                .attr('y1', 0).attr('y2', BD.innerH)
                .attr('stroke', T.fg(0.45)).attr('stroke-width', 1).attr('stroke-dasharray', '2 4');
            BD.gPhase.append('line').attr('x1', xi).attr('x2', xi)
                .attr('y1', 0).attr('y2', BD.innerH)
                .attr('stroke', T.fg(0.45)).attr('stroke-width', 1).attr('stroke-dasharray', '2 4');
        }

        // Legend (top-right of magnitude panel)
        var lg = BD.gMag.append('g').attr('transform', 'translate(' + (BD.innerW - 12) + ',12)');
        var entries = [{ c: 'real', label: 'loaded N = ' + N }];
        if (state.showIdeal) entries.unshift({ c: 'ideal', label: 'ideal 1/(1+sRC)^' + N });
        entries.forEach(function (e, idx) {
            var row = lg.append('g').attr('transform', 'translate(0,' + (idx * 18) + ')');
            row.append('line').attr('class', 'trace ' + e.c)
                .attr('x1', -36).attr('x2', -8).attr('y1', 8).attr('y2', 8);
            row.append('text')
                .attr('x', -42).attr('y', 11).attr('text-anchor', 'end')
                .attr('fill', T.text).attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11).text(e.label);
        });

        // S-plane below
        setupSPlane(N);
    }

    function onSlider() {
        state.N = parseInt(slider.value, 10);
        if (valLabel) valLabel.textContent = String(state.N);
        render();
    }

    function init() {
        if (slider) slider.addEventListener('input', onSlider);
        if (togglePill) {
            togglePill.addEventListener('click', function () {
                state.showIdeal = !state.showIdeal;
                togglePill.classList.toggle('active', state.showIdeal);
                render();
            });
        }
        if (slider) onSlider(); else render();
        window.addEventListener('themechange', render);
        window.addEventListener('resize', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
