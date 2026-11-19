/* Jumper theme. Motion and interactions ported 1:1 from homepage v4, wired to the Shopify cart. */
(function () {
  var J = window.Jumper || {};
  var S = J.strings || {};
  var R = J.routes || {};

  // Motion plays by default. Viewers who ask their device for less motion get a one-tap off switch.
  var sysReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches, pref = null;
  try { pref = localStorage.getItem('jumperMotion'); } catch (e) {}
  var reduce = pref === 'off' || J.motion === false;
  if (!reduce) document.documentElement.classList.add('fm');
  else document.documentElement.classList.add('motion-reduced');
  if (J.motion !== false && (pref === 'off' || (sysReduce && pref !== 'on'))) {
    var mp = document.createElement('div'); mp.className = 'motion-pill';
    mp.innerHTML = pref === 'off' ? '<span>' + S.motionOff + '</span><button type="button">' + S.motionOn + '</button>' : '<span>' + S.motionAsk + '</span><button type="button">' + S.motionTurnOff + '</button>';
    mp.querySelector('button').onclick = function () { try { localStorage.setItem('jumperMotion', pref === 'off' ? 'on' : 'off'); } catch (e) {} location.reload(); };
    document.body.appendChild(mp);
  }
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  /* phones: the browser bar showing and hiding should not re-measure every pinned scene mid-scroll */
  if (hasGsap && ScrollTrigger.config) ScrollTrigger.config({ ignoreMobileResize: true });
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var fill = function (str, o) { return String(str || '').replace(/\[\[(\w+)\]\]/g, function (_, k) { return o[k] != null ? o[k] : ''; }); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var lenis = null;

  /* money, using the store's own format */
  function money(cents) {
    var fmt = J.moneyFormat || 'Rs. {{amount_no_decimals}}';
    cents = Math.round(Number(cents) || 0);
    function group(n, d, ts, ds) {
      var parts = (n / 100).toFixed(d).split('.');
      var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ts);
      return whole + (parts[1] ? ds + parts[1] : '');
    }
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, key) {
      switch (key) {
        case 'amount': return trim(group(cents, 2, ',', '.'), '.');
        case 'amount_no_decimals': return group(cents, 0, ',', '.');
        case 'amount_with_comma_separator': return trim(group(cents, 2, '.', ','), ',');
        case 'amount_no_decimals_with_comma_separator': return group(cents, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return trim(group(cents, 2, "'", '.'), '.');
        case 'amount_with_space_separator': return trim(group(cents, 2, ' ', ','), ',');
        case 'amount_no_decimals_with_space_separator': return group(cents, 0, ' ', ',');
        default: return group(cents, 2, ',', '.');
      }
    }).replace(/<[^>]*>/g, '');
    function trim(s, ds) { return s.replace(new RegExp('\\' + ds + '00$'), ''); }
  }

  /* toast */
  var toastT;
  function toast(msg) { var t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2400); }
  J.toast = toast;

  /* bag */
  var bagBtn = $('#bagBtn'), drawer = $('#drawer'), scrim = $('#scrim');
  function trunkSVG(hex) {
    return '<svg viewBox="0 0 40 34" aria-hidden="true"><path d="M3 4h34l-1 22c-5 0-10-2-12-6h-8c-2 4-7 6-12 6z" fill="' + esc(hex || '#111') + '" stroke="#111" stroke-width="2"/><rect x="3" y="3" width="34" height="6" fill="#111" stroke="#111" stroke-width="2"/></svg>';
  }
  function setCount(n) {
    var c = $('#bagCount'); if (!c) return;
    c.textContent = n;
    if (bagBtn) { bagBtn.classList.add('bump'); setTimeout(function () { bagBtn.classList.remove('bump'); }, 320); }
  }
  var lastFocus = null;
  /* the 3D packing box is its own script, loaded only when someone taps Checkout */
  function loadBox() {
    if (J._box || !J.boxSrc) return; J._box = true;
    var sc = document.createElement('script'); sc.src = J.boxSrc; sc.defer = true; document.body.appendChild(sc);
  }
  function openBag() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add('open'); scrim.classList.add('open'); scrim.dataset.for = 'bag'; drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock'); if (lenis) lenis.stop(); var c = $('#drawerClose'); if (c) c.focus();
  }
  function closeBag() {
    if (!drawer || !drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); scrim.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lock'); if (lenis) lenis.start(); if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  J.openBag = openBag;
  if (bagBtn && J.template !== 'cart') bagBtn.addEventListener('click', function (e) { e.preventDefault(); openBag(); });
  if (drawer) {
    $('#drawerClose').addEventListener('click', closeBag);
    drawer.addEventListener('click', function (e) {
      var q = e.target.closest('[data-qty][data-key]');
      if (q) { changeLine(q.dataset.key, +q.dataset.qty); return; }
      var p = e.target.closest('[data-rm-pack]');
      if (p) {
        var updates = {};
        p.dataset.rmPack.split(',').filter(Boolean).forEach(function (k) { updates[k] = 0; });
        cartPost(R.cartUpdate + '.js', { updates: updates }).then(renderSections).catch(cartError);
        return;
      }
      if (e.target.closest('[data-closebag]')) closeBag();
    });
  }
  if (scrim) scrim.addEventListener('click', function () { closeBag(); closeFilters(); });

  function cartPost(url, body) {
    if (drawer) drawer.classList.add('busy');
    body.sections = 'cart-drawer';
    body.sections_url = window.location.pathname;
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.status) throw j; return j; }); })
      .finally(function () { if (drawer) drawer.classList.remove('busy'); });
  }
  function renderSections(res) {
    var html = res && res.sections && res.sections['cart-drawer'];
    if (!html) return refreshDrawer();
    swapDrawer(html);
  }
  function swapDrawer(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var nb = doc.querySelector('#drawerBody'), ob = $('#drawerBody');
    if (nb && ob) { ob.replaceWith(nb); setCount(+nb.dataset.count || 0); document.dispatchEvent(new CustomEvent('jumper:cart')); }
  }
  function refreshDrawer() {
    return fetch(R.root.replace(/\/?$/, '/') + '?sections=cart-drawer').then(function (r) { return r.json(); }).then(function (j) { if (j['cart-drawer']) swapDrawer(j['cart-drawer']); });
  }
  function cartError(err) {
    toast((err && (err.description || err.message)) || S.error);
    refreshDrawer();
  }
  function changeLine(key, qty) {
    cartPost(R.cartChange + '.js', { id: key, quantity: Math.max(0, qty) }).then(renderSections).catch(cartError);
  }
  function addItems(items) {
    return cartPost(R.cartAdd + '.js', { items: items }).then(function (res) { renderSections(res); return res; });
  }
  J.addItems = addItems;

  /* checkout: the trunks drop into the Jumper mailer and the lid comes down, then checkout opens. Skipped with
     reduced motion or without the packing screen; a safety timer goes to checkout even if the 3D never draws. */
  document.addEventListener('submit', function (e) {
    var form = e.target, btn = e.submitter;
    if (!btn || btn.name !== 'checkout') return;
    var ov = document.getElementById('packing');
    if (!ov || !J.boxSrc || reduce || form._packing) return;
    e.preventDefault(); form._packing = true;
    var gone = false;
    var go = function () {
      if (gone) return; gone = true;
      var h = document.createElement('input'); h.type = 'hidden'; h.name = 'checkout'; h.value = btn.value || ''; h.setAttribute('data-packing-field', '');
      form.appendChild(h); HTMLFormElement.prototype.submit.call(form);
    };
    ov.addEventListener('jumper:packed', go, { once: true });
    setTimeout(go, 8000);
    ov.hidden = false;
    requestAnimationFrame(function () { ov.classList.add('is-on'); });
    loadBox();
  });
  // coming back from checkout with the back button: hide the packing screen so the bag works again
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var ov = document.getElementById('packing');
    if (ov) { ov.classList.remove('is-on'); ov.hidden = true; }
    $$('form').forEach(function (f) { f._packing = false; });
    $$('[data-packing-field]').forEach(function (i) { i.remove(); });
  });

  function fly(fromEl, hex, done) {
    if (reduce || !fromEl.animate || !bagBtn) { done(); return; }
    var a = fromEl.getBoundingClientRect(), z = bagBtn.getBoundingClientRect();
    var f = document.createElement('div'); f.className = 'flyer'; f.innerHTML = trunkSVG(hex);
    f.style.left = (a.left + a.width / 2 - 17) + 'px'; f.style.top = (a.top - 10) + 'px'; document.body.appendChild(f);
    var dx = z.left + z.width / 2 - (a.left + a.width / 2), dy = z.top - a.top + 10;
    f.animate([
      { transform: 'translate(0,0) rotate(0) scale(1)' },
      { transform: 'translate(' + dx * 0.45 + 'px,' + (Math.min(0, dy) - 120) + 'px) rotate(-200deg) scale(1.3)', offset: 0.45 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(-360deg) scale(.4)' }
    ], { duration: 850, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = function () { f.remove(); done(); };
  }
  J.fly = fly;

  /* size buttons on cards and the pack builder */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.sizes button'); if (!b || b.disabled) return;
    $$('button', b.parentNode).forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
    var card = b.closest('.card'); if (card) { var q = $('.qa', card); if (q && !q.disabled) { q.textContent = S.quickAdd; q.classList.remove('warn'); } }
  });

  /* quick add from any card on any page */
  document.addEventListener('click', function (e) {
    var q = e.target.closest('.card button.qa'); if (!q || q.disabled) return;
    var card = q.closest('.card');
    var sizes = $('.sizes', card), sel = sizes ? $('[aria-pressed="true"]', sizes) : null;
    if (sizes && !sel) { q.textContent = S.pickSize; q.classList.remove('warn'); void q.offsetWidth; q.classList.add('warn'); return; }
    if (card.hasAttribute('data-demo')) { toast(S.demoCard); return; }
    var id = sel ? sel.dataset.variant : q.dataset.variant;
    if (!id) return;
    var title = card.dataset.title, label = sel ? title + ' (' + sel.textContent.trim() + ')' : title;
    q.textContent = S.adding; q.disabled = true;
    var req = addItems([{ id: +id, quantity: 1 }]);
    fly(q, card.dataset.hex, function () {
      req.then(function () {
        q.textContent = S.addedShort; toast(fill(S.added, { title: label }));
        setTimeout(function () { q.textContent = S.quickAdd; q.disabled = false; }, 1600);
      }).catch(function (err) { q.textContent = S.quickAdd; q.disabled = false; cartError(err); });
    });
  });

  /* pack builder with the Direction 1 box */
  var boxes = [];
  function initPack(root) {
    var dataEl = $('[data-pack-data]', root); if (!dataEl) return;
    var data; try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var colours = data.colours || [];
    var n = 3, inside = $('[data-inside]', root), addBtn = $('[data-add-pack]', root);
    var picks = String(data.start || '').split(',').map(function (s) { s = s.trim().toLowerCase(); for (var i = 0; i < colours.length; i++) if (colours[i].name.toLowerCase() === s) return i; return -1; }).filter(function (i) { return i >= 0; }).slice(0, n);
    function nameOf(i) { return colours[i] ? colours[i].name : ''; }
    function hexOf(i) { return colours[i] ? colours[i].hex : '#777'; }
    // fan positions per pack size: [x %, y %, rotate deg]
    var layouts = { 1: [[0, 0, 0]], 3: [[-30, 3, -7], [0, 0, 0], [30, 3, 7]], 5: [[-44, 7, -12], [-22, 2, -6], [0, 0, 0], [22, 2, 6], [44, 7, 12]] };
    function renderPack() {
      var lay = layouts[n], existing = $$('.ft', inside);
      while (existing.length > picks.length) { existing.pop().remove(); }
      var off = Math.floor((lay.length - picks.length) / 2);
      picks.forEach(function (ci, i) {
        var el = existing[i], isNew = !el;
        if (isNew) { el = document.createElement('div'); el.className = 'ft out'; el.innerHTML = '<div class="band">JUMPER</div><div class="body"></div>'; inside.appendChild(el); }
        $('.body', el).style.backgroundColor = hexOf(ci);
        var P = lay[i + off] || [0, 0, 0];
        el.style.zIndex = 10 - Math.abs(P[0]) / 10 | 0;
        el.style.transform = 'translate(' + P[0] + '%,' + P[1] + '%) rotate(' + P[2] + 'deg)';
        if (isNew) requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove('out'); }); });
      });
      var full = picks.length === n;
      addBtn.disabled = !full;
      var status = $('[data-pack-status]', root);
      if (full) {
        var prices = picks.map(function (ci) { return colours[ci].price || data.demoPrice || 0; });
        var same = prices.every(function (p) { return p === prices[0]; });
        var total = prices.reduce(function (a, b) { return a + b; }, 0);
        status.innerHTML = '<b>' + (same ? n + ' × ' + money(prices[0]) : money(total)) + '</b>' + (data.saving ? ' · ' + esc(data.saving) : '');
      } else status.innerHTML = fill(S.addMore, { count: n - picks.length });
      $('[data-picks]', root).innerHTML = picks.map(function (ci, k) { return '<span class="pick-chip"><i style="background:' + esc(hexOf(ci)) + '"></i>' + esc(nameOf(ci)) + '<button type="button" data-unpick="' + k + '" aria-label="Remove ' + esc(nameOf(ci)) + '">×</button></span>'; }).join('');
    }
    $('[data-pack-size]', root).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      n = +b.dataset.n; picks = picks.slice(0, n);
      $$('button', this).forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
      renderPack();
    });
    $('[data-swatches]', root).addEventListener('click', function (e) {
      var b = e.target.closest('.sw'); if (!b) return;
      if (picks.length >= n) { toast(S.boxFull); return; }
      picks.push(+b.dataset.i); renderPack();
    });
    $('[data-picks]', root).addEventListener('click', function (e) { var b = e.target.closest('[data-unpick]'); if (b) { picks.splice(+b.dataset.unpick, 1); $$('.ft', inside).forEach(function (f) { f.remove(); }); renderPack(); } });
    addBtn.addEventListener('click', function () {
      var sizeBtn = $('[data-pack-sizes] [aria-pressed="true"]', root);
      var size = sizeBtn ? sizeBtn.dataset.size : '';
      var key = size.toUpperCase(), packId = 'P' + Date.now().toString(36).toUpperCase();
      var label = n === 1 ? S.onePiece : fill(S.nPack, { count: n });
      var items = [];
      for (var i = 0; i < picks.length; i++) {
        var c = colours[picks[i]];
        if (!c.variants) { toast(fill(S.packConnect, { name: c.name })); return; }
        var v = c.variants[key] || c.variants['*'];
        if (!v || !v.available) { toast(fill(S.packSizeOut, { name: c.name })); return; }
        var props = { Pack: label, _pack: packId, _hex: c.hex, _name: c.name };
        if (!c.variants['*']) props._size = size;
        var same = items.filter(function (it) { return it.id === v.id; })[0];
        if (same) same.quantity++; else items.push({ id: v.id, quantity: 1, properties: props });
      }
      var btn = this; btn.disabled = true;
      var req = addItems(items);
      fly(btn, hexOf(picks[0]), function () {
        req.then(function () {
          toast(n === 1 ? S.pieceAdded : fill(S.packAdded, { count: n }));
          hop(); picks = []; $$('.ft', inside).forEach(function (f) { f.remove(); }); renderPack();
        }).catch(function (err) { btn.disabled = false; cartError(err); });
      });
    });
    renderPack();

    /* box rotation: drag, cursor, scroll */
    var box = $('[data-box]', root), stage = $('[data-stage]', root);
    var st = { rotY: -30, rotX: -10, tRotY: -30, tRotX: -10, dragging: false, sx: 0, sRot: 0, scrollRot: 0, hopY: 0, lastDrag: 0, box: box, root: root };
    function hop() { if (reduce) return; var t0 = performance.now(); (function f(t) { var p = (t - t0) / 700; st.hopY = p < 1 ? -Math.sin(p * Math.PI) * 40 : 0; if (p < 1) requestAnimationFrame(f); })(t0); }
    stage.addEventListener('pointerdown', function (e) { st.dragging = true; st.sx = e.clientX; st.sRot = st.tRotY; try { stage.setPointerCapture(e.pointerId); } catch (err) {} });
    stage.addEventListener('pointermove', function (e) {
      if (st.dragging) { st.tRotY = st.sRot + (e.clientX - st.sx) * 0.5; st.lastDrag = performance.now(); }
      else if (e.pointerType === 'mouse') { var r = stage.getBoundingClientRect(); st.tRotX = -10 - ((e.clientY - r.top) / r.height - 0.5) * 12; }
    });
    stage.addEventListener('pointerup', function () { st.dragging = false; });
    stage.addEventListener('pointercancel', function () { st.dragging = false; });
    boxes.push(st);
    if (hasGsap && !reduce) ScrollTrigger.create({ trigger: root, start: 'top bottom', end: 'bottom top', onUpdate: function (s) { st.scrollRot = (s.progress - 0.5) * 50; } });
  }
  (function spinLoop() {
    boxes = boxes.filter(function (st) { return document.body.contains(st.root); });
    boxes.forEach(function (st) {
      if (!st.dragging && performance.now() - st.lastDrag > 2500) st.tRotY += (-30 + st.scrollRot - st.tRotY) * 0.02;
      st.rotY += (st.tRotY - st.rotY) * 0.12; st.rotX += (st.tRotX - st.rotX) * 0.12;
      st.box.style.transform = 'translateY(' + st.hopY + 'px) rotateX(' + st.rotX + 'deg) rotateY(' + st.rotY + 'deg)';
    });
    requestAnimationFrame(spinLoop);
  })();

  /* no widows: keep the last two words of short-run text together */
  function noWidows(scope) {
    $$('p, q, .perks span, .fact span', scope).forEach(function (el) {
      if (el.closest('.rte, .shopify-policy__body, form')) return;
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nd, last = null;
      while ((nd = w.nextNode())) if (nd.nodeValue.trim()) last = nd;
      if (!last) return;
      var s = last.nodeValue.replace(/\s+$/, ''), i = s.lastIndexOf(' ');
      if (i > 0 && s.length - i < 16) last.nodeValue = s.slice(0, i) + ' ' + s.slice(i + 1) + last.nodeValue.slice(s.length);
    });
  }

  /* join: live crew card */
  function initJoin(root) {
    var form = $('[data-join-form]', root), card = $('[data-crewcard]', root); if (!form || !card) return;
    var fname = $('[data-fname]', form), email = $('[data-email]', form), note = $('[data-join-note]', form);
    var ccName = $('[data-cc-name]', card), ccNo = $('[data-cc-no]', card), placeholder = ccName.textContent;
    function crewNo(v) { var h = 0; for (var i = 0; i < v.length; i++) h = (h * 31 + v.toUpperCase().charCodeAt(i)) % 9000; return v ? String(1000 + h) : '0001'; }
    fname.addEventListener('input', function () { var v = fname.value.trim(); ccName.textContent = v || placeholder; ccNo.textContent = crewNo(v); });
    form.addEventListener('submit', function (e) {
      var v = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { e.preventDefault(); note.textContent = S.joinBadEmail; email.focus(); return; }
      try { sessionStorage.setItem('jumperCrewName', fname.value.trim()); } catch (err) {}
    });
    if (card.hasAttribute('data-posted')) {
      var nm = ''; try { nm = sessionStorage.getItem('jumperCrewName') || ''; sessionStorage.removeItem('jumperCrewName'); } catch (err) {}
      if (nm) { ccName.textContent = nm; ccNo.textContent = crewNo(nm); }
      $('[data-cc-welcome]', card).textContent = nm ? fill(S.joinWelcome, { name: nm }) : S.joinWelcomeAnon;
      if (!reduce) { card.classList.remove('flip'); setTimeout(function () { root.scrollIntoView({ block: 'center' }); card.classList.add('flip'); }, 400); }
    }
    if (!reduce && finePointer) {
      card.addEventListener('pointermove', function (e) { if (card.classList.contains('flip')) return; var r = card.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; card.style.transform = 'rotateY(' + x * 14 + 'deg) rotateX(' + (-y * 10) + 'deg)'; });
      card.addEventListener('pointerleave', function () { if (!card.classList.contains('flip')) card.style.transform = ''; });
    }
  }

  /* move your way: mode tabs recolour the scene, swap the copy and retarget the button */
  function initMove(root) {
    var modes = $$('[data-mode]', root); if (!modes.length) return;
    var cuts = $$('[data-cuts] > img', root), text = $('[data-mode-text]', root), cta = $('[data-mode-cta]', root), label = $('[data-mode-label]', root), no = $('[data-mode-no]', root), cur = 0;
    function set(k, focus) {
      cur = (k + modes.length) % modes.length;
      var m = modes[cur];
      root.style.setProperty('--mode', m.dataset.colour);
      modes.forEach(function (b, i) { var on = i === cur; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
      if (focus) m.focus();
      cuts.forEach(function (c, i) { var on = i === cur; c.classList.toggle('on', on); if (on) c.removeAttribute('aria-hidden'); else c.setAttribute('aria-hidden', 'true'); });
      if (no) no.textContent = (cur < 9 ? '0' : '') + (cur + 1);
      if (cta) { cta.href = m.dataset.link; if (label && m.dataset.label) label.textContent = m.dataset.label; }
      if (text && m.dataset.text && text.textContent !== m.dataset.text) {
        text.classList.add('swap');
        setTimeout(function () { text.textContent = m.dataset.text; text.classList.remove('swap'); }, reduce ? 0 : 220);
      }
    }
    function stop() { root.classList.remove('cycling'); }
    root._setMode = function (i) { stop(); set(i); };
    cuts.forEach(function (c, i) { if (i) { c.setAttribute('aria-hidden', 'true'); c.loading = 'eager'; } });
    modes.forEach(function (b, i) { b.addEventListener('click', function () { stop(); set(i); }); });
    $('.modes', root).addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); stop(); set(cur + d, true); }
    });
    if (root.hasAttribute('data-autoplay') && !reduce && modes.length > 1) {
      root.classList.add('cycling');
      root.addEventListener('animationend', function (e) { if (e.animationName === 'modefill' && root.classList.contains('cycling')) set(cur + 1); });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { root.classList.toggle('inview', es[0].isIntersecting); }, { threshold: 0.4 }).observe(root);
      else root.classList.add('inview');
    }
  }

  /* footer: the JUMPER letters lift toward the cursor, bounce on tap and wave in on scroll */
  function initFooterWord(root) {
    var letters = $$('.fl', root); if (!letters.length) return;
    var sparks = ['var(--pink)', 'var(--cyan)', 'var(--orange)', 'var(--purple)'], ci = 0;
    letters.forEach(function (l) {
      l.addEventListener('click', function () { l.classList.remove('boing'); void l.getBoundingClientRect(); l.classList.add('boing'); l.style.fill = sparks[ci++ % sparks.length]; });
      l.addEventListener('animationend', function () { l.classList.remove('boing'); });
    });
    if (reduce) return;
    var svg = $('.fw-svg', root);
    if (finePointer) {
      svg.addEventListener('pointermove', function (e) {
        letters.forEach(function (l) { var r = l.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.width / 2)) / r.width; l.style.transform = 'translateY(' + (-Math.max(0, 1 - d / 1.6) * 16) + '%)'; });
      });
      svg.addEventListener('pointerleave', function () { letters.forEach(function (l) { l.style.transform = ''; }); });
    }
    if ('IntersectionObserver' in window) {
      root.classList.add('armed');
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect(); root.classList.remove('armed'); root.classList.add('wave');
        setTimeout(function () { root.classList.remove('wave'); }, 1600);
      }, { threshold: 0.35 });
      io.observe(root);
    }
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-to-top]')) return;
    if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* menu and search overlays */
  var menu = $('#menu'), menuBtn = $('#menuBtn'), search = $('#search');
  function lockOn() { document.body.classList.add('lock'); if (lenis) lenis.stop(); }
  function lockOff() { if (!(drawer && drawer.classList.contains('open'))) { document.body.classList.remove('lock'); if (lenis) lenis.start(); } }
  function openMenu() { menu.classList.add('open'); menuBtn.setAttribute('aria-expanded', 'true'); lockOn(); }
  function closeMenu() { if (!menu || !menu.classList.contains('open')) return; menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); lockOff(); }
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', openMenu);
    menu.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeMenu(); });
    var pics = $$('.menu-pic img', menu);
    $$('.menu-links a', menu).forEach(function (a) { a.addEventListener('mouseenter', function () { pics.forEach(function (p, i) { p.classList.toggle('on', i === +a.dataset.pic); }); }); });
  }
  function openSearch() { search.classList.add('open'); lockOn(); setTimeout(function () { $('#searchInput').focus(); }, 300); }
  function closeSearch() { if (!search || !search.classList.contains('open')) return; search.classList.remove('open'); lockOff(); }
  if (search) {
    var sb = $('#searchBtn'); if (sb) sb.addEventListener('click', function (e) { e.preventDefault(); openSearch(); });
    search.addEventListener('click', function (e) { if (e.target.closest('[data-close-search]')) closeSearch(); });
    var input = $('#searchInput'), out = $('#predictive'), predT, ctl;
    input.addEventListener('input', function () {
      clearTimeout(predT);
      var q = input.value.trim();
      if (!q) { out.innerHTML = ''; return; }
      predT = setTimeout(function () {
        if (ctl) ctl.abort(); ctl = window.AbortController ? new AbortController() : null;
        var url = (R.predictive || '/search/suggest') + '?q=' + encodeURIComponent(q) + '&section_id=predictive-search&resources[type]=product,collection,page,article&resources[limit]=6&resources[options][fields]=title,product_type,variants.title,vendor';
        fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.text(); }).then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html'), res = doc.querySelector('[data-predictive]');
          out.innerHTML = res ? res.innerHTML : '';
        }).catch(function () {});
      }, 180);
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); closeSearch(); closeBag(); closeFilters(); } });

  /* filters drawer on collections and search */
  var fdrawer = $('#filters');
  function openFilters() { if (!fdrawer) return; fdrawer.classList.add('open'); fdrawer.setAttribute('aria-hidden', 'false'); scrim.classList.add('open'); lockOn(); }
  function closeFilters() { if (!fdrawer || !fdrawer.classList.contains('open')) return; fdrawer.classList.remove('open'); fdrawer.setAttribute('aria-hidden', 'true'); if (!(drawer && drawer.classList.contains('open'))) scrim.classList.remove('open'); lockOff(); }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-open-filters]')) { e.preventDefault(); openFilters(); }
    if (e.target.closest('[data-close-filters]')) closeFilters();
  });
  document.addEventListener('change', function (e) {
    var s = e.target.closest('[data-sort]'); if (!s) return;
    var u = new URL(window.location.href); u.searchParams.set('sort_by', s.value); u.searchParams.delete('page'); window.location.href = u.toString();
  });

  /* smooth scroll */
  function scrollToHash(hash) {
    var t = hash && hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!t) return false;
    if (lenis) lenis.scrollTo(t, { offset: -60 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="#"]'); if (!a || e.defaultPrevented || a.target === '_blank') return;
    var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin || u.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '')) return;
    if (scrollToHash(u.hash)) { e.preventDefault(); closeMenu(); history.replaceState(null, '', u.hash); }
  });
  if (!reduce && window.Lenis) {
    try {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      if (hasGsap) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(function (t) { lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }
      else { (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(); }
    } catch (err) { lenis = null; }
  }

  /* tapes and header */
  var header = $('#header'), lastY = window.scrollY;
  /* the header tucks away while scrolling down only on computers with a mouse; on phones and tablets it always stays */
  var headerAutoHide = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var tracks = [];
  function collectTracks() {
    tracks = $$('.track');
    tracks.forEach(function (t) { if (!t._dup) { t.innerHTML += t.innerHTML; t._dup = true; t._x = 0; } });
  }
  collectTracks();
  // lime ribbons ground: the lime fills everything above the lower edge of the lowest ribbon, so no page colour
  // shows between or beside the ribbons. The edge is worked out from each ribbon's real (rotated) position.
  function tapeGround(box) {
    var W = box.clientWidth, lines = [];
    $$('.tape', box).forEach(function (t) {
      var m = new DOMMatrix(getComputedStyle(t).transform), w = t.offsetWidth, h = t.offsetHeight;
      var ox = t.offsetLeft + w / 2, oy = t.offsetTop + h / 2;
      var pt = function (lx, ly) { var dx = lx - w / 2, dy = ly - h / 2; return { x: m.a * dx + m.c * dy + ox, y: m.b * dx + m.d * dy + oy }; };
      var p1 = pt(0, h), p2 = pt(w, h), k = (p2.y - p1.y) / (p2.x - p1.x || 1);
      lines.push(function (x) { return p1.y + (x - p1.x) * k; });
    });
    if (!lines.length) return;
    var low = function (x) { return Math.max.apply(null, lines.map(function (f) { return f(x); })) - 3; }, xs = [0, W];
    // where the two edges cross, the outline bends
    if (lines.length > 1) {
      var a0 = lines[0](0), a1 = lines[0](W), b0 = lines[1](0), b1 = lines[1](W), den = (a1 - a0) - (b1 - b0);
      if (den) { var tx = (b0 - a0) / den; if (tx > 0 && tx < 1) xs.splice(1, 0, tx * W); }
    }
    box.style.setProperty('--ground', 'polygon(0 0, ' + W + 'px 0, ' + xs.slice().reverse().map(function (x) { return x.toFixed(1) + 'px ' + low(x).toFixed(1) + 'px'; }).join(', ') + ')');
  }
  $$('.tapes--lime').forEach(function (box) {
    tapeGround(box);
    if ('ResizeObserver' in window) new ResizeObserver(function () { tapeGround(box); }).observe(box);
  });
  var vel = 0, dir = 1, prevY = window.scrollY;
  function loop() {
    var y = window.scrollY, dy = y - prevY; prevY = y;
    if (dy) dir = dy > 0 ? 1 : -1;
    vel += (Math.abs(dy) - vel) * 0.12;
    if (header && headerAutoHide && Math.abs(y - lastY) > 8) { header.classList.toggle('hide', y > lastY && y > 400 && !(menu && menu.classList.contains('open'))); lastY = y; }
    var boost = 1 + Math.min(vel / 5, 7);
    tracks.forEach(function (t) {
      var s = parseFloat(t.dataset.speed) || 0.5;
      t._x -= 0.55 * s * (t.dataset.vel ? boost * dir : 1);
      var w = t.scrollWidth / 2;
      if (w > 0) { if (t._x <= -w) t._x += w; if (t._x > 0) t._x -= w; }
      t.style.transform = 'translate3d(' + t._x + 'px,0,0)';
    });
    requestAnimationFrame(loop);
  }
  if (!reduce) requestAnimationFrame(loop);

  /* hero fills the first screen: measure the announcement bar and header once and on resize */
  function setChrome() {
    var a = $('.announce'), h = $('#header');
    document.documentElement.style.setProperty('--chrome', ((a ? a.offsetHeight : 0) + (h ? h.offsetHeight : 0)) + 'px');
  }
  setChrome(); window.addEventListener('resize', setChrome); window.addEventListener('load', setChrome);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setChrome);

  /* logo hover: next spark colour each time */
  var sparks = ['var(--pink)', 'var(--cyan)', 'var(--orange)', 'var(--purple)'], si = 0;
  $$('[data-cycle]').forEach(function (el) { el.addEventListener('pointerenter', function () { var list = el.dataset.cycle === 'foot' ? ['var(--pink)', 'var(--purple)', 'var(--orange)'] : sparks; el.style.setProperty('--logo-hover', list[si++ % list.length]); }); });

  /* hero tilt */
  function initHero(root) {
    var hv = $('#heroVisual', root), hp = $('#heroPhoto', root), img = $('#heroImg', root);
    if (!hv || !hp || reduce || !finePointer) return;
    var tx = 0, ty = 0, cx = 0, cy = 0;
    root.addEventListener('pointermove', function (e) { var r = hv.getBoundingClientRect(); tx = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5)); ty = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5)); });
    root.addEventListener('pointerleave', function () { tx = ty = 0; });
    (function tilt() { if (!document.body.contains(hp)) return; cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08; hp.style.transform = 'perspective(900px) rotateY(' + cx * 10 + 'deg) rotateX(' + (-cy * 8) + 'deg)'; if (img) img.style.transform = 'translate(' + (-cx * 14) + 'px,' + (-cy * 14 - 20) + 'px)'; requestAnimationFrame(tilt); })();
  }

  /* scroll scenes */
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  function initScenes(scope) {
    if (!hasGsap || reduce) return;
    // move your way
    $$('[data-move-pin]', scope).forEach(function (pinEl) {
      if (pinEl._mv) return; pinEl._mv = true;
      var lines = $$('.gl', pinEl), cut = $('[data-cuts]', pinEl) || $('.cut', pinEl), bottom = $('[data-move-bottom]', pinEl), words = $$('.gl > span', pinEl);
      gsap.matchMedia().add({ phone: '(max-width: 560px)', desk: '(min-width: 561px)' }, function (ctx) {
        if (ctx.conditions.phone) {
          /* phones: the words rise and the crew comes up while the section scrolls in, so it is already built when
             it pins (never an empty screen). While pinned the lines slide apart, the crew grows a touch and the
             tabs and button come up. The two parts move different properties, so they never fight. */
          var enter = gsap.timeline({ scrollTrigger: { trigger: pinEl, start: 'top 85%', end: 'top top', scrub: 0.6 } });
          enter.from(words, { yPercent: 105, stagger: 0.1, duration: 0.6, ease: 'power3.out' }, 0);
          if (cut) enter.from(cut, { yPercent: 35, duration: 0.8, ease: 'power2.out' }, 0.1);
          var hold = gsap.timeline({ scrollTrigger: { trigger: pinEl, start: 'top top', end: '+=100%', scrub: 0.8, pin: true, anticipatePin: 1 } });
          if (lines[0]) hold.to(lines[0], { xPercent: -14, duration: 1, ease: 'none' }, 0);
          if (lines[1]) hold.to(lines[1], { xPercent: 11, duration: 1, ease: 'none' }, 0);
          if (lines[2]) hold.to(lines[2], { xPercent: -8, duration: 1, ease: 'none' }, 0);
          if (cut) hold.to(cut, { scale: 1.05, transformOrigin: '50% 100%', duration: 1, ease: 'none' }, 0);
          if (bottom) hold.from(bottom, { y: 50, opacity: 0, duration: 0.35, ease: 'power2.out' }, 0.05);
          return;
        }
        /* desktop: the scene builds while pinned */
        var tl = gsap.timeline({ scrollTrigger: { trigger: pinEl, start: 'top top', end: '+=160%', scrub: 0.8, pin: true, anticipatePin: 1 } });
        tl.from(words, { yPercent: 105, stagger: 0.12, duration: 0.5, ease: 'power3.out' }, 0);
        if (cut) tl.from(cut, { yPercent: 45, scale: 0.82, duration: 0.7, ease: 'power2.out' }, 0.1);
        if (lines[0]) tl.to(lines[0], { xPercent: -18, duration: 0.6, ease: 'none' }, 0.55);
        if (lines[1]) tl.to(lines[1], { xPercent: 14, duration: 0.6, ease: 'none' }, 0.55);
        if (lines[2]) tl.to(lines[2], { xPercent: -10, duration: 0.6, ease: 'none' }, 0.55);
        if (cut) tl.to(cut, { scale: 1.06, duration: 0.6, ease: 'none' }, 0.55);
        if (bottom) tl.from(bottom, { y: 60, opacity: 0, duration: 0.3 }, 0.8);
      });
      if (cut && finePointer) {
        var qx = gsap.quickTo(cut, 'x', { duration: 0.8, ease: 'power3' });
        pinEl.addEventListener('pointermove', function (e) { var r = this.getBoundingClientRect(); qx(((e.clientX - r.left) / r.width - 0.5) * 40); });
      }
    });
    /* new in on phones: pin the row and let scrolling down slide the cards sideways, settling on a card.
       gsap.matchMedia sets it up whenever the screen is phone width and undoes it when it isn't, so it also works
       after a rotate or a resize (no reload needed). */
    $$('.scenes', scope).forEach(function (sec) {
      var grid = $('.scene-grid', sec), cards = $$('.scene', sec);
      if (!grid || cards.length < 2 || sec._sideways) return; sec._sideways = true;
      gsap.matchMedia().add('(max-width: 560px)', function () {
        sec.classList.add('scenes-pinned');
        /* travel until the last card sits as far from the right edge as the first one does from the left */
        var dist = function () { var first = cards[0], last = cards[cards.length - 1], pad = parseFloat(getComputedStyle(grid).paddingLeft) || 0; return Math.max(0, (last.offsetLeft + last.offsetWidth - first.offsetLeft) - (grid.clientWidth - 2 * pad)); };
        var stops = function (v) {
          var d = dist(); if (!d) return v;
          var best = 1, pts = cards.map(function (c) { return Math.min(1, (c.offsetLeft - cards[0].offsetLeft) / d); }).concat(1);
          pts.forEach(function (q) { if (Math.abs(q - v) < Math.abs(best - v)) best = q; });
          return best;
        };
        gsap.to(grid, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: sec, start: 'bottom bottom', end: function () { return '+=' + dist(); }, scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1, snap: { snapTo: stops, inertia: false, duration: { min: 0.15, max: 0.5 }, delay: 0.1, ease: 'power1.inOut' } } });
        return function () { sec.classList.remove('scenes-pinned'); gsap.set(grid, { clearProps: 'x' }); };
      });
    });
    $$('.card, .tile, .acard, .scene', scope).forEach(function (c, i) { gsap.from(c, { y: 60, rotate: i % 2 ? 1.5 : -1.5, duration: 1, ease: 'expo.out', delay: (i % 4) * 0.06, scrollTrigger: { trigger: c, start: 'top 95%' } }); });
    $$('.reviews', scope).forEach(function (rv) { $$('.review', rv).forEach(function (c, i) { gsap.from(c, { y: 80, duration: 1.1, ease: 'expo.out', delay: i * 0.08, scrollTrigger: { trigger: rv, start: 'top 90%' } }); }); });
    $$('.sec-top h2, .pack h2, .join h2, .contact-sec h2, .rich h2', scope).forEach(function (h) { gsap.from(h, { y: 40, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 92%' } }); });
    $$('.perks', scope).forEach(function (p) { gsap.from($$('li', p), { x: -30, stagger: 0.1, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 90%' } }); });
  }

  /* entrance for the top of each page (hero, page heroes, 404) */
  function heroIn() {
    if (heroIn.ran) return; heroIn.ran = true;
    if (!hasGsap || reduce) return;
    var heroLines = $$('#heroTitle .line > span, .phero h1 .line > span, .nf h1 .line > span, .chero h1 .line > span');
    if ($('.chero-card')) {
      // explicit end values (each card's own --r tilt) and the hover transition off while it plays, so the cards
      // always land where the CSS puts them, then hand the transform back to the stylesheet
      var cards = $$('.chero-card');
      gsap.killTweensOf(cards); cards.forEach(function (c) { c.style.transition = 'none'; });
      gsap.fromTo(cards, { y: 120, rotate: function (i) { return i % 2 ? 24 : -24; }, opacity: 0 }, {
        y: 0, rotate: function (i, el) { return parseFloat(el.style.getPropertyValue('--r')) || 0; }, opacity: 1,
        duration: 1.2, ease: 'back.out(1.5)', stagger: 0.1, delay: 0.25, clearProps: 'transform,translate,rotate,scale,opacity',
        onComplete: function () { cards.forEach(function (c) { c.style.transition = ''; }); }
      });
    }
    if (heroLines.length) gsap.from(heroLines, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.09 });
    if ($('#heroVisual')) gsap.from('#heroVisual', { y: 60, rotate: 3, duration: 1.3, ease: 'expo.out', delay: 0.15 });
    if ($('.hero .badge')) gsap.from('.hero .badge', { scale: 0, rotate: -120, duration: 1.1, ease: 'back.out(1.6)', delay: 0.5 });
    if ($('.hero-label')) gsap.from('.hero-label', { scaleX: 0, transformOrigin: 'left', duration: .8, ease: 'expo.out', delay: 0.6 });
    if ($('.phero .badge, .nf .badge, .gallery .badge')) gsap.from('.phero .badge, .nf .badge, .gallery .badge', { scale: 0, rotate: -120, duration: 1.1, ease: 'back.out(1.6)', delay: 0.35 });
    if ($('.gallery .stage')) gsap.from('.gallery .stage', { y: 50, rotate: 2, duration: 1.2, ease: 'expo.out' });
  }

  /* product page */
  function initProduct(root) {
    var form = $('[data-product-form]', root); if (!form) return;
    var vEl = $('[data-variants]', root), variants = []; try { variants = JSON.parse(vEl.textContent); } catch (e) {}
    var idInput = $('input[name="id"]', form), btn = $('[data-add]', form), priceEl = $('[data-price]', root);
    var slides = $$('.slide', root), thumbs = $$('.thumbs button', root), current = 0, err = $('[data-error]', root);
    function show(i) {
      if (!slides.length) return;
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('on', k === current); });
      thumbs.forEach(function (t, k) { t.setAttribute('aria-current', k === current ? 'true' : 'false'); });
    }
    thumbs.forEach(function (t, k) { t.addEventListener('click', function () { show(k); }); });
    var prev = $('[data-prev]', root), next = $('[data-next]', root);
    if (prev) prev.addEventListener('click', function () { show(current - 1); });
    if (next) next.addEventListener('click', function () { show(current + 1); });
    var stage = $('.gallery .stage', root), sx = null;
    if (stage) {
      stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1)); sx = null; });
    }
    function selected() { return $$('[data-option]', root).map(function (fs) { var c = $('input:checked', fs); return c ? c.value : null; }); }
    function update() {
      var opts = selected();
      var v = variants.filter(function (x) { return x.options.every(function (o, i) { return o === opts[i]; }); })[0];
      $$('[data-option]', root).forEach(function (fs, idx) {
        var lbl = $('[data-option-value]', fs); var c = $('input:checked', fs); if (lbl && c) lbl.textContent = c.value;
        $$('input', fs).forEach(function (inp) {
          var test = opts.slice(); test[idx] = inp.value;
          var match = variants.filter(function (x) { return x.options.every(function (o, i) { return o === test[i]; }); })[0];
          inp.classList.toggle('na', !match || !match.available);
        });
      });
      if (!v) { btn.disabled = true; btn.firstChild.nodeValue = S.unavailable + ' '; return; }
      idInput.value = v.id;
      btn.disabled = !v.available;
      btn.firstChild.nodeValue = (v.available ? S.addToCart : S.soldOut) + ' ';
      if (priceEl) {
        var html = '<span>' + money(v.price) + '</span>';
        if (v.compare_at_price > v.price) html = '<s>' + money(v.compare_at_price) + '</s>' + html;
        var keep = $('small', priceEl);
        priceEl.innerHTML = html + (keep ? keep.outerHTML : '');
      }
      var sb = $('[data-sticky-price]'); if (sb) sb.textContent = money(v.price);
      if (v.featured_media) { var k = slides.map(function (s) { return +s.dataset.mediaId; }).indexOf(v.featured_media.id); if (k >= 0) show(k); }
      if (history.replaceState && root.dataset.url) history.replaceState(null, '', root.dataset.url + '?variant=' + v.id);
    }
    root.addEventListener('change', function (e) { if (e.target.closest('[data-option]')) update(); });
    $$('[data-qty-step]', root).forEach(function (b) { b.addEventListener('click', function () { var i = $('[data-qty-input]', root); i.value = Math.max(1, (+i.value || 1) + +b.dataset.qtyStep); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (btn.disabled) return;
      var fd = new FormData(form), qty = +fd.get('quantity') || 1, props = {};
      fd.forEach(function (val, k) { var m = k.match(/^properties\[(.+)\]$/); if (m && val) props[m[1]] = val; });
      var item = { id: +fd.get('id'), quantity: qty }; if (Object.keys(props).length) item.properties = props;
      var sp = fd.get('selling_plan'); if (sp) item.selling_plan = +sp;
      var label = btn.firstChild.nodeValue; btn.disabled = true; btn.firstChild.nodeValue = S.adding + ' ';
      if (err) err.hidden = true;
      var req = addItems([item]);
      fly(btn, root.dataset.hex, function () {
        req.then(function () {
          btn.firstChild.nodeValue = S.addedShort + ' ';
          var size = selected().filter(Boolean).join(' / ');
          toast(fill(S.added, { title: root.dataset.title + (size && !root.hasAttribute('data-single') ? ' (' + size + ')' : '') }));
          setTimeout(function () { btn.firstChild.nodeValue = label; btn.disabled = false; update(); }, 1600);
        }).catch(function (x) { btn.firstChild.nodeValue = label; btn.disabled = false; if (err) { err.textContent = (x && x.description) || S.error; err.hidden = false; } else cartError(x); });
      });
    });
    var sticky = $('[data-sticky-buy]');
    if (sticky && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { sticky.classList.toggle('on', !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }).observe(btn);
      $('button', sticky).addEventListener('click', function () { if (btn.disabled) { btn.scrollIntoView({ block: 'center' }); return; } form.requestSubmit ? form.requestSubmit() : btn.click(); });
    }
    update();
  }

  /* product recommendations */
  function initRecs(root) {
    var el = $('[data-recs-url]', root); if (!el) return;
    fetch(el.dataset.recsUrl).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html'), g = doc.querySelector('[data-recs-url]');
      if (g && g.innerHTML.trim()) { el.innerHTML = g.innerHTML; initScenes(el); var ym = el.closest('[data-ymal]'); if (ym) initYmal(ym); } else { var s = el.closest('.recs'); if (s) s.hidden = true; }
    }).catch(function () {});
  }

  /* you might also like: arrows step through the row (desktop), dots switch the card photo, Add to bag opens the
     size chooser on the card (or adds straight away for one-size products) */
  function initYmal(sec) {
    var rail = $('[data-ym-rail]', sec), prev = $('[data-ym-prev]', sec), next = $('[data-ym-next]', sec);
    if (!rail) return;
    function update() {
      var max = rail.scrollWidth - rail.clientWidth;
      sec.classList.toggle('no-scroll', max <= 2);
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max - 2;
    }
    sec._ymUpdate = update;
    if (sec._ym) { update(); return; } sec._ym = true;
    function page(dir) {
      var card = rail.firstElementChild; if (!card) return;
      var gap = parseFloat(getComputedStyle(rail).columnGap) || 0, w = card.getBoundingClientRect().width + gap;
      var n = Math.max(1, Math.floor((rail.clientWidth + gap) / w));
      rail.scrollBy({ left: dir * n * w, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { page(-1); });
    if (next) next.addEventListener('click', function () { page(1); });
    rail.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    function show(card, i) {
      $$('.ym-img', card).forEach(function (im, k) { im.classList.toggle('is-on', k === i); });
    }
    function closePick(card) {
      var pick = $('[data-ym-pick]', card), open = $('[data-ym-open]', card); if (!pick) return;
      card.classList.remove('is-picking'); if (open) open.setAttribute('aria-expanded', 'false');
      setTimeout(function () { if (!card.classList.contains('is-picking')) pick.hidden = true; }, 360);
    }
    function add(btn, card, id, label) {
      if (!id || btn.disabled) return;
      var keep = btn.textContent; btn.disabled = true; btn.textContent = S.adding;
      var req = addItems([{ id: +id, quantity: 1 }]);
      fly(btn, card.dataset.hex, function () {
        req.then(function () {
          toast(fill(S.added, { title: label })); closePick(card);
          btn.textContent = S.addedShort;
          setTimeout(function () { btn.textContent = keep; btn.disabled = false; }, 1400);
        }).catch(function (err) { btn.textContent = keep; btn.disabled = false; cartError(err); });
      });
    }
    sec.addEventListener('click', function (e) {
      var t = e.target, card = t.closest('[data-ym-card]'); if (!card) return;
      var dot = t.closest('[data-ym-dot]');
      if (dot) {
        $$('[data-ym-dot]', card).forEach(function (d) { d.setAttribute('aria-pressed', d === dot ? 'true' : 'false'); });
        show(card, +dot.dataset.ymDot); return;
      }
      if (t.closest('[data-ym-open]')) {
        var pick = $('[data-ym-pick]', card), open = t.closest('[data-ym-open]');
        $$('[data-ym-card].is-picking', sec).forEach(function (c) { if (c !== card) closePick(c); });
        if (card.classList.contains('is-picking')) { closePick(card); return; }
        pick.hidden = false; void pick.offsetWidth; card.classList.add('is-picking'); open.setAttribute('aria-expanded', 'true');
        var first = $('[data-ym-size]:not(:disabled)', pick); if (first) first.focus({ preventScroll: true });
        return;
      }
      if (t.closest('[data-ym-close]')) { closePick(card); return; }
      var size = t.closest('[data-ym-size]');
      if (size) { add(size, card, size.dataset.variant, card.dataset.title + ' (' + size.textContent.trim() + ')'); return; }
      var direct = t.closest('[data-ym-direct]');
      if (direct) add(direct, card, direct.dataset.variant, card.dataset.title);
    });
    sec.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var card = e.target.closest('[data-ym-card].is-picking'); if (!card) return;
      closePick(card); var open = $('[data-ym-open]', card); if (open) open.focus();
    });
    /* desktop: hovering a card shows its second photo */
    if (finePointer) {
      sec.addEventListener('mouseover', function (e) {
        var card = e.target.closest('[data-ym-card]'); if (!card || card._hov || $$('.ym-img', card).length < 2) return;
        card._hov = true; show(card, 1);
        card.addEventListener('mouseleave', function out() {
          card._hov = false; card.removeEventListener('mouseleave', out);
          var on = $('[data-ym-dot][aria-pressed="true"]', card); show(card, on ? +on.dataset.ymDot : 0);
        });
      });
    }
    update();
  }

  /* cart page: quantity buttons submit the update form */
  function initCartPage(root) {
    $$('[data-cart-step]', root).forEach(function (b) {
      b.addEventListener('click', function () { var i = document.getElementById(b.dataset.for); i.value = Math.max(0, (+i.value || 0) + +b.dataset.cartStep); i.form.submit(); });
    });
  }

  /* small helpers for account pages */
  $$('select[data-default]').forEach(function (s) { if (s.dataset.default && !s.closest('form[action*="addresses"]') && !s.hasAttribute('data-address-country')) s.value = s.dataset.default; });
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-confirm]'); if (c && !window.confirm(c.dataset.confirm)) e.preventDefault();
    var t = e.target.closest('[data-toggle]'); if (t) { var el = document.getElementById(t.dataset.toggle); if (el) el.hidden = !el.hidden; }
  });

  /* gift card copy button */
  $$('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(function () { b.textContent = b.dataset.done || 'Copied'; }); }); });

  var clamp01 = function (t) { return Math.max(0, Math.min(1, t)); };

  /* about: the statement lights up word by word as you scroll through it; the banana peeks up from the corner */
  function initManifesto(sec) {
    if (sec._am) return; sec._am = true;
    var words = $$('.am-w', sec), lit = -1;
    if (reduce) { words.forEach(function (w) { w.classList.add('is-lit'); }); sec.style.setProperty('--p', 1); return; }
    (function tick() {
      if (!document.body.contains(sec)) return;
      var r = sec.getBoundingClientRect(), range = r.height - window.innerHeight;
      var p = range > 0 ? clamp01(-r.top / range) : 1;
      sec.style.setProperty('--p', p.toFixed(3));
      var n = Math.round(clamp01(p / 0.85) * words.length);
      if (n !== lit) { lit = n; words.forEach(function (w, i) { w.classList.toggle('is-lit', i < n); }); }
      requestAnimationFrame(tick);
    })();
  }

  /* about: house rules scroll sideways while the section is pinned; cards flip on tap */
  function initHScroll(sec) {
    if (sec._hs) return; sec._hs = true;
    var track = $('[data-hscroll-track]', sec), sticky = $('.av-sticky', sec);
    $$('[data-flip]', sec).forEach(function (c) { c.addEventListener('click', function () { var on = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', on ? 'true' : 'false'); }); });
    if (!track || reduce) { sec.classList.add('is-static'); return; }
    var dist = 0, last = 0, skew = 0;
    function measure() { dist = Math.max(0, track.scrollWidth - track.clientWidth); sec.style.height = (window.innerHeight + dist) + 'px'; }
    measure(); window.addEventListener('resize', measure); window.addEventListener('load', measure);
    (function tick() {
      if (!document.body.contains(sec)) return;
      var r = sec.getBoundingClientRect(), p = dist ? clamp01(-r.top / dist) : 0, x = -p * dist;
      skew += ((x - last) * 0.15 - skew) * 0.15; last = x;
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      track.style.setProperty('--skew', Math.max(-8, Math.min(8, skew)).toFixed(2) + 'deg');
      requestAnimationFrame(tick);
    })();
    if (sticky) sticky.classList.add('is-pinned');
  }

  /* about: numbers count up when they arrive (a zero counts down to nothing instead) */
  function initCounters(scope) {
    var nums = $$('[data-count-to]', scope); if (!nums.length) return;
    function run(el) {
      var to = parseFloat(el.dataset.countTo) || 0, from = to === 0 ? 99 : 0, t0 = performance.now();
      (function step(now) {
        var t = clamp01((now - t0) / 1600), e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        el.textContent = Math.round(from + (to - from) * e);
        if (t < 1) requestAnimationFrame(step); else el.parentNode.classList.add('is-done');
      })(t0);
    }
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); run(x.target); } }); }, { threshold: 0.6 });
    nums.forEach(function (n) { n.textContent = n.dataset.countTo === '0' ? '99' : '0'; io.observe(n); });
  }

  /* about: closing section. A photo peeks through a circle that follows the cursor; the button leans in */
  function initPeek(sec) {
    if (sec._peek) return; sec._peek = true;
    var tx = 50, ty = 50, cx = 50, cy = 50, rad = 0, want = 0, over = false;
    sec.addEventListener('pointermove', function (e) { var r = sec.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width * 100; ty = (e.clientY - r.top) / r.height * 100; over = true; });
    sec.addEventListener('pointerleave', function () { over = false; });
    (function tick(t) {
      if (!document.body.contains(sec)) return;
      if (!over || !finePointer) { tx = 50 + Math.sin(t / 1300) * 28; ty = 50 + Math.cos(t / 1700) * 22; }
      want = reduce ? 18 : (over || !finePointer ? 17 : 0);
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12; rad += (want - rad) * 0.1;
      sec.style.setProperty('--px', cx.toFixed(2) + '%'); sec.style.setProperty('--py', cy.toFixed(2) + '%'); sec.style.setProperty('--pr', rad.toFixed(2) + 'vmax');
      if (!reduce) requestAnimationFrame(tick);
    })(0);
  }
  function initMagnetic(btn) {
    if (btn._mag || !finePointer || reduce) return; btn._mag = true;
    var zone = btn.parentNode;
    zone.addEventListener('pointermove', function (e) {
      var r = btn.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      var d = Math.hypot(dx, dy), k = d < 220 ? (1 - d / 220) : 0;
      btn.style.transform = 'translate(' + (dx * 0.35 * k).toFixed(1) + 'px,' + (dy * 0.35 * k).toFixed(1) + 'px) rotate(' + (dx * 0.03 * k).toFixed(2) + 'deg)';
    });
    zone.addEventListener('pointerleave', function () { btn.style.transform = ''; });
  }

  /* a cursor blob that names what it is over, on pages that ask for it (fine pointers only) */
  /* banana cursor: the pointer itself is CSS (see theme.css). While the mouse button is down the cursor swaps to
     the jumping pose, and swaps back on release. Nothing else appears on the page. */
  function initBananaCursor() {
    var html = document.documentElement;
    if (!html.classList.contains('banana-cursor') || html._banana) return; html._banana = true;
    document.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button === 0) html.classList.add('is-pressing'); }, true);
    var up = function () { html.classList.remove('is-pressing'); };
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
    window.addEventListener('blur', up);
  }

  /* policy pages: contents list from the policy's own headings, active as you read, and a progress bar.
     Store policies often use bold paragraphs as headings, so those count too. */
  function initPolicy(sec) {
    if (sec._pol) return; sec._pol = true;
    var body = $('[data-pol-body]', sec), toc = $('[data-pol-toc]', sec), bar = $('[data-pol-bar]');
    if (!body) return;
    var heads = $$('h1, h2, h3', body);
    if (heads.length < 2) heads = $$('p > strong:only-child, p > b:only-child', body).map(function (b) { return b.parentNode; }).filter(function (p) { return p.textContent.trim().length < 80; });
    if (toc && heads.length >= 2) {
      var ol = $('ol', toc), links = [];
      heads.forEach(function (h, i) {
        if (!h.id) h.id = 'pol-' + (i + 1);
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = '#' + h.id; a.textContent = h.textContent.trim().replace(/[.:]$/, '');
        li.appendChild(a); ol.appendChild(li); links.push(a);
      });
      toc.hidden = false;
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (en) {
          en.forEach(function (x) { if (x.isIntersecting) links.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + x.target.id); }); });
        }, { rootMargin: '-20% 0px -70% 0px' });
        heads.forEach(function (h) { io.observe(h); });
      }
    }
    if (bar) (function tick() {
      if (!document.body.contains(sec)) return;
      var r = body.getBoundingClientRect(), p = clamp01((window.innerHeight * 0.3 - r.top) / Math.max(1, r.height - window.innerHeight * 0.5));
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      requestAnimationFrame(tick);
    })();
  }

  /* campaign banner: the last word of the headline rolls on its own; a chip picks one and holds it a while.
     Each word tints the backdrop, and the models drift with the cursor for a little depth */
  function initCampaign(sec) {
    if (sec._cb) return; sec._cb = true;
    var words = $$('[data-cb-word]', sec), chips = $$('[data-cb-pick]', sec), models = $('[data-cb-models]', sec), copy = $('[data-cb-copy]', sec), detail = $('[data-cb-detail]', sec);
    if (!words.length) return;
    var i = 0, holdUntil = 0, ms = (parseFloat(sec.dataset.speed) || 2.5) * 1000;
    function show(n) {
      var prev = words[i]; i = (n + words.length) % words.length;
      words.forEach(function (w, k) { w.classList.toggle('is-on', k === i); w.classList.toggle('is-out', w === prev && k !== i); });
      chips.forEach(function (c, k) { c.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      sec.style.setProperty('--tint', words[i].style.getPropertyValue('--k'));
      if (detail && chips[i]) detail.textContent = chips[i].dataset.detail || '';
    }
    chips.forEach(function (c, k) { c.addEventListener('click', function () { holdUntil = performance.now() + ms * 3; show(k); }); });
    if (!reduce && words.length > 1) setInterval(function () { if (document.body.contains(sec) && performance.now() > holdUntil && !document.hidden) show(i + 1); }, ms);
    if (finePointer && !reduce && models) {
      var tx = 0, ty = 0, cx = 0, cy = 0, live = false;
      sec.addEventListener('pointermove', function (e) { var r = sec.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5; if (!live) { live = true; requestAnimationFrame(drift); } });
      sec.addEventListener('pointerleave', function () { tx = ty = 0; });
      function drift() {
        cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
        models.style.transform = 'translate3d(' + (Math.max(0, cx) * -18).toFixed(1) + 'px,0,0)';
        if (copy) copy.style.transform = 'translate3d(' + (cx * 14).toFixed(1) + 'px,' + (cy * 8).toFixed(1) + 'px,0)';
        if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001) requestAnimationFrame(drift); else live = false;
      }
    }
  }

  /* stretch test: the photo is drawn as a mesh of triangles. Dragging pulls the points near the grab with a soft
     falloff (and pinches the fabric in a little, like the real thing); letting go springs them back with a boing.
     It only redraws while something is moving, and gives itself a tug now and then until someone grabs it. */
  function initStretch(sec) {
    if (sec._st) return; sec._st = true;
    var canvas = $('[data-st-canvas]', sec), stage = $('.st-stage', sec), img = $('.st-src', sec);
    if (!canvas || !stage || !img || !canvas.getContext) return;
    var ctx = canvas.getContext('2d'), pctEl = $('[data-st-pct]', sec), fillEl = $('[data-st-fill]', sec), stateEl = $('[data-st-state]', sec);
    var pic = new Image(), COLS = 12, ROWS = 15, W = 0, H = 0, dpr = 1, crop = null;
    var grab = null, down = null, off = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, aim = { x: 0, y: 0 };
    var dragging = false, running = false, touched = false, visible = false, backUntil = 0, lastState = '';
    pic.src = img.currentSrc || img.src;

    function size() {
      W = stage.clientWidth; H = stage.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      if (!pic.naturalWidth || !W || !H) return;
      // cover the stage with the photo, keeping the waistband in view
      var s = Math.max(W / pic.naturalWidth, H / pic.naturalHeight), cw = W / s, ch = H / s;
      crop = { x: (pic.naturalWidth - cw) / 2, y: (pic.naturalHeight - ch) * 0.4, w: cw, h: ch };
      draw();
    }
    function moved(i, j) {
      var x = i / COLS * W, y = j / ROWS * H;
      if (!grab) return [x, y];
      var sig = 0.3 * Math.min(W, H), dx = x - grab.x, dy = y - grab.y, w = Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig));
      return [x + off.x * w - dx * w * Math.abs(off.y) / H * 0.4, y + off.y * w - dy * w * Math.abs(off.x) / W * 0.4];
    }
    function tri(s0, s1, s2, d0, d1, d2) {
      // a hair bigger than the triangle, so no seams show between neighbours
      var cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
      function grow(p) { var dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.7, p[1] + dy / l * 0.7]; }
      var e0 = grow(d0), e1 = grow(d1), e2 = grow(d2);
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
      // the affine map that takes the photo triangle onto the stretched one
      var dx1 = s1[0] - s0[0], dy1 = s1[1] - s0[1], dx2 = s2[0] - s0[0], dy2 = s2[1] - s0[1];
      var du1 = d1[0] - d0[0], dv1 = d1[1] - d0[1], du2 = d2[0] - d0[0], dv2 = d2[1] - d0[1];
      var det = dx1 * dy2 - dx2 * dy1;
      if (det) {
        var a = (du1 * dy2 - du2 * dy1) / det, c = (du2 * dx1 - du1 * dx2) / det, b = (dv1 * dy2 - dv2 * dy1) / det, d = (dv2 * dx1 - dv1 * dx2) / det;
        var e = d0[0] - a * s0[0] - c * s0[1], f = d0[1] - b * s0[0] - d * s0[1];
        ctx.setTransform(dpr * a, dpr * b, dpr * c, dpr * d, dpr * e, dpr * f);
        ctx.drawImage(pic, 0, 0);
      }
      ctx.restore();
    }
    function draw() {
      if (!crop) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!grab || (Math.abs(off.x) < 0.2 && Math.abs(off.y) < 0.2)) {
        ctx.drawImage(pic, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
        return;
      }
      var pts = [];
      for (var j = 0; j <= ROWS; j++) for (var i = 0; i <= COLS; i++) pts.push(moved(i, j));
      for (j = 0; j < ROWS; j++) for (i = 0; i < COLS; i++) {
        var k = j * (COLS + 1) + i;
        var s = function (ii, jj) { return [crop.x + ii / COLS * crop.w, crop.y + jj / ROWS * crop.h]; };
        tri(s(i, j), s(i + 1, j), s(i, j + 1), pts[k], pts[k + 1], pts[k + COLS + 1]);
        tri(s(i + 1, j), s(i + 1, j + 1), s(i, j + 1), pts[k + 1], pts[k + COLS + 2], pts[k + COLS + 1]);
      }
    }
    function readout() {
      var max = 0.38 * H, amt = max ? Math.min(1, Math.hypot(off.x, off.y) / max) : 0;
      if (pctEl) pctEl.textContent = Math.round(100 + amt * 100) + '%';
      if (fillEl) fillEl.style.transform = 'scaleX(' + amt.toFixed(3) + ')';
      var st = dragging ? (amt < 0.33 ? sec.dataset.l1 : amt < 0.75 ? sec.dataset.l2 : sec.dataset.l3) : performance.now() < backUntil ? sec.dataset.back : sec.dataset.l0;
      if (stateEl && st !== lastState) { lastState = st; stateEl.textContent = st; }
    }
    function tick() {
      var max = 0.38 * H;
      if (dragging) {
        // pull with a little give: past the limit it gets harder to stretch
        var l = Math.hypot(aim.x, aim.y), k = l > 0 ? max * Math.tanh(l / max) / l : 0;
        off.x += (aim.x * k - off.x) * 0.35; off.y += (aim.y * k - off.y) * 0.35;
      } else {
        vel.x += -off.x * 0.16; vel.y += -off.y * 0.16; vel.x *= 0.84; vel.y *= 0.84;
        off.x += vel.x; off.y += vel.y;
        if (reduce || (Math.hypot(off.x, off.y) < 0.3 && Math.hypot(vel.x, vel.y) < 0.3)) { off.x = off.y = vel.x = vel.y = 0; grab = null; }
      }
      draw(); readout();
      if (dragging || grab || performance.now() < backUntil) requestAnimationFrame(tick); else running = false;
    }
    function start() { if (!running) { running = true; requestAnimationFrame(tick); } }
    canvas.addEventListener('pointerdown', function (e) {
      var r = canvas.getBoundingClientRect();
      touched = true; sec.classList.add('is-touched');
      dragging = true; grab = { x: e.clientX - r.left, y: e.clientY - r.top }; down = { x: e.clientX, y: e.clientY };
      off.x = off.y = vel.x = vel.y = aim.x = aim.y = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      start();
    });
    canvas.addEventListener('pointermove', function (e) { if (dragging) { aim.x = e.clientX - down.x; aim.y = e.clientY - down.y; } });
    function letGo() { if (!dragging) return; dragging = false; backUntil = performance.now() + 1600; start(); }
    canvas.addEventListener('pointerup', letGo);
    canvas.addEventListener('pointercancel', letGo);

    // until someone grabs it, a tug on the waistband every few seconds
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.4 }).observe(sec);
      setInterval(function () {
        if (touched || dragging || !visible || !crop || !document.body.contains(sec)) return;
        grab = { x: W * 0.5, y: H * 0.28 }; off.x = 0; off.y = 0; vel.x = (Math.random() - 0.5) * H * 0.03; vel.y = -H * 0.075;
        start();
      }, 3400);
    }
    if (pic.complete && pic.naturalWidth) size(); else pic.onload = size;
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(stage); else window.addEventListener('resize', size);
  }

  /* trunk finder: your day, how loud, your waist and how many pick the colours and size; the card shows the match,
     says why and adds the lot to the bag (packs grouped like the pack builder's) */
  function initFinder(root) {
    if (root._ff) return; root._ff = true;
    var dataEl = $('[data-finder-data]', root), colours = [];
    try { colours = JSON.parse(dataEl.textContent); } catch (e) { return; }
    if (!colours.length) return;
    var sizes = (root.dataset.sizes || '').split(',').map(function (s) {
      var m = s.trim().match(/^(\S+)\s+(\d+)\s*-\s*(\d+)/); return m ? { size: m[1], lo: +m[2], hi: +m[3] } : null;
    }).filter(Boolean);
    var state = { day: 'gym', vibe: 'loud', waist: 81, count: 3 };
    var range = $('[data-ff-range]', root), img = $('[data-ff-img]', root), shown = '';
    function choose(attr, key) {
      $$('[data-' + attr + ']', root).forEach(function (b) {
        b.addEventListener('click', function () {
          state[key] = key === 'count' ? +b.dataset[attr] : b.dataset[attr];
          $$('[data-' + attr + ']', root).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          render(true);
        });
      });
    }
    choose('day', 'day'); choose('vibe', 'vibe'); choose('count', 'count');
    var first = $('[data-day][aria-pressed="true"]', root); if (first) state.day = first.dataset.day;
    if (range) range.addEventListener('input', function () { state.waist = +range.value; render(false); });

    // best colours first: a matching volume counts most, then a matching day
    function ranked() {
      return colours.map(function (c, i) {
        var s = (c.vibe === state.vibe ? 3 : (c.vibe === 'loud' || state.vibe === 'loud') ? 1 : 0) + (c.day === state.day ? 2 : c.day === 'all' || state.day === 'all' ? 1 : 0);
        return { c: c, s: s - i * 0.01 };
      }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.c; });
    }
    function sizeFor(w) {
      for (var i = 0; i < sizes.length; i++) if (w >= sizes[i].lo && w <= sizes[i].hi) return sizes[i].size;
      return '';
    }
    function picks() {
      var list = ranked(), out = [];
      for (var i = 0; i < state.count; i++) out.push(list[i % list.length]);
      return out;
    }
    function render(swap) {
      var p = picks(), top = p[0], size = sizeFor(state.waist);
      var out = $('[data-ff-waist]', root); if (out) out.textContent = state.waist + ' cm';
      if (range) range.style.setProperty('--fill', ((state.waist - range.min) / (range.max - range.min) * 100).toFixed(1) + '%');
      $$('.ff-scale span', root).forEach(function (s) { s.classList.toggle('is-on', s.textContent === size); });
      $('[data-ff-size]', root).textContent = size || '?';
      $('[data-ff-name]', root).textContent = top.name;
      $('[data-ff-link]', root).href = top.url;
      if (img && shown !== top.img) {
        shown = top.img;
        if (swap && !reduce) { img.classList.remove('is-swap'); void img.offsetWidth; img.classList.add('is-swap'); }
        img.src = top.img;
      }
      $('[data-ff-picks]', root).innerHTML = p.map(function (c) { return '<i style="background:' + esc(c.hex) + '" title="' + esc(c.name) + '"></i>'; }).join('');
      var why = [root.dataset['r' + state.day.charAt(0).toUpperCase() + state.day.slice(1)], root.dataset['r' + state.vibe.charAt(0).toUpperCase() + state.vibe.slice(1)],
        size ? fill(root.dataset.rSize, { size: size, waist: state.waist }) : root.dataset.rNone];
      $('[data-ff-why]', root).innerHTML = why.filter(Boolean).map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('');
      var total = p.reduce(function (n, c) { return n + c.price; }, 0);
      $('[data-ff-price]', root).textContent = money(total);
      $('[data-ff-each]', root).textContent = state.count === 1 ? root.dataset.one : fill(root.dataset.many, { count: state.count });
      var add = $('[data-ff-add]', root); add.disabled = !size;
    }
    $('[data-ff-add]', root).addEventListener('click', function () {
      var size = sizeFor(state.waist), p = picks(), key = size.toUpperCase(), packId = 'P' + Date.now().toString(36).toUpperCase();
      var label = state.count === 1 ? S.onePiece : fill(S.nPack, { count: state.count }), items = [];
      for (var i = 0; i < p.length; i++) {
        var c = p[i];
        if (!c.variants.length) { toast(fill(S.packConnect, { name: c.name })); return; }
        var v = c.variants.filter(function (x) { return x.opts.some(function (o) { return String(o).toUpperCase() === key; }); })[0] || (c.variants.length === 1 ? c.variants[0] : null);
        if (!v || !v.ok) { toast(fill(S.packSizeOut, { name: c.name })); return; }
        var props = state.count > 1 ? { Pack: label, _pack: packId, _hex: c.hex, _name: c.name, _size: size } : {};
        var same = items.filter(function (it) { return it.id === v.id; })[0];
        if (same) same.quantity++; else items.push({ id: v.id, quantity: 1, properties: props });
      }
      var btn = this; btn.disabled = true;
      var req = addItems(items);
      fly(btn, p[0].hex, function () {
        req.then(function () { toast(state.count === 1 ? S.pieceAdded : fill(S.packAdded, { count: state.count })); btn.disabled = false; })
          .catch(function (err) { btn.disabled = false; cartError(err); });
      });
    });
    render(false);
  }

  /* size chart (inches): a waist slider that lights up the matching size with a verdict */
  function initSizeChart(sec) {
    if (sec._sz) return; sec._sz = true;
    var rows = $$('tr[data-size]', sec), range = $('[data-sz-range]', sec), out = $('[data-sz-out]', sec), res = $('[data-sz-result]', sec);
    function verdict() {
      if (!range) return;
      var inch = parseFloat(range.value), w = inch * 2.54, hit = -1, pair = null; // chart rows are stored in cm
      if (out) out.textContent = (Math.round(inch * 2) / 2).toString().replace(/^(\d+)$/, '$1.0') + ' in';
      rows.forEach(function (r, i) {
        var lo = parseFloat(r.dataset.wmin), hi = parseFloat(r.dataset.wmax), next = rows[i + 1];
        if (w >= lo && w <= hi) hit = i;
        // on the top edge of a size, or in a gap before the next one: between the two
        if (next && ((w >= hi && w < parseFloat(next.dataset.wmin)) || (hit === i && w === hi))) pair = [r, next];
      });
      rows.forEach(function (r, i) { r.classList.toggle('is-hit', pair ? pair.indexOf(r) > -1 : i === hit); });
      if (!res) return;
      var msg = pair ? fill(sec.dataset.between, { size: pair[0].dataset.size, next: pair[1].dataset.size })
        : hit > -1 ? fill(sec.dataset.result, { size: rows[hit].dataset.size }) : sec.dataset.none;
      if (res.textContent !== msg) { res.textContent = msg; res.classList.remove('is-pop'); void res.offsetWidth; res.classList.add('is-pop'); }
      var p = (inch - range.min) / (range.max - range.min) * 100;
      range.style.setProperty('--fill', p.toFixed(1) + '%');
    }
    if (range) { range.addEventListener('input', verdict); verdict(); }
    // draw the measuring lines on the photo when the chart comes into view; nudge the waist line as you slide
    if ('IntersectionObserver' in window && !reduce) {
      var seen = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { sec.classList.add('is-seen'); seen.disconnect(); } }, { threshold: 0.3 });
      seen.observe(sec);
    } else sec.classList.add('is-seen');
    var waistLine = $('.sz-mark--waist', sec);
    if (range && waistLine) range.addEventListener('input', function () { waistLine.classList.remove('is-pulse'); void waistLine.offsetWidth; waistLine.classList.add('is-pulse'); });
  }

  /* product page size guide: a dialog over the page. Sliding to a waist picks the matching size (between two,
     the bigger one); tapping a row picks that size and closes the dialog */
  function initSizeGuide(sg) {
    if (sg._sg) return; sg._sg = true;
    var form = sg.closest('form') || document, fs = sg.closest('[data-option]');
    var toggle = $('[data-sg-toggle]', fs || form), range = $('[data-sg-range]', sg), out = $('[data-sg-out]', sg), res = $('[data-sg-result]', sg);
    var rows = $$('[data-sg-row]', sg);
    // a dialog floating over the page: native <dialog> (focus trap, Esc, backdrop); a plain open attribute without it
    function open(on) {
      if (on === sg.open) return;
      if (on) { if (sg.showModal) sg.showModal(); else sg.setAttribute('open', ''); document.documentElement.classList.add('sg-lock'); }
      else { if (sg.close) sg.close(); else sg.removeAttribute('open'); }
      if (toggle) toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (!on) document.documentElement.classList.remove('sg-lock');
    }
    /* give focus back to the link only when it was opened from the keyboard; after a tap it would draw a focus box */
    var viaKeys = false;
    sg.addEventListener('close', function () { document.documentElement.classList.remove('sg-lock'); if (toggle) { toggle.setAttribute('aria-expanded', 'false'); if (viaKeys) toggle.focus(); else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); } });
    sg.addEventListener('click', function (e) { if (e.target === sg) open(false); });
    var closeBtn = $('[data-sg-close]', sg); if (closeBtn) closeBtn.addEventListener('click', function () { open(false); });
    function pick(size) {
      var want = String(size).trim().toLowerCase();
      var inp = $$('input[type=radio]', fs).filter(function (i) { return i.value.trim().toLowerCase() === want; })[0];
      if (inp && !inp.checked) { inp.checked = true; inp.dispatchEvent(new Event('change', { bubbles: true })); }
      rows.forEach(function (r) { r.classList.toggle('is-hit', r.dataset.size.trim().toLowerCase() === want); });
    }
    if (toggle) toggle.addEventListener('click', function (e) { viaKeys = e.detail === 0; open(!sg.open); });
    rows.forEach(function (r) {
      var go = function () { pick(r.dataset.size); setTimeout(function () { open(false); }, 260); };
      r.addEventListener('click', go);
      r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    if (range) range.addEventListener('input', function () {
      var inch = parseFloat(range.value), w = inch * 2.54, hit = -1, pair = null; // rows are stored in cm
      if (out) out.textContent = inch.toFixed(1) + ' in';
      rows.forEach(function (r, i) {
        var lo = parseFloat(r.dataset.wmin), hi = parseFloat(r.dataset.wmax), next = rows[i + 1];
        if (w >= lo && w <= hi) hit = i;
        if (next && w > hi && w < parseFloat(next.dataset.wmin)) pair = [r, next];
      });
      range.style.setProperty('--fill', ((inch - range.min) / (range.max - range.min) * 100).toFixed(1) + '%');
      if (pair) { pick(pair[1].dataset.size); res.textContent = fill(sg.dataset.between, { size: pair[0].dataset.size, next: pair[1].dataset.size }); }
      else if (hit > -1) { pick(rows[hit].dataset.size); res.textContent = fill(sg.dataset.result, { size: rows[hit].dataset.size }); }
      else { rows.forEach(function (r) { r.classList.remove('is-hit'); }); res.textContent = sg.dataset.none; }
    });
    // keep the table in step when a size is picked from the buttons
    if (fs) fs.addEventListener('change', function (e) { if (e.target.type === 'radio') rows.forEach(function (r) { r.classList.toggle('is-hit', r.dataset.size.trim().toLowerCase() === e.target.value.trim().toLowerCase()); }); });
    var cur = fs && $('input:checked', fs); if (cur) rows.forEach(function (r) { r.classList.toggle('is-hit', r.dataset.size.trim().toLowerCase() === cur.value.trim().toLowerCase()); });
  }

  /* product page size by waist: the slider (even jeans waist sizes) picks the matching size option. A size the
     product doesn't stock in this colour (say XXL) clears the choice, so Add to bag shows Unavailable. */
  function initWaist(fs) {
    if (fs._wz) return; fs._wz = true;
    var range = $('[data-waist-range]', fs), num = $('[data-waist-num]', fs), tag = $('[data-waist-size]', fs), note = $('[data-waist-note]', fs);
    var rows = $$('[data-waist-row]', fs).map(function (r) { return { size: r.dataset.size, lo: parseFloat(r.dataset.jmin), hi: parseFloat(r.dataset.jmax) }; });
    var radios = $$('input[type=radio]', fs);
    if (!range || !rows.length) return;
    var lo = +range.min, hi = +range.max;
    var even = function (n) { n = Math.ceil(n); if (n % 2) n += 1; return Math.max(lo, Math.min(hi, n)); };
    function rowFor(n) {
      var hit = rows.filter(function (r) { return n >= r.lo && n <= r.hi; })[0];
      return hit || rows.filter(function (r) { return r.lo > n; })[0] || rows[rows.length - 1];
    }
    function paint(n, size, have) {
      range.value = n;
      range.style.setProperty('--fill', ((n - lo) / (hi - lo || 1) * 100).toFixed(1) + '%');
      if (num) num.textContent = n;
      if (tag) { tag.textContent = size; tag.classList.toggle('is-na', !have); }
      if (note) note.textContent = have ? '' : fill(fs.dataset.missing || '', { size: size });
      $$('.wsz-ticks span', fs).forEach(function (t) { t.classList.toggle('on', +t.textContent === n); });
    }
    function choose(n, silent) {
      var row = rowFor(n), want = row.size.trim().toLowerCase();
      var inp = radios.filter(function (i) { return i.value.trim().toLowerCase() === want; })[0];
      paint(n, row.size, !!inp);
      if (silent) return;
      if (inp) { if (!inp.checked) { inp.checked = true; inp.dispatchEvent(new Event('change', { bubbles: true })); } }
      else { radios.forEach(function (i) { i.checked = false; }); fs.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    range.addEventListener('input', function () { choose(+range.value); });
    // a size picked from the chart moves the slider to that size's first waist number
    $$('[data-sg-row]', fs).forEach(function (r) {
      r.addEventListener('click', function () { var row = rows.filter(function (x) { return x.size === r.dataset.size; })[0]; if (row) choose(even(row.lo)); });
    });
    // start on the size already selected (from the URL or the first available variant)
    var cur = radios.filter(function (i) { return i.checked; })[0];
    var start = cur && rows.filter(function (x) { return x.size.trim().toLowerCase() === cur.value.trim().toLowerCase(); })[0];
    choose(even(start ? start.lo : rows[0].lo), true);
  }

  /* product reviews: the write-a-review dialog. A thank-you or an error from the last send reopens it. */
  function initReviews(sec) {
    if (sec._rv) return; sec._rv = true;
    var dlg = $('[data-rv-dialog]', sec); if (!dlg) return;
    function open() { if (dlg.open) return; if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); document.documentElement.classList.add('sg-lock'); }
    function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); document.documentElement.classList.remove('sg-lock'); }
    $$('[data-rv-open]', sec).forEach(function (b) { b.addEventListener('click', open); });
    $$('[data-rv-close]', dlg).forEach(function (b) { b.addEventListener('click', close); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    dlg.addEventListener('close', function () { document.documentElement.classList.remove('sg-lock'); });
    // rating filter and show-more
    var list = $('[data-rv-list]', sec), more = $('[data-rv-more]', sec);
    if (list) {
      var cards = $$('.rv-card', list), cta = $('.rv-cta', list), page = +list.dataset.page || 6, shown = page, want = 0;
      var apply = function () {
        var match = cards.filter(function (c) { return !want || +c.dataset.rating === want; }), n = 0;
        cards.forEach(function (c) { c.hidden = true; });
        match.forEach(function (c) { if (n < shown) { c.hidden = false; n++; } });
        if (more) { more.hidden = match.length <= shown; }
      };
      $$('[data-rv-filter]', sec).forEach(function (b) {
        b.addEventListener('click', function () {
          want = +b.dataset.rvFilter; shown = page;
          $$('[data-rv-filter]', sec).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          apply();
        });
      });
      if (more) more.addEventListener('click', function () { shown += page; apply(); });
      apply();
    }
    // customer photos: pick up to 3, shrink them in the browser, upload to the endpoint on send, pass the links along
    var ph = $('[data-rv-photos]', dlg), phForm = ph && ph.closest('form');
    if (ph && phForm) {
      var files = [], thumbs = $('[data-rv-thumbs]', ph), picker = $('[data-rv-file]', ph), perr = $('[data-rv-perr]', ph), max = +ph.dataset.max || 3, sending = false;
      var shrink = function (file) {
        return new Promise(function (res) {
          var img = new Image(), url = URL.createObjectURL(file);
          img.onload = function () {
            var k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas');
            c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            c.toBlob(function (b) { URL.revokeObjectURL(url); res(b ? { blob: b, name: (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', thumb: c.toDataURL('image/jpeg', 0.5) } : null); }, 'image/jpeg', 0.82);
          };
          img.onerror = function () { URL.revokeObjectURL(url); res(null); };
          img.src = url;
        });
      };
      var paint = function () {
        thumbs.innerHTML = '';
        files.forEach(function (f, i) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'rv-pt'; b.setAttribute('aria-label', 'Remove photo ' + (i + 1));
          b.innerHTML = '<img alt="" src="' + f.thumb + '"><i aria-hidden="true">×</i>';
          b.addEventListener('click', function () { files.splice(i, 1); paint(); });
          thumbs.appendChild(b);
        });
        picker.parentNode.hidden = files.length >= max;
      };
      picker.addEventListener('change', function () {
        var list = Array.prototype.slice.call(picker.files).slice(0, max - files.length); picker.value = ''; perr.hidden = true;
        Promise.all(list.map(shrink)).then(function (out) { out.forEach(function (o) { if (o && files.length < max) files.push(o); }); paint(); });
      });
      phForm.addEventListener('submit', function (e) {
        if (!files.length || phForm._sent) return;
        e.preventDefault(); if (sending) return; sending = true; perr.hidden = true;
        var btn = $('[data-rv-submit]', phForm), label = btn.firstChild.nodeValue; btn.disabled = true; btn.firstChild.nodeValue = ph.dataset.uploading + ' ';
        Promise.all(files.map(function (f) {
          var fd = new FormData(); fd.append('file', f.blob, f.name);
          return fetch(ph.dataset.upload, { method: 'POST', body: fd }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { if (!j || !j.url) throw 0; return j.url; });
        })).then(function (urls) {
          urls.forEach(function (u, i) { var h = document.createElement('input'); h.type = 'hidden'; h.name = 'contact[Photo ' + (i + 1) + ']'; h.value = u; phForm.appendChild(h); });
          phForm._sent = true; HTMLFormElement.prototype.submit.call(phForm);
        }).catch(function () {
          sending = false; btn.disabled = false; btn.firstChild.nodeValue = label; perr.textContent = ph.dataset.failed; perr.hidden = false;
        });
      });
    }
    // review photos open in a lightbox
    var lb = $('[data-rv-lb]', sec);
    if (lb) {
      var lbImg = document.createElement('img'); lbImg.alt = ''; lb.appendChild(lbImg);
      $$('.rv-ph', sec).forEach(function (b) {
        b.addEventListener('click', function () { lbImg.src = b.dataset.full; if (lb.showModal) lb.showModal(); else lb.setAttribute('open', ''); });
      });
      var lbClose = function () { if (lb.close) lb.close(); else lb.removeAttribute('open'); lbImg.removeAttribute('src'); };
      $('[data-rv-lbclose]', lb).addEventListener('click', lbClose);
      lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });
    }
    // sign-in box: Log in / Create account tabs, no page change
    $$('[data-rv-view]', dlg).forEach(function (t) {
      t.addEventListener('click', function () {
        var want = t.dataset.rvView;
        $$('[data-rv-view]', dlg).forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
        $$('[data-rv-pane]', dlg).forEach(function (p) { p.hidden = p.dataset.rvPane !== want; });
        var f = $('[data-rv-pane="' + want + '"] input:not([type=hidden])', dlg); if (f) f.focus();
      });
    });
    if ($('[data-rv-ok]', dlg)) { open(); sec.scrollIntoView(); }
  }

  /* product details: hotspots on the photo and the numbered list light each other up */
  function initDetails(sec) {
    if (sec._pd) return; sec._pd = true;
    var tip = $('[data-detail-tip]', sec), items = $$('.pd-list [data-detail]', sec), dots = $$('.pd-dot', sec);
    function show(i) {
      dots.forEach(function (d) { d.classList.toggle('is-on', d.dataset.detail === String(i)); });
      items.forEach(function (d) { d.classList.toggle('is-on', d.dataset.detail === String(i)); });
      var dot = dots[i], item = items[i];
      if (!tip || !dot || !item) return;
      tip.innerHTML = '<b>' + esc($('b', item).textContent) + '</b><span>' + esc($('p', item).textContent) + '</span>';
      tip.style.left = dot.style.left; tip.style.top = dot.style.top;
      tip.classList.toggle('is-left', parseFloat(dot.style.left) > 55);
      tip.classList.add('is-on');
    }
    dots.concat(items).forEach(function (el) {
      var i = parseInt(el.dataset.detail, 10);
      el.addEventListener('mouseenter', function () { show(i); });
      el.addEventListener('focus', function () { show(i); });
      el.addEventListener('click', function () { show(i); });
    });
    show(0);
  }

  /* ---------- About page (ported from the About v2 design) ---------- */
  var aboutDesk = function () { return window.matchMedia('(min-width: 861px)').matches; };
  function splitReveal(root) {
    if (!hasGsap || reduce) return;
    $$('.split[data-scroll]', root).forEach(function (h) {
      gsap.from($$('.line > span', h), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: h, start: 'top 90%' } });
    });
  }

  /* hero: grey type rises, the crew lands, then the colour switches on and the brand devices land (Ink block,
     the Pink block). On desktop the section pins: the type splits and the Ink block drifts as you scroll. */
  function initAboutHero(root) {
    if (root._ab) return; root._ab = true;
    var pin = $('[data-xh-pin]', root), bg = $('[data-xh-bg]', root), hi = $('[data-xh-hi]', root), cut = $('[data-xh-cut]', root), foot = $('[data-xh-foot]', root);
    var block = $('[data-xh-block]', root);
    var G = hasGsap && !reduce;
    function colourOn(instant) {
      if (!G || instant) { pin.style.setProperty('--g', 0); pin.style.setProperty('--tc', '#111'); bg.style.clipPath = 'circle(150% at 72% 34%)'; if (hi) hi.style.setProperty('--hb', 1); return; }
      var tl = gsap.timeline();
      /* quick sweep: most of the Lime is in within half a second */
      tl.to(bg, { clipPath: 'circle(150% at 72% 34%)', duration: 0.75, ease: 'power3.out' }, 0)
        .to(pin, { '--g': 0, '--tc': '#111111', duration: 0.5, ease: 'power2.out' }, 0.05);
      if (hi) tl.to(hi, { '--hb': 1, duration: 0.5, ease: 'expo.out' }, 0.3);
    }
    if (G) {
      var intro = gsap.timeline({ delay: 0.1 });
      intro.from($$('.xl > span', root), { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: 0.09 }, 0);
      if (block) intro.fromTo(block, { scale: 0, rotate: -60, transformOrigin: '50% 50%' }, { scale: 1, rotate: 0, duration: 1.1, ease: 'expo.out' }, 0.15); /* the sun disc pops out, its ring swinging round */
      intro.from(cut, { yPercent: 40, scale: 0.85, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0.2)
        .from(foot, { y: 40, opacity: 0, duration: 0.8, ease: 'expo.out' }, 0.7)
        .add(function () { colourOn(); }, 0.4)
        .add(function () { pin.classList.add('typed'); }, 0.95);
      /* scrolling away: no pin. The three headline lines lift at different speeds; the photo and sun stay still.
         The line wrappers move, not the spans the intro animates, so the two never fight. */
      var st = gsap.timeline({ scrollTrigger: { trigger: pin, start: 'top top', end: 'bottom top', scrub: 0.6 } });
      var lines = $$('.xl', root), speeds = [-140, -95, -55];
      lines.forEach(function (l, i) { st.to(l, { y: speeds[i] || -55, ease: 'none' }, 0); });
    } else colourOn(true);
  }

  /* house rules: each card stacks on the last; the one underneath shrinks back */
  function initAboutRules(root) {
    if (root._ab) return; root._ab = true;
    splitReveal(root);
    if (!hasGsap || reduce) return;
    var rules = $$('.rule', root), no = $('[data-rule-no]', root);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    rules.forEach(function (r, i) {
      gsap.from(r, { rotate: i % 2 ? 4 : -4, y: 80, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: r, start: 'top 95%' } });
      if (no) ScrollTrigger.create({ trigger: r, start: 'top 60%', onEnter: function () { no.textContent = pad(i + 1); }, onEnterBack: function () { no.textContent = pad(i + 1); } });
      /* the card underneath shrinks back as the next one stacks on it (every screen size) */
      if (i < rules.length - 1) gsap.to(r, { scale: 0.92, ease: 'none', scrollTrigger: { trigger: rules[i + 1], start: 'top 85%', end: 'top 30%', scrub: true } });
      var stamp = $('.stamp', r);
      if (stamp) gsap.from(stamp, { scale: 2.6, opacity: 0, rotate: -30, duration: 0.5, ease: 'back.out(2.4)', scrollTrigger: { trigger: r, start: 'top 55%' } });
    });
  }

  /* pillars: the section pins and the panels scroll sideways, on desktop and phones alike. Without motion the row
     is a normal swipeable strip (see theme.css). */
  function initAboutPillars(root) {
    if (root._ab) return; root._ab = true;
    if (!hasGsap || reduce) { root.classList.add('pil-native'); return; }
    var pinEl = $('[data-pil-pin]', root), track = $('[data-pil-track]', root), bar = $('[data-pil-bar]', root);
    /* how far the row travels: from the panels themselves, so overhanging colour blocks or odd window sizes never leave a gap */
    var dist = function () { var last = track.lastElementChild; return last ? Math.max(0, last.offsetLeft + last.offsetWidth - pinEl.clientWidth) : 0; };
    /* when scrolling stops, settle on the nearest panel so it sits fully in view */
    var panels = $$('.pil', root);
    var snapTo = function (v) {
      var d = dist(); if (d <= 0) return v;
      var pts = panels.map(function (p) { return Math.min(1, p.offsetLeft / d); }).concat(1), best = pts[0];
      pts.forEach(function (q) { if (Math.abs(q - v) < Math.abs(best - v)) best = q; });
      return best;
    };
    var ht = gsap.to(track, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: pinEl, start: 'top top', end: function () { return '+=' + dist(); }, scrub: 0.7, pin: true, anticipatePin: 1, invalidateOnRefresh: true, snap: { snapTo: snapTo, inertia: false, duration: { min: 0.2, max: 0.6 }, delay: 0.12, ease: 'power1.inOut' }, onUpdate: function (s) { if (bar) bar.style.transform = 'scaleX(' + s.progress + ')'; } } });
    $$('.pil:not(.intro)', root).forEach(function (p) {
      var img = $('figure img', p), h3 = $('h3', p), fig = $('.pil-art', p);
      if (img) gsap.fromTo(img, { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: ht, start: 'left right', end: 'right left', scrub: true } });
      if (h3) gsap.from(h3, { xPercent: 30, opacity: 0, ease: 'power2.out', scrollTrigger: { trigger: p, containerAnimation: ht, start: 'left 85%', end: 'left 30%', scrub: true } });
      if (fig) gsap.from(fig, { rotate: 10, scale: 0.85, ease: 'power2.out', scrollTrigger: { trigger: p, containerAnimation: ht, start: 'left 90%', end: 'left 20%', scrub: true } });
    });
  }

  /* what you get: cycle the word, chips pick it */
  function initAboutGet(root) {
    if (root._ab) return; root._ab = true;
    var words = $$('.gx-word', root), chips = $$('.gx-chips button', root), detail = $('[data-gx-detail]', root), cur = 0, timer = null;
    if (words.length > 1) {
      var show = function (i) {
        if (i === cur || !words[i]) return;
        var old = words[cur]; old.classList.remove('is-on'); old.classList.add('is-out');
        /* park the word below the line again without animating, so it never sweeps back through the heading */
        setTimeout(function () { old.style.transition = 'none'; old.classList.remove('is-out'); void old.offsetWidth; old.style.transition = ''; }, 720);
        words[i].classList.add('is-on'); cur = i;
        chips.forEach(function (c, k) { c.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
        if (detail && chips[i]) { detail.textContent = chips[i].dataset.detail; if (hasGsap && !reduce) gsap.fromTo(detail, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'expo.out' }); }
      };
      var auto = function () { clearInterval(timer); if (!reduce) timer = setInterval(function () { if (!document.contains(root)) return clearInterval(timer); show((cur + 1) % words.length); }, 2600); };
      chips.forEach(function (c, k) { c.addEventListener('click', function () { show(k); auto(); }); });
      auto();
    }
    if (!hasGsap || reduce) return;
    var box = $('.gx-chips', root);
    if (box) gsap.from(chips, { y: 24, opacity: 0, stagger: 0.07, duration: 0.7, ease: 'expo.out', scrollTrigger: { trigger: box, start: 'top 90%' } });
    var bgImg = $('.get-bg img', root);
    if (bgImg) gsap.fromTo(bgImg, { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* numbers: count up (or down) on scroll */
  function initAboutStats(root) {
    if (root._ab) return; root._ab = true;
    splitReveal(root);
    if (!hasGsap || reduce) return;
    $$('.cnt', root).forEach(function (c) {
      var from = +(c.dataset.from || 0), to = +c.dataset.to, o = { v: from };
      c.textContent = from;
      gsap.to(o, { v: to, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 88%' }, onUpdate: function () { c.textContent = Math.round(o.v); } });
    });
    var grid = $('.sgridn', root);
    if (grid) gsap.from($$('.stat', root), { y: 60, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: grid, start: 'top 88%' } });
  }

  /* closing: trunks drop into a pile */
  function initAboutDrop(root) {
    if (root._ab) return; root._ab = true;
    splitReveal(root);
    var box = $('[data-pile-box]', root), srcs = (root.dataset.pile || '').split('|').filter(Boolean); if (!box || !srcs.length) return;
    var order = [0, 1, 2, 3, 4, 1, 0, 2, 3, 4], rs = [-14, 8, -6, 10, -9, 15, 22, -18, -25, 12];
    var wide = { xs: [4, 15, 26, 64, 75, 86, 9, 70, 20, 80], ys: [0, 0, 0, 0, 0, 0, 60, 70, 40, 50], n: 10 };
    var narrow = { xs: [-4, 20, 50, 72, 8, 60], ys: [0, 0, 0, 0, 50, 46], n: 6 };
    var els = order.map(function (k, i) {
      var d = document.createElement('div'); d.className = 'pc';
      var im = document.createElement('img'); im.src = srcs[k % srcs.length]; im.alt = ''; im.loading = 'lazy'; d.appendChild(im);
      d.style.rotate = rs[i] + 'deg'; box.appendChild(d); return d;
    });
    /* the pile is laid out for the screen it is on, and again if the screen crosses 700px (rotate, resize) */
    var narrowMq = window.matchMedia('(max-width: 699px)');
    function layout() {
      var L = narrowMq.matches ? narrow : wide;
      els.forEach(function (d, i) {
        var on = i < L.n; d.style.display = on ? '' : 'none';
        if (on) { d.style.left = L.xs[i] + '%'; d.style.bottom = (L.ys[i] - 20) + 'px'; }
      });
    }
    layout();
    if (narrowMq.addEventListener) narrowMq.addEventListener('change', layout); else if (narrowMq.addListener) narrowMq.addListener(layout);
    if (!hasGsap || reduce) return;
    gsap.set(els, { y: -1200 });
    ScrollTrigger.create({ trigger: root, start: 'top 55%', once: true, onEnter: function () {
      gsap.to(els, { y: 0, duration: 1.1, ease: 'bounce.out', stagger: { each: 0.09, from: 'random' } });
    } });
  }

  function initAll(scope) {
    scope = scope || document;
    $$('[data-about-hero]', scope).forEach(initAboutHero);
    $$('[data-about-rules]', scope).forEach(initAboutRules);
    $$('[data-about-pillars]', scope).forEach(initAboutPillars);
    $$('[data-about-get]', scope).forEach(initAboutGet);
    $$('[data-about-stats]', scope).forEach(initAboutStats);
    $$('[data-about-drop]', scope).forEach(initAboutDrop);
    $$('[data-size-chart]', scope).forEach(initSizeChart);
    $$('[data-sg]', scope).forEach(initSizeGuide);
    $$('[data-waist]', scope).forEach(initWaist);
    $$('[data-reviews]', scope).forEach(initReviews);
    $$('[data-finder]', scope).forEach(initFinder);
    $$('[data-stretch]', scope).forEach(initStretch);
    $$('[data-campaign]', scope).forEach(initCampaign);
    $$('[data-details]', scope).forEach(initDetails);
    $$('[data-policy]', scope).forEach(initPolicy);
    $$('[data-manifesto]', scope).forEach(initManifesto);
    $$('[data-hscroll]', scope).forEach(initHScroll);
    $$('[data-peek]', scope).forEach(initPeek);
    $$('[data-magnetic]', scope).forEach(initMagnetic);
    initCounters(scope);
    initBananaCursor();
    $$('[data-pack]', scope).forEach(initPack);
    $$('[data-join]', scope).forEach(initJoin);
    $$('[data-move]', scope).forEach(initMove);
    $$('[data-fword]', scope).forEach(initFooterWord);
    $$('.hero', scope).forEach(initHero);
    $$('[data-product]', scope).forEach(initProduct);
    $$('[data-recs]', scope).forEach(initRecs);
    $$('[data-ymal]', scope).forEach(initYmal);
    $$('[data-cart-page]', scope).forEach(initCartPage);
    noWidows(scope);
    initScenes(scope);
  }
  initAll(document);

  /* theme editor: re-run a section's scripts when it reloads */
  document.addEventListener('shopify:section:load', function (e) {
    collectTracks(); initAll(e.target);
    if (hasGsap) ScrollTrigger.refresh();
  });
  document.addEventListener('shopify:section:unload', function () { if (hasGsap) setTimeout(function () { ScrollTrigger.refresh(); }, 50); });
  document.addEventListener('shopify:block:select', function (e) {
    var t = e.target; if (!t.closest) return;
    var sw = t.closest('.sw'); if (sw) sw.scrollIntoView({ block: 'center' });
    var mode = t.closest('[data-mode]'), move = t.closest('[data-move]');
    if (mode && move && move._setMode) move._setMode($$('[data-mode]', move).indexOf(mode));
  });

  /* loaders */
  if (J.loader === 'badge' && document.documentElement.classList.contains('js-load') && hasGsap && !reduce) {
    try { sessionStorage.setItem('jumper-loader', '1'); } catch (e) {}
    var tl0 = gsap.timeline({ onComplete: function () { document.documentElement.classList.remove('js-load'); } });
    tl0.from('#lbadge', { y: -320, rotate: -90, duration: .8, ease: 'bounce.out' })
      .to('#ltape', { scaleX: 1, duration: .5, ease: 'expo.out' }, '-=.1')
      .to('#loader', { yPercent: -100, duration: .7, ease: 'expo.inOut' }, '+=.2')
      .add(heroIn, '-=.35');
    setTimeout(function () { document.documentElement.classList.remove('js-load'); }, 3800);
  } else if (document.documentElement.classList.contains('is-loading')) {
    // inflating JUMPER loader: play the entrance as its panel lifts
    document.documentElement.classList.remove('js-load');
    var mo = new MutationObserver(function () { if (!document.documentElement.classList.contains('is-loading')) { mo.disconnect(); heroIn(); } });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  } else {
    document.documentElement.classList.remove('js-load');
    heroIn();
  }

  if (location.hash && location.hash.length > 1) setTimeout(function () { scrollToHash(location.hash); }, 120);
  window.addEventListener('load', function () { if (hasGsap) ScrollTrigger.refresh(); });
})();
