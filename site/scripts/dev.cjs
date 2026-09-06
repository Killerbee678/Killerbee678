/* Локальный просмотр: node scripts/dev.cjs, затем открыть адрес из консоли. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};
const blocked=['scripts','tests','package.json','dist','node_modules'];
http.createServer((req,res)=>{
  let p; try{ p=decodeURIComponent(new URL(req.url,'http://localhost').pathname); }catch{ res.writeHead(400); return res.end(); }
  if(req.method==='POST'){ res.writeHead(404); return res.end('Формы работают только на Netlify'); }
  const relative=p==='/'?'index.html':p.slice(1), file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||blocked.some(b=>relative===b||relative.startsWith(b+'/'))){ res.writeHead(404); return res.end('Not found'); }
  fs.readFile(file,(error,data)=>{ if(error){ res.writeHead(404); return res.end('Not found'); } res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}); res.end(data); });
}).listen(process.env.PORT||0,'127.0.0.1',function(){ console.log(`Local: http://127.0.0.1:${this.address().port}`); });
