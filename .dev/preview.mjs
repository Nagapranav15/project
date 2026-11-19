// Renders the real theme Liquid into a static preview in /dist with liquidjs and a mock store.
// The bag works too: .dev/preview-cart.js fakes Shopify's cart endpoints and re-renders the real
// cart-drawer section in the browser. Not part of the Shopify theme.
import { Liquid } from 'liquidjs';
import fs from 'node:fs';
import path from 'node:path';
import { setupEngine } from './preview-lib.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'dist');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJSON = (p) => JSON.parse(read(p));
const locale = readJSON('locales/en.default.json');
const schemaDefaults = Object.fromEntries(readJSON('config/settings_schema.json').flatMap((g) => g.settings || []).filter((s) => s.id).map((s) => [s.id, s.default ?? (s.type === 'checkbox' ? false : '')]));
const settings = { ...schemaDefaults, ...readJSON('config/settings_data.json').current };

const memfs = {
  resolve: (dir, file, ext) => (file.endsWith(ext) ? file : file + ext).replace(/^\.?\/?/, dir === '.' ? '' : dir + '/'),
  exists: async (f) => fs.existsSync(path.join(root, f)), existsSync: (f) => fs.existsSync(path.join(root, f)),
  readFile: async (f) => read(f), readFileSync: (f) => read(f),
};
const engine = new Liquid({ root: ['.'], partials: ['snippets'], layouts: ['layout'], extname: '.liquid', jsTruthy: false, strictFilters: true, dynamicPartials: true, fs: memfs, relativeReference: false });
const { renderJSON } = setupEngine(engine, { locale, read, assetBase: '/assets/' });

/* ---------- mock store ---------- */
const sizes = ['S', 'M', 'L', 'XL'];
const catalog = {};
const mk = (n, id, title, colour, hex, tags, compare) => {
  const handle = id + '-trunk';
  const media = [{ id: n * 10 + 1, media_type: 'image', src: `/assets/trunk-${id}-close.jpg`, alt: title + ', close up', preview_image: { src: `/assets/trunk-${id}-close.jpg` } },
    { id: n * 10 + 2, media_type: 'image', src: `/assets/trunk-${id}-wide.jpg`, alt: title + ' on body', preview_image: { src: `/assets/trunk-${id}-wide.jpg` } }];
  const variants = sizes.map((s, i) => {
    const vid = n * 100 + i;
    catalog[vid] = { product: title, size: s, price: 79900, url: '/product.html', image: `/assets/trunk-${id}-close.jpg`, hex };
    return { id: vid, title: s, options: [s], option1: s, price: 79900, compare_at_price: compare || null, available: !(n === 3 && s === 'XL'), url: '/product.html?variant=' + vid, featured_media: null, sku: `JMP-${id.toUpperCase()}-${s}` };
  });
  return {
    id: n, title, handle, url: '/product.html', vendor: 'Jumper', type: 'Trunk', tags,
    description: `<p>Soft stretch body, loud woven band. ${colour}. Made to move from the gym to the rooftop.</p><ul><li>95% cotton, 5% elastane</li><li>Brushed inner band</li><li>Ships boxed</li></ul>`,
    price: 79900, price_min: 79900, price_varies: false, compare_at_price: compare || null, available: true, has_only_default_variant: false,
    metafields: { custom: { swatch: hex, colour_label: colour } }, media, featured_media: media[0], featured_image: media[0],
    options_with_values: [{ name: 'Size', position: 1, values: sizes, selected_value: 'M' }],
    variants, selected_or_first_available_variant: variants[1], selling_plan_groups: [], requires_selling_plan: false,
  };
};
const products = [
  mk(1, 'maroon', 'Maroon Trunk', 'Maroon, orange band', '#5a2230', ['New in']),
  mk(2, 'yellow', 'Sunshine Trunk', 'Yellow, ink band', '#d9bf2e', ['New in']),
  mk(3, 'navy', 'Navy Trunk', 'Navy, ink band', '#22285a', [], 99900),
  mk(4, 'grey', 'Heather Trunk', 'Grey, white band', '#b9bab5', []),
];
const byName = { Maroon: products[0], Sunshine: products[1], Navy: products[2], Heather: products[3] };
const sortOptions = [{ value: 'manual', name: 'Featured' }, { value: 'price-ascending', name: 'Price, low to high' }, { value: 'created-descending', name: 'Newest' }];
const filters = [
  { label: 'Size', type: 'list', active_values: [], values: sizes.map((s) => ({ label: s, value: s, param_name: 'filter.v.option.size', count: 4, active: s === 'M' })) },
  { label: 'Colour', type: 'list', active_values: [], values: products.map((p) => ({ label: p.title.split(' ')[0], value: p.handle, param_name: 'filter.v.option.color', count: 1, active: false, swatch: { color: p.metafields.custom.swatch } })) },
  { label: 'Price', type: 'price_range', range_max: 99900, min_value: { param_name: 'filter.v.price.gte', value: null }, max_value: { param_name: 'filter.v.price.lte', value: null } },
];
filters[0].active_values = filters[0].values.filter((v) => v.active).map((v) => ({ ...v, url_to_remove: '/collections/all' }));
const collection = { title: 'All trunks', handle: 'all', url: '/collection.html', products, products_count: products.length, all_products_count: 4, description: '<p>Every colour, every band. Loud on purpose.</p>', filters, sort_options: sortOptions, sort_by: 'manual', default_sort_by: 'manual', featured_image: { src: 'assets/trunk-yellow-wide.jpg' } };

