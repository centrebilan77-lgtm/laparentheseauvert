/* La Parenthèse au vert — book a call through a Google Agenda appointment schedule.
   The schedule's link lives in the data-booking-url attribute of [data-booking] (see index.html).
   Google's calendar is only loaded once the visitor asks for it (it sets Google cookies); the choice
   is remembered so that, next time, the calendar loads by itself. */
(() => {
  'use strict';

  const box = document.querySelector('[data-booking]');
  if (!box) return;
  const url = (box.dataset.bookingUrl || '').trim();
  const loadBtn = box.querySelector('[data-booking-load]');
  const fallback = box.querySelector('[data-booking-fallback]');
  const note = box.querySelector('[data-booking-note]');
  const frame = box.querySelector('.booking__frame');
  const week = box.querySelector('[data-booking-week]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'lpav-booking-consent';

  // Google Agenda links: the embeddable page, or a short sharing link (opened in a new tab)
  const isEmbed = /^https:\/\/calendar\.google\.com\/calendar\/(u\/\d+\/)?appointments\//.test(url);
  const isLink = isEmbed || /^https:\/\/calendar\.app\.google\//.test(url);

  /* ---------- preview of the next five working days ---------- */
  const days = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (days.length < 5) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  week.innerHTML = days.map((day, i) => {
    let slots = '';
    for (let s = 0; s < 4; s++) {
      const free = (i * 7 + s * 3) % 5 < 3;
      slots += `<i class="wk__slot${free ? ' is-free' : ''}" style="--sd:${(i * .17 + s * .29).toFixed(2)}s"></i>`;
    }
    return `<div class="wk__day"><span class="wk__name">${fmtDay.format(day)}</span>` +
      `<span class="wk__date">${day.getDate()}</span><span class="wk__month">${fmtMonth.format(day)}</span>${slots}</div>`;
  }).join('');

  // a slot is "picked" in turn — an invitation to act (only while the preview is on screen)
  const free = Array.from(week.querySelectorAll('.is-free'));
  let timer = 0, pick = 0;
  const cycle = () => {
    free.forEach(s => s.classList.remove('is-picked'));
    free[pick % free.length].classList.add('is-picked');
    pick += 3;
  };
  if (!reduce && free.length) {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !timer) { cycle(); timer = setInterval(cycle, 1600); }
      else if (!en.isIntersecting && timer) { clearInterval(timer); timer = 0; }
    }).observe(week);
  }

  /* ---------- not configured yet: the call button stays ---------- */
  if (!isLink) return;

  box.classList.add('is-live');
  loadBtn.hidden = false;
  fallback.hidden = true;
  note.textContent = isEmbed
    ? "L'agenda est fourni par Google Agenda : en l'affichant, vous acceptez le dépôt de cookies par Google."
    : "L'agenda de réservation s'ouvre sur Google Agenda, dans un nouvel onglet.";

  const embedSrc = () => {
    const u = new URL(url);
    u.searchParams.set('gv', 'true'); // Google's parameter for the embedded view
    return u.toString();
  };

  const open = remember => {
    if (!isEmbed) { window.open(url, '_blank', 'noopener'); return; }
    if (box.classList.contains('is-open')) return;
    if (remember) { try { localStorage.setItem(KEY, '1'); } catch (e) { /* private mode */ } }
    box.classList.add('is-open');
    frame.hidden = false;
    frame.addEventListener('load', () => box.classList.add('is-ready'), { once: true });
    frame.src = embedSrc();
  };

  loadBtn.addEventListener('click', () => open(true));
  week.addEventListener('click', () => open(true));

  // accepted on a previous visit: load the calendar as the section approaches
  let consented = false;
  try { consented = localStorage.getItem(KEY) === '1'; } catch (e) { /* private mode */ }
  if (isEmbed && consented) {
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      open(false);
      io.disconnect();
    }, { rootMargin: '400px 0px' });
    io.observe(box);
  }
})();
