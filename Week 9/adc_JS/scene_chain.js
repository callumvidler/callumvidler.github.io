// Scene 01 · Signal chain block diagram.
// Static D3 diagram tracing an ECG beat from the electrode through the analog
// front-end, the ADC, and into the digital domain. The ADC block is highlighted
// to indicate where this page is positioned within the chain.
(function () {
    var svg = d3.select('#plot-chain');
    // Fixed coordinate system; preserveAspectRatio scales the SVG to the box
    // without clipping the bottom-row 'analog domain' / 'digital domain' labels.
    var W = 800, H = 290;

    function layout() {
        svg.attr('viewBox', '0 0 ' + W + ' ' + H)
           .attr('preserveAspectRatio', 'xMidYMid meet');
    }

    function ecgShape(t, scale) {
        // t in [0, 1] over the block width. Returns a small cardiac waveform
        // with a P, QRS, and T excursion. scale controls amplitude.
        scale = scale || 1;
        var p   = 0.10 * Math.exp(-Math.pow((t - 0.20) / 0.050, 2));
        var q   = -0.10 * Math.exp(-Math.pow((t - 0.45) / 0.020, 2));
        var r   = 0.95 * Math.exp(-Math.pow((t - 0.50) / 0.020, 2));
        var s   = -0.18 * Math.exp(-Math.pow((t - 0.55) / 0.022, 2));
        var twv = 0.22 * Math.exp(-Math.pow((t - 0.78) / 0.060, 2));
        return scale * (p + q + r + s + twv);
    }

    function build() {
        svg.selectAll('*').remove();
        layout();

        var pad = 30;
        var topPad = 60;
        var blocks = [
            { id: 'sensor', label: 'electrode',  sub: 'mV-scale',     analog: true,  noisy: 0.18, gain: 0.55 },
            { id: 'amp',    label: 'amplifier',  sub: '× 1000',        analog: true,  noisy: 0.10, gain: 0.95 },
            { id: 'aaf',    label: 'anti-alias', sub: 'LPF',           analog: true,  noisy: 0.04, gain: 0.95 },
            { id: 'adc',    label: 'ADC',        sub: 'sample · quantise', analog: false, highlight: true },
            { id: 'mcu',    label: 'MCU',        sub: 'digital',       digital: true }
        ];

        var n = blocks.length;
        var blockW = (W - 2 * pad - (n - 1) * 24) / n;
        var blockH = 78;
        var blockY = topPad + 60;

        var stroke = window.T.text;

        // Background label band
        svg.append('text')
            .attr('x', pad).attr('y', topPad - 18)
            .attr('class', 'blk-sub')
            .attr('fill', 'var(--c-input)')
            .text('analog · continuous voltage');
        svg.append('text')
            .attr('x', W - pad).attr('y', topPad - 18)
            .attr('text-anchor', 'end')
            .attr('class', 'blk-sub')
            .attr('fill', 'var(--c-output)')
            .text('digital · integer codes');

        // Build positions
        blocks.forEach(function (b, i) {
            b.x = pad + i * (blockW + 24);
            b.cx = b.x + blockW / 2;
            b.cy = blockY + blockH / 2;
        });

        // Connecting arrows between block centres
        for (var i = 0; i < n - 1; i++) {
            var a = blocks[i], c = blocks[i + 1];
            var x1 = a.x + blockW;
            var x2 = c.x;
            svg.append('path')
                .attr('class', 'arrow')
                .attr('d', 'M' + x1 + ',' + a.cy + ' L' + (x2 - 6) + ',' + c.cy)
                .attr('stroke', 'var(--text-dim)');
            svg.append('polygon')
                .attr('class', 'arrow-head')
                .attr('points',
                    (x2 - 6) + ',' + (c.cy - 4) + ' ' +
                    (x2 - 6) + ',' + (c.cy + 4) + ' ' +
                    x2 + ',' + c.cy)
                .attr('fill', 'var(--text-dim)');
        }

        // Signal previews above each block
        var sigH = 38;
        var sigY = topPad - 6;
        blocks.forEach(function (b, i) {
            var g = svg.append('g')
                .attr('transform', 'translate(' + b.x + ',' + sigY + ')');

            if (b.id === 'sensor' || b.id === 'amp' || b.id === 'aaf') {
                // Continuous trace through the block area, with optional noise.
                var pts = [];
                var samples = 80;
                var rng = (function () {
                    var s = 0x9c7e + i * 0x10c1;
                    return function () {
                        s = (s + 0x6D2B79F5) >>> 0;
                        var t = s;
                        t = Math.imul(t ^ (t >>> 15), t | 1);
                        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                    };
                })();
                for (var k = 0; k < samples; k++) {
                    var u = k / (samples - 1);
                    var v = ecgShape(u, b.gain);
                    if (b.noisy) v += (rng() - 0.5) * b.noisy;
                    pts.push([u * blockW, sigH / 2 - v * sigH * 0.55]);
                }
                g.append('path')
                    .datum(pts)
                    .attr('d', d3.line()
                        .x(function (d) { return d[0]; })
                        .y(function (d) { return d[1]; })
                        .curve(d3.curveCatmullRom.alpha(0.5)))
                    .attr('fill', 'none')
                    .attr('stroke', 'var(--c-input)')
                    .attr('stroke-width', 1.6);
            } else if (b.id === 'adc') {
                // Sample dots over an envelope.
                var nDot = 14;
                for (var k = 0; k < nDot; k++) {
                    var u = (k + 0.5) / nDot;
                    var v = ecgShape(u, 1.0);
                    var px = u * blockW;
                    var py = sigH / 2 - v * sigH * 0.55;
                    g.append('line')
                        .attr('x1', px).attr('x2', px)
                        .attr('y1', sigH / 2).attr('y2', py)
                        .attr('stroke', 'var(--c-output)')
                        .attr('stroke-width', 1)
                        .attr('opacity', 0.55);
                    g.append('circle')
                        .attr('cx', px).attr('cy', py).attr('r', 2.2)
                        .attr('fill', 'var(--c-output)');
                }
            } else if (b.id === 'mcu') {
                // Bit stream
                var bits = '01101011010110100110101011010110';
                var n2 = Math.floor(blockW / 7);
                g.append('text')
                    .attr('x', blockW / 2).attr('y', sigH / 2 + 5)
                    .attr('text-anchor', 'middle')
                    .attr('font-family', "'JetBrains Mono', monospace")
                    .attr('font-size', 11)
                    .attr('fill', 'var(--c-output)')
                    .attr('letter-spacing', '0.16em')
                    .text(bits.substring(0, n2));
            }
        });

        // Block bodies and labels
        blocks.forEach(function (b) {
            svg.append('rect')
                .attr('class', 'blk-rect' + (b.highlight ? ' highlight' : ''))
                .attr('x', b.x).attr('y', blockY)
                .attr('width', blockW).attr('height', blockH)
                .attr('rx', 8);

            svg.append('text')
                .attr('x', b.cx).attr('y', b.cy - 4)
                .attr('text-anchor', 'middle')
                .attr('class', 'blk-text')
                .text(b.label);
            svg.append('text')
                .attr('x', b.cx).attr('y', b.cy + 14)
                .attr('text-anchor', 'middle')
                .attr('class', 'blk-sub')
                .text(b.sub);
        });

        // Bottom legend bar: analog | digital
        var divX = blocks[3].x;  // ADC block left edge marks the boundary
        var legY = blockY + blockH + 36;

        svg.append('line')
            .attr('x1', pad).attr('x2', divX)
            .attr('y1', legY).attr('y2', legY)
            .attr('stroke', 'var(--c-input)')
            .attr('stroke-width', 2);
        svg.append('line')
            .attr('x1', divX).attr('x2', W - pad)
            .attr('y1', legY).attr('y2', legY)
            .attr('stroke', 'var(--c-output)')
            .attr('stroke-width', 2);
        svg.append('text')
            .attr('x', (pad + divX) / 2).attr('y', legY + 18)
            .attr('text-anchor', 'middle')
            .attr('class', 'blk-sub')
            .attr('fill', 'var(--c-input)')
            .text('analog domain');
        svg.append('text')
            .attr('x', (divX + W - pad) / 2).attr('y', legY + 18)
            .attr('text-anchor', 'middle')
            .attr('class', 'blk-sub')
            .attr('fill', 'var(--c-output)')
            .text('digital domain');

        // Vertical divider line where the ADC sits
        svg.append('line')
            .attr('x1', divX).attr('x2', divX)
            .attr('y1', sigY - 4).attr('y2', legY)
            .attr('stroke', 'var(--accent)')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3 3')
            .attr('opacity', 0.6);
    }

    function init() {
        build();
        window.addEventListener('themechange', build);
        window.addEventListener('resize', build);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
