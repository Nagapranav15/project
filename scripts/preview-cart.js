/* Preview-only mock cart so the static demo feels real. Not part of the Shopify theme. */
(() => {
  const J = (window.Jumper = window.Jumper || {});
  const items = [];
  const THRESHOLD = 99900;
  const money = (c) => 'Rs. ' + (c / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const cents = (s) => Math.round(parseFloat(String(s).replace(/[^\d.]/g, '')) * 100) || 79900;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const icon = (d) => `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" stroke="currentColor" stroke-width="2" fill="none"/></svg>`;

  const render = () => {
    const el = document.querySelector('[data-cart-contents]');
    if (!el) return;
    const count = items.reduce((n, i) => n + i.qty, 0);
    const total = items.reduce((n, i) => n + i.qty * i.price, 0);
    const pct = Math.min(100, Math.round((total / THRESHOLD) * 100));
    const meter = `<div class="ship-meter" style="--p:${pct}%"><p class="t-label">${total >= THRESHOLD ? 'Free shipping unlocked ✦' : money(THRESHOLD - total) + ' away from free shipping'}</p><div class="ship-meter__bar"><span></span></div></div>`;
    const head = `<div class="drawer__head"><h2 class="t-headline" id="CartDrawerTitle">Your bag<sup class="drawer__count">${count}</sup></h2>${meter}</div>`;
    const empty = document.querySelector('.drawer__empty');
    if (!items.length) {
      el.innerHTML = head + (empty ? empty.outerHTML : '<div class="drawer__empty"><p class="t-subhead">Your bag is empty. Not for long.</p></div>');
    } else {
      el.innerHTML = head + `<ul class="drawer__items" role="list">${items.map((i, k) => `
        <li class="line">
          <span class="line__media"><img src="${esc(i.image)}" alt=""></span>
          <div class="line__info"><span class="line__title">${esc(i.title)}</span><p class="t-label line__variant">Size ${esc(i.size)}</p>
            <div class="qty"><button type="button" class="qty__btn" data-qty-change="${i.qty - 1}" data-line-index="${k + 1}" aria-label="Decrease">${icon('M4 12h16')}</button><span class="qty__val">${i.qty}</span><button type="button" class="qty__btn" data-qty-change="${i.qty + 1}" data-line-index="${k + 1}" aria-label="Increase">${icon('M12 4v16M4 12h16')}</button></div>
          </div>
          <div class="line__end"><span class="price">${money(i.qty * i.price)}</span><button type="button" class="line__remove t-label" data-qty-change="0" data-line-index="${k + 1}">Remove</button></div>
        </li>`).join('')}</ul>
        <div class="drawer__foot"><div class="drawer__total"><span class="t-label">Subtotal</span><span class="t-subhead">${money(total)} INR</span></div>
        <p class="drawer__note">Taxes and shipping calculated at checkout.</p>
        <button class="btn btn--block btn--lime-on-ink" type="button" onclick="Jumper.toast('Preview only: checkout runs on Shopify')">Check out →</button></div>`;
    }
    document.querySelectorAll('[data-cart-count]').forEach((c) => { c.textContent = count; c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump'); });
  };
  // keep the server-rendered empty state as a template
  document.addEventListener('DOMContentLoaded', () => { const e = document.querySelector('.drawer__empty'); if (e) J._empty = e.cloneNode(true); });

  J.preview = {
    render,
    add(d) {
      const ex = items.find((i) => i.title === d.title && i.size === d.size);
      if (ex) ex.qty += 1; else items.push({ title: d.title, size: d.size, price: cents(d.price), image: d.image, qty: 1 });
      render();
    },
    change(line, qty) {
      if (qty <= 0) items.splice(line - 1, 1); else items[line - 1].qty = qty;
      render();
    },
  };

  // Product forms in preview: fake the add
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-product-form]');
    if (!f) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const title = document.querySelector('.pdp__title')?.textContent.trim() || f.closest('.card')?.querySelector('.card__title')?.textContent.trim() || 'Trunk';
    const checked = f.querySelector('.swatch input:checked');
    const size = (e.submitter && e.submitter.name === 'id' ? e.submitter.textContent.trim() : checked && checked.value) || 'M';
    const img = document.querySelector('.pdp__media img, .card__img')?.getAttribute('src') || '';
    const qty = Number(f.querySelector('input[name="quantity"]')?.value || 1);
    for (let n = 0; n < qty; n++) J.preview.add({ title, size, price: 'Rs. 799', image: img });
    J.openCart && J.openCart();
  }, true);
})();
