(function () {
    var slider, readout;
    var radius = 1.2;

    function polePair(angleDeg) {
        var a = angleDeg * Math.PI / 180;
        return {
            sigma: radius * Math.cos(a),
            omega: radius * Math.sin(a)
        };
    }

    function stepResponse(sigma, omega) {
        return window.WCGW.linspace(0, 8, 320).map(function (t) {
            var y;
            if (Math.abs(omega) < 1e-6) {
                y = 1 - Math.exp(sigma * t) * (1 - sigma * t);
            } else {
                y = 1 - Math.exp(sigma * t) * (Math.cos(omega * t) - sigma / omega * Math.sin(omega * t));
            }
            return { t: t, y: y };
        });
    }

    function capturePlotGeometry(P) {
        var rect = P.svg.node().getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            W: P.W,
            H: P.H,
            margin: P.margin,
            xScale: P.x,
            yScale: P.y
        };
    }

    function setAngleFromClientPoint(geom, clientX, clientY) {
        var svgX = (clientX - geom.left) * geom.W / geom.width;
        var svgY = (clientY - geom.top) * geom.H / geom.height;
        var x = geom.xScale.invert(svgX - geom.margin.left);
        var y = Math.abs(geom.yScale.invert(svgY - geom.margin.top));
        var angle = Math.atan2(y, x) * 180 / Math.PI;
        angle = window.WCGW.clamp(angle, 0, 180);
        slider.value = angle.toFixed(0);
        draw();
    }

    function beginPlaneDrag(P, event) {
        event.preventDefault();
        var geom = capturePlotGeometry(P);
        setAngleFromClientPoint(geom, event.clientX, event.clientY);

        function move(ev) {
            setAngleFromClientPoint(geom, ev.clientX, ev.clientY);
        }

        function stop() {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', stop);
            document.removeEventListener('pointercancel', stop);
        }

        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', stop);
        document.addEventListener('pointercancel', stop);
    }

    function draw() {
        var C = window.WCGW.colors();
        var angle = +slider.value;
        var pair = polePair(angle);
        var stable = pair.sigma < 0;
        readout.textContent = angle.toFixed(0) + ' deg, Re = ' + pair.sigma.toFixed(2);

        var P = window.WCGW.setupSPlane('#plot-instability-splane', { xDomain: [-1.6, 1.6], yDomain: [-1.6, 1.6] });
        P.g.append('circle')
            .attr('cx', P.x(0)).attr('cy', P.y(0)).attr('r', Math.abs(P.x(radius) - P.x(0)))
            .attr('fill', 'none').attr('stroke', C.gridStrong).attr('stroke-dasharray', '4 4');
        [[pair.sigma, pair.omega], [pair.sigma, -pair.omega]].forEach(function (p) {
            var g = P.g.append('g').attr('transform', 'translate(' + P.x(p[0]) + ',' + P.y(p[1]) + ')');
            g.append('line').attr('class', 'pole-x ' + (stable ? 'stable' : 'unstable')).attr('x1', -7).attr('x2', 7).attr('y1', -7).attr('y2', 7);
            g.append('line').attr('class', 'pole-x ' + (stable ? 'stable' : 'unstable')).attr('x1', -7).attr('x2', 7).attr('y1', 7).attr('y2', -7);
        });
        P.g.append('text').attr('x', P.x(pair.sigma) + 12).attr('y', P.y(pair.omega) - 10)
            .attr('fill', stable ? C.clean : C.distort).attr('font-size', 12).attr('font-family', "'JetBrains Mono', monospace")
            .text(stable ? 'LHP poles' : 'RHP poles');

        P.g.append('rect')
            .attr('x', 0).attr('y', 0)
            .attr('width', P.innerW).attr('height', P.innerH)
            .attr('fill', 'transparent')
            .style('cursor', 'crosshair')
            .style('pointer-events', 'all')
            .on('pointerdown', function (event) { beginPlaneDrag(P, event); });

        var data = stepResponse(pair.sigma, pair.omega);
        var yMin = d3.min(data, function (d) { return d.y; });
        var yMax = d3.max(data, function (d) { return d.y; });
        yMin = Math.max(-4, Math.min(-0.2, yMin * 1.05));
        yMax = Math.min(8, Math.max(1.4, yMax * 1.05));
        var R = window.WCGW.setupPlot('#plot-instability-step', {
            xDomain: [0, 8],
            yDomain: [yMin, yMax],
            xLabel: 't\\,[\\mathrm{s}]',
            yLabel: 'y_{\\mathrm{step}}(t)',
            yTicks: 5
        });
        window.WCGW.drawLine(R, data, function (d) { return d.t; }, function (d) { return d.y; }, stable ? 'clean' : 'distort', R.y);
        R.g.append('line').attr('x1', 0).attr('x2', R.innerW).attr('y1', R.y(0)).attr('y2', R.y(0)).attr('stroke', C.axis);
        R.g.append('line').attr('class', 'marker-line').attr('x1', 0).attr('x2', R.innerW).attr('y1', R.y(1)).attr('y2', R.y(1));
    }

    document.addEventListener('DOMContentLoaded', function () {
        slider = document.getElementById('instability-angle-slider');
        readout = document.getElementById('instability-angle-val');
        if (!slider) return;
        slider.addEventListener('input', draw);
        window.addEventListener('themechange', draw);
        window.addEventListener('resize', window.WCGW.debounceResize(draw));
        draw();
    });
})();
