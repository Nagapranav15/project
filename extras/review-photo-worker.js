// Review photo upload endpoint for the Jumper theme (Cloudflare Worker + R2).
// The theme posts each customer photo here before sending the review; the Worker stores it and answers
// { "url": "https://..." }. The link then arrives in the review email (fields "Photo 1..3") so you can add it to
// the review's Photos field when you approve it.
//
// Set up (once):
//   1. Create an R2 bucket (for example jumper-review-photos) and turn on its public access / custom domain.
//   2. Create a Worker with this file, bind the bucket as REVIEW_PHOTOS, and set the variables
//        PUBLIC_BASE      = the bucket's public address, no trailing slash
//        ALLOWED_ORIGIN   = your store address, for example https://jumper.in (add the myshopify.com one too, comma separated)
//   3. Paste the Worker address into Theme settings > Product reviews > Photo upload endpoint.
//
// Safety: images only, 4 MB max, only your store's origin is allowed, random file names.

const MAX = 4 * 1024 * 1024;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
    const ok = allowed.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST' || !ok) return new Response('Not allowed', { status: 403, headers: cors });
    let file;
    try { file = (await req.formData()).get('file'); } catch (e) { return new Response('Bad request', { status: 400, headers: cors }); }
    if (!file || typeof file === 'string') return new Response('No file', { status: 400, headers: cors });
    const ext = TYPES[file.type];
    if (!ext) return new Response('Images only', { status: 415, headers: cors });
    if (file.size > MAX) return new Response('Too large', { status: 413, headers: cors });
    const key = crypto.randomUUID() + '.' + ext;
    await env.REVIEW_PHOTOS.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    return new Response(JSON.stringify({ url: env.PUBLIC_BASE + '/' + key }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
