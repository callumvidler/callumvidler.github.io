// D3 3D-style s-plane projection for the active filter family plots.
(function () {
    var views = new Map();
    var normCache = new WeakMap();
    var PROBE_COLOR = '#a855f7';
    var DEFAULT_ABOVE_PLANE_PITCH = 0.72;
    var MIN_ABOVE_PLANE_PITCH = 0.46;
    var MAX_ABOVE_PLANE_PITCH = 1.56;

    function setEnabled(opts) {
        var svg = document.querySelector(opts.svgSelector);
        if (!svg) return;

        var box = svg.closest('.plot-box');
        if (!box) return;

        if (!opts.enabled) {
            dispose(opts.svgSelector);
            box.classList.remove('view3d-active');
            return;
        }

        box.classList.add('view3d-active');
        var existing = views.get(opts.svgSelector);
        if (existing) {
            existing.opts = opts;
            render(existing);
            return;
        }

        var view = createView(box, opts);
        views.set(opts.svgSelector, view);
        render(view);
    }

    function dispose(key) {
        var view = views.get(key);
        if (!view) return;
        window.removeEventListener('resize', view.onResize);
        if (view.topButton) view.topButton.remove();
        view.host.remove();
        views.delete(key);
    }

    function createView(box, opts) {
        var host = document.createElement('div');
        host.className = 'd3-splane-view';
        box.appendChild(host);

        var view = {
            host: host,
            svg: d3.select(host).append('svg'),
            opts: opts,
            yaw: -0.72,
            pitch: DEFAULT_ABOVE_PLANE_PITCH,
            savedYaw: -0.72,
            savedPitch: DEFAULT_ABOVE_PLANE_PITCH,
            topMode: false,
            topButton: null,
            zoom: 1,
            onResize: null
        };

        view.topButton = document.createElement('button');
        view.topButton.type = 'button';
        view.topButton.className = 'pill d3-top-view-toolbar';
        view.topButton.textContent = 'top view';
        appendTopViewButton(box, view.topButton);

        view.topButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (view.topMode) {
                view.topMode = false;
                view.yaw = view.savedYaw;
                view.pitch = view.savedPitch;
            } else {
                view.topMode = true;
                view.savedYaw = view.yaw;
                view.savedPitch = constrainAbovePlanePitch(view.pitch);
                view.yaw = 0;
                view.pitch = MAX_ABOVE_PLANE_PITCH;
            }
            render(view);
        });

        view.onResize = function () { render(view); };
        window.addEventListener('resize', view.onResize);

        view.svg.call(d3.drag().on('drag', function (event) {
            view.topMode = false;
            view.yaw += event.dx * 0.008;
            view.pitch = constrainAbovePlanePitch(view.pitch + event.dy * 0.006);
            render(view);
        }));

        view.svg.attr('data-plot-zoom', '');
        view.svg.on('wheel', function (event) {
            if (window.__plotWheelGuard && window.__plotWheelGuard.isPageScrolling(event)) {
                window.__plotWheelGuard.extend(event);
                return;
            }
            event.preventDefault();
            var factor = event.deltaY > 0 ? 0.92 : 1.08;
            view.zoom = clamp(view.zoom * factor, 0.65, 2.4);
            render(view);
        });

        return view;
    }

    function appendTopViewButton(box, button) {
        var stack = box.closest('.plot-stack');
        var toolbar = stack ? stack.querySelector('.toolbar') : null;
        var view3dButton = toolbar ? toolbar.querySelector('[id$="-view-3d"]') : null;

        if (!toolbar) {
            button.className = 'd3-top-view-toggle';
            box.appendChild(button);
            return;
        }

        if (view3dButton && view3dButton.nextSibling) {
            toolbar.insertBefore(button, view3dButton.nextSibling);
        } else {
            toolbar.appendChild(button);
        }
    }

    function render(view) {
        var rect = view.host.getBoundingClientRect();
        var width = Math.max(1, rect.width);
        var height = Math.max(1, rect.height);
        var opts = view.opts;
        var T = window.T || {};
        view.pitch = constrainAbovePlanePitch(view.pitch);
        updateTopButton(view);

        view.svg
            .attr('viewBox', '0 0 ' + width + ' ' + height)
            .attr('width', width)
            .attr('height', height);
        view.svg.selectAll('*').remove();

        var xDomain = opts.xDomain;
        var yDomain = opts.yDomain;
        var surfaceMode = opts.probeMode === 'angle' ? 'angle' : 'mag';
        var sx = 3.2 / (xDomain[1] - xDomain[0]);
        var sz = 3.2 / (yDomain[1] - yDomain[0]);
        var scale = Math.min(width, height) * 0.23 * view.zoom;
        var cx = width * 0.52;
        var cy = height * 0.58;

        function project(p) {
            var x = p.x;
            var y = p.y;
            var z = p.z;
            var cyaw = Math.cos(view.yaw);
            var syaw = Math.sin(view.yaw);
            var cp = Math.max(0.02, Math.cos(view.pitch));
            var sp = Math.max(0.12, Math.sin(view.pitch));

            var xr = x * cyaw - z * syaw;
            var zr = x * syaw + z * cyaw;
            var yr = y * cp - zr * sp;
            var zd = zr * cp - y * sp;
            return {
                x: cx + xr * scale,
                y: cy - yr * scale,
                depth: zd
            };
        }

        drawGrid(view.svg, project, xDomain, yDomain, sx, sz, T);
        if (surfaceMode === 'mag') {
            drawSurface(view.svg, project, opts.filter, xDomain, yDomain, sx, sz, opts.color, surfaceMode, T, 'below');
            drawZeroDbPlaneFill(view.svg, project, opts.filter, xDomain, yDomain, sx, sz, T);
            drawZeroDbPlaneOverlay(view.svg, project, xDomain, yDomain, sx, sz, T);
            drawZeroDbPlaneLabel(view.svg, project, xDomain, yDomain, sx, sz, opts.contourColor || opts.color);
            drawAxes(view.svg, project, xDomain, yDomain, sx, sz, T, false, surfaceMode);
            drawAxes(view.svg, project, xDomain, yDomain, sx, sz, T, true, surfaceMode);
            drawSurface(view.svg, project, opts.filter, xDomain, yDomain, sx, sz, opts.color, surfaceMode, T, 'above');
            drawContour(view.svg, project, opts.filter, xDomain, yDomain, sx, sz, opts.contourColor || opts.color);
        } else {
            drawSurface(view.svg, project, opts.filter, xDomain, yDomain, sx, sz, opts.color, surfaceMode, T);
            drawAxes(view.svg, project, xDomain, yDomain, sx, sz, T, false, surfaceMode);
            drawAxes(view.svg, project, xDomain, yDomain, sx, sz, T, true, surfaceMode);
        }
        drawProbeTrace(view.svg, project, opts.filter, xDomain, yDomain, sx, sz, PROBE_COLOR, surfaceMode);
        drawProbePoint(view.svg, project, opts.filter, opts.probeOmega, opts.probeActive, xDomain, yDomain, sx, sz, PROBE_COLOR, surfaceMode);
        drawPoleZeroMarkers(view.svg, project, opts.filter, xDomain, yDomain, sx, sz, opts.color, surfaceMode);
        drawSceneLabels(view.svg, width, T);
    }

    function updateTopButton(view) {
        if (!view.topButton) return;
        view.topButton.textContent = view.topMode ? 'angled view' : 'top view';
        view.topButton.classList.toggle('active', view.topMode);
    }

    function drawSurface(svg, project, filter, xDomain, yDomain, sx, sz, color, surfaceMode, T, planeSide) {
        var n = 72;
        var cells = [];
        var meshColor = T.gridAxis || T.grid || T.text || 'rgba(255,255,255,0.24)';

        function vertexAt(re, im) {
            var value = surfaceValueAt({ re: re, im: im }, filter, surfaceMode);
            var y = surfaceHeight(value, surfaceMode);
            var p = project({ x: re * sx, y: y, z: imToZ(im, sz) });
            return { re: re, im: im, value: value, y: y, p: p };
        }

        function vertex(i, j) {
            var re = xDomain[0] + (i / n) * (xDomain[1] - xDomain[0]);
            var im = yDomain[0] + (j / n) * (yDomain[1] - yDomain[0]);
            return vertexAt(re, im);
        }

        function addSurfacePolygon(vertices) {
            if (surfaceMode === 'mag' && planeSide) {
                vertices = clipSurfaceCellToPlane(vertices, planeSide, project, sx, sz);
                if (vertices.length < 3) return;
            }

            triangulateFan(vertices).forEach(function (tri) {
                var points = tri.map(function (v) { return v.p; });
                var area = projectedArea(points);
                if (surfaceMode === 'mag' && planeSide === 'above' && area >= -0.1) return;
                if (surfaceMode === 'angle' && area >= -0.1) return;
                if (surfaceMode === 'angle' && hasPhaseWrap(tri) && Math.abs(area) < 8) return;
                var valueMean = d3.mean(tri, function (v) { return v.value; });
                var surfaceFill = surfaceMode === 'angle'
                    ? d3.interpolateRgb('#dc2626', '#1e3a8a')(surfaceMix(valueMean, surfaceMode))
                    : d3.interpolateRgb('#dbeafe', '#1e3a8a')(surfaceMix(valueMean, surfaceMode));
                var depths = points.map(function (p) { return p.depth; });
                var meanDepth = d3.mean(depths);
                cells.push({
                    points: points,
                    depth: Math.min.apply(null, depths),
                    meanDepth: meanDepth,
                    sortDepth: surfaceMode === 'angle' ? meanDepth : Math.min.apply(null, depths),
                    area: area,
                    fill: surfaceFill
                });
            });
        }

        for (var row = 0; row < n; row++) {
            for (var col = 0; col < n; col++) {
                var a = vertex(col, row);
                var b = vertex(col + 1, row);
                var c = vertex(col + 1, row + 1);
                var d = vertex(col, row + 1);
                addSurfacePolygon([a, b, c]);
                addSurfacePolygon([a, c, d]);
            }
        }

        cells.sort(function (a, b) {
            return (b.sortDepth - a.sortDepth) || (b.meanDepth - a.meanDepth);
        });
        svg.append('g')
            .attr('class', 'd3-surface')
            .selectAll('path')
            .data(cells)
            .join('path')
            .attr('d', function (d) { return polygonPath(d.points); })
            .attr('fill', function (d) { return d.fill; })
            .attr('fill-opacity', 1)
            .attr('stroke', meshColor)
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 0.24);
    }

    function triangulateFan(vertices) {
        if (vertices.length < 4) return [vertices];

        var triangles = [];
        for (var i = 1; i < vertices.length - 1; i++) {
            triangles.push([vertices[0], vertices[i], vertices[i + 1]]);
        }
        return triangles;
    }

    function clipSurfaceCellToPlane(vertices, side, project, sx, sz) {
        var keepAbove = side === 'above';
        var out = [];

        function keep(v) {
            return keepAbove ? v.value >= 0 : v.value <= 0;
        }

        function intersect(a, b) {
            var denom = b.value - a.value;
            var t = Math.abs(denom) < 1e-12 ? 0.5 : (0 - a.value) / denom;
            t = clamp(t, 0, 1);
            var re = a.re + (b.re - a.re) * t;
            var im = a.im + (b.im - a.im) * t;
            var p = project({ x: re * sx, y: 0, z: imToZ(im, sz) });
            return { re: re, im: im, value: 0, y: 0, p: p };
        }

        for (var i = 0; i < vertices.length; i++) {
            var current = vertices[i];
            var previous = vertices[(i + vertices.length - 1) % vertices.length];
            var currentInside = keep(current);
            var previousInside = keep(previous);

            if (currentInside !== previousInside) {
                out.push(intersect(previous, current));
            }
            if (currentInside) out.push(current);
        }

        return out;
    }

    function zeroDbPlaneCorners(project, xDomain, yDomain, sx, sz, lift) {
        var y = lift || 0;
        return [
            project({ x: xDomain[0] * sx, y: y, z: imToZ(yDomain[0], sz) }),
            project({ x: xDomain[1] * sx, y: y, z: imToZ(yDomain[0], sz) }),
            project({ x: xDomain[1] * sx, y: y, z: imToZ(yDomain[1], sz) }),
            project({ x: xDomain[0] * sx, y: y, z: imToZ(yDomain[1], sz) })
        ];
    }

    function drawZeroDbPlaneFill(svg, project, filter, xDomain, yDomain, sx, sz, T) {
        var corners = zeroDbPlaneCorners(project, xDomain, yDomain, sx, sz, 0);
        var root = svg.append('g').attr('class', 'd3-zero-db-plane-fill');
        var fillColor = T.fg ? T.fg(0.16) : 'rgba(128,128,128,0.16)';
        var path = polygonPath(corners) + zeroDbCutoutPath(project, filter, xDomain, yDomain, sx, sz);

        root.append('path')
            .attr('d', path)
            .attr('fill', fillColor)
            .attr('fill-rule', 'evenodd')
            .attr('stroke', 'none')
            .attr('pointer-events', 'none');
    }

    function zeroDbCutoutPath(project, filter, xDomain, yDomain, sx, sz) {
        var n = 96;
        var nx = n + 1;
        var ny = n + 1;
        var values = [];

        for (var row = 0; row < ny; row++) {
            var im = yDomain[0] + (row / n) * (yDomain[1] - yDomain[0]);
            for (var col = 0; col < nx; col++) {
                var re = xDomain[0] + (col / n) * (xDomain[1] - xDomain[0]);
                values.push(log10MagnitudeAt({ re: re, im: im }, filter));
            }
        }

        var contours = d3.contours()
            .size([nx, ny])
            .thresholds([0])(values);
        if (!contours.length) return '';

        var d = '';
        contours[0].coordinates.forEach(function (polygon) {
            polygon.forEach(function (ring) {
                if (ring.length < 3) return;
                var points = ring.map(function (point) {
                    var re = xDomain[0] + (point[0] / n) * (xDomain[1] - xDomain[0]);
                    var im = yDomain[0] + (point[1] / n) * (yDomain[1] - yDomain[0]);
                    return project({ x: re * sx, y: 0.012, z: imToZ(im, sz) });
                });
                d += polygonPath(points);
            });
        });
        return d;
    }

    function drawZeroDbPlaneOverlay(svg, project, xDomain, yDomain, sx, sz, T) {
        var corners = zeroDbPlaneCorners(project, xDomain, yDomain, sx, sz, 0.006);
        var root = svg.append('g').attr('class', 'd3-zero-db-plane-overlay');
        var strokeColor = T.fg ? T.fg(0.68) : 'rgba(128,128,128,0.68)';

        root.append('path')
            .attr('d', polygonPath(corners))
            .attr('fill', 'none')
            .attr('stroke', strokeColor)
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 0.9)
            .attr('pointer-events', 'none');

        var hatchCount = 8;
        for (var i = 1; i < hatchCount; i++) {
            var t = i / hatchCount;
            var x = xDomain[0] + t * (xDomain[1] - xDomain[0]);
            drawLine(root,
                project({ x: x * sx, y: 0.004, z: imToZ(yDomain[0], sz) }),
                project({ x: x * sx, y: 0.004, z: imToZ(yDomain[1], sz) }),
                strokeColor, 1, 0.42);
        }

    }

    function drawGrid(svg, project, xDomain, yDomain, sx, sz, T) {
        var root = svg.append('g').attr('class', 'd3-base-grid');
        var gridColor = T.grid || 'rgba(255,255,255,0.18)';
        var axisColor = T.gridAxis || T.text || '#ffffff';

        for (var x = Math.ceil(xDomain[0]); x <= Math.floor(xDomain[1]); x++) {
            drawLine(root, project({ x: x * sx, y: 0, z: imToZ(yDomain[0], sz) }), project({ x: x * sx, y: 0, z: imToZ(yDomain[1], sz) }), x === 0 ? axisColor : gridColor, x === 0 ? 2 : 1, x === 0 ? 0.9 : 0.45);
        }
        for (var y = Math.ceil(yDomain[0]); y <= Math.floor(yDomain[1]); y++) {
            drawLine(root, project({ x: xDomain[0] * sx, y: 0, z: imToZ(y, sz) }), project({ x: xDomain[1] * sx, y: 0, z: imToZ(y, sz) }), y === 0 ? axisColor : gridColor, y === 0 ? 2 : 1, y === 0 ? 0.9 : 0.45);
        }
    }

    function drawAxes(svg, project, xDomain, yDomain, sx, sz, T, labelsOnly, surfaceMode) {
        var root = svg.append('g').attr('class', 'd3-axes');
        var axisColor = T.text || '#ffffff';
        var reStart = project({ x: xDomain[0] * sx, y: 0.02, z: 0 });
        var reEnd = project({ x: xDomain[1] * sx, y: 0.02, z: 0 });
        var imStart = project({ x: 0, y: 0.02, z: imToZ(yDomain[0], sz) });
        var imEnd = project({ x: 0, y: 0.02, z: imToZ(yDomain[1], sz) });

        var magBase = project({ x: xDomain[0] * sx, y: 0, z: imToZ(yDomain[0], sz) });
        var magTop = project({ x: xDomain[0] * sx, y: 1, z: imToZ(yDomain[0], sz) });

        if (!labelsOnly) {
            drawLine(root, reStart, reEnd, axisColor, 2.5, 0.95);
            drawLine(root, imStart, imEnd, axisColor, 2.5, 0.95);
            drawArrowHead(root, reStart, reEnd, axisColor);
            drawArrowHead(root, imStart, imEnd, axisColor);
            drawLine(root, magBase, magTop, axisColor, 2, 0.8);
            drawArrowHead(root, magBase, magTop, axisColor);
            return;
        }

        addPillText(root, 'Re{s}', reEnd.x + 30, reEnd.y, axisColor, 52);
        addPillText(root, 'Im{s}', imEnd.x, imEnd.y - 16, axisColor, 52);
        addPillText(root, surfaceMode === 'angle' ? 'angle H(s) [deg]' : '|H(s)| [dB]', magTop.x + 62, magTop.y - 10, axisColor, surfaceMode === 'angle' ? 130 : 104);
    }

    function drawZeroDbPlaneLabel(svg, project, xDomain, yDomain, sx, sz, color) {
        var root = svg.append('g').attr('class', 'd3-zero-db-plane-label');
        var labelPos = project({ x: xDomain[0] * sx * 0.72, y: 0.08, z: imToZ(yDomain[1] * 0.88, sz) });
        addPillText(root, '|H(s)| = 1 plane', labelPos.x, labelPos.y, color, 128);
    }

    function drawContour(svg, project, filter, xDomain, yDomain, sx, sz, color) {
        var segments = marchingSquares(filter, xDomain, yDomain, 150, 0);
        var root = svg.append('g').attr('class', 'd3-zero-db-contour');
        var contourY = 0.075;
        var projected = segments.map(function (segment) {
            var a = project({ x: segment[0].re * sx, y: contourY, z: imToZ(segment[0].im, sz) });
            var b = project({ x: segment[1].re * sx, y: contourY, z: imToZ(segment[1].im, sz) });
            return { a: a, b: b, depth: (a.depth + b.depth) / 2 };
        });

        root.selectAll('line')
            .data(projected)
            .join('line')
            .attr('x1', function (d) { return d.a.x; })
            .attr('y1', function (d) { return d.a.y; })
            .attr('x2', function (d) { return d.b.x; })
            .attr('y2', function (d) { return d.b.y; })
            .attr('stroke', color)
            .attr('stroke-width', 4)
            .attr('stroke-linecap', 'round')
            .attr('stroke-opacity', 0.98);

        var labelPos = project({ x: xDomain[1] * sx * 0.58, y: 0.18, z: imToZ(yDomain[1] * 0.72, sz) });
        var pill = root.append('g').attr('transform', 'translate(' + labelPos.x + ',' + labelPos.y + ')');
        pill.append('rect')
            .attr('x', -48).attr('y', -12)
            .attr('width', 96).attr('height', 24)
            .attr('rx', 12)
            .attr('fill', 'rgba(255,255,255,0.94)')
            .attr('stroke', color)
            .attr('stroke-width', 1.2);
        pill.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', '#1a1a1e')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 11)
            .text('|H(s)| = 1');
    }

    function drawPoleZeroMarkers(svg, project, filter, xDomain, yDomain, sx, sz, color, surfaceMode) {
        var root = svg.append('g').attr('class', 'd3-pole-zero');
        var markerY = 1.18;
        var planeY = 0.025;

        if (surfaceMode === 'angle') {
            drawPhaseSurfaceSingularityMarkers(root, project, filter, xDomain, yDomain, sx, sz);
            return;
        }

        (filter.poles || []).forEach(function (p) {
            if (!inside(p, xDomain, yDomain)) return;
            var base = project({ x: p.re * sx, y: planeY, z: imToZ(p.im, sz) });
            var q = project({ x: p.re * sx, y: markerY, z: imToZ(p.im, sz) });
            drawMarkerDropLine(root, base, q, color);
            root.append('path')
                .attr('d', 'M' + (q.x - 6) + ',' + (q.y - 6) + 'L' + (q.x + 6) + ',' + (q.y + 6) + 'M' + (q.x - 6) + ',' + (q.y + 6) + 'L' + (q.x + 6) + ',' + (q.y - 6))
                .attr('stroke', color)
                .attr('stroke-width', 2.8)
                .attr('stroke-linecap', 'round');
        });
        (filter.zeros || []).forEach(function (z) {
            if (!inside(z, xDomain, yDomain)) return;
            var base = project({ x: z.re * sx, y: planeY, z: imToZ(z.im, sz) });
            var q = project({ x: z.re * sx, y: markerY, z: imToZ(z.im, sz) });
            drawMarkerDropLine(root, base, q, color);
            root.append('circle')
                .attr('cx', q.x)
                .attr('cy', q.y)
                .attr('r', 7)
                .attr('fill', 'rgba(255,255,255,0.92)')
                .attr('stroke', color)
                .attr('stroke-width', 2.6);
        });
    }

    function drawPhaseSurfaceSingularityMarkers(root, project, filter, xDomain, yDomain, sx, sz) {
        var lift = 0.035;
        var planeLift = 0.02;

        function surfacePoint(s) {
            var value = surfaceValueAt(s, filter, 'angle');
            return project({
                x: s.re * sx,
                y: surfaceHeight(value, 'angle') + lift,
                z: imToZ(s.im, sz)
            });
        }

        function planePoint(s) {
            return project({
                x: s.re * sx,
                y: planeLift,
                z: imToZ(s.im, sz)
            });
        }

        function drawPhaseDropLine(base, marker) {
            root.append('line')
                .attr('x1', marker.x).attr('y1', marker.y)
                .attr('x2', base.x).attr('y2', base.y)
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 1.1)
                .attr('stroke-dasharray', '4 4')
                .attr('stroke-opacity', 0.74)
                .attr('pointer-events', 'none');
        }

        function drawPoleCross(point, size, width) {
            root.append('path')
                .attr('d', 'M' + (point.x - size) + ',' + (point.y - size) + 'L' + (point.x + size) + ',' + (point.y + size) + 'M' + (point.x - size) + ',' + (point.y + size) + 'L' + (point.x + size) + ',' + (point.y - size))
                .attr('stroke', '#ffffff')
                .attr('stroke-width', width)
                .attr('stroke-linecap', 'round')
                .attr('pointer-events', 'none');
        }

        function drawZeroCircle(point, radius, width) {
            root.append('circle')
                .attr('cx', point.x)
                .attr('cy', point.y)
                .attr('r', radius)
                .attr('fill', 'none')
                .attr('stroke', '#ffffff')
                .attr('stroke-width', width)
                .attr('pointer-events', 'none');
        }

        (filter.poles || []).forEach(function (p) {
            if (!inside(p, xDomain, yDomain)) return;
            var q = surfacePoint(p);
            var base = planePoint(p);
            drawPhaseDropLine(base, q);
            drawPoleCross(q, 4.5, 2.2);
        });

        (filter.zeros || []).forEach(function (z) {
            if (!inside(z, xDomain, yDomain)) return;
            var q = surfacePoint(z);
            var base = planePoint(z);
            drawPhaseDropLine(base, q);
            drawZeroCircle(q, 5, 2.2);
        });
    }

    function drawProbePoint(svg, project, filter, omega, active, xDomain, yDomain, sx, sz, color, surfaceMode) {
        if (!active || omega == null || omega < yDomain[0] || omega > yDomain[1]) return;

        var value = surfaceValueAt({ re: 0, im: omega }, filter, surfaceMode);
        var probeHeight = surfaceHeight(value, surfaceMode) + 0.055;
        var base = project({ x: 0, y: 0.02, z: imToZ(omega, sz) });
        var point = project({ x: 0, y: probeHeight, z: imToZ(omega, sz) });
        var root = svg.append('g').attr('class', 'd3-probe-point');

        drawMarkerDropLine(root, base, point, color);
        root.append('circle')
            .attr('cx', point.x)
            .attr('cy', point.y)
            .attr('r', 7)
            .attr('fill', 'rgba(255,255,255,0.96)')
            .attr('stroke', color)
            .attr('stroke-width', 2.8);
        root.append('circle')
            .attr('cx', point.x)
            .attr('cy', point.y)
            .attr('r', 3)
            .attr('fill', color);

        addPillText(root, 's = j' + omega.toFixed(2), point.x + 48, point.y - 18, color, 86);
    }

    function drawProbeTrace(svg, project, filter, xDomain, yDomain, sx, sz, color, surfaceMode) {
        var root = svg.append('g').attr('class', 'd3-probe-trace');
        var samples = 140;
        var points = [];
        var wMin = Math.max(0, yDomain[0]);
        var wMax = yDomain[1];

        for (var i = 0; i <= samples; i++) {
            var w = wMin + (i / samples) * (wMax - wMin);
            var value = surfaceValueAt({ re: 0, im: w }, filter, surfaceMode);
            if (surfaceMode === 'angle' && i > 0) {
                var prevValue = surfaceValueAt({ re: 0, im: wMin + ((i - 1) / samples) * (wMax - wMin) }, filter, surfaceMode);
                if (Math.abs(value - prevValue) > 170) {
                    if (points.length > 1) drawProbeTracePath(root, points, color);
                    points = [];
                }
            }
            points.push(project({
                x: 0,
                y: surfaceHeight(value, surfaceMode) + 0.04,
                z: imToZ(w, sz)
            }));
        }
        if (points.length > 1) drawProbeTracePath(root, points, color);
    }

    function drawProbeTracePath(root, points, color) {
        root.append('path')
            .attr('d', d3.line()
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; })(points))
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 4)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-opacity', 0.95);
        root.append('path')
            .attr('d', d3.line()
                .x(function (d) { return d.x; })
                .y(function (d) { return d.y; })(points))
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255,255,255,0.9)')
            .attr('stroke-width', 1.4)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-opacity', 0.85);
    }

    function drawMarkerDropLine(root, base, marker, color) {
        root.append('line')
            .attr('x1', marker.x).attr('y1', marker.y)
            .attr('x2', base.x).attr('y2', base.y)
            .attr('stroke', color)
            .attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '4 4')
            .attr('stroke-opacity', 0.72);
        root.append('circle')
            .attr('cx', base.x)
            .attr('cy', base.y)
            .attr('r', 3)
            .attr('fill', color)
            .attr('fill-opacity', 0.82);
    }

    function drawSceneLabels(svg, width, T) {
        svg.append('text')
            .attr('x', width - 16)
            .attr('y', 24)
            .attr('text-anchor', 'end')
            .attr('fill', T.text || '#ffffff')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 11)
            .text('drag to rotate, scroll to zoom');
    }

    function drawLine(root, a, b, color, width, opacity) {
        root.append('line')
            .attr('x1', a.x).attr('y1', a.y)
            .attr('x2', b.x).attr('y2', b.y)
            .attr('stroke', color)
            .attr('stroke-width', width)
            .attr('stroke-opacity', opacity);
    }

    function drawArrowHead(root, a, b, color) {
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / len;
        var uy = dy / len;
        var nx = -uy;
        var ny = ux;
        var size = 9;
        var p1 = [b.x, b.y];
        var p2 = [b.x - ux * size + nx * size * 0.45, b.y - uy * size + ny * size * 0.45];
        var p3 = [b.x - ux * size - nx * size * 0.45, b.y - uy * size - ny * size * 0.45];
        root.append('path')
            .attr('d', 'M' + p1[0] + ',' + p1[1] + 'L' + p2[0] + ',' + p2[1] + 'L' + p3[0] + ',' + p3[1] + 'Z')
            .attr('fill', color);
    }

    function addText(root, text, x, y, color, anchor) {
        root.append('text')
            .attr('x', x)
            .attr('y', y)
            .attr('text-anchor', anchor || 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', color)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 12)
            .text(text);
    }

    function addPillText(root, text, x, y, color, width) {
        var group = root.append('g').attr('transform', 'translate(' + x + ',' + y + ')');
        group.append('rect')
            .attr('x', -width / 2)
            .attr('y', -12)
            .attr('width', width)
            .attr('height', 24)
            .attr('rx', 12)
            .attr('fill', 'rgba(255,255,255,0.94)')
            .attr('stroke', color)
            .attr('stroke-width', 1.1);
        group.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', '#1a1a1e')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 11)
            .text(text);
    }

    function polygonPath(points) {
        return 'M' + points.map(function (p) { return p.x + ',' + p.y; }).join('L') + 'Z';
    }

    function projectedArea(points) {
        var area = 0;
        for (var i = 0; i < points.length; i++) {
            var a = points[i];
            var b = points[(i + 1) % points.length];
            area += a.x * b.y - b.x * a.y;
        }
        return area / 2;
    }

    function hasPhaseWrap(vertices) {
        var values = vertices.map(function (v) { return v.value; });
        var min = Math.min.apply(null, values);
        var max = Math.max.apply(null, values);
        return (max - min) > 170;
    }

    function marchingSquares(filter, xDomain, yDomain, n, threshold) {
        var segments = [];
        var field = [];
        var target = threshold == null ? 0 : threshold;
        for (var j = 0; j <= n; j++) {
            var im = yDomain[0] + (j / n) * (yDomain[1] - yDomain[0]);
            for (var i = 0; i <= n; i++) {
                var re = xDomain[0] + (i / n) * (xDomain[1] - xDomain[0]);
                field.push(log10MagnitudeAt({ re: re, im: im }, filter));
            }
        }

        function sample(i, j) { return field[j * (n + 1) + i]; }
        function point(i, j) {
            return {
                re: xDomain[0] + (i / n) * (xDomain[1] - xDomain[0]),
                im: yDomain[0] + (j / n) * (yDomain[1] - yDomain[0])
            };
        }
        function interp(a, b, va, vb) {
            var t = Math.abs(vb - va) < 1e-12 ? 0.5 : (target - va) / (vb - va);
            return { re: a.re + t * (b.re - a.re), im: a.im + t * (b.im - a.im) };
        }

        for (var row = 0; row < n; row++) {
            for (var col = 0; col < n; col++) {
                var p0 = point(col, row);
                var p1 = point(col + 1, row);
                var p2 = point(col + 1, row + 1);
                var p3 = point(col, row + 1);
                var v0 = sample(col, row);
                var v1 = sample(col + 1, row);
                var v2 = sample(col + 1, row + 1);
                var v3 = sample(col, row + 1);
                var crossings = [];
                if ((v0 <= target) !== (v1 <= target)) crossings.push(interp(p0, p1, v0, v1));
                if ((v1 <= target) !== (v2 <= target)) crossings.push(interp(p1, p2, v1, v2));
                if ((v2 <= target) !== (v3 <= target)) crossings.push(interp(p2, p3, v2, v3));
                if ((v3 <= target) !== (v0 <= target)) crossings.push(interp(p3, p0, v3, v0));
                if (crossings.length === 2) segments.push(crossings);
                if (crossings.length === 4) {
                    segments.push([crossings[0], crossings[1]]);
                    segments.push([crossings[2], crossings[3]]);
                }
            }
        }
        return segments;
    }

    function log10MagnitudeAt(s, filter) {
        return rawLog10MagnitudeAt(s, filter) - computeLog10NormMax(filter);
    }

    function rawLog10MagnitudeAt(s, filter) {
        var poles = filter.poles || [];
        var zeros = filter.zeros || [];
        var eps = 1e-9;
        var out = Math.log10(Math.max(Math.abs(filter.gain || 1), eps));

        zeros.forEach(function (z) {
            out += Math.log10(Math.max(distance(s, z), eps));
        });
        poles.forEach(function (p) {
            out -= Math.log10(Math.max(distance(s, p), eps));
        });
        return clamp(out, -6, 6);
    }

    function computeLog10NormMax(filter) {
        if (normCache.has(filter)) return normCache.get(filter);

        var n = 240;
        var lo = 0.001;
        var hi = 1;
        var maxLog = -Infinity;
        for (var i = 0; i <= n; i++) {
            var t = i / n;
            var w = lo * Math.pow(hi / lo, t);
            maxLog = Math.max(maxLog, rawLog10MagnitudeAt({ re: 0, im: w }, filter));
        }
        if (!isFinite(maxLog)) maxLog = 0;
        normCache.set(filter, maxLog);
        return maxLog;
    }

    function surfaceValueAt(s, filter, mode) {
        if (mode === 'angle') return phaseDegAt(s, filter);
        return 20 * log10MagnitudeAt(s, filter);
    }

    function surfaceHeight(value, mode) {
        if (mode === 'angle') return (clamp(value, -540, 180) + 540) / 720;
        return clamp(value, -36, 18) / 18;
    }

    function surfaceMix(value, mode) {
        if (mode === 'angle') return clamp((value + 360) / 540, 0, 1);
        return clamp((value + 24) / 42, 0, 1);
    }

    function phaseDegAt(s, filter) {
        var poles = filter.poles || [];
        var zeros = filter.zeros || [];
        var angle = (filter.gain || 1) < 0 ? 180 : 0;

        zeros.forEach(function (z) {
            angle += Math.atan2(s.im - z.im, s.re - z.re) * 180 / Math.PI;
        });
        poles.forEach(function (p) {
            angle -= Math.atan2(s.im - p.im, s.re - p.re) * 180 / Math.PI;
        });
        return clamp(angle, -720, 360);
    }

    function distance(a, b) {
        var dx = a.re - b.re;
        var dy = a.im - b.im;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function imToZ(im, scale) {
        return -im * scale;
    }

    function inside(p, xDomain, yDomain) {
        return p.re >= xDomain[0] && p.re <= xDomain[1] && p.im >= yDomain[0] && p.im <= yDomain[1];
    }

    function brighten(color, amount) {
        return d3.rgb(
            color.r + (255 - color.r) * amount,
            color.g + (255 - color.g) * amount,
            color.b + (255 - color.b) * amount
        ).formatRgb();
    }

    function darken(color, amount) {
        return d3.rgb(color.r * amount, color.g * amount, color.b * amount).formatRgb();
    }

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function constrainAbovePlanePitch(value) {
        if (!isFinite(value) || value <= 0) return DEFAULT_ABOVE_PLANE_PITCH;
        return clamp(value, MIN_ABOVE_PLANE_PITCH, MAX_ABOVE_PLANE_PITCH);
    }

    window.AFD3SPlane = { setEnabled: setEnabled };
    window.dispatchEvent(new Event('af-d3-ready'));
})();
