// Section dots + progress rail.
(function () {
  const sections = Array.from(document.querySelectorAll('section[data-label]'));
  const dots = document.getElementById('dots');
  const rail = document.getElementById('rail');

  sections.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.className = 'dot';
    btn.setAttribute('data-i', i);
    btn.innerHTML = `<span class="lbl">${s.getAttribute('data-label')}</span>`;
    btn.addEventListener('click', () => {
      s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    dots.appendChild(btn);
  });

  const btns = Array.from(dots.querySelectorAll('.dot'));

  function onScroll() {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, h)));
    rail.style.width = (p * 100) + '%';
    // active dot: section whose top is closest to middle
    const mid = window.scrollY + window.innerHeight * 0.35;
    let best = 0, bestD = Infinity;
    sections.forEach((s, i) => {
      const top = s.offsetTop;
      const d = Math.abs(top - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    btns.forEach((b, i) => b.classList.toggle('active', i === best));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

})();
