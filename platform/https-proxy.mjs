import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';

const options = {
  key: fs.readFileSync('./certificates/localhost-key.pem'),
  cert: fs.readFileSync('./certificates/localhost.pem'),
};

https.createServer(options, (req, res) => {
  const proxy = http.request(
    { hostname: 'localhost', port: 3001, path: req.url, method: req.method, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  req.pipe(proxy);
  proxy.on('error', (e) => { res.writeHead(502); res.end('Proxy error'); });
}).listen(3000, () => console.log('HTTPS proxy on https://localhost:3000 → http://localhost:3001'));