const emptyCart = { items: [], item_count: 0, total_price: 0, cart_level_discount_applications: [], currency: { iso_code: 'INR', symbol: '₹' }, taxes_included: true, note: '' };
const fullCart = (() => {
  const line = (vid, q, props) => { const v = catalog[vid]; return { key: `${vid}:k${Math.random().toString(36).slice(2, 6)}`, id: vid, quantity: q, properties: props || {}, final_line_price: v.price * q, original_line_price: v.price * q, final_price: v.price, url: v.url, image: { src: v.image }, url_to_remove: '#', product: { title: v.product, has_only_default_variant: false }, options_with_values: [{ name: 'Size', value: v.size }], line_level_discount_allocations: [] }; };
  const items = [
    line(401, 1, { Pack: '3 pack', _size: 'M', _pack: 'PDEMO', _hex: '#b9bab5', _name: 'Heather' }),
    line(301, 2, { Pack: '3 pack', _size: 'M', _pack: 'PDEMO', _hex: '#22285a', _name: 'Navy' }),
    line(102, 1),
  ];
  return { ...emptyCart, items, item_count: 4, total_price: items.reduce((n, i) => n + i.final_line_price, 0) };
})();

const base = {
  shop: { name: 'Jumper', url: '/index.html', description: 'Underwear with the volume up.', money_format: 'Rs. {{amount_no_decimals}}', email: 'hello@jumper.example', phone: '+91 98765 43210', enabled_payment_types: ['visa', 'master', 'rupay', 'upi'],
    privacy_policy: { url: '/policy.html', title: 'Privacy policy' }, refund_policy: { url: '/policy.html', title: 'Refund policy' }, shipping_policy: { url: '/policy.html', title: 'Shipping policy', body: 'x' }, terms_of_service: { url: '/policy.html', title: 'Terms of service' }, checkout: { guest_login: false } },
  routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', cart_update_url: '/cart/update', search_url: '/search', predictive_search_url: '/search/suggest', account_url: '/account', account_login_url: '/account/login', account_register_url: '/account/register', account_logout_url: '#', account_addresses_url: '#', all_products_collection_url: '/collections/all', product_recommendations_url: '/recs.html' },
  request: { locale: { iso_code: 'en' }, origin: 'https://jumper.example', design_mode: false, page_type: 'index' },
  cart: emptyCart, settings, canonical_url: 'https://jumper.example', current_page: 1, page_description: 'Jumper. Underwear with the volume up.', content_for_header: '',
  recommendations: { performed: true, products_count: 3, products: products.slice(1) }, collections: [collection, { ...collection, title: 'Packs', featured_image: { src: 'assets/box-front.webp' } }, { ...collection, title: 'New in', featured_image: null }],
  powered_by_link: '<a href="#">Powered by Shopify</a>', all_country_option_tags: '<option value="India">India</option>',
};
base.collections.all = collection; // Shopify's collections.all (the home Shop section falls back to it)
const withProducts = (type, section) => {
  if (type === 'featured-collection' && !section.settings.collection) section.settings.collection = collection;
  if (type === 'pack-builder') section.blocks.forEach((b) => { if (byName[b.settings.name]) b.settings.product = byName[b.settings.name]; });
};
const policyBody = `<p>This Privacy Policy describes how Jumper collects, uses and shares your personal information when you visit or make a purchase.</p><h2>What we collect</h2><ul><li>Device information, such as your browser and time zone.</li><li>Order information, such as your name, address and email.</li></ul><h2>How we use it</h2><p>We use your order information to fulfil orders, talk to you, and screen for fraud.</p><h2>Sharing</h2><p>We share your information with the services that help us run the store, like payments and delivery.</p><h2>Your rights</h2><p>You can ask to see, fix or delete the information we hold about you.</p><h2>Contact</h2><p>Questions? <a href="/pages/contact">Contact us</a>.</p>`;
const policyHTML = `<div class="shopify-policy__container"><div class="shopify-policy__title"><h1>Privacy policy</h1></div><div class="shopify-policy__body"><div class="rte"><p>This Privacy Policy describes how Jumper collects, uses and shares your personal information when you visit or make a purchase.</p><h2>What we collect</h2><ul><li>Device information, such as your browser and time zone.</li><li>Order information, such as your name, address and email.</li></ul><h2>How we use it</h2><p>We use your order information to fulfil orders, talk to you, and screen for fraud. Questions? <a href="/pages/contact">Contact us</a>.</p><table><tr><th>Data</th><th>Kept for</th></tr><tr><td>Orders</td><td>7 years</td></tr></table></div></div></div>`;

