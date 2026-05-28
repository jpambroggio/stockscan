// Cloudflare Pages Function — stock en tiempo real
// GET /api/stock?code=FAR001&id=18

const FARMACIAS = {
  "FAR001": { api: "http://190.231.99.243:60063", activa: true },
  "FAR002": { api: "http://192.168.1.50:60063",   activa: true }
};

export async function onRequest(context) {
  const url  = new URL(context.request.url);
  const code = (url.searchParams.get('code') || '').trim().toUpperCase();
  const id   = (url.searchParams.get('id')   || '').trim();

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (!code || !id) {
    return new Response(JSON.stringify({ error: 'Parámetros requeridos' }), { status: 400, headers });
  }

  const f = FARMACIAS[code];
  if (!f || !f.activa) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403, headers });
  }

  try {
    const resp = await fetch(`${f.api}/api/productos/${id}`, {
      signal: AbortSignal.timeout(5000)
    });
    const data = await resp.text();
    return new Response(data, { status: 200, headers });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502, headers });
  }
}
