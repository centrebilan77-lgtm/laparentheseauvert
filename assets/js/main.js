/* La Parenthèse au vert — interactions & scroll effects (vanilla, no build step) */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 4);

  let vw = innerWidth;
  let vh = innerHeight;
  const isMobile = () => vw <= 900;

  /* ---------------------------------------------------------
     Smooth scroll (Lenis, if the CDN loaded)
     --------------------------------------------------------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
  }
  const lockScroll = on => {
    body.classList.toggle('is-locked', on);
    if (lenis) on ? lenis.stop() : lenis.start();
  };

  /* ---------------------------------------------------------
     Loader → hero intro
     --------------------------------------------------------- */
  const t0 = performance.now();
  const onReady = [];
  const boot = () => {
    body.classList.add('is-opening');
    setTimeout(() => {
      body.classList.add('is-loaded');
      lockScroll(false);
      onReady.forEach(fn => fn());
    }, reduce ? 0 : 950);
  };
  if (reduce) {
    body.classList.add('is-opening', 'is-loaded');
    requestAnimationFrame(() => onReady.forEach(fn => fn()));
  } else {
    lockScroll(true);
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, new Promise(r => setTimeout(r, 2500))]).then(() => {
      // leave the logo time to draw itself in the loader
      setTimeout(boot, Math.max(0, 1500 - (performance.now() - t0)));
    });
  }

  /* ---------------------------------------------------------
     Anchor links & mobile menu
     --------------------------------------------------------- */
  const burger = $('.nav__burger');
  const menu = $('#menu');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    lockScroll(open);
    // the logo draws itself as the menu slides down
    const ml = $('.menu__logo .logo');
    if (ml) setTimeout(() => ml.classList.toggle('is-drawn', open), open ? 350 : 0);
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));

  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : (id.length > 1 ? $(id) : null);
      if (target === null) return;
      e.preventDefault();
      if (body.classList.contains('menu-open')) setMenu(false);
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else if (target === 0) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------------------------------------------------------
     Nav: hide on scroll down, show on scroll up
     --------------------------------------------------------- */
  const nav = $('[data-nav]');
  let navLastY = 0;
  const updateNav = y => {
    if (body.classList.contains('menu-open')) { nav.classList.remove('is-hidden', 'is-dark'); navLastY = y; return; }
    const dy = y - navLastY;
    if (y > 160 && dy > 3) nav.classList.add('is-hidden');
    else if (dy < -3 || y <= 160) nav.classList.remove('is-hidden');
    navLastY = y;
    // night blue over the dark zones (and over the day section once night has fallen)
    const probe = y + 34;
    let dark = geo.night.some(z => probe >= z.top && probe < z.top + z.h);
    if (!dark && dayDark) dark = probe >= geo.d.top && probe < geo.d.top + geo.d.h;
    nav.classList.toggle('is-dark', dark);
  };

  /* ---------------------------------------------------------
     Cursor follower
     --------------------------------------------------------- */
  const cursor = $('.cursor');
  const ring = $('.cursor__ring');
  const label = $('.cursor__label');
  let mx = -200, my = -200, rx = -200, ry = -200;
  if (fine && !reduce) {
    body.classList.add('has-cursor');
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor], a, button, summary');
      cursor.classList.remove('is-hover', 'is-view', 'is-off');
      if (!t) return;
      const kind = t.dataset.cursor;
      if (kind === 'off') { cursor.classList.add('is-off'); return; } // the neural network draws its own cursor
      const text = kind === 'view' ? 'Voir' : (t.dataset.cursorLabel || '');
      if (text) { label.textContent = text; cursor.classList.add('is-view'); }
      else cursor.classList.add('is-hover');
    });
  }

  /* ---------------------------------------------------------
     Magnetic pills & tilt cards
     --------------------------------------------------------- */
  if (fine && !reduce) {
    $$('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * .22}px, ${y * .32}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointerenter', () => {
        el.style.transition = 'transform .25s ease-out, background-color .6s var(--ease), color .6s var(--ease)';
      });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(1000px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-6px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .9s var(--ease), background-color .6s var(--ease), color .6s var(--ease)';
        el.style.transform = '';
      });
    });
  }

  /* ---------------------------------------------------------
     Text splitting helpers
     --------------------------------------------------------- */
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const splitWords = (el, cls) => {
    const words = el.textContent.trim().split(/ +/);
    el.innerHTML = words.map((w, k) => `<span class="${cls}" style="--k:${k}">${esc(w)}</span>`).join(' ');
    return $$('.' + cls, el);
  };

  /* ---------------------------------------------------------
     Logo — injected wherever [data-logo] asks for it
     --------------------------------------------------------- */
  const logoSVG = cls => `<svg class="logo ${cls}" viewBox="0 0 360 372" aria-hidden="true" focusable="false">` +
    '<circle class="logo__ring" cx="259.5" cy="95.5" r="74.5" pathLength="1"/>' +
    '<path class="logo__swoosh" pathLength="1" d="M19 346C19 268 55 220 102 220C150 220 187 266 190 338C190 250 200 160 259 98"/></svg>';
  $$('[data-logo]').forEach(el => el.insertAdjacentHTML('beforeend', logoSVG(el.dataset.logo || '')));

  // Section labels: "(01) — Le séjour" → "(01) [logo] Le séjour"
  $$('.label').forEach(l => {
    const parts = l.textContent.split(' — ');
    if (parts.length < 2) return;
    l.innerHTML = `<span>${esc(parts[0])}</span>${logoSVG('logo--draw label__logo')}<span>${esc(parts.slice(1).join(' — '))}</span>`;
  });

  // Draw each logo once it comes into view
  const logoIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-drawn');
      logoIO.unobserve(en.target);
    });
  }, { threshold: .35 });
  onReady.push(() => $$('.logo--draw').forEach(l => {
    if (!l.closest('.loader, .menu')) logoIO.observe(l);
  }));

  /* ---------------------------------------------------------
     Immersive photo bands
     --------------------------------------------------------- */
  const immersives = $$('[data-immersive]');
  const immIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      immIO.unobserve(en.target);
    });
  }, { threshold: .45 });
  onReady.push(() => immersives.forEach(el => immIO.observe(el)));

  // embers rising from the fire (left part of the picture)
  $$('.immersive__embers').forEach(box => {
    if (reduce) return;
    let html = '';
    for (let n = 0; n < 26; n++) {
      const r = (a, b) => (a + Math.random() * (b - a)).toFixed(2);
      html += `<i style="--x:${r(4, 58)}%;--s:${r(2, 5)}px;--d:${r(4.5, 9)}s;--delay:${r(-9, 0)}s;--drift:${r(-60, 90)}px"></i>`;
    }
    box.innerHTML = html;
  });

  // Contact: hover throws the stroke again
  const contactLogo = $('.contact__logo .logo');
  $('.contact__logo').addEventListener('pointerenter', () => {
    if (reduce || !contactLogo.classList.contains('is-drawn')) return;
    contactLogo.classList.remove('is-drawn');
    void contactLogo.getBoundingClientRect();
    contactLogo.classList.add('is-drawn');
  });

  // Manifesto: words ink in as you read
  const mText = $('[data-words]');
  const mWords = splitWords(mText, 'wd');

  // Testimonials: words fade in
  $$('.voice p').forEach(p => splitWords(p, 'vw'));

  // Contact title: letter by letter
  const letters = $('[data-letters]');
  let k = 0;
  $$('.line', letters).forEach(line => {
    Array.from(line.childNodes).forEach(node => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const ch of node.textContent) {
          if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
          const s = document.createElement('span');
          s.className = 'ch'; s.style.setProperty('--k', k++); s.textContent = ch;
          frag.appendChild(s);
        }
        node.replaceWith(frag);
      } else if (node.nodeType === 1) {
        node.classList.add('ch'); node.style.setProperty('--k', k++);
      }
    });
  });

  /* ---------------------------------------------------------
     Reveal on enter + counters
     --------------------------------------------------------- */
  const countUp = el => {
    const target = +el.dataset.count;
    if (reduce) { el.textContent = target; return; }
    const start = performance.now();
    const step = now => {
      const p = clamp((now - start) / 1700);
      el.textContent = Math.round(target * easeOut(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      $$('[data-count]', en.target).forEach(countUp);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .08 });
  onReady.push(() => $$('.reveal, .g, [data-letters], .stat, [data-clip]').forEach(el => io.observe(el)));

  /* ---------------------------------------------------------
     Marquee (speed follows scroll velocity)
     --------------------------------------------------------- */
  const marquee = $('.marquee');
  let marqueeSlow = 1;
  const rows = $$('.marquee__row').map(row => {
    const track = $('.marquee__track', row);
    const html = track.innerHTML;
    track.innerHTML = '';
    return { row, track, html, dir: +row.dataset.dir || -1, x: 0, w: 1 };
  });
  const buildMarquee = () => {
    rows.forEach(r => {
      r.track.innerHTML = '';
      const unit = () => {
        const u = document.createElement('div');
        u.className = 'marquee__unit';
        u.innerHTML = r.html;
        r.track.appendChild(u);
        return u;
      };
      const first = unit();
      r.w = first.offsetWidth || 1;
      const n = Math.ceil((vw * 2) / r.w) + 1;
      for (let i = 0; i < n; i++) unit().setAttribute('aria-hidden', 'true');
    });
  };
  marquee.addEventListener('pointerenter', () => { marqueeSlow = .25; });
  marquee.addEventListener('pointerleave', () => { marqueeSlow = 1; });

  /* ---------------------------------------------------------
     Cached geometry
     --------------------------------------------------------- */
  const heroText = $('.hero__text');
  const heroCue = $('.hero__scroll');
  const heroArt = $('.hero__art'); // the neural network itself lives in neural-logo.js

  const unveil = $('.unveil');
  const keys = $('.keys');
  const keysTrack = $('.keys__track');
  const keysBar = $('.keys__bar');
  const day = $('.day');
  const moments = $$('.moment');
  const hourEl = $('[data-hour]');
  const sun = $('[data-sun]');
  const dayTrail = $('[data-trail]');
  const unveilLogo = $('.unveil__logo');
  const gTrail = $('[data-gtrail]');
  const gTrailSwoosh = $('.logo__swoosh', gTrail);
  const gTrailRing = $('.logo__ring', gTrail);
  const figures = $$('.g');
  const footer = $('.footer');
  const footLetters = $$('[data-mark] span');
  const progress = $('.progress span');

  const geo = { m: {}, u: {}, k: {}, d: {}, f: {}, t: {}, moments: [], figs: [], imm: [], night: [], doc: 1 };
  let keysDist = 0;

  const absTop = el => el.getBoundingClientRect().top + scrollY;

  const measure = () => {
    vw = innerWidth; vh = innerHeight;
    document.documentElement.style.setProperty('--sbw', `${innerWidth - document.documentElement.clientWidth}px`);

    // horizontal keys section
    if (!isMobile() && !reduce) {
      keysDist = Math.max(0, keysTrack.scrollWidth - vw);
      keys.style.height = (keysDist + vh) + 'px';
    } else {
      keysDist = 0;
      keys.style.height = '';
    }

    geo.m = { top: absTop(mText), h: mText.offsetHeight };
    geo.u = { top: absTop(unveil), h: unveil.offsetHeight };
    geo.k = { top: absTop(keys), h: keys.offsetHeight };
    geo.d = { top: absTop(day), h: day.offsetHeight };
    geo.f = { top: absTop(footer), h: footer.offsetHeight };
    geo.t = { top: absTop(gTrail), h: gTrail.getBoundingClientRect().height };
    geo.imm = immersives.map(el => ({ el, top: absTop(el), h: el.offsetHeight }));
    geo.night = $$('section.zone-night, footer.zone-night').map(el => ({ top: absTop(el), h: el.offsetHeight }));
    geo.moments = moments.map(m => {
      const top = absTop(m);
      return { el: m, c: top + m.offsetHeight / 2, min: toMin(m.dataset.time) };
    });
    geo.figs = figures.map(f => {
      f.style.transform = '';
      return { el: f, img: $('img', f), top: absTop(f), h: f.offsetHeight, s: +f.dataset.speed || 0 };
    });
    geo.doc = Math.max(1, document.documentElement.scrollHeight - vh);
    if (!reduce) updateUnveil(scrollY);
  };

  /* Unveil: the photo is seen through the ring of the logo, then we fly through it */
  const LOGO_CX = 259.5, LOGO_CY = 95.5, LOGO_HOLE = 56.25; // ring centre & inner radius (viewBox units)
  function updateUnveil(y) {
    const u = geo.u;
    const p = clamp((y - u.top) / Math.max(1, u.h - vh));
    const e = easeInOut(clamp(p / .7));
    const r0 = Math.min(vw, vh) * .17;
    const r1 = Math.hypot(vw, vh) / 2 + 30;
    const r = lerp(r0, r1, e);
    unveil.style.setProperty('--cr', `${(r + 4).toFixed(1)}px`);
    unveil.style.setProperty('--is', lerp(1.3, 1, e).toFixed(4));
    unveil.style.setProperty('--co', clamp((p - .5) / .3).toFixed(3));
    const s = r / LOGO_HOLE;
    unveilLogo.style.transform = `translate(${(vw / 2 - LOGO_CX * s).toFixed(1)}px, ${(vh / 2 - LOGO_CY * s).toFixed(1)}px) scale(${s.toFixed(4)})`;
    unveilLogo.style.opacity = (1 - clamp(e / .3)).toFixed(3);
  }

  const toMin = t => {
    const [h, m] = t.split('h').map(Number);
    return h * 60 + (m || 0);
  };

  let measureQueued = false;
  const queueMeasure = () => {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => { measureQueued = false; measure(); });
  };
  let lastVw = vw;
  addEventListener('resize', () => {
    const widthChanged = innerWidth !== lastVw;
    lastVw = innerWidth;
    vw = innerWidth; vh = innerHeight;
    if (widthChanged) buildMarquee();
    queueMeasure();
  });
  if ('ResizeObserver' in window) new ResizeObserver(queueMeasure).observe(body);

  /* ---------------------------------------------------------
     Day → night palette
     --------------------------------------------------------- */
  const dayStops = [
    [540, [235, 245, 252]],  // 09h00 — very light sky
    [870, [221, 237, 250]],  // 14h30 — bright midday blue
    [1020, [200, 219, 240]], // 17h00 — late afternoon
    [1185, [52, 76, 122]],   // 19h45 — dusk blue
    [1230, [14, 27, 54]]     // 20h30 — night blue
  ];
  const mixRGB = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  const colorAt = min => {
    if (min <= dayStops[0][0]) return dayStops[0][1];
    for (let i = 1; i < dayStops.length; i++) {
      if (min <= dayStops[i][0]) {
        const [m0, c0] = dayStops[i - 1];
        const [m1, c1] = dayStops[i];
        return mixRGB(c0, c1, (min - m0) / (m1 - m0));
      }
    }
    return dayStops[dayStops.length - 1][1];
  };
  const INK = [18, 33, 61], CREAM = [241, 247, 253], GRAY = [86, 104, 138], MUTE_N = [163, 183, 211];
  let activeMoment = -1;
  let dayDark = false; // night has fallen in the day section

  const setHour = text => {
    if (hourEl.textContent === text) return;
    hourEl.textContent = text;
    if (reduce) return;
    hourEl.classList.remove('is-swap');
    void hourEl.offsetWidth;
    hourEl.classList.add('is-swap');
  };

  const updateDay = y => {
    const g = geo.d;
    if (y + vh < g.top - 200 || y > g.top + g.h + 200) return;
    const mid = y + vh * .5;
    const ms = geo.moments;
    if (!ms.length) return;

    // continuous "time of day" following the reading line
    let minutes = ms[0].min;
    if (mid >= ms[ms.length - 1].c) minutes = ms[ms.length - 1].min;
    else if (mid > ms[0].c) {
      for (let i = 0; i < ms.length - 1; i++) {
        if (mid >= ms[i].c && mid < ms[i + 1].c) {
          const t = (mid - ms[i].c) / (ms[i + 1].c - ms[i].c);
          minutes = lerp(ms[i].min, ms[i + 1].min, t);
          break;
        }
      }
    }

    const bg = colorAt(minutes);
    const lum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
    const ft = clamp((0.62 - lum) / 0.22);
    day.style.setProperty('--day-bg', rgb(bg));
    day.style.setProperty('--day-fg', rgb(mixRGB(INK, CREAM, ft)));
    day.style.setProperty('--day-mute', rgb(mixRGB(GRAY, MUTE_N, ft)));
    day.style.setProperty('--day-navy', rgb(mixRGB([33, 63, 125], [126, 156, 219], ft))); // reversed logo at night
    dayDark = ft > .5;

    // sun travels along the arc, turns into a crescent moon at dusk
    const t = clamp((minutes - 540) / (1230 - 540));
    const ang = Math.PI - (0.1 + t * 0.8) * Math.PI;
    const sx = 150 + 130 * Math.cos(ang);
    const sy = 150 - 130 * Math.sin(ang);
    sun.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
    sun.style.setProperty('--moon', clamp((minutes - 1150) / 60).toFixed(3));
    dayTrail.style.strokeDashoffset = (1 - (0.1 + t * 0.8)).toFixed(4);

    // active moment = closest to the reading line
    let best = 0, bestD = Infinity;
    ms.forEach((m, i) => { const d = Math.abs(m.c - mid); if (d < bestD) { bestD = d; best = i; } });
    if (best !== activeMoment) {
      activeMoment = best;
      ms.forEach((m, i) => m.el.classList.toggle('is-active', i === best));
      setHour(ms[best].el.dataset.time);
    }
  };

  /* ---------------------------------------------------------
     Testimonials slider (progress bar drives the timer)
     --------------------------------------------------------- */
  const voicesSec = $('.voices');
  const voices = $$('.voice');
  const dots = $$('.voices__dots button');
  let vIdx = 0;
  const goVoice = n => {
    n = (n + voices.length) % voices.length;
    if (n === vIdx) return;
    const prev = voices[vIdx];
    prev.classList.remove('is-active');
    prev.classList.add('is-leaving');
    setTimeout(() => prev.classList.remove('is-leaving'), 700);
    vIdx = n;
    setTimeout(() => voices[vIdx].classList.add('is-active'), reduce ? 0 : 250);
    dots.forEach((d, i) => d.classList.toggle('is-active', i === vIdx));
  };
  dots.forEach((d, i) => {
    d.addEventListener('click', () => goVoice(i));
    if (!reduce) d.addEventListener('animationend', e => { if (e.animationName === 'ringfill' && i === vIdx) goVoice(vIdx + 1); });
  });
  $('.voices__stage').addEventListener('pointerenter', () => voicesSec.classList.add('is-paused'));
  $('.voices__stage').addEventListener('pointerleave', () => voicesSec.classList.remove('is-paused'));
  // only run the timer while visible
  new IntersectionObserver(([en]) => voicesSec.classList.toggle('is-paused', !en.isIntersecting), { threshold: .3 }).observe(voicesSec);

  /* ---------------------------------------------------------
     FAQ — animated <details>
     --------------------------------------------------------- */
  $$('.qa').forEach(d => {
    const s = $('summary', d);
    const a = $('.qa__a', d);
    s.addEventListener('click', e => {
      e.preventDefault();
      if (reduce || !a.animate) { d.open = !d.open; return; }
      if (d.open) {
        d.classList.add('is-closing');
        const anim = a.animate([{ height: a.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.65,0,.35,1)' });
        anim.onfinish = () => { d.open = false; d.classList.remove('is-closing'); };
      } else {
        d.open = true;
        a.animate([{ height: '0px', opacity: 0 }, { height: a.offsetHeight + 'px', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  });

  /* ---------------------------------------------------------
     Lightbox
     --------------------------------------------------------- */
  const lb = $('.lightbox');
  const lbImg = $('.lightbox__fig img', lb);
  const lbCap = $('.lightbox__fig figcaption', lb);
  const gBtns = $$('.g__btn');
  let lbIdx = 0, lbReturn = null;
  const lbShow = i => {
    lbIdx = (i + gBtns.length) % gBtns.length;
    const src = $('img', gBtns[lbIdx]);
    lbImg.style.transition = 'none';
    lbImg.classList.remove('is-shown');
    void lbImg.offsetWidth;
    lbImg.style.transition = '';
    const pre = new Image();
    pre.onload = () => {
      lbImg.src = pre.src;
      lbImg.alt = src.alt;
      lbCap.textContent = gBtns[lbIdx].nextElementSibling.textContent;
      requestAnimationFrame(() => requestAnimationFrame(() => lbImg.classList.add('is-shown')));
    };
    pre.src = src.currentSrc || src.src;
  };
  const lbOpen = i => {
    lbReturn = document.activeElement;
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    lbShow(i);
    $('.lightbox__close', lb).focus({ preventScroll: true });
  };
  const lbClose = () => {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    if (lbReturn) lbReturn.focus({ preventScroll: true });
  };
  gBtns.forEach((b, i) => b.addEventListener('click', () => lbOpen(i)));
  $('.lightbox__close', lb).addEventListener('click', lbClose);
  $('.lightbox__nav--prev', lb).addEventListener('click', () => lbShow(lbIdx - 1));
  $('.lightbox__nav--next', lb).addEventListener('click', () => lbShow(lbIdx + 1));
  lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && body.classList.contains('menu-open')) setMenu(false);
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
    if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
  });

  /* ---------------------------------------------------------
     Main loop
     --------------------------------------------------------- */
  let lastY = scrollY;
  let vel = 0;
  let scrollDir = 1;
  let lastT = performance.now();
  let ready = false;

  const frame = now => {
    const dt = Math.min(64, now - lastT) / 16.667;
    lastT = now;
    if (lenis) lenis.raf(now);

    const y = scrollY;
    const dy = y - lastY;
    lastY = y;
    vel = lerp(vel, dy, .15);
    if (Math.abs(dy) > .5) scrollDir = Math.sign(dy);

    // progress bar + nav
    progress.style.transform = `scaleX(${clamp(y / geo.doc)})`;
    updateNav(y);

    // cursor ring
    if (fine && !reduce) {
      rx = lerp(rx, mx, .2); ry = lerp(ry, my, .2);
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    }

    if (ready && !reduce) {
      // hero: the network rises and fades as you scroll away
      if (y < vh * 1.2) {
        const hp = clamp(y / vh);
        heroArt.style.transform = `translateY(${(-hp * 50).toFixed(1)}px) scale(${(1 - hp * .06).toFixed(3)})`;
        heroArt.style.opacity = hp > 0 ? (1 - hp * .85).toFixed(3) : '';
        heroText.style.transform = `translateY(${(y * .08).toFixed(1)}px)`;
        heroText.style.opacity = (1 - hp * .7).toFixed(3);
        heroCue.style.opacity = (1 - clamp(y / 120)).toFixed(3);
      }

      // marquee
      rows.forEach(r => {
        const speed = (.6 + Math.min(Math.abs(vel) * .35, 9)) * marqueeSlow * dt;
        r.x += r.dir * scrollDir * speed;
        if (r.x <= -r.w) r.x += r.w;
        if (r.x > 0) r.x -= r.w;
        r.track.style.transform = `translate3d(${r.x.toFixed(2)}px,0,0)`;
      });

      // unveil: through the ring of the logo
      const u = geo.u;
      if (y + vh > u.top && y < u.top + u.h) updateUnveil(y);

      // keys horizontal travel — the logo hops along the progress line
      if (keysDist > 0) {
        const kg = geo.k;
        const p = clamp((y - kg.top) / keysDist);
        keysTrack.style.transform = `translate3d(${(-p * keysDist).toFixed(1)}px,0,0)`;
        keysBar.style.setProperty('--kp', p.toFixed(4));
        keysBar.style.setProperty('--hy', `${(-Math.abs(Math.sin(p * Math.PI * 6)) * 18).toFixed(1)}px`);
      }

      // immersive bands: open between parentheses, then drift (parallax)
      geo.imm.forEach(b => {
        if (y + vh < b.top - 80 || y > b.top + b.h + 80) return;
        const t = clamp((y + vh - b.top) / (vh * .9));
        const open = 1 - (1 - t) * (1 - t); // gentle: the opening stays visible while the band enters
        const pass = clamp((y + vh - b.top) / (vh + b.h));
        b.el.style.setProperty('--ix', `${((1 - open) * 34).toFixed(2)}%`);
        b.el.style.setProperty('--iy', `${((pass - .5) * -b.h * .16).toFixed(1)}px`);
        b.el.style.setProperty('--iz', (1.16 - .16 * open).toFixed(4));
        b.el.style.setProperty('--po', (1 - open * .78).toFixed(3));
      });

      // gallery: the logo is drawn like a path as you walk down the photos
      const gt = geo.t;
      if (y + vh > gt.top && y < gt.top + gt.h + vh) {
        const p = clamp((y + vh * .75 - gt.top) / (gt.h * .95));
        gTrailSwoosh.style.strokeDashoffset = (1.01 * (1 - clamp(p / .75))).toFixed(4);
        gTrailRing.style.strokeDashoffset = (1.01 * (1 - clamp((p - .7) / .3))).toFixed(4);
      }

      // gallery parallax
      if (!isMobile()) {
        geo.figs.forEach(f => {
          const c = f.top + f.h / 2 - y - vh / 2;
          if (Math.abs(c) > vh * 1.5) return;
          f.el.style.transform = `translate3d(0, ${(-c * f.s).toFixed(1)}px, 0)`;
          f.img.style.setProperty('--py', `${clamp(c * .05, -f.h * .05, f.h * .05).toFixed(1)}px`);
        });
      }

      // footer wordmark rises letter by letter
      const fg = geo.f;
      if (y + vh > fg.top) {
        const p = clamp((y + vh - fg.top) / (fg.h * .9));
        footLetters.forEach((s, i) => {
          const lp = clamp(p * 1.7 - i * .06);
          s.style.setProperty('--fy', `${((1 - easeOut(lp)) * 70).toFixed(1)}%`);
          s.style.setProperty('--fo', lp.toFixed(3));
        });
      }
    }

    if (ready) {
      // manifesto words (colour only — fine with reduced motion too)
      const m = geo.m;
      if (y + vh > m.top && y < m.top + m.h + vh) {
        const p = clamp((y + vh * .82 - m.top) / (m.h + vh * .3));
        const n = Math.floor(p * (mWords.length + 1));
        for (let i = 0; i < mWords.length; i++) mWords[i].classList.toggle('on', i < n);
      }
      updateDay(y);
    }

    requestAnimationFrame(frame);
  };

  onReady.push(() => {
    buildMarquee();
    measure();
    ready = true;
    // after its intro fade, the scroll cue follows the scroll instantly
    setTimeout(() => { heroCue.style.transition = 'opacity .3s'; }, 2700);
  });
  requestAnimationFrame(frame);

  // footer year
  const yr = $('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
