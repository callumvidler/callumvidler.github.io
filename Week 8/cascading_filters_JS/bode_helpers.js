// Shared helpers for the Bode-pair plots on this page.
// Builds the magnitude+phase axes, gridlines, and KaTeX titles.
// Each individual plot file calls setupBode(...) once per render and then
// draws its own data traces on the returned panels.
(function () {
    var T = window.T;

    function setupBode(opts) {
        var sel = opts.sel;
        var xDomain = opts.xDomain || [0.1, 1000];
        var magDomain = opts.magDomain || [-100, 6];
        var phaseDomain = opts.phaseDomain || [-540, 10];
        var phaseTicks = opts.phaseTicks;
        var magTicks = opts.magTicks;

        var root = d3.select(sel);
        root.selectAll('*').remove();

        var rect = root.node().getBoundingClientRect();
        var W = rect.width;
        var H = rect.height || 600;

        var margin = { top: 40, right: 70, bottom: 56, left: 70 };
        var gapBetween = 22;
        var innerW = W - margin.left - margin.right;
        var innerH_total = H - margin.top - margin.bottom - gapBetween;
        var innerH = innerH_total / 2;

        var svg = root.append('svg')
            .attr('width', W)
            .attr('height', H)
            .attr('viewBox', '0 0 ' + W + ' ' + H);

        var x = d3.scaleLog().domain(xDomain).range([0, innerW]).clamp(true);
        var yMag = d3.scaleLinear().domain(magDomain).range([innerH, 0]);
        var yPhase = d3.scaleLinear().domain(phaseDomain).range([innerH, 0]);

        // ── Magnitude panel ───────────────────────────────────
        var gMag = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var magTickValues = magTicks || yMag.ticks(7);
        gMag.append('g').attr('class', 'grid')
            .selectAll('line.gy').data(magTickValues).join('line')
            .attr('y1', function (d) { return yMag(d); })
            .attr('y2', function (d) { return yMag(d); })
            .attr('x1', 0).attr('x2', innerW)
            .attr('stroke', T.grid).attr('stroke-width', 1);

        var xLogTicks = generateLogTicks(xDomain[0], xDomain[1]);
        gMag.append('g').attr('class', 'grid')
            .selectAll('line.gx').data(xLogTicks.major).join('line')
            .attr('class', 'major')
            .attr('x1', function (d) { return x(d); })
            .attr('x2', function (d) { return x(d); })
            .attr('y1', 0).attr('y2', innerH)
            .attr('stroke', T.grid).attr('stroke-width', 1);
        gMag.append('g').attr('class', 'grid')
            .selectAll('line.gxm').data(xLogTicks.minor).join('line')
            .attr('x1', function (d) { return x(d); })
            .attr('x2', function (d) { return x(d); })
            .attr('y1', 0).attr('y2', innerH)
            .attr('stroke', T.gridFine).attr('stroke-width', 1);

        var magAxisL = d3.axisLeft(yMag).tickValues(magTickValues).tickSizeOuter(0);
        var magAxisB = d3.axisBottom(x).tickValues(xLogTicks.major).tickFormat(function () { return ''; }).tickSizeOuter(0);
        var magYg = gMag.append('g').call(magAxisL);
        var magXg = gMag.append('g').attr('transform', 'translate(0,' + innerH + ')').call(magAxisB);

        styleAxis(magYg);
        styleAxis(magXg);

        gMag.append('rect')
            .attr('x', 0).attr('y', 0)
            .attr('width', innerW).attr('height', innerH)
            .attr('fill', 'none')
            .attr('stroke', T.gridStrong)
            .attr('stroke-width', 1);

        // ── Phase panel ───────────────────────────────────────
        var phaseTop = margin.top + innerH + gapBetween;
        var gPhase = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + phaseTop + ')');

        var phaseTickValues = phaseTicks || yPhase.ticks(7);
        gPhase.append('g').attr('class', 'grid')
            .selectAll('line.gy').data(phaseTickValues).join('line')
            .attr('y1', function (d) { return yPhase(d); })
            .attr('y2', function (d) { return yPhase(d); })
            .attr('x1', 0).attr('x2', innerW)
            .attr('stroke', T.grid).attr('stroke-width', 1);

        gPhase.append('g').attr('class', 'grid')
            .selectAll('line.gx').data(xLogTicks.major).join('line')
            .attr('class', 'major')
            .attr('x1', function (d) { return x(d); })
            .attr('x2', function (d) { return x(d); })
            .attr('y1', 0).attr('y2', innerH)
            .attr('stroke', T.grid).attr('stroke-width', 1);
        gPhase.append('g').attr('class', 'grid')
            .selectAll('line.gxm').data(xLogTicks.minor).join('line')
            .attr('x1', function (d) { return x(d); })
            .attr('x2', function (d) { return x(d); })
            .attr('y1', 0).attr('y2', innerH)
            .attr('stroke', T.gridFine).attr('stroke-width', 1);

        var phaseAxisL = d3.axisLeft(yPhase).tickValues(phaseTickValues).tickSizeOuter(0);
        var phaseAxisB = d3.axisBottom(x).tickValues(xLogTicks.major)
            .tickFormat(function (d) {
                if (d >= 1000) return (d / 1000) + 'k';
                if (d >= 1) return String(d);
                return d.toString();
            })
            .tickSizeOuter(0);
        var phYg = gPhase.append('g').call(phaseAxisL);
        var phXg = gPhase.append('g').attr('transform', 'translate(0,' + innerH + ')').call(phaseAxisB);
        styleAxis(phYg);
        styleAxis(phXg);

        gPhase.append('rect')
            .attr('x', 0).attr('y', 0)
            .attr('width', innerW).attr('height', innerH)
            .attr('fill', 'none')
            .attr('stroke', T.gridStrong)
            .attr('stroke-width', 1);

        // ── Axis titles (single-quadrant rule) ────────────────
        // y-axis title for magnitude
        window.renderKatex(svg, '|H(j\\omega)| \\, [\\mathrm{dB}]',
            22, margin.top + innerH / 2,
            { width: 200, height: 24, rotate: -90, size: 14 });
        // y-axis title for phase
        window.renderKatex(svg, '\\angle H(j\\omega) \\, [^\\circ]',
            22, phaseTop + innerH / 2,
            { width: 200, height: 24, rotate: -90, size: 14 });
        // x-axis title (only below phase plot)
        window.renderKatex(svg, '\\omega \\, [\\mathrm{rad/s}]',
            margin.left + innerW / 2, H - 14,
            { width: 220, height: 24, size: 14 });

        return {
            svg: svg,
            gMag: gMag,
            gPhase: gPhase,
            x: x,
            yMag: yMag,
            yPhase: yPhase,
            innerW: innerW,
            innerH: innerH,
            margin: margin,
            phaseTop: phaseTop,
            W: W,
            H: H
        };
    }

    function styleAxis(ax) {
        ax.selectAll('path,line').attr('stroke', T.gridAxis);
        ax.selectAll('text')
            .attr('fill', T.text)
            .attr('font-size', 12)
            .attr('font-family', "'JetBrains Mono', monospace");
    }

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

    // ─── Complex arithmetic for transfer function evaluation ───
    // Each complex number is { re, im }.
    function cAdd(a, b)  { return { re: a.re + b.re, im: a.im + b.im }; }
    function cMul(a, b)  { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
    function cDiv(a, b)  {
        var d = b.re * b.re + b.im * b.im;
        return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
    }
    function cAbs(a)     { return Math.sqrt(a.re * a.re + a.im * a.im); }
    function cArg(a)     { return Math.atan2(a.im, a.re); }

    // Evaluate H_real(jw) for two cascaded passive RC stages with
    // R1=R, C1=C and R2=k*R, C2=C/k, so each stage in isolation has
    // the same cutoff. ABCD chain matrix:
    //   stage_i = [[1+s*Ri*Ci, Ri], [s*Ci, 1]]
    // Open-output transfer function = 1 / A_total.
    function cascadeABCD(omega, stages) {
        var s = { re: 0, im: omega };
        // identity matrix
        var A = { re: 1, im: 0 };
        var B = { re: 0, im: 0 };
        var C = { re: 0, im: 0 };
        var D = { re: 1, im: 0 };
        for (var i = 0; i < stages.length; i++) {
            var R = stages[i].R;
            var Cc = stages[i].C;
            var stA = { re: 1, im: omega * R * Cc };
            var stB = { re: R, im: 0 };
            var stC = { re: 0, im: omega * Cc };
            var stD = { re: 1, im: 0 };
            // multiply [A B; C D] · [stA stB; stC stD]
            var nA = cAdd(cMul(A, stA), cMul(B, stC));
            var nB = cAdd(cMul(A, stB), cMul(B, stD));
            var nC = cAdd(cMul(C, stA), cMul(D, stC));
            var nD = cAdd(cMul(C, stB), cMul(D, stD));
            A = nA; B = nB; C = nC; D = nD;
        }
        // open-circuit voltage gain: Vout/Vin = 1/A
        return cDiv({ re: 1, im: 0 }, A);
    }

    // Continuous phase unwrapping along an array of phase samples (radians).
    function unwrapPhase(phases) {
        var out = [phases[0]];
        for (var i = 1; i < phases.length; i++) {
            var prev = out[i - 1];
            var p = phases[i];
            while (p - prev > Math.PI) p -= 2 * Math.PI;
            while (p - prev < -Math.PI) p += 2 * Math.PI;
            out.push(p);
        }
        return out;
    }

    // ─── Hover crosshair + value readout ────────────────────────
    // traces: array of { name, cssClass, pts: [{ w, magDb, phase }] }
    // pts must be sorted by w. Adds a vertical crosshair across both panels,
    // a dot on each trace at the cursor frequency, and a small readout box
    // pinned to the top-left of the magnitude panel.
    function attachHover(H, traces, opts) {
        opts = opts || {};
        if (!traces || traces.length === 0) return;
        var T = window.T;

        var crosshair = H.svg.append('g').attr('class', 'crosshair').style('display', 'none');
        var vlineMag = crosshair.append('line').attr('class', 'hover-vline')
            .attr('y1', H.margin.top).attr('y2', H.margin.top + H.innerH);
        var vlinePhase = crosshair.append('line').attr('class', 'hover-vline')
            .attr('y1', H.phaseTop).attr('y2', H.phaseTop + H.innerH);

        var dotsMag = traces.map(function (t) {
            return crosshair.append('circle')
                .attr('class', 'hover-dot ' + (t.cssClass || ''))
                .attr('r', 4);
        });
        var dotsPhase = traces.map(function (t) {
            return crosshair.append('circle')
                .attr('class', 'hover-dot ' + (t.cssClass || ''))
                .attr('r', 4);
        });

        var rPad = 10;
        var rWidth = 220;
        var rRowH = 16;
        var rHeight = 22 + rRowH * traces.length + 10;
        var rX = H.margin.left + 10;
        var rY = H.margin.top + 10;

        var readout = H.svg.append('g').attr('class', 'readout').style('display', 'none');
        readout.append('rect').attr('class', 'readout-bg')
            .attr('x', rX).attr('y', rY)
            .attr('width', rWidth).attr('height', rHeight)
            .attr('rx', 6).attr('ry', 6);
        var omegaText = readout.append('text').attr('class', 'readout-text title')
            .attr('x', rX + rPad).attr('y', rY + 18);
        var traceTexts = traces.map(function (t, i) {
            return readout.append('text')
                .attr('class', 'readout-text ' + (t.cssClass || ''))
                .attr('x', rX + rPad)
                .attr('y', rY + 18 + 18 + i * rRowH);
        });

        var overlay = H.svg.append('rect').attr('class', 'hover-overlay')
            .attr('x', H.margin.left).attr('y', H.margin.top)
            .attr('width', H.innerW)
            .attr('height', H.phaseTop + H.innerH - H.margin.top);

        var magMin = H.yMag.domain()[0];
        var magMax = H.yMag.domain()[1];
        var phaseMin = H.yPhase.domain()[0];
        var phaseMax = H.yPhase.domain()[1];

        function findNearest(pts, w) {
            var lo = 0, hi = pts.length - 1;
            if (w <= pts[0].w) return pts[0];
            if (w >= pts[hi].w) return pts[hi];
            while (hi - lo > 1) {
                var mid = (lo + hi) >> 1;
                if (pts[mid].w < w) lo = mid; else hi = mid;
            }
            return Math.abs(pts[lo].w - w) < Math.abs(pts[hi].w - w) ? pts[lo] : pts[hi];
        }

        function fmtFreq(w) {
            if (w >= 100) return w.toFixed(1) + ' rad/s';
            if (w >= 10)  return w.toFixed(2) + ' rad/s';
            if (w >= 1)   return w.toFixed(3) + ' rad/s';
            if (w >= 0.1) return w.toFixed(4) + ' rad/s';
            return w.toExponential(2) + ' rad/s';
        }

        overlay.on('pointermove', function (event) {
            var p = d3.pointer(event, H.svg.node());
            var px = p[0];
            var xInPlot = px - H.margin.left;
            if (xInPlot < 0 || xInPlot > H.innerW) {
                crosshair.style('display', 'none');
                readout.style('display', 'none');
                return;
            }
            crosshair.style('display', null);
            readout.style('display', null);

            var w = H.x.invert(xInPlot);
            vlineMag.attr('x1', px).attr('x2', px);
            vlinePhase.attr('x1', px).attr('x2', px);

            omegaText.text('ω = ' + fmtFreq(w));

            traces.forEach(function (t, i) {
                var s = findNearest(t.pts, w);
                var magClipped = Math.min(Math.max(s.magDb, magMin), magMax);
                var phaseClipped = Math.min(Math.max(s.phase, phaseMin), phaseMax);
                var yMagPix = H.margin.top + H.yMag(magClipped);
                var yPhasePix = H.phaseTop + H.yPhase(phaseClipped);
                dotsMag[i].attr('cx', px).attr('cy', yMagPix);
                dotsPhase[i].attr('cx', px).attr('cy', yPhasePix);

                var magStr = isFinite(s.magDb)
                    ? (s.magDb >= -0.05 ? s.magDb.toFixed(2) : s.magDb.toFixed(1)) + ' dB'
                    : '−∞ dB';
                var phStr = s.phase.toFixed(1) + '°';
                traceTexts[i].text(t.name + ': ' + magStr + ',  ' + phStr);
            });
        }).on('pointerleave', function () {
            crosshair.style('display', 'none');
            readout.style('display', 'none');
        });
    }

    window.BodeHelpers = {
        setupBode: setupBode,
        styleAxis: styleAxis,
        generateLogTicks: generateLogTicks,
        cAdd: cAdd, cMul: cMul, cDiv: cDiv, cAbs: cAbs, cArg: cArg,
        cascadeABCD: cascadeABCD,
        unwrapPhase: unwrapPhase,
        attachHover: attachHover
    };
})();
