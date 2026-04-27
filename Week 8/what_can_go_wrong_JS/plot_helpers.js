(function () {
    var WCGW = {};

    function cssVar(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function colors() {
        return {
            clean: cssVar('--c-clean'),
            distort: cssVar('--c-distort'),
            noise: cssVar('--c-noise'),
            fixed: cssVar('--c-fixed'),
            sample: cssVar('--c-sample'),
            mark: cssVar('--c-mark'),
            stable: cssVar('--c-stable'),
            unstable: cssVar('--c-unstable'),
            bg: cssVar('--bg-2'),
            fg: window.T.text,
            muted: window.T.textMuted,
            grid: window.T.grid,
            gridFine: window.T.gridFine,
            gridStrong: window.T.gridStrong,
            axis: window.T.gridAxis
        };
    }

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function linspace(a, b, n) {
        var out = [];
        for (var i = 0; i < n; i++) out.push(a + (b - a) * i / (n - 1));
        return out;
    }

    function gaussian(t, mu, sigma, amp) {
        var z = (t - mu) / sigma;
        return amp * Math.exp(-0.5 * z * z);
    }

    function ecg(t, opts) {
        opts = opts || {};
        var beat = opts.period || 1;
        var phase = ((t % beat) + beat) % beat;
        var st = opts.st || 0;
        var qrsScale = opts.qrsScale || 1;
        var baseline = opts.baseline || 0;
        var value = baseline;
        value += gaussian(phase, 0.18, 0.035, 0.10);
        value += gaussian(phase, 0.355, 0.012, -0.16 * qrsScale);
        value += gaussian(phase, 0.382, 0.010, 1.15 * qrsScale);
        value += gaussian(phase, 0.415, 0.016, -0.30 * qrsScale);
        value += gaussian(phase, 0.51, 0.075, st);
        value += gaussian(phase, 0.67, 0.080, 0.28);
        return value;
    }

    function ecgSeries(duration, fs, opts) {
        var n = Math.round(duration * fs);
        var out = [];
        for (var i = 0; i < n; i++) {
            var t = i / fs;
            out.push({ t: t, y: ecg(t, opts) });
        }
        return out;
    }

    function seededNoise(seed) {
        var x = Math.sin(seed * 12.9898) * 43758.5453;
        return 2 * (x - Math.floor(x)) - 1;
    }

    function emgSeries(duration, fs, opts) {
        opts = opts || {};
        var n = Math.round(duration * fs);
        var out = [];
        var y1 = 0, y2 = 0, hp = 0, hpPrevX = 0;
        var lpA = Math.exp(-2 * Math.PI * (opts.high || 120) / fs);
        var hpA = Math.exp(-2 * Math.PI * (opts.low || 20) / fs);
        for (var i = 0; i < n; i++) {
            var t = i / fs;
            var env = Math.exp(-0.5 * Math.pow((t - duration * 0.48) / (duration * 0.22), 2));
            var x = seededNoise(i + 31) + 0.45 * seededNoise(i * 2 + 7);
            y1 = (1 - lpA) * x + lpA * y1;
            hp = hpA * (hp + y1 - hpPrevX);
            hpPrevX = y1;
            y2 = 0.75 * y2 + 0.25 * hp;
            out.push({ t: t, y: 0.55 * env * y2 });
        }
        return out;
    }

    function addMains(series, amp, freq) {
        return series.map(function (p) {
            return { t: p.t, y: p.y + amp * Math.sin(2 * Math.PI * freq * p.t) };
        });
    }

    function biquadLowpass(fc, q, fs) {
        var w0 = 2 * Math.PI * fc / fs;
        var cos = Math.cos(w0);
        var sin = Math.sin(w0);
        var alpha = sin / (2 * q);
        var b0 = (1 - cos) / 2;
        var b1 = 1 - cos;
        var b2 = (1 - cos) / 2;
        var a0 = 1 + alpha;
        var a1 = -2 * cos;
        var a2 = 1 - alpha;
        return normBiquad(b0, b1, b2, a0, a1, a2);
    }

    function biquadHighpass(fc, q, fs) {
        var w0 = 2 * Math.PI * fc / fs;
        var cos = Math.cos(w0);
        var sin = Math.sin(w0);
        var alpha = sin / (2 * q);
        var b0 = (1 + cos) / 2;
        var b1 = -(1 + cos);
        var b2 = (1 + cos) / 2;
        var a0 = 1 + alpha;
        var a1 = -2 * cos;
        var a2 = 1 - alpha;
        return normBiquad(b0, b1, b2, a0, a1, a2);
    }

    function biquadNotch(f0, q, fs) {
        var w0 = 2 * Math.PI * f0 / fs;
        var cos = Math.cos(w0);
        var sin = Math.sin(w0);
        var alpha = sin / (2 * q);
        return normBiquad(1, -2 * cos, 1, 1 + alpha, -2 * cos, 1 - alpha);
    }

    function normBiquad(b0, b1, b2, a0, a1, a2) {
        return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
    }

    function filterValues(values, coeffs, initial) {
        var x1 = initial || 0, x2 = initial || 0, y1 = initial || 0, y2 = initial || 0;
        return values.map(function (x) {
            var y = coeffs.b0 * x + coeffs.b1 * x1 + coeffs.b2 * x2 - coeffs.a1 * y1 - coeffs.a2 * y2;
            x2 = x1; x1 = x; y2 = y1; y1 = y;
            return y;
        });
    }

    function cascadeFilterValues(values, sections, initial) {
        var out = values.slice();
        sections.forEach(function (sec) { out = filterValues(out, sec, initial); });
        return out;
    }

    function biquadH(coeffs, f, fs) {
        var w = 2 * Math.PI * f / fs;
        var c1 = Math.cos(-w), s1 = Math.sin(-w);
        var c2 = Math.cos(-2 * w), s2 = Math.sin(-2 * w);
        var nr = coeffs.b0 + coeffs.b1 * c1 + coeffs.b2 * c2;
        var ni = coeffs.b1 * s1 + coeffs.b2 * s2;
        var dr = 1 + coeffs.a1 * c1 + coeffs.a2 * c2;
        var di = coeffs.a1 * s1 + coeffs.a2 * s2;
        var den = dr * dr + di * di;
        return { re: (nr * dr + ni * di) / den, im: (ni * dr - nr * di) / den };
    }

    function sectionResponse(sections, f, fs) {
        var h = { re: 1, im: 0 };
        sections.forEach(function (sec) {
            var s = biquadH(sec, f, fs);
            h = { re: h.re * s.re - h.im * s.im, im: h.re * s.im + h.im * s.re };
        });
        return h;
    }

    function spectrum(series, fs, maxF, bins) {
        var values = series.map(function (p) { return p.y; });
        var n = values.length;
        var mean = d3.mean(values);
        var out = [];
        for (var k = 0; k < bins; k++) {
            var f = maxF * k / (bins - 1);
            var re = 0, im = 0;
            for (var i = 0; i < n; i++) {
                var win = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
                var a = -2 * Math.PI * f * i / fs;
                var x = (values[i] - mean) * win;
                re += x * Math.cos(a);
                im += x * Math.sin(a);
            }
            out.push({ f: f, y: 20 * Math.log10(Math.sqrt(re * re + im * im) / n + 1e-5) });
        }
        return out;
    }

    function setupPlot(sel, opts) {
        opts = opts || {};
        var C = colors();
        var root = d3.select(sel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect();
        var W = rect.width || 720;
        var H = rect.height || 380;
        var margin = opts.margin || { top: 40, right: 70, bottom: 56, left: 70 };
        var innerW = W - margin.left - margin.right;
        var innerH = H - margin.top - margin.bottom;
        var svg = root.append('svg').attr('width', W).attr('height', H).attr('viewBox', '0 0 ' + W + ' ' + H);
        var x = (opts.xScale || d3.scaleLinear()).domain(opts.xDomain || [0, 1]).range([0, innerW]);
        var y = (opts.yScale || d3.scaleLinear()).domain(opts.yDomain || [-1, 1]).range([innerH, 0]);
        var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        drawGrid(g, x, y, innerW, innerH, C, opts);
        var xAxis = d3.axisBottom(x).ticks(opts.xTicks || 6).tickFormat(opts.xFormat || null).tickSizeOuter(0);
        var yAxis = d3.axisLeft(y).ticks(opts.yTicks || 5).tickFormat(opts.yFormat || null).tickSizeOuter(0);
        styleAxis(g.append('g').attr('transform', 'translate(0,' + innerH + ')').call(xAxis), C);
        styleAxis(g.append('g').call(yAxis), C);
        g.append('rect').attr('width', innerW).attr('height', innerH).attr('fill', 'none').attr('stroke', C.gridStrong);
        if (opts.xLabel) window.renderKatex(svg, opts.xLabel, margin.left + innerW / 2, H - 14, { width: 220, height: 24, size: 14 });
        if (opts.yLabel) window.renderKatex(svg, opts.yLabel, 22, margin.top + innerH / 2, { width: 220, height: 24, rotate: -90, size: 14 });
        return { svg: svg, g: g, x: x, y: y, W: W, H: H, innerW: innerW, innerH: innerH, margin: margin, colors: C };
    }

    function setupDual(sel, opts) {
        opts = opts || {};
        var C = colors();
        var root = d3.select(sel);
        root.selectAll('*').remove();
        var rect = root.node().getBoundingClientRect();
        var W = rect.width || 720;
        var H = rect.height || 520;
        var margin = opts.margin || { top: 40, right: 70, bottom: 56, left: 70 };
        var gap = opts.gap || 24;
        var innerW = W - margin.left - margin.right;
        var innerH = (H - margin.top - margin.bottom - gap) / 2;
        var svg = root.append('svg').attr('width', W).attr('height', H).attr('viewBox', '0 0 ' + W + ' ' + H);
        var xTop = (opts.xScale || d3.scaleLinear()).domain(opts.xTopDomain || opts.xDomain || [0, 1]).range([0, innerW]);
        var xBottom = (opts.xBottomScale || opts.xScale || d3.scaleLinear()).domain(opts.xBottomDomain || opts.xDomain || [0, 1]).range([0, innerW]);
        var yTop = d3.scaleLinear().domain(opts.yTopDomain || [-1, 1]).range([innerH, 0]);
        var yBottom = d3.scaleLinear().domain(opts.yBottomDomain || [-1, 1]).range([innerH, 0]);
        var gTop = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        var bottomTop = margin.top + innerH + gap;
        var gBottom = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + bottomTop + ')');
        drawPanel(gTop, xTop, yTop, innerW, innerH, C, opts);
        drawPanel(gBottom, xBottom, yBottom, innerW, innerH, C, opts);
        if (opts.topLabel) window.renderKatex(svg, opts.topLabel, 22, margin.top + innerH / 2, { width: 220, height: 24, rotate: -90, size: 14 });
        if (opts.bottomLabel) window.renderKatex(svg, opts.bottomLabel, 22, bottomTop + innerH / 2, { width: 220, height: 24, rotate: -90, size: 14 });
        if (opts.xLabel) window.renderKatex(svg, opts.xLabel, margin.left + innerW / 2, H - 14, { width: 220, height: 24, size: 14 });
        return { svg: svg, gTop: gTop, gBottom: gBottom, x: xTop, xTop: xTop, xBottom: xBottom, yTop: yTop, yBottom: yBottom, W: W, H: H, innerW: innerW, innerH: innerH, margin: margin, bottomTop: bottomTop, colors: C };
    }

    function drawPanel(g, x, y, innerW, innerH, C, opts) {
        drawGrid(g, x, y, innerW, innerH, C, opts);
        styleAxis(g.append('g').attr('transform', 'translate(0,' + innerH + ')').call(d3.axisBottom(x).ticks(opts.xTicks || 6).tickSizeOuter(0)), C);
        styleAxis(g.append('g').call(d3.axisLeft(y).ticks(opts.yTicks || 5).tickSizeOuter(0)), C);
        g.append('rect').attr('width', innerW).attr('height', innerH).attr('fill', 'none').attr('stroke', C.gridStrong);
    }

    function drawGrid(g, x, y, innerW, innerH, C, opts) {
        g.append('g').attr('class', 'grid').selectAll('line.gy').data(y.ticks(opts.yTicks || 5)).join('line')
            .attr('x1', 0).attr('x2', innerW).attr('y1', function (d) { return y(d); }).attr('y2', function (d) { return y(d); })
            .attr('stroke', C.grid).attr('stroke-width', 1);
        g.append('g').attr('class', 'grid').selectAll('line.gx').data(x.ticks(opts.xTicks || 6)).join('line')
            .attr('x1', function (d) { return x(d); }).attr('x2', function (d) { return x(d); }).attr('y1', 0).attr('y2', innerH)
            .attr('stroke', C.gridFine).attr('stroke-width', 1);
    }

    function setupSPlane(sel, opts) {
        opts = opts || {};
        var P = setupPlot(sel, {
            xDomain: opts.xDomain || [-2, 2],
            yDomain: opts.yDomain || [-2, 2],
            margin: { top: 56, right: 56, bottom: 56, left: 56 },
            xTicks: 5,
            yTicks: 5
        });
        var x0 = P.x(0), y0 = P.y(0);
        P.g.append('rect').attr('class', 'splane-rhp').attr('x', x0).attr('y', 0).attr('width', P.innerW - x0).attr('height', P.innerH);
        P.g.append('line').attr('class', 'axis-line').attr('x1', 0).attr('x2', P.innerW).attr('y1', y0).attr('y2', y0).attr('stroke', P.colors.axis);
        P.g.append('line').attr('class', 'axis-line').attr('x1', x0).attr('x2', x0).attr('y1', 0).attr('y2', P.innerH).attr('stroke', P.colors.axis);
        window.renderKatex(P.svg, '\\operatorname{Im}\\{s\\}', P.margin.left + x0, 22, { width: 180, height: 24, size: 14 });
        window.renderKatex(P.svg, '\\operatorname{Re}\\{s\\}', P.margin.left + P.innerW + 18, P.margin.top + y0, { width: 140, height: 24, size: 14 });
        return P;
    }

    function styleAxis(ax, C) {
        ax.selectAll('path,line').attr('stroke', C.axis);
        ax.selectAll('text').attr('fill', C.fg).attr('font-size', 12).attr('font-family', "'JetBrains Mono', monospace");
    }

    function drawLine(panel, data, xAccessor, yAccessor, cls, yScale, gTarget) {
        var line = d3.line()
            .x(function (d) { return panel.x(xAccessor(d)); })
            .y(function (d) { return yScale(yAccessor(d)); })
            .curve(d3.curveCatmullRom.alpha(0.35));
        return (gTarget || panel.g).append('path')
            .datum(data)
            .attr('class', 'trace ' + cls)
            .attr('fill', 'none')
            .attr('d', line);
    }

    function legend(svg, items, x, y) {
        var C = colors();
        var g = svg.append('g').attr('transform', 'translate(' + x + ',' + y + ')');
        items.forEach(function (it, i) {
            var row = g.append('g').attr('transform', 'translate(0,' + i * 18 + ')');
            row.append('line').attr('x1', 0).attr('x2', 22).attr('y1', 0).attr('y2', 0)
                .attr('stroke', it.color || C[it.key]).attr('stroke-width', 2.6);
            row.append('text').attr('x', 30).attr('y', 4).attr('fill', C.fg)
                .attr('font-size', 11).attr('font-family', "'JetBrains Mono', monospace").text(it.label);
        });
    }

    function debounceResize(draw) {
        var timer = null;
        return function () {
            clearTimeout(timer);
            timer = setTimeout(draw, 120);
        };
    }

    WCGW.cssVar = cssVar;
    WCGW.colors = colors;
    WCGW.clamp = clamp;
    WCGW.linspace = linspace;
    WCGW.ecg = ecg;
    WCGW.ecgSeries = ecgSeries;
    WCGW.emgSeries = emgSeries;
    WCGW.addMains = addMains;
    WCGW.biquadLowpass = biquadLowpass;
    WCGW.biquadHighpass = biquadHighpass;
    WCGW.biquadNotch = biquadNotch;
    WCGW.filterValues = filterValues;
    WCGW.cascadeFilterValues = cascadeFilterValues;
    WCGW.sectionResponse = sectionResponse;
    WCGW.spectrum = spectrum;
    WCGW.setupPlot = setupPlot;
    WCGW.setupDual = setupDual;
    WCGW.setupSPlane = setupSPlane;
    WCGW.drawLine = drawLine;
    WCGW.legend = legend;
    WCGW.debounceResize = debounceResize;
    WCGW.styleAxis = styleAxis;

    window.WCGW = WCGW;
})();
