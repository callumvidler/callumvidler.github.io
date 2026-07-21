// Scene 06 · Switch debouncing with a monostable.
// User types into a real textarea (the "input"). Each keypress is mirrored to
// the textarea (one character per press) and lights the corresponding key on
// the QWERTY graphic. The keypress is replaced by a synthesised burst of
// contact-bounce edges. A non-retriggerable monostable of width T_d filters
// the burst, and the surviving edges are written to the "output" textarea.
// A trace of the most recent press is shown above, with accepted edges in
// green and rejected edges in muted grey.
(function () {
    var svgSel = '#plot-db-trace';
    var slDb = document.getElementById('db-time');
    var lbDb = document.getElementById('db-time-val');
    var slBn = document.getElementById('db-bounce');
    var lbBn = document.getElementById('db-bounce-val');
    var slSpeed = document.getElementById('db-speed');
    var lbSpeed = document.getElementById('db-speed-val');
    var grpSpeed = document.getElementById('db-speed-group');
    var btScroll = document.getElementById('db-scroll');
    var btNormal = document.getElementById('db-normal');
    var btClear = document.getElementById('db-clear');

    // Defaults that mimic a real mechanical keyboard switch:
    //   bounce span ≈ 6.5 ms (good-quality switch on a clean contact),
    //   firmware debounce ≈ 10 ms (typical Cherry-MX-class controller).
    var NORMAL_TD     = 10;
    var NORMAL_BOUNCE = 3;
    var inEl = document.getElementById('db-input');
    var outEl = document.getElementById('db-output');
    var board = document.getElementById('db-board');
    var rdCount = document.getElementById('db-count');
    var rdOutN = document.getElementById('db-out-n');
    var rdPhantom = document.getElementById('db-phantom-n');
    var rdRej = document.getElementById('db-rejected');

    // ── scroll-mode constants ────────────────────────────────
    var SCROLL_WINDOW_MS = 1200; // visible window in scroll mode
    var SCROLL_DT_MS     = 0.4;  // integration step (sim ms per micro-step)
    var DWELL_MS         = 90;   // typical key dwell (press → release)

    function winMs() { return Math.max(60, state.debounceMs + 20); }
    function bounceSpan() { return 2 + state.bounce * 1.5; } // ms

    var state = {
        debounceMs: 0,
        bounce: 5,
        inputText: '',
        outputText: '',
        keypresses: 0,
        rejected: 0,

        // ── snapshot mode ────────────────────────────────────
        lastEdges: [],          // [{tMs}] bounce edge times
        lastBounceSpan: 0,
        lastSettleT: 0,         // time at which input settles to CLOSED
        lastVTrace: [],         // [[t, V]] cap voltage samples
        lastSchmittRises: [],   // times at which Schmitt output went LOW→HIGH

        // ── scroll mode ──────────────────────────────────────
        scrollMode: false,
        speed: 1.0,             // sim ms per wall ms
        tNow: 0,                // current absolute simulated time
        events: [],             // [{tStart, ch, label, edges, bounceSpan, dwellMs}]
        scrollV: 0,
        scrollSchmitt: 0,
        scrollSamples: [],      // [[tAbs, V]]
        scrollRisings: [],      // [{tAbs, ch, label}]
        _raf: null,
        _lastTickWall: 0
    };

    // Schmitt thresholds for the comparator that watches the cap voltage.
    var V_TH_HI = 0.55;
    var V_TH_LO = 0.45;

    // ─── helpers ─────────────────────────────────────────────
    function rngBurst(seed, n, span) {
        var out = [0];
        var s = seed | 0;
        for (var i = 1; i < n; i++) {
            s = (s * 9301 + 49297) | 0;
            var u = ((s >>> 0) % 100000) / 100000;
            out.push(u * span);
        }
        out.sort(function (a, b) { return a - b; });
        return out;
    }

    function applyChar(buf, ch) {
        if (ch === '\b') return buf.slice(0, -1);
        return buf + ch;
    }

    // Map a KeyboardEvent to the character produced. Returns null for keys we
    // do not simulate (modifiers, function keys, arrows, etc.).
    function keyChar(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return null;
        if (e.key === 'Enter') return '\n';
        if (e.key === 'Backspace') return '\b';
        if (e.key === 'Tab') return '\t';
        if (e.key === ' ') return ' ';
        if (e.key.length === 1) return e.key;
        return null;
    }

    // Returns the input contact level (0 OPEN, 1 CLOSED) at time t given the
    // sorted bounce edge offsets. Before the first edge: OPEN. After the last
    // edge plus a short settle delay: CLOSED.
    function inputAtTime(t, offsets, settleT) {
        var lvl = 0;
        for (var i = 0; i < offsets.length; i++) {
            if (offsets[i] <= t) lvl = 1 - lvl;
            else break;
        }
        if (t > settleT) lvl = 1;
        return lvl;
    }

    function recordKeyPress(ch) {
        state.keypresses++;
        state.inputText = applyChar(state.inputText, ch);

        var nEdges = 2 + Math.min(8, Math.round(state.bounce * 0.8 + Math.random() * 1.5));
        var span = bounceSpan();
        var seed = (Date.now() ^ Math.floor(Math.random() * 1e6));
        var offsets = rngBurst(seed, nEdges, span);
        state.lastBounceSpan = span;
        var settleT = offsets[offsets.length - 1] + 0.5;
        state.lastSettleT = settleT;

        // ── Physical RC + Schmitt response ──────────────────────
        // Cap voltage V(t) integrates against the bouncing input through
        // dV/dt = (V_in − V) / τ. Discretised over a fine timestep:
        //   V_{k+1} = V_k + (V_in − V_k) · (1 − exp(−Δt / τ))
        // The Schmitt comparator watches V and toggles its digital output on
        // V ≥ V_TH_HI (rising) and V ≤ V_TH_LO (falling). Each LOW→HIGH
        // transition emits one output character.
        var Td = state.debounceMs;
        var tau = Math.max(0.05, Td);       // τ = T_d (RC time constant). Floor so τ > 0 at T_d = 0.
        var W_MS = winMs();
        var dt = Math.min(0.05, W_MS / 800);
        var alpha = 1 - Math.exp(-dt / tau);

        var V = 0;
        var schmitt = 0;
        var risingTimes = [];
        var trace = [[0, 0]];

        for (var t = dt; t <= W_MS + 1e-9; t += dt) {
            var inLvl = inputAtTime(t, offsets, settleT);
            V += (inLvl - V) * alpha;
            if (schmitt === 0 && V >= V_TH_HI) {
                schmitt = 1;
                risingTimes.push(t);
            } else if (schmitt === 1 && V <= V_TH_LO) {
                schmitt = 0;
            }
            trace.push([t, V]);
        }

        // Each rising threshold crossing produces one character on the line.
        for (var r = 0; r < risingTimes.length; r++) {
            state.outputText = applyChar(state.outputText, ch);
        }

        // "Rejected" bounces: rising input edges that did not result in an
        // additional output character beyond the first one.
        var risingInEdges = 0;
        var prevLvl = 0;
        for (var i = 0; i < offsets.length; i++) {
            var newLvl = 1 - prevLvl;
            if (newLvl === 1) risingInEdges++;
            prevLvl = newLvl;
        }
        // Plus the final settle to CLOSED if the bouncing ended LOW.
        if (prevLvl === 0) risingInEdges++;
        state.rejected += Math.max(0, risingInEdges - risingTimes.length);

        // Save for drawing.
        state.lastEdges = offsets.map(function (tt) { return { tMs: tt }; });
        state.lastVTrace = trace;
        state.lastSchmittRises = risingTimes;

        renderText();
        renderCounts();
        drawTrace();
    }

    // ════════════════════════════════════════════════════════
    //  KEYBOARD VISUAL  ·  realistic ANSI-ish QWERTY layout
    //  Each entry: { id, label, w, cls }
    //    id   — used to look up the key from the KeyboardEvent
    //    label— glyph drawn on the keycap
    //    w    — width in "u" units (1u ≈ 38 px)
    //    cls  — extra css class (k-letter, k-mod, k-space, k-mod-left)
    // ════════════════════════════════════════════════════════
    var ROWS = [
        // row 0 — number row
        [
            { id: '`',  label: '`',  w: 1 }, { id: '1', label: '1', w: 1 },
            { id: '2',  label: '2',  w: 1 }, { id: '3', label: '3', w: 1 },
            { id: '4',  label: '4',  w: 1 }, { id: '5', label: '5', w: 1 },
            { id: '6',  label: '6',  w: 1 }, { id: '7', label: '7', w: 1 },
            { id: '8',  label: '8',  w: 1 }, { id: '9', label: '9', w: 1 },
            { id: '0',  label: '0',  w: 1 }, { id: '-', label: '−', w: 1 },
            { id: '=',  label: '=',  w: 1 },
            { id: 'Backspace', label: '⌫', w: 2, cls: 'k-mod' }
        ],
        // row 1 — qwerty
        [
            { id: 'Tab', label: '⇥ tab', w: 1.5, cls: 'k-mod k-mod-left' },
            { id: 'q', label: 'Q', w: 1, cls: 'k-letter' },
            { id: 'w', label: 'W', w: 1, cls: 'k-letter' },
            { id: 'e', label: 'E', w: 1, cls: 'k-letter' },
            { id: 'r', label: 'R', w: 1, cls: 'k-letter' },
            { id: 't', label: 'T', w: 1, cls: 'k-letter' },
            { id: 'y', label: 'Y', w: 1, cls: 'k-letter' },
            { id: 'u', label: 'U', w: 1, cls: 'k-letter' },
            { id: 'i', label: 'I', w: 1, cls: 'k-letter' },
            { id: 'o', label: 'O', w: 1, cls: 'k-letter' },
            { id: 'p', label: 'P', w: 1, cls: 'k-letter' },
            { id: '[', label: '[', w: 1 }, { id: ']', label: ']', w: 1 },
            { id: '\\', label: '\\', w: 1.5 }
        ],
        // row 2 — asdfg
        [
            { id: 'CapsLock', label: '⇪ caps', w: 1.75, cls: 'k-mod k-mod-left' },
            { id: 'a', label: 'A', w: 1, cls: 'k-letter' },
            { id: 's', label: 'S', w: 1, cls: 'k-letter' },
            { id: 'd', label: 'D', w: 1, cls: 'k-letter' },
            { id: 'f', label: 'F', w: 1, cls: 'k-letter' },
            { id: 'g', label: 'G', w: 1, cls: 'k-letter' },
            { id: 'h', label: 'H', w: 1, cls: 'k-letter' },
            { id: 'j', label: 'J', w: 1, cls: 'k-letter' },
            { id: 'k', label: 'K', w: 1, cls: 'k-letter' },
            { id: 'l', label: 'L', w: 1, cls: 'k-letter' },
            { id: ';', label: ';', w: 1 },
            { id: "'", label: "'", w: 1 },
            { id: 'Enter', label: '⏎ enter', w: 2.25, cls: 'k-mod' }
        ],
        // row 3 — zxcv
        [
            { id: 'ShiftLeft', label: '⇧ shift', w: 2.25, cls: 'k-mod k-mod-left' },
            { id: 'z', label: 'Z', w: 1, cls: 'k-letter' },
            { id: 'x', label: 'X', w: 1, cls: 'k-letter' },
            { id: 'c', label: 'C', w: 1, cls: 'k-letter' },
            { id: 'v', label: 'V', w: 1, cls: 'k-letter' },
            { id: 'b', label: 'B', w: 1, cls: 'k-letter' },
            { id: 'n', label: 'N', w: 1, cls: 'k-letter' },
            { id: 'm', label: 'M', w: 1, cls: 'k-letter' },
            { id: ',', label: ',', w: 1 }, { id: '.', label: '.', w: 1 },
            { id: '/', label: '/', w: 1 },
            { id: 'ShiftRight', label: '⇧ shift', w: 2.75, cls: 'k-mod' }
        ],
        // row 4 — modifiers + space
        [
            { id: 'ControlLeft', label: 'ctrl', w: 1.25, cls: 'k-mod k-mod-left' },
            { id: 'AltLeft',     label: 'opt',  w: 1.25, cls: 'k-mod k-mod-left' },
            { id: 'MetaLeft',    label: '⌘',    w: 1.25, cls: 'k-mod k-mod-left' },
            { id: ' ',           label: 'space',w: 7.5,  cls: 'k-space' },
            { id: 'MetaRight',   label: '⌘',    w: 1.25, cls: 'k-mod' },
            { id: 'AltRight',    label: 'opt',  w: 1.25, cls: 'k-mod' },
            { id: 'ControlRight',label: 'ctrl', w: 1.25, cls: 'k-mod' }
        ]
    ];

    var keyEls = {}; // id (lowercased) → entry
    function regKey(id, entry) { keyEls[String(id).toLowerCase()] = entry; }

    var SVG_NS = 'http://www.w3.org/2000/svg';
    function svgEl(tag, attrs) {
        var n = document.createElementNS(SVG_NS, tag);
        if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
        return n;
    }

    // Layout constants (viewBox units, scaled responsively by SVG width: 100%).
    var KB = { U: 38, GAP: 5, ROW_H: 40, PAD: 14, RX: 5 };

    // Theme palette read from CSS variables. Refreshed when the theme toggles.
    var palette = readPalette();
    function cssVar(name, fallback) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name);
        v = (v || '').trim();
        return v || fallback;
    }
    function readPalette() {
        return {
            cap:        cssVar('--bg-panel',     'rgba(22,23,32,0.75)'),
            capStroke:  cssVar('--border-hover', 'rgba(255,255,255,0.18)'),
            label:      cssVar('--text-dim',     '#d4d7e0'),
            labelMod:   cssVar('--muted',        '#8b90a3'),
            labelHi:    cssVar('--accent',       '#7ad9f3'),
            capHi:      cssVar('--accent-soft',  'rgba(122,217,243,0.15)'),
            capHiEdge:  cssVar('--accent',       '#7ad9f3'),
            output:     cssVar('--c-output',     '#ffcf5c'),
            shadow:     'rgba(0,0,0,0.18)'
        };
    }

    function buildKeyboard() {
        board.innerHTML = '';
        keyEls = {};
        palette = readPalette();

        // Compute the widest row so narrower rows can be centred under it.
        var maxRowW = 0;
        ROWS.forEach(function (row) {
            var w = (row.length - 1) * KB.GAP;
            row.forEach(function (k) { w += k.w * KB.U; });
            if (w > maxRowW) maxRowW = w;
        });
        var W = maxRowW + 2 * KB.PAD;
        var H = ROWS.length * KB.ROW_H + (ROWS.length - 1) * KB.GAP + 2 * KB.PAD;

        var svg = svgEl('svg', {
            class: 'kbd-svg',
            viewBox: '0 0 ' + W + ' ' + H,
            width: '100%',
            preserveAspectRatio: 'xMidYMid meet'
        });
        svg.style.display = 'block';
        svg.style.aspectRatio = W + ' / ' + H;
        // Some browsers need a height hint; a px-less attr lets CSS scale it.
        svg.setAttribute('height', '100%');

        ROWS.forEach(function (row, ri) {
            var rowW = (row.length - 1) * KB.GAP;
            row.forEach(function (k) { rowW += k.w * KB.U; });
            var x = KB.PAD + (maxRowW - rowW) / 2;
            var y = KB.PAD + ri * (KB.ROW_H + KB.GAP);
            row.forEach(function (spec) {
                var kw = spec.w * KB.U;
                var isMod   = spec.cls && spec.cls.indexOf('k-mod')   !== -1;
                var isSpace = spec.cls && spec.cls.indexOf('k-space') !== -1;
                var isLeft  = spec.cls && spec.cls.indexOf('k-mod-left') !== -1;
                var isLetter= spec.cls && spec.cls.indexOf('k-letter') !== -1;

                var g = svgEl('g', {
                    transform: 'translate(' + x + ',' + y + ')'
                });

                // Soft drop shadow under the cap.
                g.appendChild(svgEl('rect', {
                    x: 0, y: 2, width: kw, height: KB.ROW_H,
                    rx: KB.RX, ry: KB.RX,
                    fill: palette.shadow
                }));

                // The cap itself. fill / stroke set as presentation attributes
                // so the SVG renders correctly without relying on CSS.
                var cap = svgEl('rect', {
                    x: 0, y: 0, width: kw, height: KB.ROW_H,
                    rx: KB.RX, ry: KB.RX,
                    fill: palette.cap,
                    stroke: palette.capStroke,
                    'stroke-width': 1
                });
                g.appendChild(cap);

                // Debounce drain overlay — its y / height are animated.
                var fill = svgEl('rect', {
                    x: 0, y: KB.ROW_H, width: kw, height: 0,
                    rx: KB.RX, ry: KB.RX,
                    fill: palette.output, opacity: 0
                });
                g.appendChild(fill);

                // Label placement matches a real keycap.
                var fontSize, anchor, lx, ly, labelFill;
                if (isSpace) {
                    fontSize = 10; anchor = 'middle';
                    lx = kw / 2; ly = KB.ROW_H / 2 + 3.5;
                    labelFill = palette.labelMod;
                } else if (isMod) {
                    fontSize = 9.5;
                    anchor = isLeft ? 'start' : 'end';
                    lx = isLeft ? 7 : (kw - 7);
                    ly = KB.ROW_H - 7;
                    labelFill = palette.labelMod;
                } else if (isLetter) {
                    fontSize = 14; anchor = 'start';
                    lx = 7; ly = KB.ROW_H - 7;
                    labelFill = palette.label;
                } else {
                    fontSize = 12; anchor = 'start';
                    lx = 7; ly = KB.ROW_H - 7;
                    labelFill = palette.label;
                }
                var lbl = svgEl('text', {
                    x: lx, y: ly,
                    'text-anchor': anchor,
                    'font-family': 'JetBrains Mono, ui-monospace, monospace',
                    'font-size': fontSize,
                    fill: labelFill
                });
                lbl.textContent = spec.label;
                g.appendChild(lbl);

                svg.appendChild(g);
                regKey(spec.id, {
                    g: g, cap: cap, fill: fill, label: lbl,
                    kw: kw, baseFill: palette.cap, baseStroke: palette.capStroke,
                    baseLabel: labelFill
                });
                x += kw + KB.GAP;
            });
        });

        board.appendChild(svg);

        // Aliases so we can find a key from various e.key values
        if (keyEls['shiftleft'])   { regKey('Shift',   keyEls['shiftleft']); }
        if (keyEls['controlleft']) { regKey('Control', keyEls['controlleft']); }
        if (keyEls['altleft'])     { regKey('Alt',     keyEls['altleft']); }
        if (keyEls['metaleft'])    { regKey('Meta',    keyEls['metaleft']); }
    }

    function lookupKey(eOrCh) {
        // eOrCh may be a KeyboardEvent or a single char ('\b','\n','\t',' ')
        var id;
        if (typeof eOrCh === 'string') {
            if (eOrCh === '\b') id = 'Backspace';
            else if (eOrCh === '\n') id = 'Enter';
            else if (eOrCh === '\t') id = 'Tab';
            else id = eOrCh;
        } else {
            id = eOrCh.key;
        }
        var k = String(id).toLowerCase();
        if (keyEls[k]) return keyEls[k];
        // Try shifted-symbol fallback (e.g. '?' → '/')
        var unshift = {
            '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6',
            '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=',
            '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'",
            '<': ',', '>': '.', '?': '/', '~': '`'
        };
        if (unshift[id] && keyEls[unshift[id]]) return keyEls[unshift[id]];
        return null;
    }

    function setPressed(entry, on) {
        if (on) {
            entry.cap.setAttribute('fill',   palette.capHi);
            entry.cap.setAttribute('stroke', palette.capHiEdge);
            entry.cap.setAttribute('stroke-width', 1.5);
            entry.label.setAttribute('fill',  palette.labelHi);
            entry.label.setAttribute('font-weight', '600');
        } else {
            entry.cap.setAttribute('fill',   entry.baseFill);
            entry.cap.setAttribute('stroke', entry.baseStroke);
            entry.cap.setAttribute('stroke-width', 1);
            entry.label.setAttribute('fill', entry.baseLabel);
            entry.label.removeAttribute('font-weight');
        }
    }

    function setLocked(entry, on) {
        if (on) {
            entry.cap.setAttribute('stroke', palette.output);
            entry.cap.setAttribute('stroke-width', 1.5);
        } else if (!entry._pressed) {
            entry.cap.setAttribute('stroke', entry.baseStroke);
            entry.cap.setAttribute('stroke-width', 1);
        }
    }

    function animateDrain(entry, Td) {
        if (entry._raf) cancelAnimationFrame(entry._raf);
        var fill = entry.fill;
        if (Td <= 0) {
            fill.setAttribute('opacity', 0);
            fill.setAttribute('y', KB.ROW_H);
            fill.setAttribute('height', 0);
            return;
        }
        fill.setAttribute('opacity', 0.45);
        fill.setAttribute('y', 0);
        fill.setAttribute('height', KB.ROW_H);
        var t0 = performance.now();
        function step(now) {
            var p = (now - t0) / Td;
            if (p >= 1) {
                fill.setAttribute('y', KB.ROW_H);
                fill.setAttribute('height', 0);
                fill.setAttribute('opacity', 0);
                entry._raf = 0;
                return;
            }
            var h = KB.ROW_H * (1 - p);
            fill.setAttribute('y', KB.ROW_H - h);
            fill.setAttribute('height', h);
            entry._raf = requestAnimationFrame(step);
        }
        entry._raf = requestAnimationFrame(step);
    }

    function flashKey(eOrCh) {
        var entry = lookupKey(eOrCh);
        if (!entry) return;

        if (entry._pressTo) clearTimeout(entry._pressTo);
        entry._pressed = true;
        setPressed(entry, true);
        var pressMs = Math.max(80, bounceSpan() * 8);
        entry._pressTo = setTimeout(function () {
            entry._pressed = false;
            setPressed(entry, false);
            // If still locked, restore the locked stroke colour.
            if (entry._locked) setLocked(entry, true);
        }, pressMs);

        var Td = state.debounceMs;
        if (entry._lockTo) clearTimeout(entry._lockTo);
        animateDrain(entry, Td);
        if (Td <= 0) {
            entry._locked = false;
            setLocked(entry, false);
            return;
        }
        entry._locked = true;
        setLocked(entry, true);
        entry._lockTo = setTimeout(function () {
            entry._locked = false;
            if (!entry._pressed) setLocked(entry, false);
        }, Td + 20);
    }

    // ════════════════════════════════════════════════════════
    //  TRACE — input bounce + monostable output for the most recent press
    //  Two stacked tracks share the same x-axis (time since first contact):
    //    top track   = bouncing contact line (input)
    //    bottom track = monostable output, a clean pulse of width T_d on each
    //                   accepted edge. With T_d = 0 the output reduces to
    //                   instantaneous spikes (drawn as thin ticks).
    // ════════════════════════════════════════════════════════
    var svg = d3.select(svgSel).classed('ov', true);
    var W = 600, H = 320;
    var margin = { top: 30, right: 28, bottom: 40, left: 62 };
    var iw, ih, x, yIn, yOut, bandH, bandSep, outBaseY;

    var gRoot = svg.append('g');
    var gGrid = gRoot.append('g').attr('class', 'grid');
    var gBand = gRoot.append('g');     // shaded debounce window (full height)
    var gWaveIn  = gRoot.append('g');  // bouncing input line
    var gMarks   = gRoot.append('g');  // edge markers above input
    var gWaveOut = gRoot.append('g');  // monostable output line
    var gAxis = gRoot.append('g').attr('class', 'axis');
    var gTitles = gRoot.append('g');

    function layout() {
        var rect = svg.node().getBoundingClientRect();
        W = Math.max(360, rect.width);
        H = Math.max(240, rect.height);
        svg.attr('viewBox', '0 0 ' + W + ' ' + H);
        iw = W - margin.left - margin.right;
        ih = H - margin.top - margin.bottom;
        gRoot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        // x scale depends on mode:
        //   snapshot — domain [0, winMs()]: time since first contact
        //   scroll   — domain [-windowMs, 0]: time relative to "now"
        if (state.scrollMode) {
            x = d3.scaleLinear().domain([-SCROLL_WINDOW_MS, 0]).range([0, iw]);
        } else {
            x = d3.scaleLinear().domain([0, winMs()]).range([0, iw]);
        }

        // Two equal-height bands separated by a small gap.
        bandSep = Math.max(18, ih * 0.10);
        bandH = (ih - bandSep) / 2;
        yIn  = d3.scaleLinear().domain([-0.2, 1.6]).range([bandH, 0]);
        outBaseY = bandH + bandSep;
        yOut = d3.scaleLinear().domain([-0.2, 1.3]).range([ih, outBaseY]);
    }

    function xTicks() {
        if (state.scrollMode) {
            var step = SCROLL_WINDOW_MS / 6;
            var arr = [];
            for (var t = -SCROLL_WINDOW_MS; t <= 0 + 0.5; t += step) arr.push(t);
            return arr;
        }
        var w = winMs();
        var candidates = [5, 10, 20, 25, 50, 100];
        var s = candidates[0];
        for (var i = 0; i < candidates.length; i++) {
            if (w / candidates[i] <= 8) { s = candidates[i]; break; }
        }
        var out = [];
        for (var u = 0; u <= w + 0.5; u += s) out.push(u);
        return out;
    }

    function drawStatic() {
        gGrid.selectAll('*').remove();
        gAxis.selectAll('*').remove();
        gTitles.selectAll('*').remove();

        // Horizontal grid lines at 0/1 for both bands.
        [{ s: yIn,  major: true  },
         { s: yOut, major: true  }].forEach(function (band) {
            [0, 1].forEach(function (v) {
                gGrid.append('line')
                    .attr('class', (v === 0 && band.major) ? 'major' : '')
                    .attr('x1', 0).attr('x2', iw)
                    .attr('y1', band.s(v)).attr('y2', band.s(v));
            });
        });

        // X grid lines spanning both bands.
        var ticks = xTicks();
        ticks.forEach(function (v) {
            gGrid.append('line')
                .attr('x1', x(v)).attr('x2', x(v))
                .attr('y1', 0).attr('y2', ih);
        });

        // Y axes — one per band, OPEN/CLOSED for input, LOW/HIGH for output.
        var yAxisIn = d3.axisLeft(yIn).tickValues([0, 1])
            .tickFormat(function (d) { return d === 0 ? 'OPEN' : 'CLOSED'; })
            .tickSize(0).tickPadding(8);
        gAxis.append('g').call(yAxisIn).select('.domain').remove();

        var yAxisOut = d3.axisLeft(yOut).tickValues([0, 1])
            .tickFormat(function (d) { return d === 0 ? 'LOW' : 'HIGH'; })
            .tickSize(0).tickPadding(8);
        gAxis.append('g').call(yAxisOut).select('.domain').remove();

        var xAxis = d3.axisBottom(x).tickValues(ticks)
            .tickFormat(function (d) {
                if (!state.scrollMode) return d + ' ms';
                if (d === 0) return 'now';
                return d + ' ms';
            })
            .tickSize(0).tickPadding(8);
        gAxis.append('g').attr('transform', 'translate(0,' + ih + ')')
            .call(xAxis).select('.domain').remove();

        // Axis titles.
        gTitles.append('text').attr('class', 'axis-title')
            .attr('x', iw / 2).attr('y', ih + 32)
            .attr('text-anchor', 'middle')
            .text(state.scrollMode
                ? 'time, ms · scrolling left'
                : 'time since first contact, ms');

        // Per-band labels at the top-left of each band.
        gTitles.append('text')
            .attr('x', 0).attr('y', -10)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10)
            .attr('letter-spacing', '0.10em')
            .style('fill', 'var(--c-input)')
            .style('text-transform', 'uppercase')
            .text('input · contact');

        gTitles.append('text')
            .attr('x', 0).attr('y', outBaseY - 8)
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 10)
            .attr('letter-spacing', '0.10em')
            .style('fill', 'var(--c-output)')
            .style('text-transform', 'uppercase')
            .text('output · V_C');
    }

    function drawTrace() {
        if (state.scrollMode) drawScroll();
        else drawSnapshot();
    }

    function drawSnapshot() {
        gBand.selectAll('*').remove();
        gWaveIn.selectAll('*').remove();
        gWaveOut.selectAll('*').remove();
        gMarks.selectAll('*').remove();

        // Shaded debounce window (full height across both bands).
        if (state.debounceMs > 0) {
            var bandX = Math.max(0, x(Math.min(state.debounceMs, winMs())) - x(0));
            gBand.append('rect')
                .attr('x', x(0)).attr('y', 0)
                .attr('width', bandX).attr('height', ih)
                .style('fill', 'var(--c-output)').attr('opacity', 0.08);
            gBand.append('line')
                .attr('x1', x(Math.min(state.debounceMs, winMs())))
                .attr('x2', x(Math.min(state.debounceMs, winMs())))
                .attr('y1', 0).attr('y2', ih)
                .style('stroke', 'var(--c-output)')
                .attr('stroke-width', 1.2).attr('stroke-dasharray', '4 4');
            if (state.debounceMs <= winMs()) {
                gBand.append('text')
                    .attr('x', Math.min(iw - 4, x(state.debounceMs) + 6))
                    .attr('y', 12)
                    .attr('font-family', "'JetBrains Mono', monospace")
                    .attr('font-size', 10).style('fill', 'var(--c-output)')
                    .text('T_d = ' + state.debounceMs.toFixed(1) + ' ms');
            }
        }

        // Empty state — show a hint in the centre.
        if (state.lastEdges.length === 0) {
            gWaveIn.append('text')
                .attr('x', iw / 2).attr('y', ih / 2)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 12).style('fill', 'var(--muted)')
                .attr('opacity', 0.7)
                .text('press a key to see input + output traces');
            return;
        }

        // ── INPUT trace — alternating contact level toggled by each edge.
        var pts = [[0, 0]];
        var lvl = 0;
        for (var i = 0; i < state.lastEdges.length; i++) {
            var t = state.lastEdges[i].tMs;
            pts.push([t, lvl]);
            lvl = 1 - lvl;
            pts.push([t, lvl]);
        }
        var settleT = state.lastEdges[state.lastEdges.length - 1].tMs + 0.5;
        pts.push([settleT, lvl]);
        if (lvl === 0) { pts.push([settleT, 1]); lvl = 1; }
        pts.push([winMs(), lvl]);

        var lineIn = d3.line()
            .x(function (p) { return x(Math.min(winMs(), Math.max(0, p[0]))); })
            .y(function (p) { return yIn(p[1]); });
        gWaveIn.append('path').datum(pts)
            .attr('class', 'trace input')
            .attr('stroke-width', 1.6)
            .attr('d', lineIn);

        // Edge markers above the input baseline — neutral grey ticks for
        // every bounce edge. In the RC model the cap response depends on the
        // whole stream so we no longer label individual edges accepted /
        // rejected.
        var W_MS = winMs();
        for (var j = 0; j < state.lastEdges.length; j++) {
            var ed = state.lastEdges[j];
            var xp = x(Math.min(W_MS, ed.tMs));
            gMarks.append('line')
                .attr('x1', xp).attr('x2', xp)
                .attr('y1', yIn(1.06)).attr('y2', yIn(1.26))
                .style('stroke', 'var(--muted)')
                .attr('stroke-width', 1.2).attr('opacity', 0.65);
        }

        // ── OUTPUT trace — physical RC + Schmitt response.
        // V(t) tracks the bouncing input through a first-order low-pass with
        // τ = T_d, drawn as a smooth curve. The Schmitt thresholds and every
        // LOW→HIGH crossing (each emits one character) are overlaid.
        var trace = state.lastVTrace;
        var Td = state.debounceMs;

        if (trace && trace.length > 0) {
            var lineOut = d3.line()
                .x(function (p) { return x(Math.min(W_MS, Math.max(0, p[0]))); })
                .y(function (p) { return yOut(p[1]); })
                .curve(d3.curveLinear);

            // Faint hysteresis band between V_TH_LO and V_TH_HI.
            gWaveOut.append('rect')
                .attr('x', 0).attr('y', yOut(V_TH_HI))
                .attr('width', iw)
                .attr('height', Math.max(0, yOut(V_TH_LO) - yOut(V_TH_HI)))
                .attr('fill', 'var(--c-thresh)')
                .attr('opacity', 0.08);

            // Schmitt thresholds.
            [V_TH_HI, V_TH_LO].forEach(function (v) {
                gWaveOut.append('line')
                    .attr('x1', 0).attr('x2', iw)
                    .attr('y1', yOut(v)).attr('y2', yOut(v))
                    .attr('stroke', 'var(--c-thresh)')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '4 3')
                    .attr('opacity', 0.55);
            });
            gWaveOut.append('text')
                .attr('x', iw - 4).attr('y', yOut(V_TH_HI) - 4)
                .attr('text-anchor', 'end')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 9)
                .style('fill', 'var(--c-thresh)')
                .attr('opacity', 0.85)
                .text('Schmitt V_TH = ' + V_TH_LO.toFixed(2) + ' / ' + V_TH_HI.toFixed(2));

            // The cap voltage curve itself.
            gWaveOut.append('path').datum(trace)
                .attr('fill', 'none')
                .attr('stroke', 'var(--c-output)')
                .attr('stroke-width', 1.8)
                .attr('stroke-linecap', 'round')
                .attr('stroke-linejoin', 'round')
                .attr('d', lineOut);

            // Vertical dashed marker at one time constant τ past the first
            // settled charge so the slope can be read off.
            if (Td > 0) {
                var tau = Td;
                var tTau = state.lastSettleT + tau;
                if (tTau < W_MS) {
                    var xTau = x(tTau);
                    gWaveOut.append('line')
                        .attr('x1', xTau).attr('x2', xTau)
                        .attr('y1', yOut(0)).attr('y2', yOut(1.05))
                        .attr('stroke', 'var(--c-output)')
                        .attr('stroke-width', 1)
                        .attr('stroke-dasharray', '2 3')
                        .attr('opacity', 0.5);
                    gWaveOut.append('text')
                        .attr('x', xTau + 4).attr('y', yOut(1.05) + 4)
                        .attr('font-family', "'JetBrains Mono', monospace")
                        .attr('font-size', 9)
                        .style('fill', 'var(--c-output)')
                        .attr('opacity', 0.75)
                        .text('τ = T_d');
                }
            }

            // Mark every LOW→HIGH Schmitt transition. Each one is a character
            // emitted on the line. Green = the expected single press; red =
            // a phantom (the second crossing onward).
            for (var i = 0; i < state.lastSchmittRises.length; i++) {
                var rt = state.lastSchmittRises[i];
                var rx = x(Math.min(W_MS, rt));
                var col = (i === 0) ? 'var(--c-output2)' : 'var(--c-thresh)';
                gWaveOut.append('line')
                    .attr('x1', rx).attr('x2', rx)
                    .attr('y1', yOut(V_TH_HI)).attr('y2', yOut(1.18))
                    .attr('stroke', col)
                    .attr('stroke-width', 1.4)
                    .attr('opacity', 0.9);
                gWaveOut.append('circle')
                    .attr('cx', rx).attr('cy', yOut(1.18))
                    .attr('r', 3.2)
                    .attr('fill', col);
            }
        }

        // Legend strip in top right.
        var legX = iw - 240, legY = -16;
        var lg = gMarks.append('g').attr('transform', 'translate(' + legX + ',' + legY + ')');
        lg.append('line').attr('x1', -2).attr('x2', 10).attr('y1', 0).attr('y2', 0)
            .style('stroke', 'var(--muted)').attr('stroke-width', 1.4);
        lg.append('text').attr('x', 14).attr('y', 3)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .style('fill', 'var(--text-dim)').text('bounce edge');
        lg.append('circle').attr('cx', 96).attr('cy', 0).attr('r', 3.2)
            .attr('fill', 'var(--c-output2)');
        lg.append('text').attr('x', 104).attr('y', 3)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .style('fill', 'var(--text-dim)').text('press');
        lg.append('circle').attr('cx', 152).attr('cy', 0).attr('r', 3.2)
            .attr('fill', 'var(--c-thresh)');
        lg.append('text').attr('x', 160).attr('y', 3)
            .attr('font-family', "'JetBrains Mono', monospace").attr('font-size', 10)
            .style('fill', 'var(--text-dim)').text('phantom');
    }

    // ════════════════════════════════════════════════════════
    //  SCROLL MODE  ·  rolling timeline
    //  Time runs from t = 0 at the moment scroll mode is entered. Every
    //  press is recorded into state.events with absolute timestamps. A rAF
    //  loop integrates V(t) from the previously sampled time up to the new
    //  state.tNow at every frame, and trims data outside the visible window.
    // ════════════════════════════════════════════════════════
    function inputAtAbs(t) {
        // Most recent event whose tStart ≤ t wins; before that, OPEN.
        var ev = null;
        for (var i = state.events.length - 1; i >= 0; i--) {
            if (state.events[i].tStart <= t) { ev = state.events[i]; break; }
        }
        if (!ev) return 0;
        var dt = t - ev.tStart;
        if (dt >= ev.dwellMs) return 0;
        if (dt >= ev.bounceSpan) return 1;
        var lvl = 0;
        for (var j = 0; j < ev.edges.length; j++) {
            if (ev.edges[j] <= t) lvl = 1 - lvl;
            else break;
        }
        return lvl;
    }

    function currentEventAt(t) {
        for (var i = state.events.length - 1; i >= 0; i--) {
            var ev = state.events[i];
            if (t >= ev.tStart && t < ev.tStart + ev.dwellMs) return ev;
            if (ev.tStart < t) break;
        }
        return null;
    }

    function keyDisplayLabel(ch) {
        if (ch === '\b') return '⌫';
        if (ch === '\n') return '↵';
        if (ch === '\t') return '⇥';
        if (ch === ' ')  return '␣';
        return ch.toUpperCase();
    }

    function recordKeyPressScroll(ch) {
        state.keypresses++;
        state.inputText = applyChar(state.inputText, ch);

        var nEdges = 2 + Math.min(8, Math.round(state.bounce * 0.8 + Math.random() * 1.5));
        var span = bounceSpan();
        var seed = (Date.now() ^ Math.floor(Math.random() * 1e6));
        var offsets = rngBurst(seed, nEdges, span);

        var tStart = state.tNow;
        var absEdges = offsets.map(function (o) { return tStart + o; });

        state.events.push({
            tStart:     tStart,
            ch:         ch,
            label:      keyDisplayLabel(ch),
            edges:      absEdges,
            bounceSpan: span,
            dwellMs:    DWELL_MS
        });

        renderText();
        renderCounts();
    }

    function tickScroll(nowWall) {
        if (!state.scrollMode) return;
        var dtWall = nowWall - state._lastTickWall;
        state._lastTickWall = nowWall;
        // Cap dtWall so a tab-switch doesn't fast-forward through eternity.
        if (dtWall > 100) dtWall = 100;

        var dtSim = dtWall * state.speed;
        if (dtSim <= 0) {
            state._raf = requestAnimationFrame(tickScroll);
            drawScroll();
            return;
        }

        var Td = state.debounceMs;
        var tau = Math.max(0.05, Td);

        var t = state.tNow;
        var tEnd = t + dtSim;

        while (t < tEnd) {
            var step = Math.min(SCROLL_DT_MS, tEnd - t);
            var alpha = 1 - Math.exp(-step / tau);
            var inLvl = inputAtAbs(t);
            state.scrollV += (inLvl - state.scrollV) * alpha;

            if (state.scrollSchmitt === 0 && state.scrollV >= V_TH_HI) {
                state.scrollSchmitt = 1;
                var ev = currentEventAt(t);
                if (ev) {
                    state.outputText = applyChar(state.outputText, ev.ch);
                    state.scrollRisings.push({ tAbs: t, ch: ev.ch, label: ev.label });
                }
            } else if (state.scrollSchmitt === 1 && state.scrollV <= V_TH_LO) {
                state.scrollSchmitt = 0;
            }
            t += step;
            state.scrollSamples.push([t, state.scrollV]);
        }
        state.tNow = t;

        // Trim everything outside the visible window (keep a small margin).
        var tLeft = state.tNow - SCROLL_WINDOW_MS - 50;
        while (state.scrollSamples.length > 0 && state.scrollSamples[0][0] < tLeft) {
            state.scrollSamples.shift();
        }
        while (state.events.length > 0 &&
               state.events[0].tStart + state.events[0].dwellMs < tLeft) {
            state.events.shift();
        }
        while (state.scrollRisings.length > 0 && state.scrollRisings[0].tAbs < tLeft) {
            state.scrollRisings.shift();
        }
        // Update phantom count derived from output length vs presses.
        renderText();
        renderCounts();
        drawScroll();
        state._raf = requestAnimationFrame(tickScroll);
    }

    function startScroll() {
        // Reset everything so the timeline starts fresh at t = 0.
        if (state._raf) cancelAnimationFrame(state._raf);
        state.tNow = 0;
        state.events = [];
        state.scrollV = 0;
        state.scrollSchmitt = 0;
        state.scrollSamples = [[0, 0]];
        state.scrollRisings = [];
        state.outputText = '';
        state.inputText = '';
        state.keypresses = 0;
        state.rejected = 0;
        state._lastTickWall = performance.now();
        renderText(); renderCounts();
        // layout() rebuilds the x scale for the scroll-mode domain
        // [-SCROLL_WINDOW_MS, 0]. Without this, x stays in snapshot mode and
        // "now" maps to the left edge instead of the right.
        layout(); drawStatic(); drawScroll();
        state._raf = requestAnimationFrame(tickScroll);
    }

    function stopScroll() {
        if (state._raf) cancelAnimationFrame(state._raf);
        state._raf = null;
    }

    function drawScroll() {
        gBand.selectAll('*').remove();
        gWaveIn.selectAll('*').remove();
        gWaveOut.selectAll('*').remove();
        gMarks.selectAll('*').remove();

        var tNow = state.tNow;
        var tLeft = tNow - SCROLL_WINDOW_MS;
        // Map absolute sim time → x pixel.
        function xT(t) { return x(Math.max(-SCROLL_WINDOW_MS, Math.min(0, t - tNow))); }

        // ── INPUT trace — reconstruct piecewise from events that touch the
        // visible window. We sample at every transition (bounce edges, settle,
        // release) plus the window edges so the step waveform is exact.
        var checkpoints = [tLeft, tNow];
        state.events.forEach(function (ev) {
            ev.edges.forEach(function (e) {
                if (e >= tLeft && e <= tNow) {
                    checkpoints.push(e - 0.0001, e + 0.0001);
                }
            });
            var settle = ev.tStart + ev.bounceSpan;
            if (settle >= tLeft && settle <= tNow) {
                checkpoints.push(settle - 0.0001, settle + 0.0001);
            }
            var release = ev.tStart + ev.dwellMs;
            if (release >= tLeft && release <= tNow) {
                checkpoints.push(release - 0.0001, release + 0.0001);
            }
        });
        checkpoints.sort(function (a, b) { return a - b; });

        var inPts = checkpoints.map(function (t) { return [t, inputAtAbs(t)]; });
        var lineIn = d3.line()
            .x(function (p) { return xT(p[0]); })
            .y(function (p) { return yIn(p[1]); });
        gWaveIn.append('path').datum(inPts)
            .attr('class', 'trace input')
            .attr('stroke-width', 1.6)
            .attr('d', lineIn);

        // Press labels — character above each event start, with a faint
        // dashed drop-line linking the label to the moment of contact.
        state.events.forEach(function (ev) {
            if (ev.tStart < tLeft || ev.tStart > tNow) return;
            var lx = xT(ev.tStart);
            gMarks.append('line')
                .attr('x1', lx).attr('x2', lx)
                .attr('y1', yIn(1.05)).attr('y2', yIn(1.45))
                .attr('stroke', 'var(--c-input)').attr('stroke-width', 1)
                .attr('stroke-dasharray', '2 2').attr('opacity', 0.45);
            gMarks.append('text')
                .attr('x', lx).attr('y', yIn(1.55))
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 11).attr('font-weight', '600')
                .style('fill', 'var(--c-input)')
                .text(ev.label);
        });

        // ── OUTPUT trace — the V_C samples we have integrated so far.
        // Hysteresis band + thresholds first, curve on top.
        gWaveOut.append('rect')
            .attr('x', 0).attr('y', yOut(V_TH_HI))
            .attr('width', iw)
            .attr('height', Math.max(0, yOut(V_TH_LO) - yOut(V_TH_HI)))
            .attr('fill', 'var(--c-thresh)').attr('opacity', 0.08);
        [V_TH_HI, V_TH_LO].forEach(function (v) {
            gWaveOut.append('line')
                .attr('x1', 0).attr('x2', iw)
                .attr('y1', yOut(v)).attr('y2', yOut(v))
                .attr('stroke', 'var(--c-thresh)').attr('stroke-width', 1)
                .attr('stroke-dasharray', '4 3').attr('opacity', 0.55);
        });

        if (state.scrollSamples.length > 1) {
            var lineOut = d3.line()
                .x(function (p) { return xT(p[0]); })
                .y(function (p) { return yOut(p[1]); })
                .curve(d3.curveLinear);
            gWaveOut.append('path').datum(state.scrollSamples)
                .attr('fill', 'none')
                .attr('stroke', 'var(--c-output)')
                .attr('stroke-width', 1.8)
                .attr('stroke-linecap', 'round')
                .attr('stroke-linejoin', 'round')
                .attr('d', lineOut);
        }

        // Schmitt rising-edge markers + the character that was emitted.
        state.scrollRisings.forEach(function (r) {
            if (r.tAbs < tLeft || r.tAbs > tNow) return;
            var rx = xT(r.tAbs);
            gWaveOut.append('line')
                .attr('x1', rx).attr('x2', rx)
                .attr('y1', yOut(V_TH_HI)).attr('y2', yOut(1.20))
                .attr('stroke', 'var(--c-output2)').attr('stroke-width', 1.4);
            gWaveOut.append('circle')
                .attr('cx', rx).attr('cy', yOut(1.20))
                .attr('r', 3.2).attr('fill', 'var(--c-output2)');
            gWaveOut.append('text')
                .attr('x', rx).attr('y', yOut(1.20) - 6)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 10)
                .style('fill', 'var(--c-output2)')
                .text(r.label);
        });

        // Now-cursor on the right edge of the window, spanning both bands.
        gMarks.append('line')
            .attr('x1', iw).attr('x2', iw)
            .attr('y1', 0).attr('y2', ih)
            .attr('stroke', 'var(--accent)').attr('stroke-width', 1)
            .attr('opacity', 0.45);
        gMarks.append('text')
            .attr('x', iw - 4).attr('y', ih - 4)
            .attr('text-anchor', 'end')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-size', 9)
            .style('fill', 'var(--accent)')
            .attr('opacity', 0.7)
            .text('now');

        // Idle hint when nothing has been typed yet.
        if (state.events.length === 0 && state.scrollSamples.length < 8) {
            gMarks.append('text')
                .attr('x', iw / 2).attr('y', ih / 2)
                .attr('text-anchor', 'middle')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-size', 12).style('fill', 'var(--muted)')
                .attr('opacity', 0.7)
                .text('type into the input box; keypresses scroll left with time');
        }
    }

    // ════════════════════════════════════════════════════════
    //  RENDER
    // ════════════════════════════════════════════════════════
    function renderText() {
        // The textarea stays in sync with our model (we own every keystroke).
        if (inEl.value !== state.inputText) inEl.value = state.inputText;
        outEl.textContent = state.outputText;
        inEl.scrollTop = inEl.scrollHeight;
    }

    function renderCounts() {
        rdCount.textContent = state.keypresses;
        rdOutN.textContent = state.outputText.length;
        var phantom = Math.max(0, state.outputText.length - state.keypresses);
        rdPhantom.textContent = phantom;
        rdRej.textContent = state.rejected;
    }

    // ════════════════════════════════════════════════════════
    //  INPUT
    // ════════════════════════════════════════════════════════
    function onKey(e) {
        var ch = keyChar(e);
        if (ch === null) return;
        e.preventDefault();
        if (state.scrollMode) recordKeyPressScroll(ch);
        else                  recordKeyPress(ch);
        flashKey(e);
    }

    // Block native edits so the model is the single source of truth. The
    // textarea cursor is purely visual; all writes go through recordKeyPress.
    function onBeforeInput(e) { e.preventDefault(); }
    function onPaste(e) { e.preventDefault(); }

    function clearAll() {
        state.inputText = '';
        state.outputText = '';
        state.keypresses = 0;
        state.rejected = 0;
        state.lastEdges = [];
        if (state.scrollMode) {
            // In scroll mode, clear the rolling buffers but keep the timer
            // running so the trace continues to scroll from "now".
            state.events = [];
            state.scrollV = 0;
            state.scrollSchmitt = 0;
            state.scrollSamples = [[state.tNow, 0]];
            state.scrollRisings = [];
        }
        renderText();
        renderCounts();
        drawTrace();
    }

    function setScrollMode(on) {
        state.scrollMode = !!on;
        btScroll.classList.toggle('active', state.scrollMode);
        if (grpSpeed) grpSpeed.hidden = !state.scrollMode;
        if (state.scrollMode) {
            startScroll();
        } else {
            stopScroll();
            // Reset snapshot view to its empty hint.
            state.lastEdges = [];
            state.lastVTrace = [];
            state.lastSchmittRises = [];
            state.inputText = '';
            state.outputText = '';
            state.keypresses = 0;
            state.rejected = 0;
            renderText(); renderCounts();
            layout(); drawStatic(); drawTrace();
        }
    }

    function init() {
        layout(); drawStatic(); drawTrace();
        buildKeyboard();
        renderText();
        renderCounts();

        slDb.addEventListener('input', function () {
            state.debounceMs = parseFloat(slDb.value);
            lbDb.textContent = state.debounceMs.toFixed(0) + ' ms';
            // Re-layout only matters in snapshot mode (axis depends on T_d).
            // In scroll mode the integration just uses the new τ from the
            // next tick onward.
            if (!state.scrollMode) { layout(); drawStatic(); drawTrace(); }
        });
        slBn.addEventListener('input', function () {
            state.bounce = parseFloat(slBn.value);
            lbBn.textContent = state.bounce.toFixed(0);
        });
        btClear.addEventListener('click', function () { clearAll(); inEl.focus(); });

        btScroll.addEventListener('click', function () {
            setScrollMode(!state.scrollMode);
            inEl.focus();
        });

        btNormal.addEventListener('click', function () {
            // Snap T_d and bounce sliders to typical real-keyboard values
            // and switch into scroll mode so continuous typing can be tested.
            slDb.value = String(NORMAL_TD);
            state.debounceMs = NORMAL_TD;
            lbDb.textContent = NORMAL_TD.toFixed(0) + ' ms';
            slBn.value = String(NORMAL_BOUNCE);
            state.bounce = NORMAL_BOUNCE;
            lbBn.textContent = NORMAL_BOUNCE.toFixed(0);
            if (!state.scrollMode) setScrollMode(true);
            else { layout(); drawStatic(); drawTrace(); }
            inEl.focus();
        });

        if (slSpeed) {
            slSpeed.addEventListener('input', function () {
                state.speed = parseFloat(slSpeed.value);
                lbSpeed.textContent = state.speed.toFixed(2) + '×';
            });
        }

        inEl.addEventListener('keydown', onKey);
        inEl.addEventListener('beforeinput', onBeforeInput);
        inEl.addEventListener('paste', onPaste);
        inEl.addEventListener('drop', function (e) { e.preventDefault(); });

        window.addEventListener('themechange', function () {
            drawStatic(); drawTrace(); buildKeyboard();
        });
        window.addEventListener('resize', function () {
            layout(); drawStatic(); drawTrace();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
