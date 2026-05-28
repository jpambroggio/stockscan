const http = require('http');
const FARMACIAS = {
  "FAR001": { host:"190.231.99.243", port:60063, activa:true },
  "FAR002": { host:"192.168.1.50",   port:60063, activa:true }
};
exports.handler = async (event) => {
  const h = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  const code = (event.queryStringParameters?.code||'').trim().toUpperCase();
  const id   = (event.queryStringParameters?.id||'').trim();
  if(!code||!id) return {statusCode:400,headers:h,body:JSON.stringify({error:'Params requeridos'})};
  const f = FARMACIAS[code];
  if(!f||!f.activa) return {statusCode:403,headers:h,body:JSON.stringify({error:'No autorizado'})};
  return new Promise(resolve=>{
    const req=http.request({hostname:f.host,port:f.port,path:`/api/productos/${id}`,method:'GET'},res=>{
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>resolve({statusCode:200,headers:h,body:d}));
    });
    req.on('error',e=>resolve({statusCode:502,headers:h,body:JSON.stringify({error:e.message})}));
    req.setTimeout(5000,()=>{req.destroy();resolve({statusCode:504,headers:h,body:JSON.stringify({error:'Timeout'})});});
    req.end();
  });
};
