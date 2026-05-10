// nav.js  ·  Slide-deck navigation. Arrow keys, dot indicator, prev/next
// buttons. The scenes themselves are always running in the background; the
// nav only shows the active slide.
(function () {
    var deck = document.getElementById('deck');
    if (!deck) return;
    var slides = Array.prototype.slice.call(deck.querySelectorAll('.slide'));
    var dotsHost = document.getElementById('nav-dots');
    var elPrev = document.getElementById('nav-prev');
    var elNext = document.getElementById('nav-next');
    var elCur = document.getElementById('nav-cur');
    var elTot = document.getElementById('nav-tot');
    var current = 0;

    function buildDots() {
        dotsHost.innerHTML = '';
        slides.forEach(function (_, i) {
            var d = document.createElement('span');
            d.className = 'dot' + (i === current ? ' active' : '');
            d.addEventListener('click', function () { go(i); });
            dotsHost.appendChild(d);
        });
        elTot.textContent = slides.length;
    }

    function go(i) {
        if (i < 0 || i >= slides.length || i === current) return;
        slides[current].classList.remove('active');
        slides[current].classList.toggle('prev', i > current);
        current = i;
        slides[current].classList.add('active');
        slides[current].classList.remove('prev');
        slides.forEach(function (s, idx) {
            if (idx !== current && idx >= current) s.classList.remove('prev');
        });
        var dotEls = dotsHost.querySelectorAll('.dot');
        dotEls.forEach(function (d, idx) { d.classList.toggle('active', idx === current); });
        elCur.textContent = current + 1;
        elPrev.classList.toggle('disabled', current === 0);
        elNext.classList.toggle('disabled', current === slides.length - 1);
    }

    function next() { go(current + 1); }
    function prev() { go(current - 1); }

    function init() {
        buildDots();
        elCur.textContent = current + 1;
        elPrev.classList.add('disabled');
        elPrev.addEventListener('click', prev);
        elNext.addEventListener('click', next);
        document.addEventListener('keydown', function (e) {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
            if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
                next(); e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                prev(); e.preventDefault();
            } else if (e.key === 'Home') {
                go(0); e.preventDefault();
            } else if (e.key === 'End') {
                go(slides.length - 1); e.preventDefault();
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
