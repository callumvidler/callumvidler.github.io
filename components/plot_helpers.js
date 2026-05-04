// Shared helpers for the comparator page plots.
(function () {
    window.CMP = window.CMP || {};

    // Read CSS variable from the page-specific palette so plots stay theme-aware.
    window.CMP.cssVar = function (name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    };

    // Pseudo-random number generator with a fixed seed so noise traces are
    // reproducible across resizes and theme toggles. Mulberry32.
    window.CMP.rng = function (seed) {
        var s = seed >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };

    // Generate Gaussian noise from a seeded RNG via Box-Muller.
    window.CMP.gaussian = function (rng) {
        var u = 0, v = 0;
        while (u === 0) u = rng();
        while (v === 0) v = rng();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    // Generate a synthetic ECG-like waveform: low-frequency baseline plus a
    // train of QRS-like spikes. Returns v(t) for use as the clean biosignal.
    window.CMP.ecgLike = function (t) {
        // Base period: 1 s per beat. Spike modelled as a difference of two
        // narrow Gaussians centred slightly apart to give the QRS shape.
        var T = 1.0;
        var phase = (t % T + T) % T;
        var qrs = 0.95 * Math.exp(-Math.pow((phase - 0.30) / 0.025, 2))
                - 0.30 * Math.exp(-Math.pow((phase - 0.34) / 0.030, 2))
                + 0.18 * Math.exp(-Math.pow((phase - 0.55) / 0.060, 2));  // T-wave
        var pwave = 0.10 * Math.exp(-Math.pow((phase - 0.18) / 0.040, 2));
        return qrs + pwave;
    };

    // Style a D3 axis after .call() so its strokes and text colours track the
    // current theme without needing to thread T through every call site.
    window.CMP.styleAxis = function (axisG) {
        axisG.selectAll('path,line').attr('stroke', window.T.gridAxis);
        axisG.selectAll('text')
            .attr('fill', window.T.text)
            .attr('font-size', 12)
            .attr('font-family', "'JetBrains Mono', monospace");
    };

    // Draw light/dark gridlines aligned with axis ticks. Uses the page CSS
    // variables so light and dark themes pick up the right contrast level.
    window.CMP.drawGrid = function (g, x, y, innerW, innerH, opts) {
        opts = opts || {};
        var gridColor = window.CMP.cssVar('--grid-line');
        var gridZero  = window.CMP.cssVar('--grid-zero');
        var xt = opts.xTicks || x.ticks(8);
        var yt = opts.yTicks || y.ticks(6);

        g.append('g').attr('class', 'grid')
            .selectAll('line.gx').data(xt).join('line')
                .attr('class', 'gx')
                .attr('x1', function (d) { return x(d); })
                .attr('x2', function (d) { return x(d); })
                .attr('y1', 0).attr('y2', innerH)
                .attr('stroke', gridColor).attr('stroke-width', 1);

        g.append('g').attr('class', 'grid')
            .selectAll('line.gy').data(yt).join('line')
                .attr('class', 'gy')
                .attr('y1', function (d) { return y(d); })
                .attr('y2', function (d) { return y(d); })
                .attr('x1', 0).attr('x2', innerW)
                .attr('stroke', gridColor).attr('stroke-width', 1);

        // Bold zero lines if the domain crosses zero
        if (x.domain()[0] < 0 && x.domain()[1] > 0) {
            g.append('line')
                .attr('x1', x(0)).attr('x2', x(0))
                .attr('y1', 0).attr('y2', innerH)
                .attr('stroke', gridZero).attr('stroke-width', 1.2);
        }
        if (y.domain()[0] < 0 && y.domain()[1] > 0) {
            g.append('line')
                .attr('y1', y(0)).attr('y2', y(0))
                .attr('x1', 0).attr('x2', innerW)
                .attr('stroke', gridZero).attr('stroke-width', 1.2);
        }
    };
})();
