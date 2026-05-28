// ══════════════════════════════════════════════
// VENCIMIENTOS — leer y escribir via GitHub API
// GET  /.netlify/functions/vencimientos?code=FAR001
// POST /.netlify/functions/vencimientos  body:{code,barcode,nombre,fecha,lote}
// DELETE /.netlify/functions/vencimientos?code=FAR001&barcode=xxx&lote=xxx
// ══════════════════════════════════════════════

const FARMACIAS = {
  "FAR001": { activa: true },
  "FAR002": { activa: true }
};

const GH_TOKEN = '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';
const GH_REPO  = 'jpambroggio/stockscan-pro';
const GH_FILE  = 'data/vencimientos.json';

async function ghGet() {
  const r = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE}`, {
    headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (r.status === 404) return { data: {}, sha: null };
  const j = await r.json();
  const content = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
  return { data: content, sha: j.sha };
}

async function ghSave(data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const body = { message: 'update vencimientos', content };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE}`, {
    method: 'PUT',
    headers: { Authorization: `token ${GH_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.ok;
}

exports.handler = async (event) => {
  const h = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: h, body: '' };

  const code = (event.queryStringParameters?.code || '').trim().toUpperCase();
  if (!code || !FARMACIAS[code]?.activa) {
    return { statusCode: 403, headers: h, body: JSON.stringify({ error: 'No autorizado' }) };
  }

  try {
    // GET — traer vencimientos de esta farmacia
    if (event.httpMethod === 'GET') {
      const { data } = await ghGet();
      const farm = data[code] || [];
      return { statusCode: 200, headers: h, body: JSON.stringify(farm) };
    }

    // POST — agregar/actualizar vencimiento
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { barcode, nombre, fecha, lote } = body;
      if (!barcode || !fecha) return { statusCode: 400, headers: h, body: JSON.stringify({ error: 'Faltan datos' }) };

      const { data, sha } = await ghGet();
      if (!data[code]) data[code] = [];

      // Buscar si ya existe ese barcode+lote
      const idx = data[code].findIndex(v => v.barcode === barcode && v.lote === (lote||''));
      const entry = { barcode, nombre: nombre||'', fecha, lote: lote||'', updated: new Date().toISOString() };
      if (idx >= 0) data[code][idx] = entry;
      else data[code].push(entry);

      await ghSave(data, sha);
      return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true }) };
    }

    // DELETE — borrar vencimiento
    if (event.httpMethod === 'DELETE') {
      const barcode = event.queryStringParameters?.barcode || '';
      const lote    = event.queryStringParameters?.lote    || '';
      const { data, sha } = await ghGet();
      if (data[code]) {
        data[code] = data[code].filter(v => !(v.barcode === barcode && v.lote === lote));
        await ghSave(data, sha);
      }
      return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: h, body: JSON.stringify({ error: 'Método no permitido' }) };

  } catch(e) {
    return { statusCode: 500, headers: h, body: JSON.stringify({ error: e.message }) };
  }
};
