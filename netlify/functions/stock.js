// ══════════════════════════════════════════════
// STOCK — consulta precio/stock en tiempo real
// GET /.netlify/functions/stock?code=FAR001&id=18
// El cliente nunca ve la URL real del servidor Observer
// ══════════════════════════════════════════════
const http = require('http');

const FARMACIAS = {
  "FAR001": { api: "190.231.99.243", port: 60063, activa: true },
  "FAR002": { api: "192.168.1.50",   port: 60063, activa: true }
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/xml'
  };

  const code = (event.queryStringParameters?.code || '').trim().toUpperCase();
  const id   = (event.queryStringParameters?.id   || '').trim();

  if (!code || !id) {
    return { statusCode: 400, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Parámetros requeridos' }) };
  }

  const farmacia = FARMACIAS[code];
  if (!farmacia || !farmacia.activa) {
    return { statusCode: 403, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No autorizado' }) };
  }

  return new Promise((resolve) => {
    const options = {
      hostname: farmacia.api,
      port:     farmacia.port,
      path:     `/api/productos/${id}`,
      method:   'GET',
      headers:  { Accept: 'application/xml' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 502, headers, body: `<error>${e.message}</error>` });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ statusCode: 504, headers, body: '<error>Timeout</error>' });
    });

    req.end();
  });
};
