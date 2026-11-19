// Shared by the Node preview build and the in-browser mock cart.
// Registers the Shopify filters and tags the theme uses on a liquidjs engine. Preview only; never shipped.

export function setupEngine(engine, { locale, read, assetBase = 'assets/' }) {
  const kv = (args) => Object.fromEntries(args.filter(Array.isArray));
  const fmt = (c, dec) => (Number(c || 0) / 100).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const money = (c) => 'Rs. ' + fmt(c, 2);
  const moneyNz = (c) => 'Rs. ' + fmt(c, 2).replace(/\.00$/, '');
  const escAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const lookup = (key) => key.split('.').reduce((o, k) => (o ? o[k] : undefined), locale);

  const filters = {
    asset_url: (n) => assetBase + n,
    shopify_asset_url: (n) => `https://cdn.shopify.com/s/shopify/${n}`,
    image_url: (img) => (img && typeof img === 'object' ? img.src : img),
    image_tag: (src, ...args) => {
      const o = kv(args);
      const attrs = Object.entries(o).filter(([k]) => k !== 'widths').map(([k, v]) => `${k}="${escAttr(v)}"`).join(' ');
      return `<img src="${src}" ${attrs}>`;
    },
    preload_tag: (u) => `<link rel="preload" href="${u}">`,
    stylesheet_tag: (u) => `<link rel="stylesheet" href="${u}">`,
    money, money_with_currency: (c) => money(c) + ' INR', money_without_currency: (c) => fmt(c, 2), money_without_trailing_zeros: moneyNz,
    t: (key, ...args) => {
      let v = lookup(key);
      const o = kv(args);
      if (v && typeof v === 'object' && 'count' in o) v = Number(o.count) === 1 ? v.one : v.other;
      if (typeof v !== 'string') return `[missing: ${key}]`;
      return v.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (o[k] ?? ''));
    },
    handle: (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    payment_type_svg_tag: (t) => `<svg viewBox="0 0 38 24" role="img" aria-label="${t}"><rect width="38" height="24" fill="#F7F7F7" stroke="#111"/><text x="19" y="15" font-size="7" text-anchor="middle" fill="#111" font-family="Arial">${t.slice(0, 4).toUpperCase()}</text></svg>`,
    default_errors: (e) => (e ? `<ul><li>${e}</li></ul>` : ''),
    format_address: (a) => (a ? Object.values(a).join('<br>') : ''),
    format_code: (c) => String(c).replace(/(.{4})/g, '$1 ').trim(),
    payment_button: () => '<div class="shopify-payment-button"><button type="button" class="shopify-payment-button__button shopify-payment-button__button--unbranded">Buy it now</button></div>',
    media_tag: (m) => `<img src="${m && m.src}" alt="">`,
    video_tag: () => '', external_video_tag: () => '', model_viewer_tag: () => '',
  };
  for (const [n, f] of Object.entries(filters)) engine.registerFilter(n, f);
  engine.registerFilter('handleize', filters.handle);

  const block = (open) => ({
    parse(token, remain) {
      this.tpls = []; this.args = token.args;
      const stream = this.liquid.parser.parseStream(remain)
        .on(`tag:end${this.name}`, () => stream.stop())
        .on('template', (t) => this.tpls.push(t))
        .on('end', () => { throw new Error(`tag ${token.getText()} not closed`); });
      stream.start();
    },
    * render(ctx, emitter) {
      const extra = open ? open.call(this, ctx) : {};
      emitter.write(extra.before || '');
      ctx.push(extra.scope || {});
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
      ctx.pop();
      emitter.write(extra.after || '');
    },
  });
  engine.registerTag('schema', { parse(token, remain) { const s = this.liquid.parser.parseStream(remain).on('tag:endschema', () => s.stop()).on('end', () => {}); s.start(); }, render() {} });
  engine.registerTag('style', block(function () { return { before: '<style>', after: '</style>' }; }));
  engine.registerTag('paginate', block(function (ctx) {
    const m = this.args.match(/^\s*([\w.]+)\s+by/);
    const coll = m ? m[1].split('.').reduce((o, k) => (o ? o[k] : undefined), ctx.getAll()) : [];
    const n = Array.isArray(coll) ? coll.length : 0;
    return { scope: { paginate: { pages: n > 16 ? 2 : 1, current_page: 1, items: n, parts: n > 16 ? [{ title: 1, is_link: false }, { title: 2, is_link: true, url: '#' }] : [], next: n > 16 ? { url: '#' } : null } } };
  }));
  engine.registerTag('form', block(function (ctx) {
    const type = (this.args.match(/^\s*'([^']+)'/) || [])[1];
    const attrs = {};
    for (const m of this.args.matchAll(/([\w-]+):\s*'([^']*)'/g)) attrs[m[1]] = m[2];
    const action = { product: '/cart/add', customer: '/contact#join', contact: '/contact', customer_login: '/account/login', create_customer: '/account', storefront_password: '/password', guest_login: '/account/login', recover_customer_password: '/account/recover', customer_address: '/account/addresses', new_comment: '#' }[type] || '#';
    const html = Object.entries(attrs).map(([k, v]) => (v === '' ? k : `${k}="${v}"`)).join(' ');
    const posted = !!(ctx.getAll().__posted || {})[type];
    return { before: `<form method="post" action="${action}" ${html}><input type="hidden" name="form_type" value="${type}">`, after: '</form>', scope: { form: { errors: null, 'posted_successfully?': posted, password_needed: true } } };
  }));
  engine.registerTag('layout', { parse() {}, render() {} });

  const sectionSchema = (name) => {
    const m = read(`sections/${name}.liquid`).match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
    return m ? JSON.parse(m[1]) : {};
  };
  const defaults = (list = []) => Object.fromEntries(list.filter((s) => s.id).map((s) => [s.id, s.default ?? (s.type === 'checkbox' ? false : '')]));
  async function renderSection(id, conf, scope, extraClass = '') {
    const schema = sectionSchema(conf.type);
    const blocks = (conf.block_order || []).map((bid) => {
      const b = conf.blocks[bid];
      const bs = (schema.blocks || []).find((x) => x.type === b.type) || {};
      return { id: bid, type: b.type, settings: { ...defaults(bs.settings), ...b.settings }, shopify_attributes: '' };
    });
    const section = { id, settings: { ...defaults(schema.settings), ...conf.settings }, blocks };
    if (scope.__decorate) scope.__decorate(conf.type, section);
    const html = await engine.parseAndRender(read(`sections/${conf.type}.liquid`), { ...scope, section });
    return `<div id="shopify-section-${id}" class="shopify-section ${extraClass} ${schema.class || ''}">${html}</div>`;
  }
  async function renderJSON(file, scope) {
    const j = JSON.parse(read(file));
    const group = file.includes('-group') ? `shopify-section-group-${file.split('/').pop().replace('.json', '')}` : '';
    const parts = [];
    for (const id of j.order) parts.push(await renderSection(id, j.sections[id], scope, group));
    return parts.join('\n');
  }
  engine.registerTag('sections', {
    parse(token) { this.group = token.args.replace(/['"\s]/g, ''); },
    * render(ctx, emitter) { emitter.write(yield renderJSON(`sections/${this.group}.json`, ctx.getAll())); },
  });
  engine.registerTag('section', {
    parse(token) { this.name = token.args.replace(/['"\s]/g, ''); },
    * render(ctx, emitter) { emitter.write(yield renderSection(this.name, { type: this.name, settings: {} }, ctx.getAll())); },
  });
  return { renderSection, renderJSON };
}

// Build a Shopify-like cart object from simple lines.
export function buildCart(lines, catalog) {
  const items = lines.map((l, i) => {
    const v = catalog[l.id];
    const props = l.properties || {};
    return {
      key: `${l.id}:${l.uid}`, id: l.id, quantity: l.quantity, properties: props,
      final_line_price: v.price * l.quantity, original_line_price: v.price * l.quantity, final_price: v.price,
      url: v.url, image: v.image ? { src: v.image } : null, title: v.product + ' - ' + v.size,
      product: { title: v.product, has_only_default_variant: false, metafields: { custom: { swatch: v.hex } } },
      options_with_values: [{ name: 'Size', value: v.size }], line_level_discount_allocations: [], variant: { title: v.size },
    };
  });
  return {
    items, item_count: items.reduce((n, i) => n + i.quantity, 0), total_price: items.reduce((n, i) => n + i.final_line_price, 0),
    cart_level_discount_applications: [], currency: { iso_code: 'INR', symbol: '₹' }, taxes_included: true, note: '',
  };
}
