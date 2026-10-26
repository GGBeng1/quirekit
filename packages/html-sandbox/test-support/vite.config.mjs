import { fileURLToPath } from "node:url";
let requests = [];
export default {
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [{ name: "egress-observer", configureServer(server) { server.middlewares.use((req,res,next)=>{
    if (req.url.startsWith('/egress')) { requests.push(req.url); res.end('observed'); }
    else if (req.url === '/received') { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(requests)); }
    else if (req.url === '/reset') { requests=[];res.end('reset'); }
    else next();
  }); }}],
  server: { host: "127.0.0.1", port: 5194, strictPort: true, fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] } }
};
