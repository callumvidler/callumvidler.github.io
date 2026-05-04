// Scene 05 · SAR ADC circuit diagram with animated binary search.
// The schematic shows the four blocks (S/H, comparator, SAR register, DAC),
// plus a dedicated digital-output panel on the right that mirrors the running
// register state and shows the decimal code and voltage equivalent.
// A continuously running animation drives the loop: a fresh V_in is sampled,
// the register tests one bit per cycle starting from the MSB, the DAC presents
// the trial voltage, the comparator emits a decision, and the bit either stays
// set or is cleared. After N cycles the panel latches the final code, then the
// loop restarts with a new sample.
(function () {
    var N = 8;
    var svg = d3.select('#plot-circuit');
    // Cached toolbar elements (set in init); used by tick() to mirror the
    // current step on the position slider while auto-playing.
    var stepI = null, stepL = null;

    // ─── viewBox layout (fixed; SVG scales via plot-box aspect ratio) ───
    var VBW = 960, VBH = 600;
    var WAVE = { x: 35,  y: 125, w: 130, h: 140 };
    var SH   = { x: 195, y: 155, w: 80,  h: 80 };
    var CMP  = { lx: 320, rx: 410, ty: 160, by: 300, oy: 230, pinHi: 195, pinLo: 265 };
    var SAR  = { x: 480, y: 160, w: 180, h: 140 };
    var DAC  = { x: 480, y: 380, w: 180, h: 90 };
    var DIG  = { x: 720, y: 150, w: 220, h: 270 };
    var CLK  = { x: 480, y: 70, w: 180, h: 40 };
    // Side panel that makes the comparator's two inputs (V_in, V_DAC) explicit
    // so it is obvious what the comparator decides on each cycle.
    var CMPI = { x: 90, y: 320, w: 285, h: 80 };
    // Cap-array cell row inside the DAC. Each cell maps to one binary-weighted
    // capacitor; "filled" = capacitor connected to V_ref (bit = 1).
    var CAP_ROW = (function () {
        var cw = 18, gap = 4;
        var total = N * cw + (N - 1) * gap;
        return {
            x0: 480 + (180 - total) / 2,   // centred inside DAC
            y:  380 + 18,                  // ~y=398 inside DAC
            w:  cw,
            h:  20,
            gap: gap
        };
    })();
    var VREF_TXT_Y = 510;

    // Bit cells inside SAR (working register)
    var BITS = (function () {
        var bw = 18, gap = 2;
        var total = N * bw + (N - 1) * gap;
        return {
            x0: SAR.x + (SAR.w - total) / 2,
            y:  SAR.y + 38,
            w:  bw,
            h:  60,
            gap: gap
        };
    })();

    // Bit cells inside the digital-output panel (latched / live mirror)
    var DIG_BITS = (function () {
        var bw = 22, gap = 2;
        var total = N * bw + (N - 1) * gap;
        return {
            x0: DIG.x + (DIG.w - total) / 2,
            y:  DIG.y + 50,
            w:  bw,
            h:  64,
            gap: gap
        };
    })();

    // ─── Wire-routing helpers ───
    var WAVE_END_X = WAVE.x + WAVE.w;
    var SH_OUT_X   = SH.x + SH.w;
    var SH_MID_Y   = SH.y + SH.h / 2;
    var DAC_MID_Y  = DAC.y + DAC.h / 2;
    var SAR_BUS_X  = SAR.x + SAR.w / 2;
    var DAC_BUS_X  = SAR_BUS_X;
    var BEND_TOP_X = 300;            // S/H out → CMP+
    var BEND_BOT_X = 290;            // DAC out → CMP-
    var DIG_OUT_Y  = SAR.y + 30;     // wire from SAR right-edge to DIG panel

    var PATH = {
        sample: [
            [WAVE_END_X, SH_MID_Y],
            [SH.x, SH_MID_Y],
            [SH_OUT_X, SH_MID_Y],
            [BEND_TOP_X, SH_MID_Y],
            [BEND_TOP_X, CMP.pinHi],
            [CMP.lx, CMP.pinHi]
        ],
        trial: [
            [SAR_BUS_X, SAR.y + SAR.h],
            [DAC_BUS_X, DAC.y],
            [DAC.x, DAC_MID_Y],
            [BEND_BOT_X, DAC_MID_Y],
            [BEND_BOT_X, CMP.pinLo],
            [CMP.lx, CMP.pinLo]
        ],
        commit: [
            [CMP.rx, CMP.oy],
            [SAR.x, CMP.oy]
        ],
        latch: [
            [SAR.x + SAR.w, DIG_OUT_Y],
            [DIG.x, DIG_OUT_Y]
        ]
    };

    // ─── Animation timing (ms) ───
    var T_SAMPLE  = 600;
    var T_TRIAL   = 380;
    var T_COMPARE = 280;
    var T_COMMIT  = 280;
    var T_HOLD    = 1500;

    // ─── State ───
    var st = {
        phase: 'sample',
        phaseStart: 0,
        k: 0,                              // bit index 0..N-1 currently being tested
        bits: new Array(N).fill(null),     // committed bits (null = unresolved)
        latchedBits: new Array(N).fill(null),  // last completed code (sticky in DIG)
        latchedCode: null,
        trialCode: 0,
        committedCode: 0,
        vin: 0.5,
        vdac: 0,
        decision: null,                    // 1 if V_in >= V_DAC, else 0
        finalCode: null,
        waveStart: performance.now(),
        speed: 1,                          // animation speed multiplier
        pauseStart: null,                  // performance.now() at which pause began (or null)
        pausedTotal: 0                     // accumulated paused time, ms
    };

    // Virtual clock that freezes while paused so all phase / wave timing pauses
    // together. All time-keeping inside the scene must read from here.
    function nowVirtual() {
        var raw = performance.now();
        var paused = st.pausedTotal;
        if (st.pauseStart !== null) paused += raw - st.pauseStart;
        return raw - paused;
    }

    function vinWave(tSec) {
        var v = 0.5
              + 0.30 * Math.sin(tSec * 0.42)
              + 0.13 * Math.sin(tSec * 1.27 + 0.7)
              + 0.05 * Math.sin(tSec * 2.6 + 1.3);
        return Math.max(0.04, Math.min(0.96, v));
    }

    // ─── SVG layers ───
    var gStatic, gDyn;

    function setupSvg() {
        svg.attr('viewBox', '0 0 ' + VBW + ' ' + VBH)
           .attr('preserveAspectRatio', 'xMidYMid meet');
        svg.selectAll('*').remove();
        gStatic = svg.append('g').attr('class', 'static-layer');
        gDyn    = svg.append('g').attr('class', 'dyn-layer');
    }

    // ─── Static schematic (components, fixed wires, fixed labels) ───
    function buildStatic() {
        var stroke = 'var(--text-dim)';
        var muted  = 'var(--muted)';
        var label  = 'var(--text-dim)';
        var subtle = 'var(--muted)';

        var w = gStatic.append('g').attr('class', 'wires');

        function line(x1, y1, x2, y2, opts) {
            opts = opts || {};
            return w.append('line')
                .attr('x1', x1).attr('y1', y1)
                .attr('x2', x2).attr('y2', y2)
                .attr('stroke', opts.stroke || stroke)
                .attr('stroke-width', opts.sw || 1.6)
                .attr('stroke-dasharray', opts.dash || null);
        }

        // V_in arrow stub from left edge into wave plot
        line(8, SH_MID_Y, WAVE.x, SH_MID_Y);

        // wave-plot end → S/H input
        line(WAVE_END_X, SH_MID_Y, SH.x, SH_MID_Y);

        // S/H out → CMP+
        line(SH_OUT_X, SH_MID_Y, CMP.lx, CMP.pinHi);

        // DAC out → CMP-
        line(DAC.x,       DAC_MID_Y, BEND_BOT_X, DAC_MID_Y);
        line(BEND_BOT_X,  DAC_MID_Y, BEND_BOT_X, CMP.pinLo);
        line(BEND_BOT_X,  CMP.pinLo, CMP.lx,    CMP.pinLo);

        // CMP out → SAR
        line(CMP.rx, CMP.oy, SAR.x, CMP.oy, { stroke: 'var(--c-output)', sw: 2 });

        // SAR → DAC bus
        line(SAR_BUS_X, SAR.y + SAR.h, DAC_BUS_X, DAC.y, { stroke: 'var(--c-output)', sw: 2.6 });
        // bus tick
        w.append('line')
            .attr('x1', SAR_BUS_X - 7).attr('y1', SAR.y + SAR.h + 14)
            .attr('x2', SAR_BUS_X + 7).attr('y2', SAR.y + SAR.h + 6)
            .attr('stroke', 'var(--c-output)').attr('stroke-width', 1.5);
        w.append('text')
            .attr('x', SAR_BUS_X + 11).attr('y', (SAR.y + SAR.h + DAC.y) / 2 + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-output)').text('N');

        // SAR → digital output panel (parallel bus)
        line(SAR.x + SAR.w, DIG_OUT_Y, DIG.x, DIG_OUT_Y,
            { stroke: 'var(--c-output)', sw: 2.6 });
        // bus tick + N label
        w.append('line')
            .attr('x1', (SAR.x + SAR.w + DIG.x) / 2 - 7).attr('y1', DIG_OUT_Y - 7)
            .attr('x2', (SAR.x + SAR.w + DIG.x) / 2 + 7).attr('y2', DIG_OUT_Y + 7)
            .attr('stroke', 'var(--c-output)').attr('stroke-width', 1.5);
        w.append('text')
            .attr('x', (SAR.x + SAR.w + DIG.x) / 2 + 4).attr('y', DIG_OUT_Y - 9)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-output)').text('N');

        // Clock signal panel above SAR. One full cycle drives one bit decision,
        // so the waveform shows N cycles total. The dynamic layer highlights
        // the cycle currently being executed.
        var clkBgX = CLK.x;
        var clkBgY = CLK.y;
        var clkPad = 6;
        var clkY1 = clkBgY + clkPad;            // high level
        var clkY0 = clkBgY + CLK.h - clkPad;    // low level
        var halfW = CLK.w / (N * 2);

        gStatic.append('rect')
            .attr('x', clkBgX).attr('y', clkBgY)
            .attr('width', CLK.w).attr('height', CLK.h)
            .attr('rx', 4)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', stroke).attr('stroke-width', 1.0)
            .attr('opacity', 0.85);

        gStatic.append('text')
            .attr('x', clkBgX).attr('y', clkBgY - 18)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('font-weight', 600)
            .attr('fill', 'var(--c-thresh)').text('clock');
        gStatic.append('text')
            .attr('x', clkBgX).attr('y', clkBgY - 6)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 9.5)
            .attr('fill', muted).attr('letter-spacing', '0.05em')
            .text('one cycle drives one bit decision');

        // Square-wave path
        var clkPts = [];
        for (var ci = 0; ci < N * 2; ci++) {
            var x1 = clkBgX + ci * halfW;
            var x2 = clkBgX + (ci + 1) * halfW;
            var yL = (ci % 2 === 0) ? clkY0 : clkY1;
            clkPts.push([x1, yL]);
            clkPts.push([x2, yL]);
        }
        gStatic.append('path')
            .attr('d', clkPts.map(function (p, i) {
                return (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1];
            }).join(''))
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-thresh)')
            .attr('stroke-width', 1.6);

        // Cycle dividers + index numerals
        for (var ck = 0; ck < N; ck++) {
            var dx = clkBgX + ck * (CLK.w / N);
            if (ck > 0) {
                gStatic.append('line')
                    .attr('x1', dx).attr('x2', dx)
                    .attr('y1', clkBgY).attr('y2', clkBgY + CLK.h)
                    .attr('stroke', 'var(--border)').attr('stroke-width', 0.8)
                    .attr('stroke-dasharray', '2 3');
            }
            gStatic.append('text')
                .attr('x', clkBgX + (ck + 0.5) * (CLK.w / N))
                .attr('y', clkBgY + CLK.h + 11)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 9)
                .attr('fill', subtle)
                .text(ck + 1);
        }

        // Dotted feed from clock panel to SAR top
        var clkFeedX = clkBgX + CLK.w / 2;
        line(clkFeedX, clkBgY + CLK.h + 14, clkFeedX, SAR.y, { sw: 1.2, dash: '3 3' });

        // V_ref into DAC from below — constant reference, value shown explicitly
        line(DAC.x + DAC.w - 22, DAC.y + DAC.h + 28, DAC.x + DAC.w - 22, DAC.y + DAC.h);
        w.append('text')
            .attr('x', DAC.x + DAC.w - 22).attr('y', VREF_TXT_Y)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', label).text('V_ref = 1.000');
        w.append('text')
            .attr('x', DAC.x + DAC.w - 22).attr('y', VREF_TXT_Y + 14)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 9)
            .attr('fill', subtle).attr('letter-spacing', '0.14em')
            .text('CONSTANT');

        // ---- Components ----
        var c = gStatic.append('g').attr('class', 'components');

        // Mini wave plot frame
        c.append('rect')
            .attr('x', WAVE.x).attr('y', WAVE.y)
            .attr('width', WAVE.w).attr('height', WAVE.h)
            .attr('rx', 5)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', stroke).attr('stroke-width', 1.2)
            .attr('opacity', 0.9);
        c.append('text')
            .attr('x', WAVE.x).attr('y', WAVE.y - 7)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', muted).text('analog input v(t)');

        // V_in label
        c.append('text')
            .attr('x', 6).attr('y', SH_MID_Y - 8)
            .attr('text-anchor', 'start')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', 'var(--c-input)').text('V_in');

        // S/H block
        c.append('rect')
            .attr('x', SH.x).attr('y', SH.y).attr('width', SH.w).attr('height', SH.h)
            .attr('rx', 5)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', stroke).attr('stroke-width', 1.4);
        c.append('text')
            .attr('x', SH.x + SH.w / 2).attr('y', SH.y - 7)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', muted).text('S / H');
        c.append('text')
            .attr('x', SH.x + SH.w / 2).attr('y', SH.y + 22)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', muted).text('hold');
        c.append('text')
            .attr('x', SH.x + SH.w / 2).attr('y', SH.y + 38)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 9)
            .attr('fill', subtle).attr('letter-spacing', '0.10em').text('× V_ref');

        // Comparator triangle
        c.append('polygon')
            .attr('points',
                CMP.lx + ',' + CMP.ty + ' ' +
                CMP.lx + ',' + CMP.by + ' ' +
                CMP.rx + ',' + CMP.oy)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', stroke).attr('stroke-width', 1.4);
        c.append('text').attr('x', CMP.lx + 9).attr('y', CMP.pinHi + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 14)
            .attr('fill', label).text('+');
        c.append('text').attr('x', CMP.lx + 9).attr('y', CMP.pinLo + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 14)
            .attr('fill', label).text('−');
        c.append('text')
            .attr('x', CMP.lx + 36).attr('y', CMP.oy + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', muted).text('CMP');

        // SAR register box
        c.append('rect')
            .attr('x', SAR.x).attr('y', SAR.y).attr('width', SAR.w).attr('height', SAR.h)
            .attr('rx', 6)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', stroke).attr('stroke-width', 1.4);
        c.append('text')
            .attr('x', SAR.x + 12).attr('y', SAR.y + 22)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 12)
            .attr('fill', label).text('SAR register');

        // DAC box
        c.append('rect')
            .attr('x', DAC.x).attr('y', DAC.y).attr('width', DAC.w).attr('height', DAC.h)
            .attr('rx', 6)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', stroke).attr('stroke-width', 1.4);
        // Title moved outside the box (above) so the interior can host the cap
        // cell row plus the V_DAC fill bar without crowding.
        c.append('text')
            .attr('x', DAC.x + 8).attr('y', DAC.y - 7)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', muted).text('DAC · binary-weighted cap array');

        // "decision" wire label
        c.append('text')
            .attr('x', (CMP.rx + SAR.x) / 2).attr('y', CMP.oy - 8)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-output)').text('decision');

        // ---- Comparator-inputs panel ----
        // Sits below the comparator and shows V_in vs V_DAC as side-by-side
        // bars with current numeric values, plus the rule the comparator applies
        // each cycle. This is what determines whether the trial bit stays 1 or
        // is cleared to 0.
        c.append('rect')
            .attr('x', CMPI.x).attr('y', CMPI.y)
            .attr('width', CMPI.w).attr('height', CMPI.h)
            .attr('rx', 6)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', stroke).attr('stroke-width', 1.0)
            .attr('opacity', 0.9);
        c.append('text')
            .attr('x', CMPI.x + 12).attr('y', CMPI.y + 14)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('letter-spacing', '0.10em')
            .attr('fill', muted).text('COMPARATOR · V_in  vs  V_DAC');

        // ---- Digital output panel ----
        c.append('rect')
            .attr('x', DIG.x).attr('y', DIG.y).attr('width', DIG.w).attr('height', DIG.h)
            .attr('rx', 8)
            .attr('fill', 'var(--bg-2)')
            .attr('stroke', 'var(--c-output)').attr('stroke-width', 1.6)
            .attr('opacity', 0.95);
        c.append('text')
            .attr('x', DIG.x + DIG.w / 2).attr('y', DIG.y + 24)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
            .attr('font-weight', 600)
            .attr('letter-spacing', '0.18em')
            .attr('fill', 'var(--c-output)').text('DIGITAL OUT');
        c.append('text')
            .attr('x', DIG.x + DIG.w / 2).attr('y', DIG.y + 39)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 9.5)
            .attr('fill', muted)
            .attr('letter-spacing', '0.12em')
            .text('N = 8 bits · MSB → LSB');

        // separator
        c.append('line')
            .attr('x1', DIG.x + 18).attr('x2', DIG.x + DIG.w - 18)
            .attr('y1', DIG_BITS.y + DIG_BITS.h + 16)
            .attr('y2', DIG_BITS.y + DIG_BITS.h + 16)
            .attr('stroke', 'var(--border)').attr('stroke-width', 1);

        c.append('text')
            .attr('x', DIG.x + 18).attr('y', DIG_BITS.y + DIG_BITS.h + 36)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('letter-spacing', '0.14em')
            .attr('fill', muted).text('DECIMAL');
        c.append('text')
            .attr('x', DIG.x + 18).attr('y', DIG_BITS.y + DIG_BITS.h + 86)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('letter-spacing', '0.14em')
            .attr('fill', muted).text('VOLTAGE  (× V_ref)');
    }

    // ─── Dynamic update ───
    function rebuildDyn(now) {
        gDyn.selectAll('*').remove();

        var phase = st.phase;
        var phaseDur = phaseDuration(phase);
        var phaseT = (now - st.phaseStart) / phaseDur;
        if (phaseT > 1) phaseT = 1;
        if (phaseT < 0) phaseT = 0;

        // ── 0. Clock-cycle highlight ──
        // Mark already-completed cycles, then highlight the active one.
        var cycleW = CLK.w / N;
        var completedThru = (phase === 'sample') ? 0
            : (phase === 'hold') ? N
            : st.k + (phase === 'commit' ? 1 : 0);
        for (var ic = 0; ic < completedThru; ic++) {
            gDyn.append('rect')
                .attr('x', CLK.x + ic * cycleW).attr('y', CLK.y)
                .attr('width', cycleW).attr('height', CLK.h)
                .attr('fill', 'var(--c-output)')
                .attr('opacity', 0.10);
        }
        if (phase === 'trial' || phase === 'compare' || phase === 'commit') {
            gDyn.append('rect')
                .attr('x', CLK.x + st.k * cycleW).attr('y', CLK.y)
                .attr('width', cycleW).attr('height', CLK.h)
                .attr('fill', 'var(--c-thresh)')
                .attr('opacity', 0.22);
        }

        // ── 1. Wave plot trace + held-value marker ──
        var waveT = (now - st.waveStart) / 1000;
        var winSec = 4.0;
        var samples = 140;
        var poly = [];
        for (var i = 0; i <= samples; i++) {
            var u = i / samples;
            var tt = waveT - winSec * (1 - u);
            var v = vinWave(tt);
            poly.push([
                WAVE.x + u * WAVE.w,
                WAVE.y + WAVE.h - v * WAVE.h
            ]);
        }

        // grid line at 0.5
        gDyn.append('line')
            .attr('x1', WAVE.x).attr('x2', WAVE.x + WAVE.w)
            .attr('y1', WAVE.y + WAVE.h * 0.5).attr('y2', WAVE.y + WAVE.h * 0.5)
            .attr('stroke', 'var(--grid-line)').attr('stroke-width', 1);

        // Held V_in horizontal line
        var heldY = WAVE.y + WAVE.h - st.vin * WAVE.h;
        gDyn.append('line')
            .attr('x1', WAVE.x).attr('x2', WAVE.x + WAVE.w)
            .attr('y1', heldY).attr('y2', heldY)
            .attr('stroke', 'var(--c-thresh)').attr('stroke-width', 1.4)
            .attr('stroke-dasharray', '4 3').attr('opacity', 0.9);

        gDyn.append('path')
            .datum(poly)
            .attr('fill', 'none')
            .attr('stroke', 'var(--c-input)')
            .attr('stroke-width', 1.8)
            .attr('opacity', 0.9)
            .attr('d', d3.line()
                .x(function (d) { return d[0]; })
                .y(function (d) { return d[1]; }));

        // "now" cursor
        var nowV = vinWave(waveT);
        gDyn.append('circle')
            .attr('cx', WAVE.x + WAVE.w - 1)
            .attr('cy', WAVE.y + WAVE.h - nowV * WAVE.h)
            .attr('r', 3)
            .attr('fill', 'var(--c-input)');

        // sample-and-hold capture pulse
        if (phase === 'sample') {
            var pulseR = 6 + 16 * (1 - phaseT);
            gDyn.append('circle')
                .attr('cx', WAVE.x + WAVE.w - 1)
                .attr('cy', heldY)
                .attr('r', pulseR)
                .attr('fill', 'none')
                .attr('stroke', 'var(--c-thresh)')
                .attr('stroke-width', 1.5)
                .attr('opacity', 0.6 * (1 - phaseT));
        }

        // V_in numeric label
        gDyn.append('text')
            .attr('x', WAVE.x + WAVE.w + 4).attr('y', heldY + 4)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--c-thresh)')
            .text(st.vin.toFixed(2));

        // Held-value readout inside S/H block
        var sampleFlash = (phase === 'sample') ? (1 - phaseT) : 0;
        gDyn.append('text')
            .attr('x', SH.x + SH.w / 2)
            .attr('y', SH.y + SH.h - 18)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 20)
            .attr('font-weight', 600)
            .attr('fill', 'var(--c-thresh)')
            .text(st.vin.toFixed(3));
        if (sampleFlash > 0) {
            gDyn.append('rect')
                .attr('x', SH.x).attr('y', SH.y)
                .attr('width', SH.w).attr('height', SH.h)
                .attr('rx', 5)
                .attr('fill', 'var(--c-thresh)')
                .attr('opacity', 0.14 * sampleFlash);
        }

        // ── 2. Bit cells inside SAR (working register) ──
        for (var k = 0; k < N; k++) {
            drawBitCell(k, BITS, /*big*/ false);
        }

        // SAR status line
        var statusText;
        if (phase === 'sample') {
            statusText = 'sample → hold V_in';
        } else if (phase === 'trial') {
            statusText = 'k=' + (st.k + 1) + '/' + N + '  trial b' + (N - 1 - st.k) + ' = 1';
        } else if (phase === 'compare') {
            statusText = 'k=' + (st.k + 1) + '/' + N + '  compare V_in ' +
                         (st.decision ? '≥' : '<') + ' V_DAC';
        } else if (phase === 'commit') {
            statusText = 'k=' + (st.k + 1) + '/' + N + '  commit b' + (N - 1 - st.k) +
                         ' = ' + st.decision;
        } else if (phase === 'hold') {
            statusText = 'final code = ' + bitsString(st.bits);
        }
        gDyn.append('text')
            .attr('x', SAR.x + SAR.w / 2)
            .attr('y', SAR.y + SAR.h - 10)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('fill', 'var(--muted)')
            .text(statusText);

        // ── 3. DAC interior: cap-array + V_DAC fill bar ──
        // Animated current trial value (used both in DAC and in the comparator
        // inputs panel so the two readouts stay consistent).
        var dacShown = st.vdac;
        if (phase === 'trial') {
            var prevV = st.committedCode / Math.pow(2, N);
            dacShown = prevV + (st.trialCode / Math.pow(2, N) - prevV) * phaseT;
        }

        // 3a. Cap-array row. Each cell maps to one binary-weighted capacitor;
        // a "filled" cell means that cap is currently connected to V_ref and is
        // contributing its weight (1/2, 1/4, ...) to V_DAC. The active trial
        // bit is highlighted with the accent ring.
        for (var ci = 0; ci < N; ci++) {
            var cellX = CAP_ROW.x0 + ci * (CAP_ROW.w + CAP_ROW.gap);
            var cellY = CAP_ROW.y;
            var bitVal = st.bits[ci];
            var isTrial = (ci === st.k && (phase === 'trial' || phase === 'compare'));
            var isCommit = (ci === st.k && phase === 'commit');
            var resolved = bitVal !== null;

            var effectiveBit;
            if (isTrial)        effectiveBit = 1;
            else if (isCommit)  effectiveBit = st.decision;
            else if (resolved)  effectiveBit = bitVal;
            else                effectiveBit = 0;

            var capFill, capStroke, capSW, capOp;
            if (isTrial) {
                capFill = 'var(--accent-soft)';
                capStroke = 'var(--accent)';
                capSW = 1.8; capOp = 0.95;
            } else if (effectiveBit) {
                capFill = 'var(--c-output2)';
                capStroke = 'var(--c-output2)';
                capSW = 1.2; capOp = 0.55;
            } else {
                capFill = 'transparent';
                capStroke = 'var(--border)';
                capSW = 1; capOp = 1;
            }
            gDyn.append('rect')
                .attr('x', cellX).attr('y', cellY)
                .attr('width', CAP_ROW.w).attr('height', CAP_ROW.h)
                .attr('rx', 2)
                .attr('fill', capFill)
                .attr('stroke', capStroke)
                .attr('stroke-width', capSW)
                .attr('opacity', capOp);
            gDyn.append('text')
                .attr('x', cellX + CAP_ROW.w / 2)
                .attr('y', cellY + CAP_ROW.h / 2 + 3)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 8)
                .attr('font-weight', 600)
                .attr('fill', isTrial ? 'var(--accent)'
                                       : (effectiveBit ? 'var(--c-output2)' : 'var(--muted)'))
                .text('b' + (N - 1 - ci));
        }
        gDyn.append('text')
            .attr('x', CAP_ROW.x0).attr('y', CAP_ROW.y + CAP_ROW.h + 9)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 8.5)
            .attr('fill', 'var(--muted)')
            .text('filled = cap → V_ref (bit = 1)');

        // 3b. V_DAC fill bar (now sits below the cap row inside the DAC).
        var barX = DAC.x + 12;
        var barW = DAC.w - 60;
        var barY = DAC.y + 60;
        var barH = 14;
        gDyn.append('text')
            .attr('x', barX).attr('y', barY - 3)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 9)
            .attr('fill', 'var(--muted)')
            .text('V_DAC / V_ref');
        gDyn.append('rect')
            .attr('x', barX).attr('y', barY)
            .attr('width', barW).attr('height', barH)
            .attr('rx', 2)
            .attr('fill', 'transparent')
            .attr('stroke', 'var(--border)').attr('stroke-width', 1);
        gDyn.append('rect')
            .attr('x', barX).attr('y', barY)
            .attr('width', Math.max(0, barW * dacShown)).attr('height', barH)
            .attr('rx', 2)
            .attr('fill', 'var(--c-output2)')
            .attr('opacity', 0.55);
        gDyn.append('text')
            .attr('x', barX + barW + 6).attr('y', barY + barH - 3)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--c-output2)')
            .text(dacShown.toFixed(3));

        // ── 3c. Comparator inputs panel ──
        // Twin bars showing the two voltages the comparator actually sees, plus
        // the rule it applies. This is what generates the bit each cycle.
        var ciRowH = 12;
        var ciBarX = CMPI.x + 75;
        var ciBarW = 145;
        var ciValX = ciBarX + ciBarW + 6;

        // V_in row
        var ciY1 = CMPI.y + 24;
        gDyn.append('text')
            .attr('x', CMPI.x + 12).attr('y', ciY1 + 9)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('font-weight', 600)
            .attr('fill', 'var(--c-thresh)').text('V_in');
        gDyn.append('rect')
            .attr('x', ciBarX).attr('y', ciY1)
            .attr('width', ciBarW).attr('height', ciRowH)
            .attr('rx', 2).attr('fill', 'transparent')
            .attr('stroke', 'var(--border)').attr('stroke-width', 1);
        gDyn.append('rect')
            .attr('x', ciBarX).attr('y', ciY1)
            .attr('width', ciBarW * st.vin).attr('height', ciRowH)
            .attr('rx', 2).attr('fill', 'var(--c-thresh)').attr('opacity', 0.55);
        gDyn.append('text')
            .attr('x', ciValX).attr('y', ciY1 + 9)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--c-thresh)').text(st.vin.toFixed(3));

        // V_DAC row
        var ciY2 = CMPI.y + 42;
        gDyn.append('text')
            .attr('x', CMPI.x + 12).attr('y', ciY2 + 9)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 11)
            .attr('font-weight', 600)
            .attr('fill', 'var(--c-output2)').text('V_DAC');
        gDyn.append('rect')
            .attr('x', ciBarX).attr('y', ciY2)
            .attr('width', ciBarW).attr('height', ciRowH)
            .attr('rx', 2).attr('fill', 'transparent')
            .attr('stroke', 'var(--border)').attr('stroke-width', 1);
        gDyn.append('rect')
            .attr('x', ciBarX).attr('y', ciY2)
            .attr('width', ciBarW * dacShown).attr('height', ciRowH)
            .attr('rx', 2).attr('fill', 'var(--c-output2)').attr('opacity', 0.55);
        gDyn.append('text')
            .attr('x', ciValX).attr('y', ciY2 + 9)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('fill', 'var(--c-output2)').text(dacShown.toFixed(3));

        // Decision rule line
        var winning = (st.vin >= dacShown);
        var rel = winning ? '≥' : '<';
        var bitOut = winning ? 1 : 0;
        var ruleColor = winning ? 'var(--c-output)' : 'var(--muted)';
        gDyn.append('text')
            .attr('x', CMPI.x + 12).attr('y', CMPI.y + CMPI.h - 9)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10.5)
            .attr('font-weight', 600)
            .attr('fill', ruleColor)
            .text('V_in ' + rel + ' V_DAC  →  bit = ' + bitOut);

        // ── 4. Comparator decision LED ──
        var ledX = CMP.rx + 14;
        var ledY = CMP.oy + 22;
        var ledOn = (phase === 'compare' || phase === 'commit') && st.decision !== null;
        gDyn.append('circle')
            .attr('cx', ledX).attr('cy', ledY).attr('r', 6)
            .attr('fill', ledOn
                  ? (st.decision ? 'var(--c-output)' : 'var(--muted)')
                  : 'transparent')
            .attr('stroke', ledOn
                  ? (st.decision ? 'var(--c-output)' : 'var(--muted)')
                  : 'var(--border)')
            .attr('stroke-width', 1.4)
            .attr('opacity', ledOn ? 0.9 : 0.4);
        if (ledOn) {
            gDyn.append('text')
                .attr('x', ledX + 12).attr('y', ledY + 5)
                .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 13)
                .attr('font-weight', 600)
                .attr('fill', st.decision ? 'var(--c-output)' : 'var(--muted)')
                .text(String(st.decision));
        }

        // Comparator triangle pulse during 'compare'
        if (phase === 'compare') {
            var pulse = 0.35 + 0.65 * Math.sin(phaseT * Math.PI);
            gDyn.append('polygon')
                .attr('points',
                    CMP.lx + ',' + CMP.ty + ' ' +
                    CMP.lx + ',' + CMP.by + ' ' +
                    CMP.rx + ',' + CMP.oy)
                .attr('fill', 'var(--accent-soft)')
                .attr('opacity', 0.5 * pulse)
                .attr('stroke', 'none');
        }

        // ── 5. Digital output panel content ──
        // The panel mirrors the live SAR contents (so the user sees bits filling
        // up as they commit), then latches with a highlight on conversion done.
        var liveBits = st.bits.slice();
        var liveCode = st.committedCode;
        // While in 'commit' phase the freshly-committed bit has already been
        // written into st.bits in enterPhase('commit') so no special handling.

        var isLatched = (phase === 'hold');
        for (var k = 0; k < N; k++) {
            drawDigitalCell(k, liveBits[k], isLatched, phaseT);
        }

        // Decimal value
        var resolvedCount = 0;
        for (var i = 0; i < N; i++) if (liveBits[i] !== null) resolvedCount++;
        var decTxt, vTxt;
        if (resolvedCount === 0) {
            decTxt = '—';
            vTxt = '—';
        } else {
            decTxt = liveCode + ' / ' + Math.pow(2, N);
            vTxt = (liveCode / Math.pow(2, N)).toFixed(3);
        }
        gDyn.append('text')
            .attr('x', DIG.x + 18).attr('y', DIG_BITS.y + DIG_BITS.h + 60)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 22)
            .attr('font-weight', 600)
            .attr('fill', isLatched ? 'var(--c-output)' : 'var(--text-dim)')
            .text(decTxt);
        gDyn.append('text')
            .attr('x', DIG.x + 18).attr('y', DIG_BITS.y + DIG_BITS.h + 110)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 22)
            .attr('font-weight', 600)
            .attr('fill', isLatched ? 'var(--c-output2)' : 'var(--text-dim)')
            .text(vTxt);

        // Status pill
        var stTxt, stColor;
        if (phase === 'hold') {
            stTxt = '● READY · code latched';
            stColor = 'var(--c-output)';
        } else if (phase === 'sample') {
            stTxt = '○ SAMPLING';
            stColor = 'var(--c-thresh)';
        } else {
            stTxt = '○ CONVERTING · ' + (st.k + 1) + ' / ' + N;
            stColor = 'var(--accent)';
        }
        gDyn.append('text')
            .attr('x', DIG.x + DIG.w / 2)
            .attr('y', DIG.y + DIG.h - 14)
            .attr('text-anchor', 'middle')
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .attr('letter-spacing', '0.14em')
            .attr('fill', stColor)
            .text(stTxt);

        // Latch flash on hold entry
        if (phase === 'hold') {
            var fade = Math.max(0, 1 - phaseT * 2);
            if (fade > 0) {
                gDyn.append('rect')
                    .attr('x', DIG.x).attr('y', DIG.y)
                    .attr('width', DIG.w).attr('height', DIG.h)
                    .attr('rx', 8)
                    .attr('fill', 'var(--c-output)')
                    .attr('opacity', 0.18 * fade);
            }
        }

        // ── 6. Active wire highlight + travelling dot ──
        var activePath = null;
        var dotColor = 'var(--c-input)';
        if (phase === 'sample')          { activePath = PATH.sample; dotColor = 'var(--c-input)'; }
        else if (phase === 'trial')      { activePath = PATH.trial;  dotColor = 'var(--c-output)'; }
        else if (phase === 'commit')     { activePath = PATH.commit; dotColor = 'var(--c-output)'; }

        if (activePath) {
            gDyn.append('path')
                .attr('d', pathToD(activePath))
                .attr('fill', 'none')
                .attr('stroke', dotColor)
                .attr('stroke-width', 5)
                .attr('opacity', 0.18)
                .attr('stroke-linecap', 'round')
                .attr('stroke-linejoin', 'round');

            var pos = pointOnPolyline(activePath, phaseT);
            gDyn.append('circle')
                .attr('cx', pos[0]).attr('cy', pos[1])
                .attr('r', 5)
                .attr('fill', dotColor)
                .attr('stroke', 'var(--bg-2)')
                .attr('stroke-width', 1.4);
        }

        // Latch dot from SAR → DIG on entry to hold
        if (phase === 'hold' && phaseT < 0.5) {
            var lt = phaseT / 0.5;
            var pos2 = pointOnPolyline(PATH.latch, lt);
            gDyn.append('circle')
                .attr('cx', pos2[0]).attr('cy', pos2[1])
                .attr('r', 5)
                .attr('fill', 'var(--c-output)')
                .attr('stroke', 'var(--bg-2)')
                .attr('stroke-width', 1.4);
        }

        // Active SAR cell ring on commit
        if (phase === 'commit') {
            var ck = st.k;
            if (ck >= 0 && ck < N) {
                var cellX = BITS.x0 + ck * (BITS.w + BITS.gap);
                gDyn.append('rect')
                    .attr('x', cellX - 2).attr('y', BITS.y - 2)
                    .attr('width', BITS.w + 4).attr('height', BITS.h + 4)
                    .attr('rx', 4)
                    .attr('fill', 'none')
                    .attr('stroke', st.decision ? 'var(--c-output)' : 'var(--muted)')
                    .attr('stroke-width', 1.6)
                    .attr('opacity', 0.7 * (1 - phaseT));
            }
        }

        // ── helpers (closures over gDyn / phase / phaseT / st) ──
        function drawBitCell(k, BB, big) {
            var cellX = BB.x0 + k * (BB.w + BB.gap);
            var cellY = BB.y;
            var bitVal = st.bits[k];
            var bitLabel = N - 1 - k;

            var isActive   = (k === st.k && (phase === 'trial' || phase === 'compare'));
            var isCommit   = (k === st.k && phase === 'commit');
            var isResolved = bitVal !== null;

            var fill, strokeC, strokeW, vText, vColor;
            if (isActive) {
                fill = 'var(--accent-soft)';
                strokeC = 'var(--accent)';
                strokeW = 2;
                vText = '1';
                vColor = 'var(--accent)';
            } else if (isCommit) {
                fill = st.decision ? 'rgba(52,211,153,' + (0.18 + 0.4 * (1 - phaseT)) + ')'
                                   : 'rgba(139,144,163,' + (0.16 + 0.32 * (1 - phaseT)) + ')';
                strokeC = st.decision ? 'var(--c-output)' : 'var(--muted)';
                strokeW = 2;
                vText = String(st.decision);
                vColor = st.decision ? 'var(--c-output)' : 'var(--muted)';
            } else if (isResolved) {
                fill = bitVal ? 'rgba(52,211,153,0.10)' : 'transparent';
                strokeC = 'var(--border)';
                strokeW = 1;
                vText = String(bitVal);
                vColor = bitVal ? 'var(--c-output)' : 'var(--muted)';
            } else {
                fill = 'transparent';
                strokeC = 'var(--border)';
                strokeW = 1;
                vText = '·';
                vColor = 'var(--muted)';
            }

            gDyn.append('rect')
                .attr('x', cellX).attr('y', cellY)
                .attr('width', BB.w).attr('height', BB.h)
                .attr('rx', 3)
                .attr('fill', fill)
                .attr('stroke', strokeC).attr('stroke-width', strokeW);
            gDyn.append('text')
                .attr('x', cellX + BB.w / 2).attr('y', cellY + 12)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', big ? 9 : 8)
                .attr('fill', 'var(--muted)')
                .attr('letter-spacing', '0.06em')
                .text('b' + bitLabel);
            gDyn.append('text')
                .attr('x', cellX + BB.w / 2).attr('y', cellY + BB.h - (big ? 14 : 12))
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', big ? 22 : 16)
                .attr('font-weight', 600)
                .attr('fill', vColor)
                .text(vText);
        }

        function drawDigitalCell(k, val, latchedHighlight, pT) {
            var cellX = DIG_BITS.x0 + k * (DIG_BITS.w + DIG_BITS.gap);
            var cellY = DIG_BITS.y;
            var bitLabel = N - 1 - k;
            var resolved = val !== null;

            var fill, strokeC, strokeW, vText, vColor;
            if (latchedHighlight && resolved) {
                var glow = 0.25 + 0.4 * (1 - pT);
                fill = val
                    ? 'rgba(52,211,153,' + (0.10 + 0.20 * (1 - pT)) + ')'
                    : 'transparent';
                strokeC = val ? 'var(--c-output)' : 'var(--muted)';
                strokeW = 1.6;
                vText = String(val);
                vColor = val ? 'var(--c-output)' : 'var(--muted)';
            } else if (resolved) {
                fill = val ? 'rgba(52,211,153,0.12)' : 'transparent';
                strokeC = val ? 'var(--c-output)' : 'var(--border)';
                strokeW = 1.2;
                vText = String(val);
                vColor = val ? 'var(--c-output)' : 'var(--muted)';
            } else {
                fill = 'transparent';
                strokeC = 'var(--border)';
                strokeW = 1;
                vText = '·';
                vColor = 'var(--muted)';
            }

            gDyn.append('rect')
                .attr('x', cellX).attr('y', cellY)
                .attr('width', DIG_BITS.w).attr('height', DIG_BITS.h)
                .attr('rx', 4)
                .attr('fill', fill)
                .attr('stroke', strokeC).attr('stroke-width', strokeW);
            gDyn.append('text')
                .attr('x', cellX + DIG_BITS.w / 2).attr('y', cellY + 14)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 9.5)
                .attr('fill', 'var(--muted)')
                .attr('letter-spacing', '0.06em')
                .text('b' + bitLabel);
            gDyn.append('text')
                .attr('x', cellX + DIG_BITS.w / 2).attr('y', cellY + DIG_BITS.h - 14)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 22)
                .attr('font-weight', 600)
                .attr('fill', vColor)
                .text(vText);
        }
    }

    function bitsString(bits) {
        var s = '';
        for (var i = 0; i < N; i++) s += (bits[i] === null ? '·' : bits[i]);
        return s;
    }

    // ─── Path helpers ───
    function pathToD(pts) {
        return pts.map(function (p, i) {
            return (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1];
        }).join(' ');
    }
    function polylineLength(pts) {
        var L = 0;
        for (var i = 1; i < pts.length; i++) {
            L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        }
        return L;
    }
    function pointOnPolyline(pts, t) {
        var L = polylineLength(pts);
        var target = t * L;
        var acc = 0;
        for (var i = 1; i < pts.length; i++) {
            var dx = pts[i][0] - pts[i - 1][0];
            var dy = pts[i][1] - pts[i - 1][1];
            var seg = Math.hypot(dx, dy);
            if (acc + seg >= target) {
                var u = seg === 0 ? 0 : (target - acc) / seg;
                return [pts[i - 1][0] + dx * u, pts[i - 1][1] + dy * u];
            }
            acc += seg;
        }
        return pts[pts.length - 1];
    }

    // ─── State machine ───
    function phaseDuration(p) {
        var base;
        switch (p) {
            case 'sample':  base = T_SAMPLE; break;
            case 'trial':   base = T_TRIAL; break;
            case 'compare': base = T_COMPARE; break;
            case 'commit':  base = T_COMMIT; break;
            case 'hold':    base = T_HOLD; break;
            default:        base = 500;
        }
        return base / st.speed;
    }

    function enterPhase(p, now) {
        st.phase = p;
        st.phaseStart = now;

        if (p === 'sample') {
            var waveT = (now - st.waveStart) / 1000;
            st.vin = vinWave(waveT);
            st.k = 0;
            st.bits = new Array(N).fill(null);
            st.committedCode = 0;
            st.trialCode = 0;
            st.vdac = 0;
            st.decision = null;
            st.finalCode = null;
        } else if (p === 'trial') {
            var bitMask = 1 << (N - 1 - st.k);
            st.trialCode = st.committedCode | bitMask;
            st.vdac = st.trialCode / Math.pow(2, N);
        } else if (p === 'compare') {
            st.decision = (st.vin >= st.vdac) ? 1 : 0;
        } else if (p === 'commit') {
            st.bits[st.k] = st.decision;
            if (st.decision === 1) st.committedCode = st.trialCode;
            st.vdac = st.committedCode / Math.pow(2, N);
        } else if (p === 'hold') {
            st.finalCode = st.committedCode;
            st.latchedBits = st.bits.slice();
            st.latchedCode = st.committedCode;
        }
    }

    function tick() {
        var now = nowVirtual();
        // Only advance phases when not paused. This makes the pause toggle
        // and the step-slider scrubber both behave naturally: while paused,
        // the visuals refresh but phases never tick over to the next.
        if (st.pauseStart === null) {
            var elapsed = now - st.phaseStart;
            var dur = phaseDuration(st.phase);
            if (elapsed >= dur) {
                if (st.phase === 'sample') {
                    enterPhase('trial', now);
                } else if (st.phase === 'trial') {
                    enterPhase('compare', now);
                } else if (st.phase === 'compare') {
                    enterPhase('commit', now);
                } else if (st.phase === 'commit') {
                    if (st.k < N - 1) {
                        st.k++;
                        enterPhase('trial', now);
                    } else {
                        enterPhase('hold', now);
                    }
                } else if (st.phase === 'hold') {
                    enterPhase('sample', now);
                }
            }
            // Mirror progress on the step slider while auto-playing.
            if (stepI && stepL) {
                var s = currentStep();
                if (parseInt(stepI.value, 10) !== s) {
                    stepI.value = s;
                    stepL.textContent = s + ' / ' + N;
                }
            }
        }
        rebuildDyn(now);
        rafId = requestAnimationFrame(tick);
    }

    // ─── Step scrub helpers ───
    // Reconstructs the SAR state at "after stepK bits committed" without
    // running the animation; used by the position slider for instant jumps.
    function setStep(stepK) {
        stepK = Math.max(0, Math.min(N, stepK));
        var vin = st.vin;
        var bits = new Array(N).fill(null);
        var committedCode = 0;
        for (var k = 0; k < stepK; k++) {
            var bitMask = 1 << (N - 1 - k);
            var trialCode = committedCode | bitMask;
            var trialV = trialCode / Math.pow(2, N);
            var decision = (vin >= trialV) ? 1 : 0;
            bits[k] = decision;
            if (decision) committedCode = trialCode;
        }

        st.bits = bits;
        st.committedCode = committedCode;
        st.vdac = committedCode / Math.pow(2, N);

        var nv = nowVirtual();
        if (stepK === 0) {
            st.phase = 'sample';
            st.k = 0;
            st.trialCode = 0;
            st.decision = null;
            st.phaseStart = nv;                          // phaseT = 0
        } else if (stepK >= N) {
            st.phase = 'hold';
            st.k = N - 1;
            st.trialCode = committedCode;
            st.decision = bits[N - 1];
            st.finalCode = committedCode;
            st.latchedBits = bits.slice();
            st.latchedCode = committedCode;
            st.phaseStart = nv;                          // hold just latched
        } else {
            st.phase = 'commit';
            st.k = stepK - 1;
            var bMask = 1 << (N - 1 - st.k);
            st.trialCode = committedCode | bMask;
            st.decision = bits[st.k];
            // Anchor so phaseT clamps to 1 (rendered as "fully committed").
            st.phaseStart = nv - phaseDuration('commit');
        }
    }

    function pauseScrub() {
        var pauseBtn = document.getElementById('circuit-pause');
        if (st.pauseStart === null) {
            st.pauseStart = performance.now();
            if (pauseBtn) {
                pauseBtn.textContent = 'resume';
                pauseBtn.classList.add('active');
            }
        }
    }

    var rafId = null;

    function start() {
        if (rafId) cancelAnimationFrame(rafId);
        // Reset virtual clock so the new run starts at virtual t=0
        st.pausedTotal = 0;
        st.pauseStart = null;
        var pauseBtn = document.getElementById('circuit-pause');
        if (pauseBtn) {
            pauseBtn.textContent = 'pause';
            pauseBtn.classList.remove('active');
        }
        var now = nowVirtual();
        st.waveStart = now;
        enterPhase('sample', now);
        rafId = requestAnimationFrame(tick);
    }

    function rebuild() {
        if (rafId) cancelAnimationFrame(rafId);
        setupSvg();
        buildStatic();
        start();
    }

    function init() {
        rebuild();
        window.addEventListener('themechange', rebuild);
        var rt = null;
        window.addEventListener('resize', function () {
            if (rt) clearTimeout(rt);
            rt = setTimeout(rebuild, 120);
        });

        var speedI = document.getElementById('circuit-speed');
        var speedL = document.getElementById('circuit-speed-val');
        if (speedI && speedL) {
            speedI.addEventListener('input', function () {
                // Preserve current phase progress across the speed change so the
                // animation continues smoothly rather than jumping forward / back.
                var now = nowVirtual();
                var oldDur = phaseDuration(st.phase);
                var progress = oldDur > 0 ? Math.min(1, (now - st.phaseStart) / oldDur) : 0;
                st.speed = parseFloat(speedI.value);
                var newDur = phaseDuration(st.phase);
                st.phaseStart = now - progress * newDur;
                speedL.textContent = st.speed.toFixed(2) + '×';
            });
        }

        var pauseBtn = document.getElementById('circuit-pause');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function () {
                if (st.pauseStart !== null) {
                    st.pausedTotal += performance.now() - st.pauseStart;
                    st.pauseStart = null;
                    pauseBtn.textContent = 'pause';
                    pauseBtn.classList.remove('active');
                } else {
                    st.pauseStart = performance.now();
                    pauseBtn.textContent = 'resume';
                    pauseBtn.classList.add('active');
                }
            });
        }

        stepI = document.getElementById('circuit-step');
        stepL = document.getElementById('circuit-step-val');
        if (stepI && stepL) {
            stepI.addEventListener('input', function () {
                pauseScrub();                            // scrubbing implies pause
                var k = parseInt(stepI.value, 10);
                setStep(k);
                stepL.textContent = k + ' / ' + N;
            });
        }

        var resetBtn = document.getElementById('circuit-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                start();                                 // also clears pause
                if (stepI && stepL) {
                    stepI.value = 0;
                    stepL.textContent = '0 / ' + N;
                }
            });
        }
    }

    // Maps the current SAR phase + bit index back to the integer step that
    // the position slider uses. Phase 'sample' is step 0; 'hold' is step N;
    // mid-conversion phases collapse to step (k+1) once the bit commits.
    function currentStep() {
        if (st.phase === 'sample') return 0;
        if (st.phase === 'hold')   return N;
        return Math.min(N, st.k + (st.phase === 'commit' ? 1 : 0));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
