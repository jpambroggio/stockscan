// ══════════════════════════════════════════════
// ACTIVAR — valida el código de farmacia
// GET /.netlify/functions/activar?code=FAR001
// ══════════════════════════════════════════════
const FARMACIAS = {
  "FAR001": {
    nombre: "Farmacia San Martín",
    api: "http://190.231.99.243:60063/api/productos/",
    activa: true
  },
  "FAR002": {
    nombre: "Farmacia Central",
    api: "http://192.168.1.50:60063/api/productos/",
    activa: true
  }
  // Agregar clientes acá
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const code = (event.queryStringParameters?.code || '').trim().toUpperCase();

  if (!code) {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Código requerido' }) };
  }

  const farmacia = FARMACIAS[code];

  if (!farmacia) {
    return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: 'Código inválido' }) };
  }

  if (!farmacia.activa) {
    return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'Licencia inactiva' }) };
  }

  // Devuelve solo lo necesario — nunca la URL real de la API
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      nombre: farmacia.nombre,
      code,
      // Token interno para el proxy — el cliente nunca ve la URL real
      token: Buffer.from(code + ':' + Date.now()).toString('base64')
    })
  };
};
