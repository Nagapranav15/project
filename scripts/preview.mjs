// Renders the real theme Liquid into a static preview in /dist using liquidjs
// and a small mock of Shopify's objects, tags and filters. Not shipped to Shopify.
import { Liquid, Tag, Hash } from 'liquidjs';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'dist');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJSON = (p) => JSON.parse(read(p));
const locale = readJSON('locales/en.default.json');
const settingsData = readJSON('config/settings_data.json').current;

const kv = (args) => Object.fromEntries(args.filter(Array.isArray));
const pos = (args) => args.filter((a) => !Array.isArray(a));
const money = (c) => 'Rs. ' + (Number(c || 0) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const engine = new Liquid({ root: [path.join(root, 'sections'), path.join(root, 'templates')], partials: path.join(root, 'snippets'), layouts: path.join(root, 'layout'), extname: '.liquid', jsTruthy: false, strictFilters: true, dynamicPartials: true });

/* ---------- filters ---------- */
const filters = {
  asset_url: (n) => `assets/${n}`,
  shopify_asset_url: (n) => `https://cdn.shopify.com/s/shopify/${n}`,
  image_url: (img) => (img && typeof img === 'object' ? img.src : img),
  image_tag: (src, ...args) => {
    const o = kv(args);
    const attrs = Object.entries(o).filter(([k]) => !['widths', 'sizes'].includes(k) || k === 'sizes').map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`).join(' ');
    return `<img src="${src}" ${attrs}>`;
  },
  stylesheet_tag: (u) => `<link rel="stylesheet" href="${u}">`,
  money, money_with_currency: (c) => money(c) + ' INR', money_without_currency: (c) => (Number(c || 0) / 100).toFixed(2),
  t: (key, ...args) => {
    let v = key.split('.').reduce((o, k) => (o ? o[k] : undefined), locale);
    if (typeof v !== 'string') return `[missing: ${key}]`;
    const o = kv(args);
    return v.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (o[k] ?? ''));
  },
  handle: (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  payment_type_svg_tag: (t, ...a) => `<svg class="${kv(a).class || ''}" viewBox="0 0 38 24" role="img" aria-label="${t}"><rect width="38" height="24" fill="#F7F7F7"/><text x="19" y="15" font-size="7" text-anchor="middle" fill="#111" font-family="Arial">${t.slice(0, 4).toUpperCase()}</text></svg>`,
  default_errors: (e) => (e ? String(e) : ''),
  default_pagination: () => '',
  format_address: (a) => (a ? Object.values(a).join('<br>') : ''),
  link_to: (t, u) => `<a href="${u}">${t}</a>`,
  payment_button: () => '<button type="button" class="shopify-payment-button__button shopify-payment-button__button--unbranded">Buy it now</button>',
  media_tag: (m) => `<img src="${m && m.src}">`,
};
Object.entries(filters).filter(([n]) => n !== 'handle').forEach(([n, f]) => engine.registerFilter(n, f));
engine.registerFilter('handle', filters.handle);
engine.registerFilter('handleize', filters.handle);

/* ---------- tags ---------- */
const passthrough = (open, close) => ({
  parse(token, remain) {
    this.tpls = []; this.args = token.args;
    const stream = this.liquid.parser.parseStream(remain)
      .on(`tag:end${this.name}`, () => stream.stop())
      .on('template', (t) => this.tpls.push(t))
      .on('end', () => { throw new Error(`tag ${token.getText()} not closed`); });
    stream.start();
  },
  * render(ctx, emitter) {
    const extra = open ? yield open.call(this, ctx) : {};
    emitter.write(extra.before || '');
    ctx.push(extra.scope || {});
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
    emitter.write(extra.after || (close ? close.call(this) : ''));
  },
});
engine.registerTag('schema', { parse(token, remain) { const s = this.liquid.parser.parseStream(remain).on('tag:endschema', () => s.stop()).on('end', () => {}); s.start(); }, render() {} });
engine.registerTag('javascript', engine.tags.schema);
engine.registerTag('style', passthrough(function () { return { before: '<style>', after: '</style>' }; }));
engine.registerTag('paginate', passthrough(function () { return { scope: { paginate: { pages: 1, current_page: 1, parts: [] } } }; }));
engine.registerTag('form', passthrough(function* (ctx) {
  const type = (this.args.match(/^\s*'([^']+)'/) || [])[1];
  const attrs = {};
  for (const m of this.args.matchAll(/([\w-]+):\s*'([^']*)'/g)) attrs[m[1]] = m[2];
  const action = { product: '/cart/add', customer: '#', contact: '#', customer_login: '#', create_customer: '#' }[type] || '#';
  const html = Object.entries(attrs).map(([k, v]) => (v === '' ? k : `${k}="${v}"`)).join(' ');
  return { before: `<form method="post" action="${action}" ${html}><input type="hidden" name="form_type" value="${type}">`, after: '</form>', scope: { form: { errors: null, 'posted_successfully?': false } } };
}));
engine.registerTag('layout', { parse() {}, render() {} });

const sectionSchema = (name) => {
  const src = read(`sections/${name}.liquid`);
  const m = src.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  return m ? JSON.parse(m[1]) : {};
};
const defaults = (list = []) => Object.fromEntries(list.filter((s) => s.id).map((s) => [s.id, s.default ?? (s.type === 'checkbox' ? false : '')]));

async function renderSection(id, conf, scope) {
  const schema = sectionSchema(conf.type);
  const blocks = (conf.block_order || []).map((bid) => {
    const b = conf.blocks[bid];
    const bs = (schema.blocks || []).find((x) => x.type === b.type) || {};
    return { id: bid, type: b.type, settings: { ...defaults(bs.settings), ...b.settings }, shopify_attributes: '' };
  });
  const section = { id, settings: { ...defaults(schema.settings), ...conf.settings }, blocks };
  const html = await engine.renderFile(conf.type, { ...scope, section });
  const tag = schema.tag || 'div';
  return `<${tag} id="shopify-section-${id}" class="shopify-section ${schema.class || ''}">${html}</${tag}>`;
}
async function renderJSON(file, scope) {
  const j = readJSON(file);
  const parts = [];
  for (const id of j.order) parts.push(await renderSection(id, j.sections[id], scope));
  return parts.join('\n');
}
engine.registerTag('sections', {
  parse(token) { this.group = token.args.replace(/['"\s]/g, ''); },
  * render(ctx, emitter) { emitter.write(yield renderJSON(`sections/${this.group}.json`, ctx.getAll())); },
});

/* ---------- mock store ---------- */
const img = (src, alt = '') => ({ src: `assets/${src}`, alt });
const sizes = ['S', 'M', 'L', 'XL'];
const product = {
  id: 1, title: 'Blue Camo Trunk', handle: 'blue-camo-trunk', url: 'product.html', vendor: 'Jumper', type: 'Trunk',
  description: '<p>Soft stretch body. Loud woven band. Made to move. The blue camo band carries the wordmark front and centre, repeated across the band.</p>',
  price: 79900, compare_at_price: null, price_varies: false, available: true, has_only_default_variant: false,
  metafields: { custom: { print: 'Blue camo' } },
  media: ['product-fan.jpg', 'photo-pool.jpg', 'band-blue-camo.jpg', 'product-flatlay.jpg', 'photo-beach.jpg'].map((s, i) => ({ id: i + 1, media_type: 'image', ...img(s, 'Blue Camo Trunk') })),
  options_with_values: [{ name: 'Size', values: sizes, selected_value: 'M' }],
  variants: sizes.map((s, i) => ({ id: 100 + i, title: s, options: [s], option1: s, price: 79900, compare_at_price: null, available: s !== 'XL', url: 'product.html' })),
};
product.featured_image = product.media[0];
product.featured_media = { preview_image: product.media[0] };
product.selected_or_first_available_variant = product.variants[1];

const base = {
  shop: { name: 'Jumper', description: 'Underwear with the volume up.', money_format: 'Rs. {{amount}}', customer_accounts_enabled: true, enabled_payment_types: ['visa', 'master', 'rupay', 'paypal', 'google_pay', 'upi'] },
  routes: { root_url: 'index.html', cart_url: 'cart.html', cart_add_url: '/cart/add', cart_change_url: '/cart/change', search_url: 'collection.html', account_url: '#', account_login_url: '#', all_products_collection_url: 'collection.html', product_recommendations_url: '#' },
  request: { locale: { iso_code: 'en' }, origin: 'https://jumper.example', design_mode: false },
  cart: { item_count: 0, items: [], total_price: 0, currency: { iso_code: 'INR' } },
  settings: settingsData, linklists: {}, collections: {}, powered_by_link: 'Powered by Shopify',
  canonical_url: 'https://jumper.example', current_page: 1, page_description: 'Jumper. Underwear with the volume up.', content_for_header: '',
  recommendations: { performed: true, products_count: 0, products: [] },
};

const pages = [
  { out: 'index.html', template: 'templates/index.json', name: 'index', title: 'Jumper — Wear it loud.' },
  { out: 'collection.html', template: 'templates/collection.json', name: 'collection', title: 'All trunks', extra: { collection: { title: 'All trunks', products_count: 0, products: [], filters: [], sort_options: [{ value: 'manual', name: 'Featured' }, { value: 'price-ascending', name: 'Price, low to high' }], url: 'collection.html', description: '<p>Every print, every band. Loud on purpose.</p>' } } },
  { out: 'product.html', template: 'templates/product.json', name: 'product', title: 'Blue Camo Trunk', extra: { product } },
  { out: '404.html', template: 'templates/404.json', name: '404', title: 'Not found' },
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
fs.copyFileSync(path.join(root, 'scripts/preview-cart.js'), path.join(out, 'preview-cart.js'));
engine.options.globals = base;

for (const p of pages) {
  const scope = { ...base, ...p.extra, template: { name: p.name, suffix: null }, page_title: p.title };
  const content = await renderJSON(p.template, scope);
  let html = await engine.renderFile('theme', { ...scope, content_for_layout: content }, { lookupType: 'layouts' }).catch(async () => engine.parseAndRender(read('layout/theme.liquid'), { ...scope, content_for_layout: content }));
  html = html.replace('</body>', '<script src="preview-cart.js"></script>\n</body>');
  const missing = html.match(/\[missing: [^\]]+\]/g);
  if (missing) console.warn(`  ! ${p.out}: ${[...new Set(missing)].join(', ')}`);
  fs.writeFileSync(path.join(out, p.out), html);
  console.log(`✓ ${p.out} (${(html.length / 1024).toFixed(0)} KB)`);
}
