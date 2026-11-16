/* VanTrust homepage concept — no libraries */
(() => {
  const root = document.documentElement;
  const flat = root.classList.contains('flat');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---- split headings into masked words ---- */
  qsa('[data-words]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) =>
      `<span class="w" aria-hidden="true"><span class="w__i" style="--i:${i}">${w}</span></span>`
    ).join(' ');
  });

  /* ---- stagger helpers ---- */
  qsa('.stair').forEach((el, i) => el.style.setProperty('--k', i));
  qsa('.illo').forEach(svg => qsa('[pathLength]', svg).forEach((p, i) => {
    p.removeAttribute('pathLength');
    const len = Math.ceil(p.getTotalLength ? p.getTotalLength() : 600) + 2;
    p.style.setProperty('--len', len);
    p.style.setProperty('--d', i);
    p.classList.add('ln');
  }));
  qsa('.cities li').forEach((el, i) => el.style.transitionDelay = `${i * 70}ms`);
  qsa('.props__grid .prop').forEach((el, i) => el.style.transitionDelay = `${(i % 3) * 90}ms`);

  /* ---- hero intro ---- */
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(ready);
  else ready();

  /* ---- reveal on view (IntersectionObserver + scroll sweep backup, so nothing is left blank) ---- */
  const targets = qsa('[data-words], [data-rise], .stairs, .card');
  const show = el => el.classList.add('is-in');
  if (flat || reduce || !('IntersectionObserver' in window)) targets.forEach(show);
  else {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach(el => io.observe(el));
    const sweep = () => {
      const lim = innerHeight * 0.95;
      targets.forEach(el => {
        if (el.classList.contains('is-in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < lim && r.bottom > 0 && r.left < innerWidth && r.right > 0) show(el);
        else if (r.bottom < 0) show(el); // flew past it
      });
    };
    addEventListener('scroll', sweep, { passive: true });
    addEventListener('load', sweep);
  }

  /* ---- stat bars: fill one after another, tied to scroll ---- */
  const stairs = qs('#stairs');
  const bars = qsa('.stair__bar');
  const fixedP = new URLSearchParams(location.search).get('p');
  const setBars = p => bars.forEach((b, i) => b.style.setProperty('--fill', clamp((p - i * 0.17) / 0.49).toFixed(4)));
  const scrub = () => {
    if (fixedP !== null) return setBars(parseFloat(fixedP));
    if (flat || reduce) return setBars(1);
    const r = stairs.getBoundingClientRect();
    const start = innerHeight * 0.92, end = innerHeight * 0.18;
    setBars(clamp((start - r.top) / (start - end)));
  };

  /* ---- nav ---- */
  const nav = qs('#nav');
  const navState = () => nav.classList.toggle('is-solid', scrollY > 40);
  qs('.nav__menu').addEventListener('click', e => {
    const open = nav.classList.toggle('is-open');
    e.currentTarget.setAttribute('aria-expanded', open);
  });
  qsa('.nav__links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('is-open')));

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { scrub(); navState(); ticking = false; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  scrub(); navState();

  /* ---- services track: drag, arrows ---- */
  const track = qs('#track');
  const step = () => { const c = qs('.card', track); return c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 16); };
  qsa('.arrow').forEach(b => b.addEventListener('click', () =>
    track.scrollBy({ left: step() * +b.dataset.dir, behavior: reduce ? 'auto' : 'smooth' })));
  let down = null;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    down = { x: e.clientX, left: track.scrollLeft, moved: false };
  });
  addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (!down.moved && Math.abs(dx) > 4) { down.moved = true; track.classList.add('is-drag'); }
    if (down.moved) track.scrollLeft = down.left - dx;
  });
  addEventListener('pointerup', () => {
    if (!down) return;
    const moved = down.moved; down = null;
    if (!moved) return;
    // glide to the nearest card, then restore snapping
    const s = step(), target = Math.round(track.scrollLeft / s) * s;
    track.scrollTo({ left: target, behavior: 'smooth' });
    setTimeout(() => track.classList.remove('is-drag'), 450);
  });
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      track.scrollBy({ left: step() * (e.key === 'ArrowRight' ? 1 : -1), behavior: 'smooth' });
    }
  });

  /* ---- painted backdrop for services (drawn once, low-res then stretched for a soft brushed look) ---- */
  const canvas = qs('.services__paint');
  const paint = () => {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W || !H) return;
    const S = 0.34;                      // render scale: lower = softer
    const w = Math.ceil(W * S), h = Math.ceil(H * S);
    canvas.width = w; canvas.height = h;
    const c = canvas.getContext('2d');
    let seed = 20261116;
    const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    const u = Math.max(w, 1) / 600;      // unit relative to width

    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#E4EAE3'); g.addColorStop(.42, '#DCE5DB'); g.addColorStop(.6, '#CBD8CA'); g.addColorStop(.72, '#D3DDD1'); g.addColorStop(1, '#DCE4D8');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.lineCap = 'round';

    const stroke = (x, y, len, lw, col, a, wob = 0.6) => {
      c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = lw;
      c.beginPath(); c.moveTo(x, y);
      const n = 4;
      for (let k = 1; k <= n; k++) c.lineTo(x + len * k / n, y + (rnd() - .5) * lw * wob);
      c.stroke();
    };
    // sky: long soft horizontal strokes
    const sky = ['#F3F5F0', '#E9EEE8', '#D8E2DB', '#CCD8D3', '#DDE4E2'];
    for (let i = 0; i < 260; i++) {
      const y = Math.pow(rnd(), 1.2) * h * .56;
      stroke(rnd() * w * 1.1 - w * .1, y, (40 + rnd() * 220) * u, (6 + rnd() * 26) * u, pick(sky), .1 + rnd() * .22);
    }
    // distant tree line: clustered dabs
    const trees = ['#86A07F', '#729070', '#97AE8F', '#A9BC9C', '#62806A', '#B7C4A6'];
    const horizon = h * .63;
    for (let i = 0; i < 1500; i++) {
      const x = rnd() * w;
      const clump = .5 + .5 * Math.sin(x / w * 9.0 + 1.3) * Math.sin(x / w * 3.3);
      if (rnd() > .25 + clump * .75) continue;
      const tall = (6 + rnd() * 34 * (0.4 + clump)) * u;
      c.globalAlpha = .18 + rnd() * .32; c.strokeStyle = pick(trees); c.lineWidth = (2 + rnd() * 7) * u;
      c.beginPath(); c.moveTo(x, horizon + rnd() * 4 * u); c.lineTo(x + (rnd() - .5) * 6 * u, horizon - tall); c.stroke();
    }
    // reflection: same colours, fainter, streaking downward
    for (let i = 0; i < 900; i++) {
      const x = rnd() * w;
      const len = (8 + rnd() * 46) * u;
      c.globalAlpha = .07 + rnd() * .16; c.strokeStyle = pick(trees); c.lineWidth = (2 + rnd() * 8) * u;
      const y0 = horizon + 4 * u + rnd() * 10 * u;
      c.beginPath(); c.moveTo(x, y0); c.lineTo(x + (rnd() - .5) * 3 * u, y0 + len); c.stroke();
    }
    // water and haze: pale horizontal strokes
    const haze = ['#E8EEE7', '#DDE6DC', '#F1F3EE', '#CFDBD0'];
    for (let i = 0; i < 260; i++) {
      const y = horizon + rnd() * (h - horizon);
      stroke(rnd() * w * 1.1 - w * .1, y, (30 + rnd() * 200) * u, (3 + rnd() * 16) * u, pick(haze), .12 + rnd() * .3, .3);
    }
    c.globalAlpha = 1;
  };
  let lastW = 0;
  const repaint = () => { if (canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; paint(); } };
  repaint();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(repaint, 200); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (canvas.clientHeight && canvas.height !== Math.ceil(canvas.clientHeight * .34)) { lastW = 0; repaint(); } }).observe(canvas);
})();
