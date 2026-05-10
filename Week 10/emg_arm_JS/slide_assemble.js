// slide_assemble.js  ·  Slide 1
// Drag the eight named blocks from a tray into eight empty slots between a
// "Strain Gauge" endcap and a "Servo" endcap. The check button marks each
// slot as correct or wrong against EMGBlocks.canonicalOrder.
(function () {
    var trayEl = document.getElementById('block-tray');
    var chainEl = document.getElementById('block-chain');
    if (!trayEl || !chainEl) return;

    var BLOCKS = window.EMGBlocks.list;
    var CANONICAL = window.EMGBlocks.canonicalOrder;
    var N = CANONICAL.length;

    // Shuffle the tray so a fresh visit is not pre-sorted.
    function shuffle(a) {
        var out = a.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = out[i]; out[i] = out[j]; out[j] = t;
        }
        return out;
    }

    var slots = [];   // DOM array, length N
    var dragId = null;
    var dragSource = null;   // 'tray' or { type:'slot', index:n }

    function makeTile(block) {
        var el = document.createElement('div');
        el.className = 'block-tile';
        el.draggable = true;
        el.dataset.id = block.id;
        el.innerHTML =
            '<div class="ttl">' + block.short + '</div>' +
            '<div class="name">' + block.name + '</div>';
        el.addEventListener('dragstart', function (ev) {
            dragId = block.id;
            dragSource = el.parentElement === trayEl ? 'tray' : findSlotSource(el);
            el.classList.add('dragging');
            ev.dataTransfer.effectAllowed = 'move';
            try { ev.dataTransfer.setData('text/plain', block.id); } catch (e) { }
        });
        el.addEventListener('dragend', function () {
            el.classList.remove('dragging');
            dragId = null;
            dragSource = null;
        });
        return el;
    }

    function findSlotSource(tileEl) {
        for (var i = 0; i < slots.length; i++) {
            if (slots[i].contains(tileEl)) return { type: 'slot', index: i };
        }
        return null;
    }

    function makeEndcap(top, name) {
        var el = document.createElement('div');
        el.className = 'chain-endcap';
        el.innerHTML =
            '<div><div class="top">' + top + '</div><div class="name">' + name + '</div></div>';
        return el;
    }

    function makeArrow() {
        var el = document.createElement('div');
        el.className = 'chain-arrow';
        el.textContent = '→';
        return el;
    }

    function makeSlot(index) {
        var el = document.createElement('div');
        el.className = 'chain-slot';
        el.dataset.index = String(index);
        var n = document.createElement('div');
        n.className = 'slot-num';
        n.textContent = String(index + 1).padStart(2, '0');
        el.appendChild(n);

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
            placeInSlot(dragId, index, dragSource);
        });

        return el;
    }

    function findTileInTray(id) {
        return trayEl.querySelector('.block-tile[data-id="' + id + '"]');
    }

    function placeInSlot(blockId, slotIndex, source) {
        var slot = slots[slotIndex];

        // If the slot is already occupied, swap or send the resident back.
        var residentTile = slot.querySelector('.block-tile');
        var residentId = residentTile ? residentTile.dataset.id : null;

        // Remove tile from its current home.
        var movingTile;
        if (source === 'tray') {
            movingTile = findTileInTray(blockId);
        } else if (source && source.type === 'slot') {
            movingTile = slots[source.index].querySelector('.block-tile');
        }
        if (!movingTile) return;
        movingTile.remove();

        // Place into the target slot (replace any resident).
        if (residentTile) residentTile.remove();
        slot.appendChild(movingTile);
        slot.classList.add('filled');
        slot.classList.remove('correct', 'wrong');

        // Resolve where the resident goes.
        if (residentId) {
            if (source && source.type === 'slot') {
                // True swap.
                slots[source.index].appendChild(residentTile);
                slots[source.index].classList.add('filled');
                slots[source.index].classList.remove('correct', 'wrong');
            } else {
                // Came from tray; resident returns to tray.
                trayEl.appendChild(residentTile);
            }
        } else if (source && source.type === 'slot') {
            // Empty source slot.
            slots[source.index].classList.remove('filled', 'correct', 'wrong');
        }

        updateScorePill(false);
    }

    // ─── Tray drop target (return tiles by dropping on the tray) ─────
    trayEl.addEventListener('dragover', function (ev) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
    });
    trayEl.addEventListener('drop', function (ev) {
        ev.preventDefault();
        if (!dragId || !dragSource || dragSource === 'tray') return;
        var t = slots[dragSource.index].querySelector('.block-tile');
        if (!t) return;
        t.remove();
        slots[dragSource.index].classList.remove('filled', 'correct', 'wrong');
        trayEl.appendChild(t);
        updateScorePill(false);
    });

    // ─── Build the chain row ─────────────────────────────────────────
    function buildChain() {
        chainEl.innerHTML = '';
        slots = [];
        chainEl.appendChild(makeEndcap('input', 'Strain Gauge'));
        for (var i = 0; i < N; i++) {
            chainEl.appendChild(makeArrow());
            var s = makeSlot(i);
            slots.push(s);
            chainEl.appendChild(s);
        }
        chainEl.appendChild(makeArrow());
        chainEl.appendChild(makeEndcap('output', 'Servo'));
    }

    function buildTray() {
        trayEl.innerHTML = '';
        var ids = shuffle(BLOCKS.map(function (b) { return b.id; }));
        ids.forEach(function (id) {
            var def = window.EMGBlocks.byId(id);
            trayEl.appendChild(makeTile(def));
        });
    }

    // ─── Buttons ─────────────────────────────────────────────────────
    var btnCheck = document.getElementById('assemble-check');
    var btnReset = document.getElementById('assemble-reset');
    var btnReveal = document.getElementById('assemble-reveal');
    var scorePill = document.getElementById('assemble-score');
    var scoreText = document.getElementById('assemble-score-text');

    function updateScorePill(visible) {
        if (!scorePill) return;
        scorePill.style.display = visible ? '' : 'none';
    }

    function check() {
        var correct = 0;
        for (var i = 0; i < N; i++) {
            var slot = slots[i];
            var tile = slot.querySelector('.block-tile');
            slot.classList.remove('correct', 'wrong');
            if (!tile) continue;
            if (tile.dataset.id === CANONICAL[i]) {
                slot.classList.add('correct');
                correct++;
            } else {
                slot.classList.add('wrong');
            }
        }
        scoreText.textContent = correct + ' / ' + N;
        updateScorePill(true);
    }

    function reset() {
        // Move every tile in slots back to the tray (re-shuffled).
        var ids = [];
        for (var i = 0; i < N; i++) {
            var t = slots[i].querySelector('.block-tile');
            if (t) { ids.push(t.dataset.id); t.remove(); }
            slots[i].classList.remove('filled', 'correct', 'wrong');
        }
        ids.forEach(function (id) {
            var existing = trayEl.querySelector('.block-tile[data-id="' + id + '"]');
            if (!existing) trayEl.appendChild(makeTile(window.EMGBlocks.byId(id)));
        });
        // Reshuffle the tray order for fairness.
        var children = Array.prototype.slice.call(trayEl.children);
        children.sort(function () { return Math.random() - 0.5; });
        children.forEach(function (c) { trayEl.appendChild(c); });
        updateScorePill(false);
    }

    function reveal() {
        // Place every block into its canonical slot. Existing residents are
        // bumped to the tray.
        reset();
        CANONICAL.forEach(function (id, i) {
            var t = trayEl.querySelector('.block-tile[data-id="' + id + '"]');
            if (!t) return;
            t.remove();
            slots[i].appendChild(t);
            slots[i].classList.add('filled', 'correct');
        });
        scoreText.textContent = N + ' / ' + N;
        updateScorePill(true);
    }

    function init() {
        buildChain();
        buildTray();
        btnCheck.addEventListener('click', check);
        btnReset.addEventListener('click', reset);
        btnReveal.addEventListener('click', reveal);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
