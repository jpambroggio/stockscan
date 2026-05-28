const FARMACIAS = {
  "FAR001": { nombre: "Farmacia San Martin", activa: true },
  "FAR002": { nombre: "Farmacia Central",    activa: true }
};
exports.handler = async (event) => {
  const h = { 'Access-Control-Allow-Origin':'*','Content-Type':'application/json' };
  const code = (event.queryStringParameters?.code||'').trim().toUpperCase();
  if(!code) return {statusCode:400,headers:h,body:JSON.stringify({ok:false,error:'Código requerido'})};
  const f = FARMACIAS[code];
  if(!f)        return {statusCode:404,headers:h,body:JSON.stringify({ok:false,error:'Código inválido'})};
  if(!f.activa) return {statusCode:403,headers:h,body:JSON.stringify({ok:false,error:'Licencia inactiva'})};
  return {statusCode:200,headers:h,body:JSON.stringify({ok:true,nombre:f.nombre,code})};
};
