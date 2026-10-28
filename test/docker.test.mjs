import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { createApplication, privateIPv4 } from '../server.mjs';
import { startContainerServer } from '../docker-server.mjs';

test('Docker listener roles cannot be overridden by spoofed forwarding headers', async (t) => {
  const app = createApplication({ lanAddress: '192.168.50.20', pin: '123456', receiverPort: 18766 });
  const servers = [];
  async function listen(role) {
    const server = createServer((req, res) => app.handle(req, res, role));
    servers.push(server);
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    return `http://127.0.0.1:${server.address().port}`;
  }
  t.after(async () => {
    app.close();
    await Promise.all(servers.map((server) => new Promise((done) => { server.close(done); server.closeAllConnections(); })));
  });
  const senderUrl = await listen('sender');
  const receiverUrl = await listen('receiver');
  const config = await (await fetch(senderUrl + '/api/config')).json();
  assert.equal(config.tvUrl, 'http://192.168.50.20:18766/');
  const spoofed = { 'X-Forwarded-For': '127.0.0.1', 'X-Real-IP': '127.0.0.1', 'X-Listener-Role': 'sender', Authorization: `Bearer ${config.token}` };
  assert.equal((await fetch(receiverUrl + '/mac', { headers: spoofed })).status, 403);
  assert.equal((await fetch(receiverUrl + '/sender.js', { headers: spoofed })).status, 403);
  assert.equal((await fetch(receiverUrl + '/api/config', { headers: spoofed })).status, 403);
  assert.equal((await fetch(receiverUrl + '/api/host', { headers: spoofed })).status, 403);
  const start = await fetch(receiverUrl + '/api/start', {
    method: 'POST', headers: { ...spoofed, Origin: receiverUrl, 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(start.status, 403);
  assert.match(await (await fetch(receiverUrl + '/')).text(), /Pairing code/);
  const valid = await fetch(senderUrl + '/api/start', {
    method: 'POST', headers: { Authorization: `Bearer ${config.token}`, Origin: senderUrl, 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(valid.status, 200);
});

test('Container mode rejects missing/public addresses and invalid port layouts', async () => {
  await assert.rejects(startContainerServer({ lanAddress: '198.51.100.5' }), /private LAN/);
  await assert.rejects(startContainerServer({ lanAddress: '192.168.50.20', senderPort: 8765, receiverPort: 8765 }), /distinct/);
  assert.equal(privateIPv4('192..168.1'), false);
  assert.equal(privateIPv4('172.16.0.2'), true);
  assert.equal(privateIPv4('172.32.0.2'), false);
  assert.equal(privateIPv4('127.0.0.1'), false);
});

test('One public port keeps distinct sender and TV listener permissions after NAT', async (t) => {
  const publicPort = 18768;
  const app = createApplication({ lanAddress: '192.168.50.20', receiverPort: publicPort, publicPorts: { sender: publicPort, receiver: publicPort } });
  const servers = [];
  async function listen(role) {
    const server = createServer((req, res) => app.handle(req, res, role));
    servers.push(server);
    await new Promise((done) => server.listen(0, '127.0.0.1', done));
    return server.address().port;
  }
  t.after(async () => {
    app.close();
    await Promise.all(servers.map((server) => new Promise((done) => { server.close(done); server.closeAllConnections(); })));
  });
  const sender = await listen('sender');
  const receiver = await listen('receiver');
  function request(internalPort, path, token) {
    return new Promise((accept, reject) => {
      const req = httpRequest({
        host: '127.0.0.1', port: internalPort, path,
        headers: { Host: `localhost:${publicPort}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => accept({ status: response.statusCode, body }));
      });
      req.on('error', reject);
      req.end();
    });
  }
  const config = await request(sender, '/api/config');
  assert.equal(config.status, 200);
  const data = JSON.parse(config.body);
  assert.equal(data.tvUrl, 'http://192.168.50.20:18768/');
  assert.equal((await request(receiver, '/api/config', data.token)).status, 403);
  assert.equal((await request(receiver, '/api/host', data.token)).status, 403);
  assert.match((await request(receiver, '/')).body, /Pairing code/);
});
