// slide_arm_trace.js  ·  Slide 2
// Owns the live chain runner pool (one runner per finger), the editable chain
// UI, the per-finger enable controls, and the two D3 trace plots that show
// raw strain-bridge inputs and post-chain outputs. Strain values come from
// window.HandPose when the webcam is running; otherwise they sit at zero.
// Exposes window.EMGArm with per-finger getters used by slide_arm_three.js.
(function () {
    var chainHost   = document.getElementById('arm-chain');
    var trayHost    = document.getElementById('arm-tray');
    var inputSvgEl  = document.getElementById('plot-hand-input');
    var outputSvgEl = document.getElementById('plot-hand-output');
    if (!chainHost || !trayHost || !inputSvgEl || !outputSvgEl) return;

    var inputSvg  = d3.select(inputSvgEl).classed('ov', true);
    var outputSvg = d3.select(outputSvgEl).classed('ov', true);

    var BLOCKS = window.EMGBlocks.list;
    var CANONICAL = window.EMGBlocks.canonicalOrder;

    var FINGERS = [
        { id: 'thumb',  label: 'thumb',  cls: 'f-thumb'  },
        { id: 'index',  label: 'index',  cls: 'f-index'  },
        { id: 'middle', label: 'middle', cls: 'f-middle' },
        { id: 'ring',   label: 'ring',   cls: 'f-ring'   },
        { id: 'pinky',  label: 'pinky',  cls: 'f-pinky'  }
    ];
    var N_F = FINGERS.length;

    // ─── Chain UI ───────────────────────────────────────────────────
    // Eight slots between the strain gauge and the servo. Each slot is
    // either empty (null) or holds a block id. The eight blocks live in
    // either the tray or one slot; the live chain runner uses whichever
    // ids are placed, in slot order.
    var N_SLOTS = CANONICAL.length;
    var orderState = new Array(N_SLOTS);
    for (var _i = 0; _i < N_SLOTS; _i++) orderState[_i] = null;
    // Tray starts with every block in EMGBlocks.list (the user must choose
    // between Comparator and Schmitt — only one fits in the seven slots).
    var trayList = BLOCKS.map(function (b) { return b.id; });
    var dragId = null;
    var dragSource = null;              // 'tray' or { type:'slot', index:n }
    var orderOkEl = document.getElementById('arm-orderok');

    function endcap(top, name) {
        var el = document.createElement('div');
        el.className = 'chain-endcap';
        el.innerHTML =
            '<div><div class="top">' + top + '</div><div class="name">' + name + '</div></div>';
        return el;
    }
    function arrowEl() {
        var el = document.createElement('div');
        el.className = 'chain-arrow';
        el.textContent = '→';
        return el;
    }
    function makeTile(def) {
        var el = document.createElement('div');
        el.className = 'block-tile';
        el.draggable = true;
        el.dataset.id = def.id;
        el.innerHTML =
            '<div class="ttl">' + def.short + '</div>' +
            '<div class="name">' + def.name + '</div>';
        el.addEventListener('dragstart', function (ev) {
            dragId = def.id;
            var parent = el.parentElement;
            if (parent === trayHost) {
                dragSource = 'tray';
            } else {
                var idx = parent && parent.dataset && parent.dataset.index !== undefined
                    ? parseInt(parent.dataset.index, 10) : -1;
                dragSource = idx >= 0 ? { type: 'slot', index: idx } : null;
            }
            el.classList.add('dragging');
            ev.dataTransfer.effectAllowed = 'move';
            try { ev.dataTransfer.setData('text/plain', def.id); } catch (e) { }
        });
        el.addEventListener('dragend', function () {
            el.classList.remove('dragging');
            dragId = null;
            dragSource = null;
        });
        return el;
    }
    function makeSlot(i) {
        var el = document.createElement('div');
        el.className = 'chain-slot';
        if (orderState[i]) el.classList.add('filled');
        el.dataset.index = String(i);
        el.addEventListener('dragover', function (ev) {
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'move';
            el.classList.add('over');
        });
        el.addEventListener('dragleave', function () { el.classList.remove('over'); });
        el.addEventListener('drop', function (ev) {
            ev.preventDefault();
            el.classList.remove('over');
            if (!dragId) return;
            placeInSlot(dragId, i, dragSource);
        });
        return el;
    }

    function rebuildTray() {
        trayHost.innerHTML = '';
        trayList.forEach(function (id) {
            var def = window.EMGBlocks.byId(id);
            trayHost.appendChild(makeTile(def));
        });
    }
    trayHost.addEventListener('dragover', function (ev) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
    });
    trayHost.addEventListener('drop', function (ev) {
        ev.preventDefault();
        if (!dragId || dragSource === 'tray') return;
        if (dragSource && dragSource.type === 'slot') {
            orderState[dragSource.index] = null;
            if (trayList.indexOf(dragId) === -1) trayList.push(dragId);
            rebuildAll();
        }
    });

    function rebuildChain() {
        chainHost.innerHTML = '';
        chainHost.appendChild(endcap('input', 'Strain Gauge'));
        for (var i = 0; i < N_SLOTS; i++) {
            chainHost.appendChild(arrowEl());
            var slot = makeSlot(i);
            var id = orderState[i];
            if (id) {
                var def = window.EMGBlocks.byId(id);
                slot.appendChild(makeTile(def));
            }
            chainHost.appendChild(slot);
        }
        chainHost.appendChild(arrowEl());
        chainHost.appendChild(endcap('output', 'Servo'));
    }

    function rebuildAll() {
        rebuildTray();
        rebuildChain();
        updateOrderOk();
    }

    function placeInSlot(blockId, slotIndex, source) {
        var residentId = orderState[slotIndex];

        // Remove the moving block from its origin.
        if (source === 'tray') {
            trayList = trayList.filter(function (id) { return id !== blockId; });
        } else if (source && source.type === 'slot') {
            orderState[source.index] = null;
        }

        // Place the moving block in the target slot.
        orderState[slotIndex] = blockId;

        // Resolve where the previous resident goes.
        if (residentId) {
            if (source && source.type === 'slot') {
                orderState[source.index] = residentId;       // swap
            } else {
                if (trayList.indexOf(residentId) === -1) trayList.push(residentId);
            }
        }

        rebuildAll();
    }

    function activeOrder() {
        var out = [];
        for (var i = 0; i < N_SLOTS; i++) {
            if (orderState[i]) out.push(orderState[i]);
        }
        return out;
    }

    function updateOrderOk() {
        var ord = activeOrder();
        var ok = ord.length === CANONICAL.length
            && ord.every(function (id, i) { return id === CANONICAL[i]; });
        if (orderOkEl) {
            if (ord.length === 0) {
                orderOkEl.textContent = 'empty';
                orderOkEl.classList.remove('on');
                orderOkEl.classList.remove('warn');
            } else {
                orderOkEl.textContent = ok ? 'yes' : 'no';
                orderOkEl.classList.toggle('on', ok);
                orderOkEl.classList.toggle('warn', !ok);
            }
        }
    }

    // ─── Plots (input and output) ────────────────────────────────────
    var T_WIN = window.EMGSignal.T_WIN;
    var BUF = window.EMGSignal.BUF;
    var FS = window.EMGSignal.FS;

    function makePlot(svg, yDomain, xTitle, yTitle) {
        var W = 800, H = 220;
        var margin = { top: 26, right: 18, bottom: 34, left: 48 };
        var iw, ih, x, y;
        var gRoot = svg.append('g');
        var gGrid = gRoot.append('g').attr('class', 'grid');
        var gAxis = gRoot.append('g').attr('class', 'axis');
        var gTitles = gRoot.append('g');
        var gPaths = FINGERS.map(function () { return gRoot.append('g'); });
        var paths = FINGERS.map(function () { return null; });

        function layout() {
            var rect = svg.node().getBoundingClientRect();
            W = Math.max(420, rect.width);
            H = Math.max(160, rect.height);
            svg.attr('viewBox', '0 0 ' + W + ' ' + H);
            iw = W - margin.left - margin.right;
            ih = H - margin.top - margin.bottom;
            gRoot.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            x = d3.scaleLinear().domain([-T_WIN, 0]).range([0, iw]);
            y = d3.scaleLinear().domain(yDomain).range([ih, 0]);
        }

        function drawAxes() {
            gGrid.selectAll('*').remove();
            gAxis.selectAll('*').remove();
            gTitles.selectAll('*').remove();

            var ys = y.ticks(5);
            ys.forEach(function (v) {
                gGrid.append('line')
                    .attr('class', Math.abs(v) < 1e-6 ? 'major' : '')
                    .attr('x1', 0).attr('x2', iw)
                    .attr('y1', y(v)).attr('y2', y(v));
            });
            gAxis.append('g')
                .call(d3.axisLeft(y).tickValues(ys)
                    .tickFormat(function (d) { return d.toFixed(2); })
                    .tickSize(0).tickPadding(8))
                .select('.domain').remove();

            var xt = [-2, -1.5, -1, -0.5, 0];
            gAxis.append('g').attr('transform', 'translate(0,' + ih + ')')
                .call(d3.axisBottom(x).tickValues(xt)
                    .tickFormat(function (d) { return d.toFixed(1) + ' s'; })
                    .tickSize(0).tickPadding(8))
                .select('.domain').remove();

            gTitles.append('text').attr('class', 'axis-title')
                .attr('x', iw / 2).attr('y', ih + 26)
                .attr('text-anchor', 'middle')
                .text(xTitle);
            gTitles.append('text').attr('class', 'axis-title')
                .attr('transform', 'translate(' + (-36) + ',' + (ih / 2) + ') rotate(-90)')
                .attr('text-anchor', 'middle')
                .text(yTitle);
        }

        function ensurePaths() {
            for (var i = 0; i < N_F; i++) {
                if (!paths[i]) {
                    paths[i] = gPaths[i].append('path')
                        .attr('class', 'trace ' + FINGERS[i].cls);
                }
            }
        }

        function decimate(buf, stride) {
            var n = Math.ceil(buf.length / stride);
            var out = new Float32Array(n);
            for (var i = 0, j = 0; i < buf.length; i += stride, j++) out[j] = buf[i];
            return out;
        }

        function redraw(buffers, enabled) {
            ensurePaths();
            var s = 4;
            var line = d3.line()
                .x(function (_, i, arr) { return x((i / (arr.length - 1)) * T_WIN - T_WIN); })
                .y(function (v) { return y(v); });
            for (var i = 0; i < N_F; i++) {
                if (!enabled[i]) {
                    paths[i].attr('d', '').attr('display', 'none');
                    continue;
                }
                paths[i].attr('display', null);
                var d = decimate(buffers[i], s);
                paths[i].attr('d', line(Array.from(d)));
            }
        }

        return {
            layout: layout,
            drawAxes: drawAxes,
            redraw: redraw
        };
    }

    var inputPlot  = makePlot(inputSvg,  [-0.40, 1.00], 'time relative to now, s', 'bridge V');
    var outputPlot = makePlot(outputSvg, [-0.20, 1.30], 'time relative to now, s', 'servo V');

    // ─── Per-finger state and UI ─────────────────────────────────────
    var runners = FINGERS.map(function () { return window.EMGSignal.makeChainRunner(); });
    var lastOut = FINGERS.map(function () { return { x: 0, env: 0, drive: 0 }; });
    var enabled = FINGERS.map(function () { return true; });

    var fingerPanel = document.getElementById('finger-controls');
    var fingerRowEls = [];
    var rotationRowEl = null;
    var rotationCb = null;
    function buildFingerControls() {
        if (!fingerPanel) return;
        fingerPanel.innerHTML = '';
        FINGERS.forEach(function (f, i) {
            var row = document.createElement('label');
            row.className = 'finger-row ' + f.cls;
            row.innerHTML =
                '<input type="checkbox" checked>' +
                '<span class="swatch"></span>' +
                '<span class="name">' + f.label + '</span>' +
                '<span class="bar"><span class="fill"></span></span>' +
                '<span class="val">0.00</span>';
            var cb = row.querySelector('input');
            cb.addEventListener('change', function () { enabled[i] = cb.checked; });
            fingerPanel.appendChild(row);
            fingerRowEls.push(row);
        });
        var divider = document.createElement('div');
        divider.className = 'finger-divider';
        fingerPanel.appendChild(divider);

        rotationRowEl = document.createElement('label');
        rotationRowEl.className = 'finger-row finger-row-rot';
        rotationRowEl.innerHTML =
            '<input type="checkbox">' +
            '<span class="swatch"></span>' +
            '<span class="name">rotation</span>' +
            '<span class="bar"><span class="fill"></span></span>' +
            '<span class="val">off</span>';
        rotationCb = rotationRowEl.querySelector('input');
        rotationCb.addEventListener('change', function () {
            rotationEnabled = rotationCb.checked;
            rotationRowEl.classList.toggle('disabled', !rotationEnabled);
            rotationRowEl.querySelector('.val').textContent = rotationEnabled ? 'on' : 'off';
        });
        rotationRowEl.classList.add('disabled');
        fingerPanel.appendChild(rotationRowEl);
    }

    // ─── Webcam controls ─────────────────────────────────────────────
    var btnCam = document.getElementById('hand-cam-btn');
    var camStatusEls = [
        document.getElementById('hand-cam-status'),
        document.getElementById('hand-cam-status-2')
    ].filter(Boolean);
    var camHost = document.getElementById('hand-webcam');
    var camActive = false;

    function setCamStatus(s) {
        camStatusEls.forEach(function (e) { e.textContent = s; });
    }
    function restorePlaceholder() {
        if (!camHost) return;
        camHost.innerHTML = '<div class="placeholder">enable camera to capture finger curl</div>';
    }
    if (window.HandPose && window.HandPose.onStatus) {
        window.HandPose.onStatus(function (s) {
            if (s === 'idle')                setCamStatus('camera off');
            else if (s === 'starting')       setCamStatus('requesting camera...');
            else if (s === 'model')          setCamStatus('loading model...');
            else if (s === 'running')        setCamStatus('tracking');
            else if (s.indexOf('error') === 0) {
                if (s === 'error:permission') setCamStatus('camera denied');
                else if (s === 'error:nocam') setCamStatus('no camera');
                else if (s === 'error:ml5')   setCamStatus('ml5 not loaded');
                else                          setCamStatus('error');
            }
        });
    }
    if (btnCam) {
        btnCam.addEventListener('click', function () {
            if (!window.HandPose) return;
            if (!camActive) {
                window.HandPose.start(camHost);
                btnCam.textContent = 'stop camera';
                btnCam.classList.add('active');
                camActive = true;
            } else {
                window.HandPose.stop();
                restorePlaceholder();
                btnCam.textContent = 'enable camera';
                btnCam.classList.remove('active');
                camActive = false;
            }
        });
    }

    // ─── Toolbar ─────────────────────────────────────────────────────
    var ui = {
        fc: document.getElementById('arm-fc'),
        fcv: document.getElementById('arm-fc-val'),
        pause: document.getElementById('arm-pause')
    };

    var paused = false;
    var lastT = null;
    var rotationEnabled = false;

    function step(now) {
        if (lastT === null) lastT = now;
        var dt = Math.max(0, Math.min(0.05, (now - lastT) / 1000));
        lastT = now;

        if (window.HandPose && window.HandPose.update) window.HandPose.update(dt);

        if (!paused) {
            var fc = parseFloat(ui.fc.value);
            var nSteps = Math.max(1, Math.round(dt * FS));
            var simDt = 1 / FS;
            var ord = activeOrder();
            for (var c = 0; c < runners.length; c++) {
                var live = window.HandPose && window.HandPose.isReady() ? window.HandPose.getStrain(c) : 0;
                var strain = enabled[c] ? live : 0;
                var params = { strain: strain, fc: fc };
                var out;
                for (var k = 0; k < nSteps; k++) {
                    out = runners[c].step(simDt, ord, params);
                }
                if (out) lastOut[c] = out;
            }
        }

        var bufsAll = runners.map(function (r) { return r.read(); });
        inputPlot.redraw(bufsAll.map(function (b) { return b.raw; }), enabled);
        outputPlot.redraw(bufsAll.map(function (b) { return b.drive; }), enabled);

        ui.fcv.textContent = ui.fc.value + ' Hz';
        for (var c2 = 0; c2 < N_F; c2++) {
            var row = fingerRowEls[c2];
            if (row) {
                var s = window.HandPose && window.HandPose.isReady() ? window.HandPose.getStrain(c2) : 0;
                row.querySelector('.fill').style.width = (s * 100).toFixed(1) + '%';
                row.querySelector('.val').textContent = s.toFixed(2);
                row.classList.toggle('disabled', !enabled[c2]);
            }
        }

        requestAnimationFrame(step);
    }

    function init() {
        inputPlot.layout();  inputPlot.drawAxes();
        outputPlot.layout(); outputPlot.drawAxes();
        rebuildAll();
        buildFingerControls();
        setCamStatus('camera off');

        // Best-effort auto-start of the webcam. Some browsers require a
        // user gesture for getUserMedia; if that's the case the call falls
        // through to the 'error:permission' path and the user can still
        // click the camera button.
        if (window.HandPose) {
            setTimeout(function () {
                if (camActive) return;
                window.HandPose.start(camHost);
                if (btnCam) {
                    btnCam.textContent = 'stop camera';
                    btnCam.classList.add('active');
                }
                camActive = true;
            }, 250);
        }

        ui.pause.addEventListener('click', function () {
            paused = !paused;
            ui.pause.classList.toggle('active', paused);
            ui.pause.textContent = paused ? 'paused' : 'pause';
        });
        window.addEventListener('resize', function () {
            inputPlot.layout();  inputPlot.drawAxes();
            outputPlot.layout(); outputPlot.drawAxes();
        });
        window.addEventListener('themechange', function () {
            inputPlot.drawAxes();
            outputPlot.drawAxes();
        });

        window.EMGArm = {
            getDrive:    function (i) { return enabled[i] && lastOut[i] ? lastOut[i].drive : 0; },
            getEnvelope: function (i) { return enabled[i] && lastOut[i] ? lastOut[i].env   : 0; },
            isEnabled:   function (i) { return !!enabled[i]; },
            getOrder:    function () { return activeOrder(); },
            isRotationEnabled: function () { return rotationEnabled; }
        };

        requestAnimationFrame(step);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
