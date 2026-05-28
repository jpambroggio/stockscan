// Cloudflare Pages Function — activar
// GET /api/activar?code=FAR001

const FARMACIAS = {
  "FAR001": { nombre: "Farmacia San Martín", activa: true },
  "FAR002": { nombre: "Farmacia Central",    activa: true }
};

export async function onRequest(context) {
  const url  = new URL(context.request.url);
  const code = (url.searchParams.get('code') || '').trim().toUpperCase();

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (!code) {
    return new Response(JSON.stringify({ ok: false, error: 'Código requerido' }), { status: 400, headers });
  }

  const f = FARMACIAS[code];
  if (!f)        return new Response(JSON.stringify({ ok: false, error: 'Código inválido' }),   { status: 404, headers });
  if (!f.activa) return new Response(JSON.stringify({ ok: false, error: 'Licencia inactiva' }), { status: 403, headers });

  return new Response(JSON.stringify({ ok: true, nombre: f.nombre, code }), { status: 200, headers });
}
