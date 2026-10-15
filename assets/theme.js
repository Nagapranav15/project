/* JUMPER — theme interactions. Vanilla JS, no dependencies. */
(() => {
  const J = window.Jumper || (window.Jumper = {});
  J.routes = J.routes || { root: '/', cart: '/cart', cartAdd: '/cart/add', cartChange: '/cart/change' };
  J.strings = J.strings || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || J.motion === false;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const raf = (fn) => { let t = 0; return (...a) => { if (t) return; t = requestAnimationFrame(() => { t = 0; fn(...a); }); }; };

  /* ---------- Money ---------- */
  J.formatMoney = (cents, format = J.moneyFormat || 'Rs. {{amount}}') => {
    const v = (Number(cents) / 100);
    const withDelims = (n, d) => n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, k) => {
      if (k === 'amount_no_decimals') return withDelims(v, 0);
      if (k === 'amount_with_comma_separator') return withDelims(v, 2).replace(/,/g, '#').replace('.', ',').replace(/#/g, '.');
      return withDelims(v, 2);
    });
  };

  /* ---------- Toast ---------- */
  let toastEl, toastT;
  J.toast = (msg) => {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
  };

  /* ---------- Header scroll state ---------- */
  const onScroll = raf(() => document.body.classList.toggle('is-scrolled', window.scrollY > 120));
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;
  const observeReveals = (root = document) => $$('.reveal', root).forEach((el) => (io ? io.observe(el) : el.classList.add('is-in')));
  observeReveals();

  /* ---------- Menu drawer ---------- */
  const menu = $('[data-menu]');
  const setMenu = (open) => {
    if (!menu) return;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    $$('[data-menu-open]').forEach((b) => b.setAttribute('aria-expanded', String(open)));
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-menu-open]')) setMenu(true);
    else if (e.target.closest('[data-menu-close]') || (menu && e.target.closest('[data-menu] a'))) setMenu(false);
  });

  /* ---------- Cart drawer ---------- */
  const drawer = $('[data-cart-drawer]');
  let lastFocus;
  const setDrawer = (open) => {
    if (!drawer) return;
    if (open) lastFocus = document.activeElement;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) setTimeout(() => $('.drawer__panel', drawer).focus(), 50);
    else if (lastFocus) lastFocus.focus();
  };
  J.openCart = () => setDrawer(true);

  const setCount = (n) => $$('[data-cart-count]').forEach((el) => {
    el.textContent = n;
    el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump');
  });

  const refreshDrawer = async () => {
    if (J.preview) return J.preview.render();
    const res = await fetch(`${J.routes.cart}?view=drawer`, { credentials: 'same-origin' });
    const html = await res.text();
    const target = $('[data-cart-contents]');
    if (target) target.innerHTML = html;
    const cart = await (await fetch(`${J.routes.cart}.js`)).json();
    setCount(cart.item_count);
  };

  const addToCart = async (formData) => {
    drawer && drawer.classList.add('is-loading');
    try {
      const res = await fetch(`${J.routes.cartAdd}.js`, { method: 'POST', headers: { Accept: 'application/json' }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.description || data.message || J.strings.error);
      await refreshDrawer();
      setDrawer(true);
    } catch (err) {
      J.toast(err.message || J.strings.error || 'Something went wrong');
    } finally {
      drawer && drawer.classList.remove('is-loading');
    }
  };

  const changeLine = async (line, quantity) => {
    if (J.preview) return J.preview.change(line, quantity);
    drawer && drawer.classList.add('is-loading');
    try {
      await fetch(`${J.routes.cartChange}.js`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ line, quantity }) });
      if (document.body.classList.contains('template-cart')) return window.location.reload();
      await refreshDrawer();
    } finally { drawer && drawer.classList.remove('is-loading'); }
  };

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-product-form]');
    if (!form || !drawer) return;
    e.preventDefault();
    const fd = new FormData(form);
    if (e.submitter && e.submitter.name === 'id') fd.set('id', e.submitter.value);
    if (e.submitter) { e.submitter.classList.add('is-added'); setTimeout(() => e.submitter.classList.remove('is-added'), 1200); }
    addToCart(fd);
  });

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-cart-open]');
    if (opener && drawer && !document.body.classList.contains('template-cart')) { e.preventDefault(); setDrawer(true); return; }
    if (e.target.closest('[data-cart-close]')) { setDrawer(false); return; }
    const q = e.target.closest('[data-qty-change]');
    if (q && q.dataset.lineIndex) { changeLine(Number(q.dataset.lineIndex), Number(q.dataset.qtyChange)); return; }
    const demo = e.target.closest('[data-demo-add]');
    if (demo) {
      if (J.preview) { J.preview.add(demo.dataset); setDrawer(true); }
      else J.toast('Demo product: assign a collection in the theme editor');
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setDrawer(false); setMenu(false); } });

  /* ---------- Waistband explorer ---------- */
  const initBands = (scope = document) => $$('[data-bands]', scope).forEach((root) => {
    const slides = $$('[data-band-slide]', root);
    const rows = $$('[data-band-trigger]', root);
    const chip = $('[data-band-chip]', root);
    const file = $('[data-band-file]', root);
    const count = $('[data-band-count]', root);
    let current = 0, timer;
    const pad = (n) => String(n).padStart(2, '0');
    const show = (i) => {
      if (i === current) return;
      slides[current].classList.remove('is-active');
      slides[current].classList.add('is-leaving');
      const prev = slides[current];
      setTimeout(() => prev.classList.remove('is-leaving'), 800);
      slides[i].classList.add('is-active');
      rows.forEach((r, k) => { r.classList.toggle('is-active', k === i); r.setAttribute('aria-pressed', String(k === i)); });
      if (chip) { chip.textContent = rows[i].dataset.title; chip.animate([{ transform: 'rotate(-20deg) scale(.6)' }, { transform: 'rotate(-4deg) scale(1)' }], { duration: 500, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
      if (file) file.textContent = `band_${pad(i + 1)}.jpg`;
      if (count) count.textContent = `${pad(i + 1)} / ${pad(rows.length)}`;
      current = i;
    };
    rows.forEach((r, i) => {
      r.addEventListener('click', () => { show(i); clearInterval(timer); });
      if (finePointer) r.addEventListener('mouseenter', () => { show(i); clearInterval(timer); });
    });
    if (!reduced && rows.length > 1 && io) {
      const auto = new IntersectionObserver(([en]) => {
        clearInterval(timer);
        if (en.isIntersecting) timer = setInterval(() => show((current + 1) % rows.length), 3200);
      }, { threshold: 0.4 });
      auto.observe(root);
      root.addEventListener('pointerdown', () => { clearInterval(timer); auto.disconnect(); }, { once: true });
    }
  });

  initBands();

  /* ---------- Banana Crew picker ---------- */
  const initCrew = (scope = document) => $$('[data-crew]', scope).forEach((root) => {
    const art = $('[data-crew-art]', root);
    const name = $('[data-crew-name]', root);
    const mood = $('[data-crew-mood]', root);
    const no = $('[data-crew-no]', root);
    const link = $('[data-crew-link]', root);
    const tiles = $$('[data-crew-pick]', root);
    tiles.forEach((t) => t.addEventListener('click', () => {
      tiles.forEach((x) => { x.classList.toggle('is-active', x === t); x.setAttribute('aria-pressed', String(x === t)); });
      const svg = $('svg', t).cloneNode(true);
      svg.setAttribute('class', 'crew__svg is-swap');
      art.replaceChildren(svg);
      name.textContent = t.dataset.name;
      mood.textContent = t.dataset.mood;
      no.textContent = `${t.dataset.no} / ${String(tiles.length).padStart(2, '0')}`;
      if (link) link.href = t.dataset.link;
    }));
  });
  initCrew();

  /* ---------- Scroll-linked: manifesto scrub + campaign split ---------- */
  const scrubs = $$('[data-scrub]').map((el) => ({ el, words: $$('.scrub', el) }));
  const splits = $$('[data-split-scroll]');
  const onScrollFx = raf(() => {
    const vh = window.innerHeight;
    scrubs.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
    });
    splits.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.7)));
      $$('.word', el).forEach((w, i) => w.style.setProperty('--split-y', `${(1 - p) * (60 + i * 30)}%`));
    });
  });
  if (reduced) $$('.scrub').forEach((w) => w.classList.add('is-lit'));
  else if (scrubs.length || splits.length) { window.addEventListener('scroll', onScrollFx, { passive: true }); window.addEventListener('resize', onScrollFx); onScrollFx(); }

  /* ---------- Pointer niceties (desktop only) ---------- */
  if (finePointer && !reduced) {
    // Hero parallax
    $$('[data-parallax-group]').forEach((g) => {
      const items = $$('[data-depth]', g);
      const host = g.closest('section') || g;
      host.addEventListener('mousemove', raf((e) => {
        const r = host.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        items.forEach((it) => { const d = parseFloat(it.dataset.depth); it.style.translate = `${x * d * 18}px ${y * d * 18}px`; });
      }));
      host.addEventListener('mouseleave', () => items.forEach((it) => (it.style.translate = '0 0')));
    });

    // Card tilt
    document.addEventListener('mousemove', raf((e) => {
      const card = e.target.closest && e.target.closest('[data-tilt]');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
      card.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 8}deg`);
    }));
    $$('[data-tilt]').forEach((c) => c.addEventListener('mouseleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }));

    // Magnetic buttons
    $$('[data-magnetic]').forEach((b) => {
      b.addEventListener('mousemove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
      });
      b.addEventListener('mouseleave', () => (b.style.transform = ''));
    });

    // Custom cursor
    const cursor = $('[data-cursor]');
    if (cursor) {
      const label = $('[data-cursor-label]', cursor);
      let x = 0, y = 0, cx = 0, cy = 0;
      document.addEventListener('mousemove', (e) => {
        x = e.clientX; y = e.clientY; cursor.classList.add('is-active');
        const t = e.target.closest && e.target.closest('[data-cursor-text]');
        cursor.classList.toggle('has-label', !!t);
        if (t) label.textContent = t.dataset.cursorText;
      });
      document.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
      const loop = () => { cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; cursor.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(loop); };
      loop();
    }
  }

  /* ---------- Drag to scroll rails ---------- */
  $$('[data-drag-scroll]').forEach((rail) => {
    let down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
    window.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; rail.classList.add('is-dragging'); } rail.scrollLeft = sl - dx; });
    window.addEventListener('pointerup', () => { down = false; rail.classList.remove('is-dragging'); });
    rail.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
  });

  /* ---------- Product page ---------- */
  $$('[data-pdp]').forEach((root) => {
    const json = $('[data-product-json]', root);
    const product = json ? JSON.parse(json.textContent) : null;
    const form = $('[data-product-form]', root);
    const idInput = form && $('input[name="id"]', form);
    const priceEl = $('[data-pdp-price]', root);
    const btn = $('[data-add-btn]', root);
    const btnLabel = btn && $('[data-add-label]', btn);
    const sticky = $('[data-pdp-sticky]');

    const currentOptions = () => $$('[data-option-index]', root).map((fs) => { const c = $('input:checked', fs); return c ? c.value : null; });
    const update = () => {
      if (!product) return;
      const opts = currentOptions();
      const v = product.variants.find((x) => x.options.every((o, i) => o === opts[i]));
      if (!v) { if (btn) btn.disabled = true; if (btnLabel) btnLabel.textContent = 'Unavailable'; return; }
      if (idInput) idInput.value = v.id;
      if (priceEl) priceEl.innerHTML = J.formatMoney(v.price) + (v.compare_at_price > v.price ? ` <s class="price__compare">${J.formatMoney(v.compare_at_price)}</s>` : '');
      if (btn) btn.disabled = !v.available;
      if (btnLabel) btnLabel.textContent = v.available ? (J.strings.addToCart || 'Add to bag') : (J.strings.soldOut || 'Sold out');
      $$('[data-option-label]', root).forEach((l, i) => (l.textContent = opts[i] || ''));
      if (v.featured_media) {
        const m = $(`[data-media-id="${v.featured_media.id}"]`, root);
        if (m && window.innerWidth < 990) m.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      const url = new URL(window.location.href);
      url.searchParams.set('variant', v.id);
      window.history.replaceState({}, '', url.toString());
    };
    root.addEventListener('change', (e) => { if (e.target.closest('[data-option-index]')) update(); });

    // Quantity stepper
    $$('[data-qty-step]', root).forEach((b) => b.addEventListener('click', () => {
      const input = $('input[name="quantity"]', root);
      input.value = Math.max(1, Number(input.value || 1) + Number(b.dataset.qtyStep));
    }));

    // Hover zoom
    if (finePointer) $$('.pdp__media', root).forEach((m) => {
      m.addEventListener('click', () => m.classList.toggle('is-zoom'));
      m.addEventListener('mousemove', (e) => { const r = m.getBoundingClientRect(); m.style.setProperty('--zx', `${((e.clientX - r.left) / r.width) * 100}%`); m.style.setProperty('--zy', `${((e.clientY - r.top) / r.height) * 100}%`); });
      m.addEventListener('mouseleave', () => m.classList.remove('is-zoom'));
    });

    // Sticky add bar on mobile
    if (sticky && btn && io) {
      new IntersectionObserver(([en]) => sticky.classList.toggle('is-visible', !en.isIntersecting && en.boundingClientRect.top < 0)).observe(btn);
      $('[data-sticky-add]', sticky).addEventListener('click', () => btn.click());
    }
  });

  /* ---------- Theme editor support ---------- */
  document.addEventListener('shopify:section:load', (e) => { observeReveals(e.target); initBands(e.target); initCrew(e.target); });
})();
