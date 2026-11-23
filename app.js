/* =====================================================================
 *  Motor de la invitación. NO se edita por cliente: todo sale de config.js
 *  Enlaces personalizados: index.html?i=Familia%20Pérez&p=4
 *    i = nombre del invitado, p = número de pases reservados
 * ===================================================================== */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const IS_PREVIEW = params.has('preview');
  const state = { timer: null, observer: null, audio: null, cfg: null };

  /* ---------- Utilidades ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const get = (obj, path, def) => path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj) ?? def;
  const on = (cfg, key) => get(cfg, 'secciones.' + key, true) !== false;

  const P = {
    church: '<path d="M12 2v4M10 4h4M6 22V11l6-5 6 5v11M3 22h18M10 22v-4a2 2 0 0 1 4 0v4"/>',
    glass: '<path d="M5 3h5l-.4 5.2a2.1 2.1 0 0 1-4.2 0L5 3zM7.5 10.5V20M5 20h5M14 3h5l-.4 5.2a2.1 2.1 0 0 1-4.2 0L14 3zM16.5 10.5V20M14 20h5"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8S10.5 3 8 3.5 7 8 12 8zM12 8s1.5-5 4-4.5S17 8 12 8z"/>',
    chat: '<path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20l1.2-4.2A8.5 8.5 0 1 1 20.5 11.5z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5"/>',
    check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    musicOff: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M2 2l20 20"/>',
    suit: '<path d="M8 3l4 5 4-5M8 3L4 6v15h16V6l-4-3M12 8v13M10.5 11h3"/>',
    dress: '<path d="M9 2v4l-1 3 1.5 2L5 21h14l-4.5-10L16 9l-1-3V2M9 6h6"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    nav: '<path d="M3 11l18-8-8 18-2-8-8-2z"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    down: '<path d="M6 9l6 6 6-6"/>'
  };
  const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  function fmtFecha(cfg, opts) {
    const d = new Date(cfg.fecha);
    if (isNaN(d)) return '';
    try { return new Intl.DateTimeFormat('es', { timeZone: cfg.zonaHoraria || undefined, ...opts }).format(d); }
    catch (e) { return new Intl.DateTimeFormat('es', opts).format(d); }
  }
  function fmtDia(isoDia) {
    if (!isoDia) return '';
    const d = new Date(isoDia + 'T12:00:00Z');
    if (isNaN(d)) return isoDia;
    return new Intl.DateTimeFormat('es', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }
  const nombresNovios = (cfg) => `${get(cfg, 'novios.ella', '')} & ${get(cfg, 'novios.el', '')}`;

  function getInvitado(cfg) {
    const src = IS_PREVIEW && cfg._previewInvitado ? cfg._previewInvitado : null;
    const nombre = String(src ? src.nombre || '' : params.get('i') || params.get('invitado') || '').trim().slice(0, 80);
    let pases = parseInt(src ? src.pases : params.get('p') || params.get('pases'), 10);
    if (!(pases > 0 && pases < 100)) pases = null;
    return { nombre, pases };
  }

  const mapsEmbed = (loc) => 'https://maps.google.com/maps?q=' + encodeURIComponent(loc.mapsQuery || `${loc.lugar || ''} ${loc.direccion || ''}`) + '&z=16&output=embed';
  const mapsDir = (loc) => loc.mapsLink || 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(loc.mapsQuery || `${loc.lugar || ''} ${loc.direccion || ''}`);

  /* ---------- Tema ---------- */
  function applyTheme(cfg) {
    const root = document.documentElement;
    root.dataset.tema = cfg.tema || 'clasico';
    ['--bg', '--text', '--accent'].forEach((v) => root.style.removeProperty(v));
    const c = cfg.coloresPersonalizados;
    if (c) {
      if (c.fondo) root.style.setProperty('--bg', c.fondo);
      if (c.texto) root.style.setProperty('--text', c.texto);
      if (c.acento) root.style.setProperty('--accent', c.acento);
    }
    requestAnimationFrame(() => {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = getComputedStyle(document.body).backgroundColor;
    });
  }

  /* ---------- Secciones ---------- */
  const sectionHead = (kicker, title) => `
    <header class="sec-head reveal">
      ${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ''}
      <h2 class="sec-title">${esc(title)}</h2>
      <span class="ornament" aria-hidden="true"><i></i>${icon('heart')}<i></i></span>
    </header>`;

  function hero(cfg, inv) {
    const img = get(cfg, 'imagenes.portada', '');
    const bg = (img ? `url('${esc(img)}'), ` : '') + 'linear-gradient(160deg, var(--accent-strong), var(--hero-fallback))';
    return `
    <section class="hero" style="background-image:${bg}">
      <div class="hero__veil"></div>
      <div class="hero__content">
        ${inv.nombre ? `<p class="hero__guest">${esc(inv.nombre)}</p>` : ''}
        <p class="hero__welcome">${esc(get(cfg, 'textos.bienvenida', ''))}</p>
        <h1 class="hero__names">
          <span>${esc(get(cfg, 'novios.ella', ''))}</span>
          <span class="amp">&amp;</span>
          <span>${esc(get(cfg, 'novios.el', ''))}</span>
        </h1>
        <p class="hero__date">${esc(cap(fmtFecha(cfg, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })))}</p>
      </div>
      <a href="#cuenta" class="hero__scroll" aria-label="Ver más">${icon('down')}</a>
    </section>`;
  }

  function countdown(cfg) {
    const u = [['d', 'Días'], ['h', 'Horas'], ['m', 'Min'], ['s', 'Seg']];
    return `
    <section id="cuenta" class="sec sec--alt">
      ${sectionHead('Faltan', 'Cuenta regresiva')}
      <div id="countdown" class="countdown reveal" role="timer" aria-live="off">
        ${u.map(([k, l]) => `<div class="countdown__item"><span class="countdown__num" data-u="${k}">00</span><span class="countdown__lbl">${l}</span></div>`).join('')}
      </div>
      <div class="btn-row reveal">
        <a class="btn btn--ghost" data-gcal target="_blank" rel="noopener">${icon('calendar')} Google Calendar</a>
        <button class="btn btn--ghost" type="button" data-ics>${icon('calendar')} iPhone / Outlook</button>
      </div>
    </section>`;
  }

  function historia(cfg) {
    if (!on(cfg, 'historia')) return '';
    const frase = get(cfg, 'textos.frase', ''), hist = get(cfg, 'textos.historia', ''), foto = get(cfg, 'imagenes.pareja', '');
    if (!frase && !hist && !foto) return '';
    return `
    <section class="sec historia">
      ${foto ? `<figure class="historia__foto reveal"><img src="${esc(foto)}" alt="${esc(nombresNovios(cfg))}" loading="lazy" onerror="this.parentNode.remove()"></figure>` : ''}
      ${frase ? `<blockquote class="historia__frase reveal">“${nl2br(frase)}”</blockquote>` : ''}
      ${hist ? `<p class="historia__texto reveal">${nl2br(hist)}</p>` : ''}
    </section>`;
  }

  function galeria(cfg) {
    const fotos = (cfg.galeria || []).filter(Boolean);
    if (!on(cfg, 'galeria') || !fotos.length) return '';
    return `
    <section class="sec sec--alt">
      ${sectionHead('Momentos', 'Nuestra galería')}
      <div class="galeria reveal">
        ${fotos.map((f, i) => `<button type="button" class="galeria__item" data-lightbox="${esc(f)}" aria-label="Ver foto ${i + 1}"><img src="${esc(f)}" alt="" loading="lazy"></button>`).join('')}
      </div>
    </section>`;
  }

  function locCard(loc, ico) {
    if (!loc || !loc.lugar) return '';
    return `
    <article class="card loc reveal">
      <div class="loc__icon">${icon(ico)}</div>
      <h3 class="loc__title">${esc(loc.titulo)}</h3>
      <p class="loc__place">${esc(loc.lugar)}</p>
      <ul class="loc__meta">
        ${loc.hora ? `<li>${icon('clock')}<span>${esc(loc.hora)} hrs.</span></li>` : ''}
        ${loc.direccion ? `<li>${icon('pin')}<span>${esc(loc.direccion)}</span></li>` : ''}
      </ul>
      <div class="loc__map"><iframe src="${esc(mapsEmbed(loc))}" title="Mapa: ${esc(loc.lugar)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>
      <a class="btn btn--primary btn--block" href="${esc(mapsDir(loc))}" target="_blank" rel="noopener">${icon('nav')} Cómo llegar</a>
    </article>`;
  }

  function ubicaciones(cfg) {
    const a = locCard(cfg.ceremonia, 'church'), b = locCard(cfg.recepcion, 'glass');
    if (!a && !b) return '';
    return `
    <section class="sec">
      ${sectionHead('Dónde y cuándo', 'Ubicaciones')}
      <div class="locs">${a}${b}</div>
    </section>`;
  }

  function vestimenta(cfg) {
    const v = cfg.vestimenta || {};
    if (!on(cfg, 'vestimenta') || !v.tipo) return '';
    const paleta = (v.paleta || []).filter(Boolean);
    return `
    <section class="sec sec--alt">
      ${sectionHead('Código de vestimenta', v.tipo)}
      <div class="dress reveal">
        <div class="dress__icons"><span>${icon('dress')}</span><span>${icon('suit')}</span></div>
        ${v.descripcion ? `<p>${nl2br(v.descripcion)}</p>` : ''}
        ${paleta.length ? `<p class="dress__lbl">Colores sugeridos</p><div class="dress__palette">${paleta.map((c) => `<span style="background:${esc(c)}" title="${esc(c)}"></span>`).join('')}</div>` : ''}
        ${v.nota ? `<p class="dress__note">${nl2br(v.nota)}</p>` : ''}
      </div>
    </section>`;
  }

  function regalos(cfg) {
    const r = cfg.regalos || {};
    const cuentas = (r.cuentas || []).filter((c) => c && (c.numero || c.banco));
    if (!on(cfg, 'regalos') || (!cuentas.length && !r.mesaUrl)) return '';
    return `
    <section class="sec">
      ${sectionHead('Con cariño', 'Regalos')}
      ${r.texto ? `<p class="lead reveal">${nl2br(r.texto)}</p>` : ''}
      <div class="gifts">
        ${cuentas.map((c) => `
          <div class="card gift reveal">
            <div class="loc__icon">${icon('gift')}</div>
            ${c.banco ? `<h3 class="gift__bank">${esc(c.banco)}</h3>` : ''}
            ${c.titular ? `<p>${esc(c.titular)}</p>` : ''}
            ${c.detalle ? `<p class="muted">${esc(c.detalle)}</p>` : ''}
            ${c.numero ? `<p class="gift__num">${esc(c.numero)}</p>
            <button type="button" class="btn btn--ghost btn--sm" data-copy="${esc(c.numero)}">${icon('copy')} Copiar número</button>` : ''}
          </div>`).join('')}
      </div>
      ${r.mesaUrl ? `<div class="btn-row reveal"><a class="btn btn--primary" href="${esc(r.mesaUrl)}" target="_blank" rel="noopener">${icon('gift')} Ver mesa de regalos</a></div>` : ''}
    </section>`;
  }

  function rsvpLinks(cfg, inv) {
    const r = cfg.rsvp || {};
    let forms = r.googleFormsUrl || '';
    if (forms && r.formsCampoNombre && inv.nombre) {
      try {
        const u = new URL(forms);
        u.searchParams.set('usp', 'pp_url');
        u.searchParams.set(r.formsCampoNombre, inv.nombre);
        forms = u.toString();
      } catch (e) { /* url corta (forms.gle) no admite pre-llenado */ }
    }
    let wa = '';
    if (r.whatsapp) {
      let msg = String(r.mensajeWhatsapp || 'Hola, confirmo mi asistencia a la boda de {novios}.').replace(/\{novios\}/g, nombresNovios(cfg));
      if (inv.nombre) msg += `\nNombre: ${inv.nombre}`;
      if (inv.pases) msg += `\nPases: ${inv.pases}`;
      wa = `https://wa.me/${String(r.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    }
    return { forms, wa };
  }

  function rsvp(cfg, inv) {
    const r = cfg.rsvp || {};
    const { forms, wa } = rsvpLinks(cfg, inv);
    if (!forms && !wa) return '';
    return `
    <section id="rsvp" class="sec sec--alt">
      ${sectionHead('Te esperamos', 'Confirma tu asistencia')}
      <div class="card rsvp reveal">
        ${inv.pases ? `<p class="rsvp__pases"><span>${inv.pases}</span>${inv.pases === 1 ? 'lugar reservado' : 'lugares reservados'}${inv.nombre ? ` para<br><strong>${esc(inv.nombre)}</strong>` : ''}</p>` : ''}
        <p>Tu presencia es muy importante para nosotros.${r.fechaLimite ? `<br>Por favor confírmanos antes del <strong>${esc(fmtDia(r.fechaLimite))}</strong>.` : ''}</p>
        <div class="rsvp__btns">
          ${forms ? `<a class="btn btn--primary btn--block" href="${esc(forms)}" target="_blank" rel="noopener">${icon('check')} Confirmar asistencia</a>` : ''}
          ${wa ? `<a class="btn btn--ghost btn--block" href="${esc(wa)}" target="_blank" rel="noopener">${icon('chat')} Confirmar por WhatsApp</a>` : ''}
        </div>
      </div>
    </section>`;
  }

  function album(cfg) {
    const a = cfg.album || {};
    if (!on(cfg, 'album') || !a.googlePhotosUrl) return '';
    return `
    <section class="sec">
      ${sectionHead('Compartamos recuerdos', 'Álbum de la boda')}
      <div class="card album reveal">
        <div class="album__icon">${icon('camera')}</div>
        ${a.texto ? `<p>${nl2br(a.texto)}</p>` : ''}
        ${a.hashtag ? `<p class="album__tag">${esc(a.hashtag)}</p>` : ''}
        <a class="btn btn--primary btn--block" href="${esc(a.googlePhotosUrl)}" target="_blank" rel="noopener">${icon('camera')} Subir fotos y videos</a>
      </div>
    </section>`;
  }

  function footer(cfg) {
    const m = cfg.marca || {};
    return `
    <footer class="footer">
      <div class="monogram reveal">${esc(get(cfg, 'novios.monograma', '') || nombresNovios(cfg))}</div>
      ${get(cfg, 'textos.despedida') ? `<p class="footer__msg reveal">${nl2br(cfg.textos.despedida)}</p>` : ''}
      ${get(cfg, 'textos.firma') ? `<p class="footer__sign reveal">${esc(cfg.textos.firma)}</p>` : ''}
      <p class="footer__date">${esc(fmtFecha(cfg, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' · '))}</p>
      ${m.texto ? `<p class="footer__brand">${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.texto)}</a>` : esc(m.texto)}</p>` : ''}
    </footer>`;
  }

  /* ---------- Intro / música ---------- */
  function renderIntro(cfg, inv) {
    const el = document.getElementById('intro');
    if (IS_PREVIEW || !get(cfg, 'intro.activa', false)) { el.hidden = true; document.body.classList.remove('locked'); return; }
    el.className = 'intro';
    el.innerHTML = `
      <div class="intro__card">
        <p class="kicker">${inv.nombre ? 'Invitación para' : 'Estás invitado a nuestra boda'}</p>
        ${inv.nombre ? `<p class="intro__guest">${esc(inv.nombre)}</p>` : ''}
        <button type="button" class="intro__seal" aria-label="Abrir invitación">${esc(get(cfg, 'novios.monograma', '') || '♥')}</button>
        <p class="intro__hint">${esc(get(cfg, 'intro.texto', 'Toca para abrir'))}</p>
      </div>`;
    el.hidden = false;
    document.body.classList.add('locked');
    el.querySelector('.intro__seal').addEventListener('click', () => {
      el.classList.add('intro--open');
      document.body.classList.remove('locked');
      playMusic();
      setTimeout(() => { el.hidden = true; }, 900);
    });
  }

  function renderMusic(cfg) {
    const btn = document.getElementById('music-btn');
    const src = get(cfg, 'musica.archivo', '');
    if (state.audio) { state.audio.pause(); state.audio = null; }
    if (!src) { btn.hidden = true; return; }
    state.audio = new Audio(src);
    state.audio.loop = true;
    state.audio.preload = 'none';
    btn.hidden = false;
    const sync = () => {
      const playing = state.audio && !state.audio.paused;
      btn.innerHTML = icon(playing ? 'music' : 'musicOff');
      btn.classList.toggle('is-playing', playing);
    };
    state.audio.addEventListener('play', sync);
    state.audio.addEventListener('pause', sync);
    btn.onclick = () => { if (!state.audio) return; state.audio.paused ? state.audio.play().catch(() => {}) : state.audio.pause(); };
    sync();
    if (!IS_PREVIEW && !get(cfg, 'intro.activa', false)) {
      document.addEventListener('pointerdown', playMusic, { once: true });
    }
  }
  function playMusic() { if (state.audio && state.audio.paused) state.audio.play().catch(() => {}); }

  /* ---------- Cuenta regresiva ---------- */
  function startCountdown(cfg) {
    const el = document.getElementById('countdown');
    const target = new Date(cfg.fecha).getTime();
    if (!el || isNaN(target)) return;
    const nodes = {};
    el.querySelectorAll('[data-u]').forEach((n) => { nodes[n.dataset.u] = n; });
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      let diff = target - Date.now();
      if (diff <= 0) {
        el.innerHTML = `<p class="countdown__done">${esc(get(cfg, 'textos.diaLlego', '¡Hoy es el gran día!'))}</p>`;
        clearInterval(state.timer);
        return;
      }
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      nodes.d.textContent = d < 100 ? pad(d) : d;
      nodes.h.textContent = pad(h);
      nodes.m.textContent = pad(m);
      nodes.s.textContent = pad(s);
    };
    tick();
    state.timer = setInterval(tick, 1000);
  }

  /* ---------- Calendario ---------- */
  function calendarData(cfg) {
    const start = new Date(cfg.fecha);
    if (isNaN(start)) return null;
    const end = new Date(start.getTime() + (Number(cfg.duracionHoras) || 6) * 36e5);
    const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const loc = cfg.recepcion && cfg.recepcion.lugar ? cfg.recepcion : cfg.ceremonia || {};
    return {
      title: `Boda de ${nombresNovios(cfg)}`,
      start: f(start), end: f(end),
      location: [loc.lugar, loc.direccion].filter(Boolean).join(', '),
      details: `¡Te esperamos! ${location.href.split('?')[0]}`
    };
  }

  function bindActions(cfg) {
    const app = document.getElementById('app');
    const cal = calendarData(cfg);
    const g = app.querySelector('[data-gcal]');
    if (g && cal) {
      g.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
        + `&text=${encodeURIComponent(cal.title)}&dates=${cal.start}/${cal.end}`
        + `&location=${encodeURIComponent(cal.location)}&details=${encodeURIComponent(cal.details)}`;
    }
    app.onclick = (e) => {
      const t = e.target.closest('[data-copy],[data-ics],[data-lightbox]');
      if (!t) return;
      if (t.dataset.copy != null) copyText(t.dataset.copy, t);
      else if (t.hasAttribute('data-ics') && cal) downloadIcs(cal);
      else if (t.dataset.lightbox) openLightbox(t.dataset.lightbox);
    };
  }

  function downloadIcs(cal) {
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Invitacion//ES', 'BEGIN:VEVENT',
      `UID:${cal.start}-${Math.random().toString(36).slice(2)}@invitacion`, `DTSTAMP:${cal.start}`,
      `DTSTART:${cal.start}`, `DTEND:${cal.end}`, `SUMMARY:${cal.title}`,
      `LOCATION:${cal.location.replace(/,/g, '\\,')}`, `DESCRIPTION:${cal.details}`,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'boda.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function copyText(text, btn) {
    const done = () => {
      const old = btn.innerHTML;
      btn.textContent = '¡Copiado!';
      setTimeout(() => { btn.innerHTML = old; }, 1600);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* nada */ }
    ta.remove();
  }

  function openLightbox(src) {
    const dlg = document.getElementById('lightbox');
    if (!dlg || !dlg.showModal) { window.open(src, '_blank'); return; }
    dlg.querySelector('img').src = src;
    dlg.showModal();
  }
  (function initLightbox() {
    const dlg = document.getElementById('lightbox');
    if (dlg) dlg.addEventListener('click', () => dlg.close());
  })();

  /* ---------- Animaciones ---------- */
  function setupReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach((i) => i.classList.add('is-visible'));
      return;
    }
    state.observer = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); state.observer.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((i) => state.observer.observe(i));
  }

  /* ---------- Render principal ---------- */
  function render(cfg) {
    cfg = cfg || {};
    state.cfg = cfg;
    clearInterval(state.timer);
    if (state.observer) state.observer.disconnect();
    applyTheme(cfg);
    const inv = getInvitado(cfg);
    document.getElementById('app').innerHTML = [
      hero(cfg, inv), countdown(cfg), historia(cfg), galeria(cfg), ubicaciones(cfg),
      vestimenta(cfg), regalos(cfg), rsvp(cfg, inv), album(cfg), footer(cfg)
    ].join('');
    if (!IS_PREVIEW) document.title = `${nombresNovios(cfg)} · Nuestra Boda`;
    renderIntro(cfg, inv);
    renderMusic(cfg);
    startCountdown(cfg);
    bindActions(cfg);
    setupReveal();
  }

  // Vista previa en vivo desde el generador-admin
  if (IS_PREVIEW) {
    window.addEventListener('message', (e) => {
      if (e.source !== window.parent || !e.data || e.data.type !== 'BODA_PREVIEW') return;
      const y = window.scrollY;
      render(e.data.config);
      document.querySelectorAll('.reveal').forEach((i) => i.classList.add('is-visible'));
      window.scrollTo(0, y);
    });
    window.parent.postMessage({ type: 'BODA_PREVIEW_READY' }, '*');
  }

  render(typeof BODA_CONFIG !== 'undefined' ? BODA_CONFIG : {});
})();
