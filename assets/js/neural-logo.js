/* La Parenthèse au vert — a neural network that traces the logo as the cursor moves.
   Every movement of the pointer over the hero recruits neurons along the logo (the bouncing
   stroke first, then the ring). Once the trace is complete — or on click / tap — the network
   jolts: the "sursaut". Left alone, it slowly lets go and dissolves back into a loose network. */
(() => {
  'use strict';

  const canvas = document.querySelector('[data-neural]');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.closest('.hero') || document.body;
  const hint = document.querySelector('[data-neural-hint]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const CYAN = '0,173,239';
  const NAVY = '33,63,125';
  const INK = '18,33,61'; // night-blue ink, as the rest of the site
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- Logo geometry (same viewBox as assets/img/logo.svg: 360 × 372) ---------- */
  const SEGMENTS = [
    [[19, 346], [19, 268], [55, 220], [102, 220]],
    [[102, 220], [150, 220], [187, 266], [190, 338]],
    [[190, 338], [190, 250], [200, 160], [259, 98]]
  ];
  const RING = { cx: 259.5, cy: 95.5, r: 74.5 };
  const HALF = 17; // half the stroke width of the logo

  const cubic = (s, t) => {
    const u = 1 - t;
    return [
      u * u * u * s[0][0] + 3 * u * u * t * s[1][0] + 3 * u * t * t * s[2][0] + t * t * t * s[3][0],
      u * u * u * s[0][1] + 3 * u * u * t * s[1][1] + 3 * u * t * t * s[2][1] + t * t * t * s[3][1]
    ];
  };
  const stroke = [];
  SEGMENTS.forEach((s, k) => { for (let i = k ? 1 : 0; i <= 48; i++) stroke.push(cubic(s, i / 48)); });
  const acc = [0];
  for (let i = 1; i < stroke.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(stroke[i][0] - stroke[i - 1][0], stroke[i][1] - stroke[i - 1][1]));
  }
  const LEN_STROKE = acc[acc.length - 1];
  const LEN_RING = 2 * Math.PI * RING.r;
  const SPLIT = LEN_STROKE / (LEN_STROKE + LEN_RING); // s < SPLIT: bouncing stroke, s ≥ SPLIT: ring

  // point + unit normal on the logo at s ∈ [0, 1]
  const logoPoint = s => {
    if (s < SPLIT) {
      const d = (s / SPLIT) * LEN_STROKE;
      let i = 1;
      while (i < acc.length - 1 && acc[i] < d) i++;
      const t = (d - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1);
      const a = stroke[i - 1], b = stroke[i];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), nx: -dy / l, ny: dx / l, ring: false };
    }
    // the ring starts where the stroke enters it (lower left) and turns clockwise
    const ang = (135 + ((s - SPLIT) / (1 - SPLIT)) * 360) * Math.PI / 180;
    const c = Math.cos(ang), sn = Math.sin(ang);
    return { x: RING.cx + RING.r * c, y: RING.cy + RING.r * sn, nx: c, ny: sn, ring: true };
  };

  /* ---------- Network ---------- */
  let W = 0, H = 0, M = 0, scale = 1, ox = 0, oy = 0;
  let nodes = [];
  let chain = []; // logo neurons sorted along the logo, for the travelling signals
  const count = () => (W < 380 ? 150 : 230);
  const AMBIENT = .24; // share of free neurons that never join the logo

  const build = () => {
    const n = count();
    const nLogo = Math.round(n * (1 - AMBIENT));
    nodes = [];
    for (let i = 0; i < n; i++) {
      const logo = i < nLogo;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * .47;
      nodes.push({
        logo,
        s: logo ? (i + Math.random() * .7) / nLogo : -1,
        off: (Math.random() * 2 - 1) * HALF * .92,
        hx: .5 + Math.cos(a) * r, hy: .5 + Math.sin(a) * r * 1.02, // rest position: a loose round cloud
        ph: Math.random() * Math.PI * 2, sp: .25 + Math.random() * .6,
        z: .4 + Math.random() * 1.1, // depth: far neurons are small and drift against the cursor
        x: 0, y: 0, vx: 0, vy: 0,
        f: 0, ex: 0, ring: false, tx: 0, ty: 0,
        r: logo ? 1.5 + Math.random() * 1.5 : 1.1 + Math.random() * 1.3
      });
    }
    nodes.forEach(nd => { nd.x = nd.hx * W; nd.y = nd.hy * H; });
    chain = nodes.filter(nd => nd.logo).sort((a, b) => a.s - b.s);
    targets();
  };

  const targets = () => {
    nodes.forEach(nd => {
      if (!nd.logo) return;
      const p = logoPoint(nd.s);
      nd.tx = ox + (p.x + p.nx * nd.off) * scale;
      nd.ty = oy + (p.y + p.ny * nd.off) * scale;
      nd.ring = p.ring;
    });
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    W = rect.width; H = rect.height; M = Math.min(W, H);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min((W * .8) / 360, (H * .8) / 372);
    ox = (W - 360 * scale) / 2;
    oy = (H - 372 * scale) / 2 - H * .02;
    if (nodes.length !== count()) build(); else targets();
    if (reduce) { settle(); draw(0); }
  };

  /* ---------- State ---------- */
  let P = 0;            // how much of the logo is traced (0 → 1)
  let hold = 0;         // seconds the full logo is held after a surge
  let idle = 99;        // seconds since the pointer last moved
  let surge = 0;        // 1 → 0 after a surge
  let rush = false;     // a click completes the trace quickly
  let phase = 'wait';   // wait → intro → live (→ intro again when left alone)
  let phaseT = 0;
  let zeroT = 0;        // time spent fully dissolved
  let spawnT = 0;
  let shocks = [];
  let pulses = [];
  const mouse = { x: -9999, y: -9999, on: false, v: 0, lx: null, ly: null };
  const tilt = { x: 0, y: 0 };

  const surgeNow = () => {
    P = 1; hold = 2.8; surge = 1; rush = false;
    const cx = ox + RING.cx * scale, cy = oy + RING.cy * scale;
    nodes.forEach(nd => {
      // the jolt: everything jumps up, the ring bursts outwards, then springs back
      nd.vy -= (nd.logo ? 7 : 4) * (.6 + Math.random() * .7);
      nd.vx += (Math.random() - .5) * 3;
      if (nd.ring) {
        const dx = nd.x - cx, dy = nd.y - cy, d = Math.hypot(dx, dy) || 1;
        nd.vx += dx / d * 5; nd.vy += dy / d * 5;
      }
      nd.ex = 1;
    });
    for (let k = 0; k < 16; k++) pulses.push({ u: -k * .05, sp: .85 + Math.random() * .35, big: true });
    shocks.push({ r: 0, a: 1, c: CYAN }, { r: -M * .12, a: 1, c: NAVY });
    hero.classList.remove('is-surge');
    void hero.offsetWidth;
    hero.classList.add('is-surge');
  };

  const advance = dp => {
    if (hold > 0) return;
    P = Math.min(1, P + dp);
    if (P >= 1) surgeNow();
  };

  /* ---------- Pointer ---------- */
  const onMove = e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.on = mouse.x > -40 && mouse.y > -40 && mouse.x < W + 40 && mouse.y < H + 40;
    if (mouse.lx !== null) {
      const d = Math.hypot(e.clientX - mouse.lx, e.clientY - mouse.ly);
      mouse.v = Math.min(60, d);
      if (phase === 'intro') phase = 'live'; // the visitor takes over
      if (phase === 'live') advance(d / (Math.max(W, 300) * 2.6));
      idle = 0;
      if (hint && d > 2) hint.classList.add('is-used');
    }
    mouse.lx = e.clientX; mouse.ly = e.clientY;
  };
  hero.addEventListener('pointermove', onMove, { passive: true });
  hero.addEventListener('pointerleave', () => { mouse.on = false; mouse.lx = null; });
  canvas.addEventListener('pointerdown', () => {
    if (reduce) return;
    phase = 'live'; idle = 0;
    if (P >= .999 || hold > 0) surgeNow(); else rush = true;
    if (hint) hint.classList.add('is-used');
  });
  if (hint) hint.textContent = fine
    ? 'Bougez la souris : le réseau trace le logo · cliquez pour le sursaut'
    : 'Touchez le réseau pour le sursaut';

  /* ---------- Simulation ---------- */
  const settle = () => {
    P = 1;
    nodes.forEach(nd => {
      nd.f = nd.logo ? 1 : 0;
      nd.x = nd.logo ? nd.tx : nd.hx * W;
      nd.y = nd.logo ? nd.ty : nd.hy * H;
    });
  };

  const step = (dt, t) => {
    const n60 = dt * 60;

    // --- the trace ---
    if (phase === 'wait') {
      if (document.body.classList.contains('is-loaded')) { phaseT += dt; if (phaseT > .6) { phase = 'intro'; phaseT = 0; } }
    } else if (phase === 'intro') {
      phaseT += dt;
      P = easeInOut(clamp(phaseT / 2.8));
      if (phaseT >= 2.8) { surgeNow(); phase = 'live'; }
    }
    if (rush) { P = Math.min(1, P + dt * 2.4); if (P >= 1) surgeNow(); }

    idle += dt;
    if (hold > 0) hold -= dt;
    else if (phase === 'live' && !rush && idle > 1.6) P = Math.max(0, P - dt * .12); // let go, slowly

    // left alone, it traces itself again (always on touch screens, after a long pause with a mouse)
    zeroT = P <= 0 && phase === 'live' ? zeroT + dt : 0;
    if (zeroT > (fine ? 14 : 2.5)) { phase = 'intro'; phaseT = 0; zeroT = 0; }

    surge = Math.max(0, surge - dt * .8);
    mouse.v *= Math.pow(.9, n60);

    // --- neurons ---
    const A = M * .03;
    const reach = M * .25;
    const k = .05 * n60;
    const damp = Math.pow(.86, n60);
    // depth parallax: the loose network turns slightly with the pointer
    const lx = mouse.lx === null ? 0 : clamp(mouse.x / W - .5, -1, 1);
    const ly = mouse.lx === null ? 0 : clamp(mouse.y / H - .5, -1, 1);
    tilt.x = lerp(tilt.x, lx, Math.min(1, .05 * n60));
    tilt.y = lerp(tilt.y, ly, Math.min(1, .05 * n60));
    for (const nd of nodes) {
      const depth = (nd.z - .95) * M * .09;
      let tx = nd.hx * W + Math.sin(t * nd.sp + nd.ph) * A + tilt.x * depth;
      let ty = nd.hy * H + Math.cos(t * nd.sp * .8 + nd.ph) * A + tilt.y * depth;
      if (nd.logo) {
        const goal = smooth(clamp((P - nd.s + .03) / .07));
        nd.f = lerp(nd.f, goal, Math.min(1, .12 * n60));
        const breathe = Math.sin(t * 1.6 + nd.ph) * 1.2;
        tx = lerp(tx, nd.tx + breathe, nd.f);
        ty = lerp(ty, nd.ty + breathe, nd.f);
      }
      if (mouse.on) {
        const dx = mouse.x - nd.x, dy = mouse.y - nd.y, d = Math.hypot(dx, dy);
        if (d < reach) {
          const w = 1 - d / reach;
          nd.ex = Math.max(nd.ex, w);
          if (nd.f < .5) { tx += dx * .24 * w * w; ty += dy * .24 * w * w; }      // free neurons follow the cursor
          else { tx -= dx / (d || 1) * 7 * w; ty -= dy / (d || 1) * 7 * w; }   // the traced logo breathes around it
          nd.vx += (Math.random() - .5) * mouse.v * .05 * w;
          nd.vy += (Math.random() - .5) * mouse.v * .05 * w;
        }
      }
      nd.vx = (nd.vx + (tx - nd.x) * k) * damp;
      nd.vy = (nd.vy + (ty - nd.y) * k) * damp;
      nd.x += nd.vx * n60;
      nd.y += nd.vy * n60;
      nd.ex *= Math.pow(.95, n60);
    }

    // --- signals running along the traced part, from the stroke up into the ring ---
    spawnT += dt;
    if (P > .08 && spawnT > .42) { spawnT = 0; pulses.push({ u: 0, sp: .3 + Math.random() * .12, big: false }); }
    pulses.forEach(p => { p.u += p.sp * dt; });
    pulses = pulses.filter(p => (p.big ? p.u < 1.02 : p.u < P + .01));

    shocks.forEach(s => { s.r += dt * M * 1.25; s.a -= dt * .9; });
    shocks = shocks.filter(s => s.a > 0);
  };

  /* ---------- Rendering ---------- */
  const LEVELS = 6;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    const n = nodes.length;
    const R = M * .12, RR = R * R;
    const RL = M * .072, RRL = RL * RL;
    const paths = new Array(3 * LEVELS).fill(null);
    const add = (col, alpha, a, b) => {
      const lv = Math.min(LEVELS - 1, Math.floor(alpha * LEVELS));
      if (lv < 0) return;
      const key = col * LEVELS + lv;
      const p = paths[key] || (paths[key] = new Path2D());
      p.moveTo(a.x, a.y);
      p.lineTo(b.x, b.y);
    };

    // synapses
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 > RR) continue;
        const formed = Math.min(a.f, b.f);
        if (formed > .35 && d2 < RRL) {
          const alpha = (1 - Math.sqrt(d2) / RL) * formed * (.8 + surge * .2);
          add(a.ring && b.ring ? 2 : 1, alpha, a, b);
        } else {
          const alpha = (1 - Math.sqrt(d2) / R) * (.15 + (a.ex + b.ex) * .2) * (1 - Math.max(a.f, b.f) * .6);
          add(0, alpha, a, b);
        }
      }
    }
    // the cursor is a neuron too
    if (mouse.on) {
      const reach = M * .25;
      for (const nd of nodes) {
        const d = Math.hypot(mouse.x - nd.x, mouse.y - nd.y);
        if (d < reach) add(0, (1 - d / reach) * .55, mouse, nd);
      }
    }
    const COLORS = [INK, CYAN, NAVY];
    ctx.lineCap = 'round';
    for (let c = 0; c < 3; c++) {
      ctx.lineWidth = c ? 1.15 : .7;
      for (let lv = 0; lv < LEVELS; lv++) {
        const p = paths[c * LEVELS + lv];
        if (!p) continue;
        ctx.strokeStyle = `rgba(${COLORS[c]},${((lv + .5) / LEVELS).toFixed(3)})`;
        ctx.stroke(p);
      }
    }

    // neurons
    for (const nd of nodes) {
      const rad = nd.r * (1 + nd.ex * .7 + surge * .6 * nd.f) * lerp(.6 + nd.z * .4, 1, nd.f);
      if (nd.f < .98) {
        ctx.fillStyle = `rgba(${INK},${((.3 + nd.z * .2) * (1 - nd.f) + nd.ex * .3).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, rad, 0, 6.2832); ctx.fill();
      }
      if (nd.f > .02) {
        const col = nd.ring ? NAVY : CYAN;
        if (surge > .05) {
          ctx.fillStyle = `rgba(${col},${(.16 * surge * nd.f).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(nd.x, nd.y, rad * 3.2, 0, 6.2832); ctx.fill();
        }
        ctx.fillStyle = `rgba(${col},${nd.f.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, rad, 0, 6.2832); ctx.fill();
      }
    }

    // signals
    const end = chain.length - 1;
    for (const p of pulses) {
      if (p.u < 0 || end < 1) continue;
      const f = clamp(p.u) * end;
      const i = Math.min(end - 1, Math.floor(f));
      const a = chain[i], b = chain[i + 1], t = f - i;
      const x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t);
      const col = a.ring ? NAVY : CYAN;
      const fade = p.big ? 1 : clamp((P - p.u) / .05);
      ctx.fillStyle = `rgba(${col},${(.18 * fade).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, p.big ? 9 : 6.5, 0, 6.2832); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${(.95 * fade).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, p.big ? 2.8 : 2.1, 0, 6.2832); ctx.fill();
      ctx.fillStyle = `rgba(${col},${(.9 * fade).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, p.big ? 1.8 : 1.3, 0, 6.2832); ctx.fill();
    }

    // shockwaves of the surge, from the ring
    const cx = ox + RING.cx * scale, cy = oy + RING.cy * scale;
    for (const s of shocks) {
      if (s.r <= 0) continue;
      ctx.strokeStyle = `rgba(${s.c},${(s.a * .5).toFixed(3)})`;
      ctx.lineWidth = 1.5 + s.a * 2;
      ctx.beginPath(); ctx.arc(cx, cy, s.r, 0, 6.2832); ctx.stroke();
    }

    // the cursor neuron: a tiny version of the logo's ring, with the cyan stroke ending inside
    if (mouse.on && fine) {
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = `rgb(${NAVY})`;
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 6.5, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = `rgb(${CYAN})`;
      ctx.beginPath(); ctx.arc(mouse.x - .5, mouse.y + .5, 2.3, 0, 6.2832); ctx.fill();
    }
  };

  /* ---------- Loop (runs only while the hero is on screen) ---------- */
  let visible = true;
  let raf = 0;
  let last = performance.now();
  const loop = now => {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    step(dt, now / 1000);
    draw();
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (reduce || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };

  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else addEventListener('resize', resize);
  if (reduce) {
    if (hint) hint.hidden = true;
    return;
  }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  start();
})();
