// Scene 03 · Streetlight comparator.
// A draggable sun moves along an arc across the sky. Its height defines a
// "sensor" voltage (0 at horizon, 1 at zenith). A draggable threshold marker
// on the right-hand bar sets the dusk level. The lamp is on whenever the
// sensor sits below threshold.
(function () {
    var svgSel = '#plot-light-scene';
    var rdSensor = document.getElementById('light-sensor');
    var rdThresh = document.getElementById('light-thresh');
    var rdLamp = document.getElementById('light-lamp');

    var state = {
        sunFrac: 0.30,    // 0..1 along the arc, 0=east horizon, 0.5=zenith, 1=west
        thresh: 0.30
    };

    var svg = d3.select(svgSel).classed('ov', true);
    var W = 600, H = 420;
    var iw, ih;

    var defs = svg.append('defs');

    var gRoot = svg.append('g');
    var gSky = gRoot.append('g');
    var gSun = gRoot.append('g');
    var gGround = gRoot.append('g');
    var gLamp = gRoot.append('g');
    var gMeter = gRoot.append('g'); // right-side sensor meter

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(360, rect.width);
        H = Math.max(280, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        iw = W; ih = H;
    }

    function sunPos() {
        var arcXMin = 60, arcXMax = iw - 90;       // sweep across (leaving room for meter)
        var cx = arcXMin + state.sunFrac * (arcXMax - arcXMin);
        var horizon = ih - 110;
        var zenith = 60;
        var bell = Math.sin(state.sunFrac * Math.PI); // 0 at horizons, 1 at noon
        var cy = horizon - bell * (horizon - zenith);
        return { x: cx, y: cy, height: bell };
    }

    function drawStatic() {
        defs.selectAll('*').remove();
        gSky.selectAll('*').remove();
        gGround.selectAll('*').remove();

        // Sky gradient: gets darker as height drops
        var sun = sunPos();
        var horizon = ih - 110;
        // Day-fraction (0 = night, 1 = noon-bright)
        var k = Math.max(0, sun.height);
        var top = d3.interpolateRgb('#0a0e2a', '#7ab4ff')(k);
        var bot = d3.interpolateRgb('#1c1632', '#ffd49a')(k);
        var grad = defs.append('linearGradient')
            .attr('id', 'skyGrad').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
        grad.append('stop').attr('offset', '0%').attr('stop-color', top);
        grad.append('stop').attr('offset', '100%').attr('stop-color', bot);

        gSky.append('rect')
            .attr('x', 0).attr('y', 0).attr('width', iw - 60).attr('height', horizon)
            .attr('fill', 'url(#skyGrad)');

        // Stars when dark
        if (k < 0.35) {
            var nstars = 60;
            var seed = 7;
            for (var i = 0; i < nstars; i++) {
                seed = (seed * 9301 + 49297) % 233280;
                var sx = (seed / 233280) * (iw - 60);
                seed = (seed * 9301 + 49297) % 233280;
                var sy = (seed / 233280) * horizon * 0.85;
                gSky.append('circle').attr('cx', sx).attr('cy', sy).attr('r', 0.8 + (i % 3) * 0.3)
                    .attr('fill', '#ffffff').attr('opacity', (0.35 - k) * 1.6);
            }
        }

        // Ground
        var groundCol = d3.interpolateRgb('#0d0d12', '#3b4327')(k);
        gGround.append('rect')
            .attr('x', 0).attr('y', horizon).attr('width', iw - 60).attr('height', ih - horizon)
            .attr('fill', groundCol);
        // road
        gGround.append('rect')
            .attr('x', 0).attr('y', horizon + 40).attr('width', iw - 60).attr('height', 40)
            .attr('fill', '#1f2027');
        gGround.append('line')
            .attr('x1', 0).attr('x2', iw - 60)
            .attr('y1', horizon + 60).attr('y2', horizon + 60)
            .attr('stroke', '#fbbf24').attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '14 12').attr('opacity', 0.7);

        // Lamp post
        var lampX = iw - 140, baseY = horizon + 90;
        gGround.append('line')
            .attr('x1', lampX).attr('x2', lampX)
            .attr('y1', baseY).attr('y2', baseY - 110)
            .attr('stroke', '#3a3f4a').attr('stroke-width', 4).attr('stroke-linecap', 'round');
        gGround.append('line')
            .attr('x1', lampX).attr('x2', lampX + 28)
            .attr('y1', baseY - 110).attr('y2', baseY - 110)
            .attr('stroke', '#3a3f4a').attr('stroke-width', 4).attr('stroke-linecap', 'round');
    }

    function drawDynamic() {
        var sun = sunPos();
        // Sun
        gSun.selectAll('*').remove();
        var sunCol = sun.height > 0.05
            ? d3.interpolateRgb('#ff8e6f', '#ffe26b')(Math.min(1, sun.height * 1.3))
            : '#243049';
        var glow = defs.select('#sunGlow');
        if (glow.empty()) {
            var rg = defs.append('radialGradient').attr('id', 'sunGlow');
            rg.append('stop').attr('offset', '0%').attr('stop-color', '#ffe089').attr('stop-opacity', 0.55);
            rg.append('stop').attr('offset', '100%').attr('stop-color', '#ffe089').attr('stop-opacity', 0);
        }
        if (sun.height > 0) {
            gSun.append('circle')
                .attr('cx', sun.x).attr('cy', sun.y).attr('r', 60)
                .attr('fill', 'url(#sunGlow)').attr('opacity', sun.height);
        }
        gSun.append('circle')
            .attr('cx', sun.x).attr('cy', sun.y).attr('r', 22)
            .attr('fill', sunCol).attr('stroke', '#fff7e0').attr('stroke-width', 1.5)
            .attr('opacity', 0.95).style('cursor', 'grab');
        gSun.append('text')
            .attr('x', sun.x).attr('y', sun.y - 32)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', '#fff7e0').attr('opacity', 0.85)
            .text('drag');

        gSun.call(d3.drag().on('drag', function (event) {
            var arcXMin = 60, arcXMax = iw - 90;
            var f = (event.x - arcXMin) / (arcXMax - arcXMin);
            state.sunFrac = Math.max(0, Math.min(1, f));
            drawStatic();
            drawDynamic();
            updateLamp();
            updateReadout();
        }));

        // Sensor meter (vertical bar on right, with draggable threshold)
        var mx = iw - 36, my0 = 40, my1 = ih - 60;
        gMeter.selectAll('*').remove();
        gMeter.append('rect')
            .attr('x', mx - 12).attr('y', my0).attr('width', 24).attr('height', my1 - my0)
            .attr('rx', 4).style('fill', 'var(--bg-2)').style('stroke', 'var(--border)');
        // fill proportional to sensor reading (sun height)
        var lvl = Math.max(0, Math.min(1, sun.height));
        var fillTop = my1 - lvl * (my1 - my0);
        gMeter.append('rect')
            .attr('x', mx - 10).attr('y', fillTop).attr('width', 20).attr('height', my1 - fillTop)
            .attr('rx', 3).style('fill', 'var(--c-input)').attr('opacity', 0.75);

        // 1.0 / 0.0 labels
        gMeter.append('text').attr('x', mx).attr('y', my0 - 6)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .style('fill', 'var(--muted)').text('bright');
        gMeter.append('text').attr('x', mx).attr('y', my1 + 14)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .style('fill', 'var(--muted)').text('dark');

        // threshold marker
        var ty = my1 - state.thresh * (my1 - my0);
        gMeter.append('line')
            .attr('x1', mx - 18).attr('x2', mx + 18)
            .attr('y1', ty).attr('y2', ty)
            .style('stroke', 'var(--c-thresh)').attr('stroke-width', 2)
            .attr('stroke-dasharray', '5 4').style('cursor', 'ns-resize');
        gMeter.append('circle')
            .attr('cx', mx + 18).attr('cy', ty).attr('r', 5)
            .style('fill', 'var(--c-thresh)').style('stroke', 'var(--bg-2)').attr('stroke-width', 1.4)
            .style('cursor', 'ns-resize');
        gMeter.append('text')
            .attr('x', mx).attr('y', ty - 8)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .style('fill', 'var(--c-thresh)')
            .text('V_th');

        gMeter.call(d3.drag()
            .on('drag', function (event) {
                var f = (my1 - event.y) / (my1 - my0);
                state.thresh = Math.max(0, Math.min(1, f));
                drawDynamic();
                updateLamp();
                updateReadout();
            }));
    }

    function updateLamp() {
        var sun = sunPos();
        var on = sun.height < state.thresh;
        gLamp.selectAll('*').remove();
        var lampX = iw - 140, baseY = ih - 110 + 90 - 110;
        // glow if on
        if (on) {
            var rg = defs.select('#lampGlow');
            if (rg.empty()) {
                var rg2 = defs.append('radialGradient').attr('id', 'lampGlow');
                rg2.append('stop').attr('offset', '0%').attr('stop-color', '#ffd86a').attr('stop-opacity', 0.7);
                rg2.append('stop').attr('offset', '100%').attr('stop-color', '#ffd86a').attr('stop-opacity', 0);
            }
            gLamp.append('circle')
                .attr('cx', lampX + 28).attr('cy', baseY)
                .attr('r', 90)
                .attr('fill', 'url(#lampGlow)');
            // light cone on the road
            var horizonY = ih - 110;
            gLamp.append('polygon')
                .attr('points',
                    (lampX + 28) + ',' + baseY + ' ' +
                    (lampX - 30) + ',' + (horizonY + 80) + ' ' +
                    (lampX + 86) + ',' + (horizonY + 80))
                .attr('fill', '#ffd86a').attr('opacity', 0.18);
        }
        gLamp.append('circle')
            .attr('cx', lampX + 28).attr('cy', baseY)
            .attr('r', 9)
            .attr('fill', on ? '#fff1b6' : '#2a2d36')
            .attr('stroke', on ? '#fff1b6' : '#3a3f4a').attr('stroke-width', 1.4);
    }

    function updateReadout() {
        var sun = sunPos();
        rdSensor.textContent = sun.height.toFixed(2);
        rdThresh.textContent = state.thresh.toFixed(2);
        var on = sun.height < state.thresh;
        rdLamp.textContent = on ? 'ON' : 'OFF';
        rdLamp.className = 'v ' + (on ? 'on' : 'off');
    }

    function init() {
        layout();
        drawStatic();
        drawDynamic();
        updateLamp();
        updateReadout();

        window.addEventListener('themechange', function () {
            drawStatic(); drawDynamic(); updateLamp();
        });
        window.addEventListener('resize', function () {
            layout(); drawStatic(); drawDynamic(); updateLamp();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
