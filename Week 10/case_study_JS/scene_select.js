// scene_select.js  ·  Slide 2
// Multi-select circuit-block question. Cards build from a fixed catalogue,
// each tagged correct / partial / wrong with a one-line rationale shown
// after Check.
(function () {
    var CHOICES = [
        {
            id: 'comparator',
            ttl: 'Op-amp comparator',
            desc: 'Drives its output to a rail when the input crosses a fixed threshold.',
            verdict: 'correct',
            why: 'Performs the binary detection step. One pulse per upward threshold crossing.'
        },
        {
            id: 'schmitt',
            ttl: 'Schmitt trigger',
            desc: 'Comparator with hysteresis: separate upper and lower thresholds.',
            verdict: 'correct',
            why: 'Hysteresis stops the comparator from chattering on a noisy spike. One clean pulse per spike.'
        },
        {
            id: 'peak',
            ttl: 'Peak detector (op-amp + diode + capacitor)',
            desc: 'Holds the most recent peak voltage on a capacitor.',
            verdict: 'correct',
            why: 'The amplitude measurement the clinicians asked for. With a slow leak, the held trace is the envelope.'
        },
        {
            id: 'monostable',
            ttl: 'Monostable multivibrator (one-shot)',
            desc: 'Emits a single fixed-width pulse on each rising edge of its trigger.',
            verdict: 'correct',
            why: 'Standardises the detected pulse width regardless of how long the EEG sits above the threshold. Clean input to a downstream counter.'
        },
        {
            id: 'sah',
            ttl: 'Sample-and-hold',
            desc: 'Captures the input voltage at a clock edge and holds it.',
            verdict: 'correct',
            why: 'Useful for capturing the held peak value at the moment the comparator fires, ahead of an ADC.'
        },
        {
            id: 'lpf',
            ttl: 'Sallen-Key low-pass filter',
            desc: 'Active second-order low-pass with adjustable cutoff and Q.',
            verdict: 'correct',
            why: 'The front-end filter that exposes the spikes in the first place. Already in place per the brief, but worth recognising as part of the chain.'
        },
        {
            id: 'astable',
            ttl: 'Astable multivibrator',
            desc: 'Free-running square-wave oscillator at a fixed rate.',
            verdict: 'wrong',
            why: 'Generates a clock; it does not detect anything in the input. A timing reference, not a detector.'
        },
        {
            id: 'integrator',
            ttl: 'Op-amp integrator',
            desc: 'Output proportional to the time-integral of the input.',
            verdict: 'wrong',
            why: 'Integration smears the sharp spikes into the baseline. Removes exactly the feature you are trying to find.'
        },
        {
            id: 'differentiator',
            ttl: 'Op-amp differentiator',
            desc: 'Output proportional to the rate of change of the input.',
            verdict: 'partial',
            why: 'Emphasises sharp edges so it can flag a spike, but it produces a derivative rather than the amplitude. Useful as a pre-detector, not a measurer.'
        },
        {
            id: 'follower',
            ttl: 'Voltage follower / buffer',
            desc: 'Unity-gain stage that isolates impedance.',
            verdict: 'partial',
            why: 'Does not detect or measure on its own, but you need one before the peak detector so the source impedance does not load the hold capacitor.'
        }
    ];

    var grid = document.getElementById('choices');
    var btnCheck = document.getElementById('check-btn');
    var btnReset = document.getElementById('reset-btn');
    var scorePill = document.getElementById('score-pill');
    var scoreText = document.getElementById('score-text');

    var selection = new Set();
    var revealed = false;

    function render() {
        grid.innerHTML = '';
        CHOICES.forEach(function (c) {
            var el = document.createElement('div');
            el.className = 'choice';
            el.dataset.id = c.id;
            if (selection.has(c.id)) el.classList.add('selected');
            if (revealed) {
                el.classList.add('revealed');
                el.classList.add(c.verdict);
            }
            var verdictLabel = c.verdict === 'correct' ? '✓ correct'
                : c.verdict === 'partial' ? '~ partial'
                    : '✗ not for this problem';
            el.innerHTML =
                '<div class="ck"></div>' +
                '<div class="ttl">' + c.ttl + '</div>' +
                '<div class="desc">' + c.desc + '</div>' +
                '<div class="verdict"><b>' + verdictLabel + '</b> · ' + c.why + '</div>';

            el.addEventListener('click', function () {
                if (revealed) return;
                if (selection.has(c.id)) selection.delete(c.id);
                else selection.add(c.id);
                el.classList.toggle('selected', selection.has(c.id));
            });
            grid.appendChild(el);
        });
    }

    function check() {
        revealed = true;
        var correctSet = new Set(CHOICES.filter(function (c) { return c.verdict === 'correct'; }).map(function (c) { return c.id; }));
        // Score: +1 for each correct chosen, +0.5 for each partial chosen, -1 for each wrong chosen (floor at 0). Out of total correct.
        var score = 0;
        var total = correctSet.size;
        selection.forEach(function (id) {
            var c = CHOICES.find(function (k) { return k.id === id; });
            if (!c) return;
            if (c.verdict === 'correct') score += 1;
            else if (c.verdict === 'partial') score += 0.5;
            else score -= 1;
        });
        score = Math.max(0, score);
        var display = (Math.round(score * 10) / 10) + ' / ' + total;
        scoreText.textContent = display;
        scorePill.style.display = '';
        btnCheck.disabled = true;
        btnReset.disabled = false;
        render();
    }

    function reset() {
        revealed = false;
        selection.clear();
        scorePill.style.display = 'none';
        btnCheck.disabled = false;
        btnReset.disabled = true;
        render();
    }

    function init() {
        render();
        btnCheck.addEventListener('click', check);
        btnReset.addEventListener('click', reset);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
