// Scene 04 · Pacemaker pulse generator (astable timer).
// A timer fires a fixed-width pulse at a chosen rate. The trace shows a 4-second
// window of the pacing waveform; a small heart indicator pulses with each fire.
(function () {
    var svgSel = '#plot-pacer-trace';
    var rateInp = document.getElementById('pacer-rate');
    var rateLab = document.getElementById('pacer-rate-val');
    var widthInp = document.getElementById('pacer-width');
    var widthLab = document.getElementById('pacer-width-val');
    var rdPeriod = document.getElementById('pacer-period');
    var rdDuty = document.getElementById('pacer-duty');
    var rdHeart = document.getElementById('pacer-heart');

    var WINDOW = 4.0;

    var state = {
        rate: 72,        // pulses per minute
        widthMs: 0.8,
        t: 0,
        last: performance.now()
    };

    var svg = d3.select(svgSel).classed('ov', true);
    var W = 600, H = 280;
    var margin = { top: 22, right: 30, bottom: 38, left: 56 };
    var iw, ih, x, y;

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gTrace = gRoot.append('g');
    var gNow = gRoot.append('g');
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(360, rect.width);
        H = Math.max(220, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        iw = W - margin.left - margin.right;
        ih = H - margin.top - margin.bottom;
        gRoot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        x = d3.scaleLinear().domain([-WINDOW, 0]).range([0, iw]);
        y = d3.scaleLinear().domain([-0.2, 1.2]).range([ih, 0]);
    }

    function drawStatic() {
        gGrid.selectAll('*').remove();
        gAxis.selectAll('*').remove();
        gTitles.selectAll('*').remove();

        [0, 1].forEach(function (v) {
            gGrid.append('line')
                .attr('class', v === 0 ? 'major' : '')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', y(v)).attr('y2', y(v));
        });
        var yAxis = d3.axisLeft(y).tickValues([0, 1]).tickFormat(function (d) { return d === 0 ? '0' : 'V_cc'; }).tickSize(0).tickPadding(8);
        gAxis.append('g').call(yAxis).select('.domain').remove();
        var xAxis = d3.axisBottom(x).tickValues([-4, -3, -2, -1, 0]).tickFormat(function (d) { return d + 's'; }).tickSize(0).tickPadding(8);
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')').call(xAxis).select('.domain').remove();

        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', iw / 2).attr('y', ih + 30)
            .attr('text-anchor', 'middle')
            .text('time (relative to now), s');
        gTitles.append('text').attr('class', 'axis-title')
            .attr('transform', 'translate(' + (-44) + ',' + (ih / 2) + ') rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('pacing output');
    }

    function drawTrace() {
        var T = 60 / state.rate;       // period (s)
        var w = state.widthMs / 1000;  // pulse width (s)
        // For visual readability the rendered pulse width is at least 18 ms (the
        // true value is shown in the readout). At 1 ms width on a 4 s window a
        // physical pulse would be < 1 px wide.
        var wDraw = Math.max(w, 0.018);

        // Find the first pulse start at or after (state.t - WINDOW)
        var tStart = state.t - WINDOW;
        var firstK = Math.floor(tStart / T);
        var pts = [[-WINDOW, 0]];
        for (var k = firstK - 1; ; k++) {
            var pulseStart = k * T;
            var pulseEnd = pulseStart + wDraw;
            if (pulseStart > state.t) break;
            if (pulseEnd < tStart) continue;
            var sRel = pulseStart - state.t;
            var eRel = pulseEnd - state.t;
            if (sRel > -WINDOW) pts.push([sRel, 0]);
            pts.push([Math.max(sRel, -WINDOW), 1]);
            pts.push([Math.min(eRel, 0), 1]);
            pts.push([Math.min(eRel, 0), 0]);
        }
        pts.push([0, 0]);

        var line = d3.line()
            .x(function (d) { return x(d[0]); })
            .y(function (d) { return y(d[1]); });
        gTrace.selectAll('*').remove();
        gTrace.append('path').datum(pts)
            .attr('class', 'trace output')
            .attr('d', line);

        // "now" cursor
        gNow.selectAll('*').remove();
        gNow.append('line')
            .attr('x1', x(0)).attr('x2', x(0))
            .attr('y1', 0).attr('y2', ih)
            .style('stroke', 'var(--c-thresh)').attr('stroke-width', 1.0)
            .attr('opacity', 0.45).attr('stroke-dasharray', '3 3');
    }

    function update() {
        var T = 60 / state.rate;
        var w = state.widthMs / 1000;
        var duty = (w / T) * 100;
        rdPeriod.textContent = (T * 1000).toFixed(0) + ' ms';
        rdDuty.textContent = duty.toFixed(2) + ' %';
        // Heart beats on pulse: light when phase < w
        var phase = ((state.t % T) + T) % T;
        var firing = phase < Math.max(w, 0.05); // give a visible flash
        rdHeart.textContent = firing ? '●' : '○';
        rdHeart.className = 'v ' + (firing ? 'on' : 'off');
        rdHeart.style.transform = firing ? 'scale(1.25)' : 'scale(1.0)';
        rdHeart.style.transition = 'transform 0.08s ease';
    }

    function tick(now) {
        var dt = (now - state.last) / 1000;
        state.last = now;
        if (dt > 0.1) dt = 0.1;
        state.t += dt;
        drawTrace();
        update();
        requestAnimationFrame(tick);
    }

    function init() {
        layout();
        drawStatic();
        drawTrace();
        update();

        rateInp.addEventListener('input', function () {
            state.rate = parseFloat(rateInp.value);
            rateLab.textContent = state.rate.toFixed(0) + ' ppm';
        });
        widthInp.addEventListener('input', function () {
            state.widthMs = parseFloat(widthInp.value);
            widthLab.textContent = state.widthMs.toFixed(2) + ' ms';
        });
        window.addEventListener('themechange', function () { drawStatic(); drawTrace(); });
        window.addEventListener('resize', function () {
            layout(); drawStatic(); drawTrace();
        });

        state.last = performance.now();
        requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
