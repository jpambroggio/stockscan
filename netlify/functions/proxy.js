const http = require('http');

const API_HOST = '190.231.99.243';
const API_PORT = 60063;

exports.handler = async (event) => {
  // Extraer el ID del producto de la URL
  // /api/productos/18 → id = 18
  const path = event.path.replace('/.netlify/functions/proxy', '');
  const apiPath = '/api/productos' + path;

  return new Promise((resolve) => {
    const options = {
      hostname: API_HOST,
      port:     API_PORT,
      path:     apiPath,
      method:   'GET',
      headers:  { Accept: 'application/xml' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: {
            'Content-Type': res.headers['content-type'] || 'application/xml',
            'Access-Control-Allow-Origin': '*',
          },
          body: data
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        statusCode: 502,
        body: 'API no disponible: ' + e.message
      });
    });

    req.setTimeout(6000, () => {
      req.destroy();
      resolve({ statusCode: 504, body: 'Timeout' });
    });

    req.end();
  });
};
