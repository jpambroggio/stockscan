const http = require('http');

const API_HOST = '190.231.99.243';
const API_PORT = 60063;

exports.handler = async (event) => {
  // Con el redirect /:splat, el path llega como parámetro
  // event.path = /.netlify/functions/proxy/18
  // event.queryStringParameters.id no existe
  // Necesitamos extraer el ID del final del path
  
  const fullPath = event.path || '';
  
  // Extraer todo lo que viene después de /proxy/
  const match = fullPath.match(/\/proxy\/(.*)/);
  const idPart = match ? match[1] : fullPath.replace('/.netlify/functions/proxy', '');
  
  const apiPath = '/api/productos/' + idPart;

  console.log('Proxy request:', apiPath);

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
      console.error('Error:', e.message);
      resolve({ statusCode: 502, body: 'API no disponible: ' + e.message });
    });

    req.setTimeout(6000, () => {
      req.destroy();
      resolve({ statusCode: 504, body: 'Timeout' });
    });

    req.end();
  });
};
