/* Preview only: fakes Shopify's cart endpoints in the browser and renders the real cart-drawer section
   with liquidjs, so quick add, packs, quantity and remove can be tried without a store. */
(function () {
  var P = window.__PREVIEW; if (!P || !window.liquidjs) return;
  var KEY = 'jumperPreviewCart';
  var lines = []; try { lines = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) {}
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) {} }
  var memfs = {
    resolve: function (dir, file, ext) { return (dir === '.' ? '' : dir + '/') + (file.slice(-ext.length) === ext ? file : file + ext); },
    exists: function (f) { return Promise.resolve(f in P.files); }, existsSync: function (f) { return f in P.files; },
    readFile: function (f) { return Promise.resolve(P.files[f]); }, readFileSync: function (f) { return P.files[f]; }
  };
  var ready = import('./preview-lib.mjs').then(function (lib) {
    var engine = new liquidjs.Liquid({ root: ['.'], partials: ['snippets'], extname: '.liquid', jsTruthy: false, strictFilters: true, fs: memfs, relativeReference: false });
    lib.setupEngine(engine, { locale: P.locale, read: function (f) { return P.files[f]; } });
    return { lib: lib, engine: engine };
  });
  function render() {
    return ready.then(function (x) {
      var cart = x.lib.buildCart(lines, P.catalog);
      x.engine.options.globals = Object.assign({}, P.base, { cart: cart });
      return x.engine.parseAndRender(P.files['sections/cart-drawer.liquid'], Object.assign({}, P.base, { cart: cart })).then(function (html) {
        return { cart: cart, html: '<div id="shopify-section-cart-drawer" class="shopify-section">' + html + '</div>' };
      });
    });
  }
  function json(obj, status) { return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } }); }
  var uid = 0;
  var realFetch = window.fetch.bind(window);
  window.fetch = function (url, opts) {
    var u = String(url), m = u.match(/\/cart\/(add|change|update)\.js/);
    if (m) {
      var body = JSON.parse((opts && opts.body) || '{}');
      if (m[1] === 'add') {
        var items = body.items || [{ id: body.id, quantity: body.quantity || 1, properties: body.properties }];
        for (var i = 0; i < items.length; i++) {
          var v = P.catalog[items[i].id];
          if (!v) return Promise.resolve(json({ status: 404, description: 'Cannot find variant' }, 404));
          if (v.product === 'Navy Trunk' && v.size === 'XL') return Promise.resolve(json({ status: 422, description: 'Navy Trunk - XL is sold out.' }, 422));
        }
        items.forEach(function (it) {
          var props = it.properties || {}, same = lines.filter(function (l) { return l.id === it.id && JSON.stringify(l.properties || {}) === JSON.stringify(props); })[0];
          if (same) same.quantity += it.quantity || 1; else lines.push({ id: it.id, quantity: it.quantity || 1, properties: props, uid: Date.now().toString(36) + (uid++) });
        });
      } else if (m[1] === 'change') {
        lines = lines.map(function (l) { if (l.id + ':' + l.uid === body.id) l.quantity = body.quantity; return l; }).filter(function (l) { return l.quantity > 0; });
      } else {
        var keys = Object.keys(body.updates || {});
        lines = lines.filter(function (l) { return keys.indexOf(l.id + ':' + l.uid) < 0 || body.updates[l.id + ':' + l.uid] > 0; });
      }
      save();
      return new Promise(function (r) { setTimeout(r, 250); }).then(render).then(function (r) { return json(Object.assign({}, r.cart, { sections: { 'cart-drawer': r.html } })); });
    }
    if (u.indexOf('sections=cart-drawer') >= 0) return render().then(function (r) { return json({ 'cart-drawer': r.html }); });
    if (u.indexOf('/search/suggest') >= 0) {
      var q = decodeURIComponent((u.match(/q=([^&]*)/) || [])[1] || '').toLowerCase(), seen = {}, html = '';
      Object.keys(P.catalog).forEach(function (id) { var v = P.catalog[id]; if (!seen[v.product] && v.product.toLowerCase().indexOf(q) >= 0) { seen[v.product] = 1; html += '<a class="pred-item" href="product.html"><img src="' + v.image + '" alt=""><span><b>' + v.product + '</b><small>Rs. 799</small></span></a>'; } });
      return Promise.resolve(new Response('<div data-predictive>' + (html ? '<div><h3>Products</h3><div class="pred-products">' + html + '</div></div>' : '') + '<div><a class="link pred-all" href="/search">See all results <span class="arrow">→</span></a></div></div>'));
    }
    return realFetch(url, opts);
  };
  function sync() {
    if (!document.getElementById('drawerBody') || document.body.classList.contains('template-cart')) return;
    render().then(function (r) {
      var doc = new DOMParser().parseFromString(r.html, 'text/html'), nb = doc.querySelector('#drawerBody'), ob = document.getElementById('drawerBody');
      if (nb && ob) { ob.replaceWith(nb); var c = document.getElementById('bagCount'); if (c) c.textContent = r.cart.item_count; }
    });
  }
  if (lines.length) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync(); }
  // forms that would post to Shopify just say so in the preview
  document.addEventListener('submit', function (e) {
    var f = e.target; if (f.closest('[data-join]') || f.matches('[data-product-form]') || f.closest('.search-form') || f.closest('#filters')) return;
    e.preventDefault(); if (window.Jumper && Jumper.toast) Jumper.toast('Preview only: this posts to Shopify (' + (f.getAttribute('action') || '') + ')');
  });
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.closest('[data-join]') || e.defaultPrevented) return;
    e.preventDefault(); sessionStorage.setItem('jumperCrewName', (f.querySelector('[data-fname]') || {}).value || ''); location.href = 'joined.html#join';
  });
})();
