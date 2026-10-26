import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT)||4173;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    let requested;
    try{requested=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end('Bad path');return;}
    const file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
    if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(data);
  }catch(error){res.writeHead(error.code==='ENOENT'||error.code==='EISDIR'?404:500);res.end('File unavailable');}
});
server.on('error',error=>{if(error.code==='EADDRINUSE')console.error(`Port ${port} is in use. The game may already be running at http://localhost:${port}`);else console.error(error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
  const url=`http://localhost:${port}`;
  console.log(`CODE LAB ready: ${url}`);
  if(process.argv.includes('--open')&&process.platform==='win32'){
    const opener=spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'});
    opener.on('error',()=>console.log(`Open ${url} in your browser.`));opener.unref();
  }
});
