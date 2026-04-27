// Shared plot helpers for the active filter family page.
// Builds the s-plane axes (4-quadrant) and the Bode magnitude+phase pair.
// Each section script calls these once per render and then draws its own
// poles, zeros, and traces on the returned panels.
(function () {

    // While the user is actively scrolling the page, wheel events that pass
    // over a plot should keep scrolling instead of zooming. Once scrolling
    // stops, a fresh wheel on a plot zooms it.
    if (!window.__plotWheelGuard) {
        var IDLE_MS = 200;
        var lastOutsideWheel = 0;
        window.addEventListener('wheel', function (e) {
            var t = e.target;
            var inPlot = t && t.closest && t.closest('[data-plot-zoom]');
            if (!inPlot) lastOutsideWheel = e.timeStamp || performance.now();
        }, { capture: true, passive: true });
        window.__plotWheelGuard = {
            isPageScrolling: function (event) {
                var now = (event && event.timeStamp) || performance.now();
                return (now - lastOutsideWheel) < IDLE_MS;
            },
            extend: function (event) {
                lastOutsideWheel = (event && event.timeStamp) || performance.now();
            }
        };
    }

    function getCssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    // ─── Bode pair: magnitude on top, phase below ────────────────
    function setupBodePair(opts) {
        var T = window.T;
        var sel = opts.sel;
        var xDomain = opts.xDomain || [0.05, 20];
        var magDomain = opts.magDomain || [-80, 6];
        var phaseDomain = opts.phaseDomain || [-540, 10];
        var phaseTicks = opts.phaseTicks;
        var magTicks = opts.magTicks;

        var root = d3.select(sel);
        root.selectAll('*').remove();

        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || 600;

        var margin = { top: 40, right: 32, bottom: 56, left: 64 };
        var gapBetween = 22;
        var innerW = W - margin.left - margin.right;
        var innerH_total = H - margin.top - margin.bottom - gapBetween;
        var innerH = innerH_total / 2;

        var svg = root.append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);
        var content = svg.append('g').attr('class', 'zoom-content');

        var x = d3.scaleLog().domain(xDomain).range([0, innerW]).clamp(true);
        var yMag = d3.scaleLinear().domain(magDomain).range([innerH, 0]);
        var yPhase = d3.scaleLinear().domain(phaseDomain).range([innerH, 0]);

        var xLogTicks = generateLogTicks(xDomain[0], xDomain[1]);

        var gMag = content.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        drawPanelGrid(gMag, x, yMag, magTicks || yMag.ticks(7), xLogTicks, innerW, innerH, T);
        styleAxis(gMag.append('g').call(
            d3.axisLeft(yMag).tickValues(magTicks || yMag.ticks(7)).tickSizeOuter(0)
        ), T);
        styleAxis(gMag.append('g').attr('transform', 'translate(0,' + innerH + ')').call(
            d3.axisBottom(x).tickValues(xLogTicks.major).tickFormat(function () { return ''; }).tickSizeOuter(0)
        ), T);

        var phaseTop = margin.top + innerH + gapBetween;
        var gPhase = content.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + phaseTop + ')');
        drawPanelGrid(gPhase, x, yPhase, phaseTicks || yPhase.ticks(7), xLogTicks, innerW, innerH, T);
        styleAxis(gPhase.append('g').call(
            d3.axisLeft(yPhase).tickValues(phaseTicks || yPhase.ticks(7)).tickSizeOuter(0)
        ), T);
        styleAxis(gPhase.append('g').attr('transform', 'translate(0,' + innerH + ')').call(
            d3.axisBottom(x).tickValues(xLogTicks.major).tickFormat(fmtFreqTick).tickSizeOuter(0)
        ), T);

        // Axis titles (single-quadrant rule)
        window.renderKatex(content, '|H(j\\omega)|\\,[\\mathrm{dB}]',
            20, margin.top + innerH / 2,
            { width: 200, height: 24, rotate: -90, size: 13 });
        window.renderKatex(content, '\\angle H(j\\omega)\\,[^\\circ]',
            20, phaseTop + innerH / 2,
            { width: 200, height: 24, rotate: -90, size: 13 });
        window.renderKatex(content, '\\omega\\,[\\mathrm{rad/s}]',
            margin.left + innerW / 2, H - 14,
            { width: 200, height: 24, size: 13 });

        installSvgZoom(root, content, W, H);

        return {
            svg: svg, gMag: gMag, gPhase: gPhase,
            x: x, yMag: yMag, yPhase: yPhase,
            innerW: innerW, innerH: innerH,
            margin: margin, phaseTop: phaseTop, W: W, H: H
        };
    }

    // ─── Bode single: magnitude only, wider aspect ───────────────
    function setupBodeSingle(opts) {
        var T = window.T;
        var sel = opts.sel;
        var xDomain = opts.xDomain || [0.05, 20];
        var magDomain = opts.magDomain || [-80, 6];
        var magTicks = opts.magTicks;

        var root = d3.select(sel);
        root.selectAll('*').remove();

        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || 360;

        var margin = { top: 38, right: 28, bottom: 56, left: 64 };
        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top - margin.bottom;

        var svg = root.append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);
        var content = svg.append('g').attr('class', 'zoom-content');

        var x = d3.scaleLog().domain(xDomain).range([0, innerW]).clamp(true);
        var yMag = d3.scaleLinear().domain(magDomain).range([innerH, 0]);
        var xLogTicks = generateLogTicks(xDomain[0], xDomain[1]);

        var gMag = content.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        drawPanelGrid(gMag, x, yMag, magTicks || yMag.ticks(7), xLogTicks, innerW, innerH, T);
        styleAxis(gMag.append('g').call(
            d3.axisLeft(yMag).tickValues(magTicks || yMag.ticks(7)).tickSizeOuter(0)
        ), T);
        styleAxis(gMag.append('g').attr('transform', 'translate(0,' + innerH + ')').call(
            d3.axisBottom(x).tickValues(xLogTicks.major).tickFormat(fmtFreqTick).tickSizeOuter(0)
        ), T);

        window.renderKatex(content, '|H(j\\omega)|\\,[\\mathrm{dB}]',
            20, margin.top + innerH / 2,
            { width: 200, height: 24, rotate: -90, size: 13 });
        window.renderKatex(content, '\\omega\\,[\\mathrm{rad/s}]',
            margin.left + innerW / 2, H - 14,
            { width: 200, height: 24, size: 13 });

        installSvgZoom(root, content, W, H);

        return {
            svg: svg, gMag: gMag,
            x: x, yMag: yMag,
            innerW: innerW, innerH: innerH,
            margin: margin, W: W, H: H
        };
    }

    // ─── S-plane: 4-quadrant, equal scaling ──────────────────────
    // The data window is expected to be square (same span on Re and Im),
    // since the four classical filter families show their geometric
    // content (poles on a circle, ellipse, etc.) only with equal axis
    // scaling. The padding is therefore tuned so the inner square fills
    // the available canvas with minimal whitespace.
    function setupSPlane(opts) {
        var T = window.T;
        var sel = opts.sel;
        var xDomain = opts.xDomain || [-2, 2];
        var yDomain = opts.yDomain || [-2, 2];

        var root = d3.select(sel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || W;

        // Reserved zones (in SVG pixels):
        //   top = 72: corner panel label sits in the upper half (CSS
        //     top: 10, ~14 px tall, ending near y = 26); Im{s} axis title
        //     is pinned at y = 50, leaving ~22 px of clear space below
        //     the corner label and ~22 px above the plot frame.
        //   right = 64: Re{s} axis title sits at innerW + 24, centred on
        //     the real axis. ForeignObject width is 60 so it never
        //     overflows the SVG.
        //   left = 16, bottom = 36: minimal, since both axes pass through
        //     x = 0 / y = 0 in the middle of a square data window, so
        //     in-plot tick labels do not need outer space.
        var pad = { top: 72, right: 64, bottom: 36, left: 16 };
        var imTitleY = 50;
        var availW = W - pad.left - pad.right;
        var availH = H - pad.top - pad.bottom;

        var dataAspect = (xDomain[1] - xDomain[0]) / (yDomain[1] - yDomain[0]);
        var fitAspect = availW / availH;
        var innerW, innerH;
        if (fitAspect > dataAspect) {
            innerH = availH;
            innerW = innerH * dataAspect;
        } else {
            innerW = availW;
            innerH = innerW / dataAspect;
        }
        var extraX = (availW - innerW) / 2;
        var extraY = (availH - innerH) / 2;
        var margin = {
            top: pad.top + extraY,
            left: pad.left + extraX,
            right: pad.right + extraX,
            bottom: pad.bottom + extraY
        };

        var svg = root.append('svg')
            .attr('width', W).attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);
        var content = svg.append('g').attr('class', 'zoom-content');

        var x = d3.scaleLinear().domain(xDomain).range([0, innerW]);
        var y = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

        var g = content.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // Light grid at integer ticks
        var xTicks = d3.range(Math.ceil(xDomain[0]), Math.floor(xDomain[1]) + 1, 1);
        var yTicks = d3.range(Math.ceil(yDomain[0]), Math.floor(yDomain[1]) + 1, 1);
        g.append('g').attr('class', 'grid')
            .selectAll('line.gx').data(xTicks).join('line')
            .attr('x1', function (d) { return x(d); })
            .attr('x2', function (d) { return x(d); })
            .attr('y1', 0).attr('y2', innerH)
            .attr('stroke', T.grid).attr('stroke-width', 1);
        g.append('g').attr('class', 'grid')
            .selectAll('line.gy').data(yTicks).join('line')
            .attr('y1', function (d) { return y(d); })
            .attr('y2', function (d) { return y(d); })
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

        // Tick labels along in-plot axes
        xTicks.forEach(function (v) {
            if (v === 0) return;
            g.append('text')
                .attr('x', x(v)).attr('y', y(0) + 14)
                .attr('text-anchor', 'middle')
                .attr('fill', T.fg(0.55))
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .text(v);
        });
        yTicks.forEach(function (v) {
            if (v === 0) return;
            g.append('text')
                .attr('x', x(0) - 6).attr('y', y(v) + 4)
                .attr('text-anchor', 'end')
                .attr('fill', T.fg(0.55))
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11)
                .text(v.toFixed(0));
        });

        // Axis titles (four-quadrant rule per CLAUDE.md). The Im title
        // is pinned to y = imTitleY in the SVG top band so it sits a
        // fixed distance below the corner panel label, regardless of
        // extraY. The Re title sits in the right padding band, just
        // outside the plot frame.
        window.renderKatex(content, '\\mathrm{Im}\\{s\\}',
            margin.left + x(0), imTitleY,
            { width: 80, height: 20, size: 13 });
        window.renderKatex(content, '\\mathrm{Re}\\{s\\}',
            margin.left + innerW + 24, margin.top + y(0),
            { width: 60, height: 20, size: 13 });

        installSvgZoom(root, content, W, H);

        return {
            svg: svg, g: g, x: x, y: y,
            innerW: innerW, innerH: innerH,
            margin: margin, W: W, H: H
        };
    }

    // ─── Marker drawing helpers ──────────────────────────────────
    // Pole (×): two crossed lines. Zero (○): empty circle.
    function drawPole(g, cx, cy, color, size) {
        var s = size || 7;
        g.append('line')
            .attr('x1', cx - s).attr('x2', cx + s)
            .attr('y1', cy - s).attr('y2', cy + s)
            .attr('stroke', color).attr('stroke-width', 2.4)
            .attr('stroke-linecap', 'round');
        g.append('line')
            .attr('x1', cx - s).attr('x2', cx + s)
            .attr('y1', cy + s).attr('y2', cy - s)
            .attr('stroke', color).attr('stroke-width', 2.4)
            .attr('stroke-linecap', 'round');
    }
    function drawZero(g, cx, cy, color, size) {
        var s = size || 7;
        g.append('circle')
            .attr('cx', cx).attr('cy', cy).attr('r', s)
            .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.2);
    }

    // Draw the |H(s)| = 1 level curve from the pole-zero geometry. The
    // curve is the 0 dB boundary for the distance-product construction.
    function drawMagnitudeUnityContour(sp, filter, color) {
        if (!d3.contours) return;

        var nx = 90;
        var ny = 90;
        var xDomain = sp.x.domain();
        var yDomain = sp.y.domain();
        var values = [];
        var norm = computeGeometricNormMax(filter);
        var logNorm = Math.log(Math.max(norm, 1e-12));

        for (var j = 0; j < ny; j++) {
            var im = yDomain[1] - (j / (ny - 1)) * (yDomain[1] - yDomain[0]);
            for (var i = 0; i < nx; i++) {
                var re = xDomain[0] + (i / (nx - 1)) * (xDomain[1] - xDomain[0]);
                values.push(logMagnitudeAt({ re: re, im: im }, filter) - logNorm);
            }
        }

        var contours = d3.contours()
            .size([nx, ny])
            .thresholds([0])(values);

        sp.g.append('g')
            .attr('class', 'mag-unity-contour')
            .selectAll('path')
            .data(contours)
            .join('path')
            .attr('d', function (d) { return contourPath(d, sp, nx, ny); })
            .attr('fill', color)
            .attr('fill-opacity', 0.08)
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6 4')
            .attr('opacity', 0.72)
            .attr('pointer-events', 'none');
    }

    function logMagnitudeAt(s, filter) {
        var poles = filter.poles || [];
        var zeros = filter.zeros || [];
        var eps = 1e-9;
        var logMag = Math.log(Math.max(Math.abs(filter.gain || 1), eps));

        zeros.forEach(function (z) {
            logMag += Math.log(Math.max(cDistance(s, z), eps));
        });
        poles.forEach(function (p) {
            logMag -= Math.log(Math.max(cDistance(s, p), eps));
        });
        return Math.max(Math.min(logMag, 40), -40);
    }

    function computeGeometricNormMax(filter) {
        var n = 240;
        var lo = 0.001;
        var hi = 1;
        var maxMag = 0;
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = lo * Math.pow(hi / lo, t);
            var mag = Math.exp(logMagnitudeAt({ re: 0, im: w }, filter));
            if (mag > maxMag) maxMag = mag;
        }
        return maxMag || 1;
    }

    function cDistance(a, b) {
        var dx = a.re - b.re;
        var dy = a.im - b.im;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function contourPath(contour, sp, nx, ny) {
        var xDomain = sp.x.domain();
        var yDomain = sp.y.domain();
        var xSpan = xDomain[1] - xDomain[0];
        var ySpan = yDomain[1] - yDomain[0];
        var d = '';

        contour.coordinates.forEach(function (poly) {
            poly.forEach(function (ring) {
                ring.forEach(function (pt, idx) {
                    var re = xDomain[0] + (pt[0] / (nx - 1)) * xSpan;
                    var im = yDomain[1] - (pt[1] / (ny - 1)) * ySpan;
                    d += (idx === 0 ? 'M' : 'L') + sp.x(re) + ',' + sp.y(im);
                });
                d += 'Z';
            });
        });
        return d;
    }

    // ─── Shared bookkeeping ──────────────────────────────────────
    function generateLogTicks(lo, hi) {
        var major = [], minor = [];
        var dStart = Math.floor(Math.log10(lo));
        var dEnd = Math.ceil(Math.log10(hi));
        for (var d = dStart; d <= dEnd; d++) {
            var dec = Math.pow(10, d);
            if (dec >= lo && dec <= hi) major.push(dec);
            for (var k = 2; k <= 9; k++) {
                var v = k * dec;
                if (v >= lo && v <= hi) minor.push(v);
            }
        }
        return { major: major, minor: minor };
    }

    function drawPanelGrid(g, x, y, yTicks, xLogTicks, w, h, T) {
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

    function styleAxis(ax, T) {
        ax.selectAll('path,line').attr('stroke', T.gridAxis);
        ax.selectAll('text')
            .attr('fill', T.text)
            .attr('font-size', 12)
            .attr('font-family', "'JetBrains Mono', monospace");
    }

    function installSvgZoom(svg, content, width, height) {
        var zoom = d3.zoom()
            .scaleExtent([1, 8])
            .extent([[0, 0], [width, height]])
            .translateExtent([[-width, -height], [2 * width, 2 * height]])
            .filter(function (event) {
                if (event.type === 'wheel') {
                    if (window.__plotWheelGuard && window.__plotWheelGuard.isPageScrolling(event)) {
                        window.__plotWheelGuard.extend(event);
                        return false;
                    }
                    event.preventDefault();
                }
                return !event.button;
            })
            .on('start', function () { svg.style('cursor', 'grabbing'); })
            .on('zoom', function (event) {
                content.attr('transform', event.transform);
                updateZoomFixedLabels(content, event.transform.k);
            })
            .on('end', function () { svg.style('cursor', 'grab'); });

        svg
            .attr('data-plot-zoom', '')
            .style('cursor', 'grab')
            .style('touch-action', 'none')
            .call(zoom)
            .on('wheel.zoom-block-scroll', function (event) {
                if (window.__plotWheelGuard && window.__plotWheelGuard.isPageScrolling(event)) {
                    window.__plotWheelGuard.extend(event);
                    return;
                }
                event.preventDefault();
            })
            .on('dblclick.zoom', null)
            .on('dblclick.zoom-reset', function (event) {
                event.preventDefault();
                svg.transition()
                    .duration(180)
                    .call(zoom.transform, d3.zoomIdentity);
            });
    }

    function updateZoomFixedLabels(content, zoomK) {
        var inv = labelZoomCompensation(zoomK);
        content.selectAll('.zoom-fixed-label')
            .attr('transform', function () {
                var x = parseFloat(this.getAttribute('data-anchor-x') || '0');
                var y = parseFloat(this.getAttribute('data-anchor-y') || '0');
                return 'translate(' + x + ' ' + y + ') scale(' + inv + ') translate(' + (-x) + ' ' + (-y) + ')';
            });
    }

    function labelZoomCompensation(zoomK) {
        var k = zoomK || 1;
        // The parent plot already scales by k. Dividing by k keeps a
        // label constant; the extra sqrt(k) makes it shrink gently as the
        // viewer zooms in, leaving the vectors easier to inspect.
        return 1 / (k * Math.sqrt(k));
    }

    function fmtFreqTick(d) {
        if (d >= 1000) return (d / 1000) + 'k';
        if (d >= 1) return String(d);
        return d.toString();
    }

    // ─── Trace path generators for Bode panels ───────────────────
    function makeMagLine(x, yMag) {
        var magMin = yMag.domain()[0];
        return d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yMag(Math.max(d.magDb, magMin)); });
    }
    function makePhaseLine(x, yPhase) {
        var phaseMin = yPhase.domain()[0];
        return d3.line()
            .x(function (d) { return x(d.w); })
            .y(function (d) { return yPhase(Math.max(Math.min(d.phase, yPhase.domain()[1]), phaseMin)); });
    }

    // Convenience: draw both magnitude and phase paths for one trace.
    function drawTrace(BD, pts, cssClass) {
        var lineMag = makeMagLine(BD.x, BD.yMag);
        var linePhase = makePhaseLine(BD.x, BD.yPhase);
        BD.gMag.append('path').datum(pts).attr('class', 'trace ' + cssClass).attr('d', lineMag);
        BD.gPhase.append('path').datum(pts).attr('class', 'trace ' + cssClass).attr('d', linePhase);
    }

    // ─── Legend ──────────────────────────────────────────────────
    // Renders a small mono-font legend. Each entry has either a plain
    // string `label` or a `{ subRow: true, label: '...' }` form which
    // produces a sub-line under the previous entry without a line
    // marker, suitable for parameter annotations.
    function drawLegend(g, anchorX, anchorY, entries, T) {
        var lg = g.append('g').attr('transform', 'translate(' + anchorX + ',' + anchorY + ')');
        entries.forEach(function (e, idx) {
            var row = lg.append('g').attr('transform', 'translate(0,' + (idx * 18) + ')');
            if (!e.subRow) {
                row.append('line')
                    .attr('x1', -36).attr('x2', -8).attr('y1', 8).attr('y2', 8)
                    .attr('stroke', e.color).attr('stroke-width', 2.4).attr('stroke-linecap', 'round');
            }
            row.append('text')
                .attr('x', -42).attr('y', 11).attr('text-anchor', 'end')
                .attr('fill', T.text).attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', e.subRow ? 10 : 11)
                .text(e.label);
        });
    }

    window.AFPlots = {
        setupBodePair: setupBodePair,
        setupBodeSingle: setupBodeSingle,
        setupSPlane: setupSPlane,
        drawPole: drawPole,
        drawZero: drawZero,
        drawMagnitudeUnityContour: drawMagnitudeUnityContour,
        drawTrace: drawTrace,
        makeMagLine: makeMagLine,
        makePhaseLine: makePhaseLine,
        drawLegend: drawLegend,
        getCssVar: getCssVar
    };
})();