const article = { title: 'Five ways to wear loud', url: '/article.html', author: 'Team Jumper', published_at: '2026-10-20', image: { src: 'assets/jumper-hero.jpg', alt: '' }, excerpt: '<p>From the gym floor to the rooftop, a field guide to colour that moves.</p>', content: '<p>Loud does not mean messy. Here is how the crew wears it.</p><h2>1. Start with the band</h2><p>The band is the headline. Let it peek.</p><blockquote>Wear it loud, wear it daily.</blockquote>', tags: ['Style', 'Drop 01'], comments_count: 0, comments: [] };
const blog = { title: 'Journal', url: '/blog.html', all_tags: ['Style', 'Drop 01'], articles: [article, { ...article, title: 'Inside the box', image: { src: 'assets/box-front.webp' } }, { ...article, title: 'Made to move', image: null }], 'comments_enabled?': true, 'moderated?': true };

const pages = [
  { out: 'index.html', template: 'templates/index.json', name: 'index', title: 'Jumper — Underwear with the volume up.', decorate: withProducts },
  { out: 'joined.html', template: 'templates/index.json', name: 'index', title: 'Jumper — joined', decorate: withProducts, extra: { __posted: { customer: true } } },
  { out: 'index-fresh.html', template: 'templates/index.json', name: 'index', title: 'Jumper — fresh store' },
  { out: 'collection.html', template: 'templates/collection.json', name: 'collection', title: 'All trunks', extra: { collection } },
  { out: 'product.html', template: 'templates/product.json', name: 'product', title: 'Maroon Trunk', extra: { product: products[0], collection } },
  { out: 'product-in.html', template: 'templates/product.json', name: 'product', title: 'Maroon Trunk', extra: { product: products[0], collection, customer: { first_name: 'Arjun', name: 'Arjun Rao', email: 'arjun@example.com' } } },
  { out: 'product-posted.html', template: 'templates/product.json', name: 'product', title: 'Maroon Trunk', extra: { product: products[0], collection, customer: { first_name: 'Arjun', name: 'Arjun Rao', email: 'arjun@example.com' }, __posted: { contact: true } } },
  { out: 'recs.html', template: null, raw: async (scope) => (await renderJSON('templates/product.json', scope)), name: 'product', extra: { product: products[0] } },
  { out: 'cart.html', template: 'templates/cart.json', name: 'cart', title: 'Your bag', extra: { cart: fullCart } },
  { out: 'search.html', template: 'templates/search.json', name: 'search', title: 'Search', extra: { search: { performed: true, terms: 'trunk', results_count: 5, results: [...products.map((p) => ({ ...p, object_type: 'product' })), { object_type: 'article', title: 'Five ways to wear loud', url: '/article.html', content: article.content, image: article.image }], filters, sort_options: sortOptions, sort_by: 'relevance', default_sort_by: 'relevance' } } },
  { out: 'page.html', template: 'templates/page.json', name: 'page', title: 'About', extra: { page: { title: 'About Jumper', content: '<p>Jumper makes underwear with the volume up. Soft stretch trunks for the gym, the office and the rooftop.</p><h2>Made to move</h2><p>Every pair is cut to stay put.</p><ul><li>Soft stretch</li><li>Woven band</li></ul>' } } },
  { out: 'about.html', template: 'templates/page.about.json', name: 'page', suffix: 'about', title: 'About', extra: { page: { title: 'About Jumper', content: '' } } },
  { out: 'contact.html', template: 'templates/page.contact.json', name: 'page', title: 'Contact', extra: { page: { title: 'Contact', content: '' } } },
  { out: 'policy.html', template: null, html: policyHTML, name: 'policy', title: 'Privacy policy' },
  { out: 'privacy.html', template: 'templates/page.privacy-policy.json', name: 'page', title: 'Privacy policy', extra: { page: { title: 'Privacy policy', content: '' }, shop: { ...base.shop, privacy_policy: { ...base.shop.privacy_policy, body: policyBody } } } },
  { out: 'collections.html', template: 'templates/list-collections.json', name: 'list-collections', title: 'Collections' },
  { out: 'blog.html', template: 'templates/blog.json', name: 'blog', title: 'Journal', extra: { blog } },
  { out: 'article.html', template: 'templates/article.json', name: 'article', title: article.title, extra: { blog, article } },
  { out: '404.html', template: 'templates/404.json', name: '404', title: 'Not found' },
  { out: 'login.html', template: null, liquid: 'templates/customers/login.liquid', name: 'customers/login', title: 'Log in' },
  { out: 'register.html', template: null, liquid: 'templates/customers/register.liquid', name: 'customers/register', title: 'Create account' },
  { out: 'account.html', template: null, liquid: 'templates/customers/account.liquid', name: 'customers/account', title: 'Account', extra: { customer: { first_name: 'Arjun', orders: [{ name: '#1001', customer_url: '#', created_at: '2026-10-21', financial_status_label: 'Paid', fulfillment_status_label: 'Shipped', total_price: 239700 }], addresses_count: 1, default_address: { a: 'Arjun K', b: '12 MG Road', c: 'Pune 411001', d: 'India' } } } },
  { out: 'password.html', template: 'templates/password.json', name: 'password', title: 'Opening soon', layout: 'password' },
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
fs.copyFileSync(path.join(root, '.dev/preview-lib.mjs'), path.join(out, 'preview-lib.mjs'));
fs.copyFileSync(path.join(root, '.dev/preview-cart.js'), path.join(out, 'preview-cart.js'));
fs.copyFileSync(path.join(root, 'node_modules/liquidjs/dist/liquid.browser.umd.js'), path.join(out, 'liquid.browser.umd.js'));
fs.writeFileSync(path.join(out, 'preview-data.js'), `window.__PREVIEW = ${JSON.stringify({ catalog, locale, settings, base: { shop: base.shop, routes: base.routes, request: base.request, settings }, files: Object.fromEntries(['sections/cart-drawer.liquid', 'snippets/cart-meter.liquid'].map((f) => [f, read(f)])) })};`);

let problems = 0;
for (const p of pages) {
  const scope = { ...base, ...p.extra, template: { name: p.name, suffix: p.suffix || null }, page_title: p.title, request: { ...base.request, page_type: p.name }, __decorate: p.decorate };
  engine.options.globals = { settings, shop: base.shop, routes: base.routes, request: scope.request, cart: scope.cart, template: scope.template, customer: scope.customer, collections: base.collections, __posted: scope.__posted };
  let content;
  if (p.raw) content = await p.raw(scope);
  else if (p.html) content = p.html;
  else if (p.liquid) content = await engine.parseAndRender(read(p.liquid), scope);
  else content = await renderJSON(p.template, scope);
  if (p.out === 'recs.html') { fs.writeFileSync(path.join(out, p.out), content); continue; }
  let html = await engine.parseAndRender(read(`layout/${p.layout || 'theme'}.liquid`), { ...scope, content_for_layout: content });
  html = html.replace('</body>', '<script src="/liquid.browser.umd.js"></script><script src="/preview-data.js"></script><script src="/preview-cart.js"></script>\n</body>');
  const missing = html.match(/\[missing: [^\]]+\]/g);
  if (missing) { problems++; console.warn(`  ! ${p.out}: ${[...new Set(missing)].join(', ')}`); }
  fs.writeFileSync(path.join(out, p.out), html);
  console.log(`✓ ${p.out} (${(html.length / 1024).toFixed(0)} KB)`);
}
if (problems) process.exitCode = 1;
