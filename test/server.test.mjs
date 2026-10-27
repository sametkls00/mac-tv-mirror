import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { createApplication, selectLanAddress } from '../server.mjs';

async function fixture(t) {
  let clock = Date.now();
  const app = createApplication({ lanAddress: '192.0.2.10', pin: '123456', now: () => clock });
  const server = createServer(app.handle);
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    app.close();
    await new Promise((done) => { server.close(done); server.closeAllConnections(); });
  });
  async function request(path, { token, body, headers = {}, method } = {}) {
    const response = await fetch(base + path, {
      method: method || (body === undefined ? 'GET' : 'POST'),
      headers: {
        ...(body !== undefined ? { Origin: base, 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return response;
  }
  const config = await (await request('/api/config')).json();
  return { base, request, host: config.token, advance: (ms) => { clock += ms; } };
}

test('Pages, security headers and local configuration', async (t) => {
  const f = await fixture(t);
  const response = await f.request('/');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Share my screen/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(await (await f.request('/tv')).text(), /Pairing code/);
  assert.equal((await f.request('/api/host')).status, 403);
  assert.equal((await f.request('/api/receiver')).status, 401);
  assert.equal((await f.request('/..%2fserver.mjs')).status, 404);
});

test('Incorrect pairing codes and cross-origin requests are blocked', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/pair', { body: { pin: '000000' } })).status, 401);
  assert.equal((await f.request('/api/pair', { body: { pin: '123456' }, headers: { Origin: 'https://example.com' } })).status, 403);
  assert.equal((await f.request('/api/config', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  // Node fetch generates its own Host header; use raw HTTP for the rebinding test.
  const status = await new Promise((accept, reject) => {
    const request = httpRequest(f.base + '/api/config', { headers: { Host: 'attacker.example:8765' } }, (response) => {
      response.resume();
      accept(response.statusCode);
    });
    request.on('error', reject);
    request.end();
  });
  assert.equal(status, 403);
});

test('Pairing, signaling and stopping', async (t) => {
  const f = await fixture(t);
  const pair = await (await f.request('/api/pair', { body: { pin: '123456' } })).json();
  const start = await (await f.request('/api/start', { token: f.host, body: {} })).json();
  const state = await (await f.request('/api/host', { token: f.host })).json();
  const body = { generation: start.generation, receiverId: state.viewer.id, signal: { type: 'offer', sdp: 'test-offer' } };
  assert.equal((await f.request('/api/signal', { token: f.host, body })).status, 200);
  const received = await (await f.request('/api/receiver', { token: pair.token })).json();
  assert.equal(received.messages[0].signal.sdp, 'test-offer');
  assert.equal((await (await f.request('/api/receiver', { token: pair.token })).json()).messages.length, 0);
  body.signal = { type: 'answer', sdp: 'test-answer' };
  assert.equal((await f.request('/api/signal', { token: pair.token, body })).status, 200);
  assert.equal((await (await f.request('/api/host', { token: f.host })).json()).messages[0].signal.sdp, 'test-answer');
  await f.request('/api/stop', { token: f.host, body: {} });
  assert.equal((await (await f.request('/api/receiver', { token: pair.token })).json()).sharing, false);
  assert.equal((await f.request('/api/signal', { token: f.host, body })).status, 409);
});

test('Fallback images require authorization and expire on stop or timeout', async (t) => {
  const f = await fixture(t);
  const pair = await (await f.request('/api/pair', { body: { pin: '123456' } })).json();
  const start = await (await f.request('/api/start', { token: f.host, body: {} })).json();
  assert.equal((await f.request('/api/compatibility', { token: pair.token, body: { generation: start.generation } })).status, 200);
  const jpeg = Buffer.from([0xff, 0xd8, 0x01, 0x02, 0xff, 0xd9]);
  async function upload() {
    return fetch(f.base + '/api/frame', {
      method: 'POST', body: jpeg,
      headers: { Origin: f.base, Authorization: `Bearer ${f.host}`, 'Content-Type': 'image/jpeg', 'X-Generation': String(start.generation) },
    });
  }
  assert.equal((await upload()).status, 200);
  assert.equal((await f.request('/api/frame.jpg')).status, 401);
  const frame = await f.request('/api/frame.jpg?key=' + pair.token);
  assert.deepEqual(Buffer.from(await frame.arrayBuffer()), jpeg);
  f.advance(3100);
  assert.equal((await f.request('/api/frame.jpg?key=' + pair.token)).status, 404);
  assert.equal((await upload()).status, 200);
  await f.request('/api/stop', { token: f.host, body: {} });
  assert.equal((await f.request('/api/frame.jpg?key=' + pair.token)).status, 404);
  assert.equal((await upload()).status, 409);
});

test('Server-side sharing expires when the sender stops checking in', async (t) => {
  const f = await fixture(t);
  const pair = await (await f.request('/api/pair', { body: { pin: '123456' } })).json();
  await f.request('/api/start', { token: f.host, body: {} });
  f.advance(21000);
  const state = await (await f.request('/api/receiver', { token: pair.token })).json();
  assert.equal(state.sharing, false);
});

test('Pairing attempts are rate-limited and previous receiver tokens become invalid', async (t) => {
  const f = await fixture(t);
  const first = await (await f.request('/api/pair', { body: { pin: '123456' } })).json();
  const second = await (await f.request('/api/pair', { body: { pin: '123456' } })).json();
  assert.notEqual(first.token, second.token);
  assert.equal((await f.request('/api/receiver', { token: first.token })).status, 401);
  for (let index = 0; index < 8; index += 1) await f.request('/api/pair', { body: { pin: '000000' } });
  assert.equal((await f.request('/api/pair', { body: { pin: '123456' } })).status, 429);
  f.advance(61000);
  assert.equal((await f.request('/api/pair', { body: { pin: '123456' } })).status, 200);
});

test('LAN selection prefers physical private networks and honors explicit settings', () => {
  const address = (ip, internal = false) => ({ family: 'IPv4', address: ip, internal });
  const interfaces = {
    lo0: [address('127.0.0.1', true)],
    utun0: [address('10.8.0.2')],
    en1: [address('192.168.50.20')],
    en0: [address('10.0.0.20')],
    eth1: [address('198.51.100.8')],
  };
  assert.equal(selectLanAddress(interfaces), '10.0.0.20');
  assert.equal(selectLanAddress(interfaces, { interfaceName: 'en1' }), '192.168.50.20');
  assert.equal(selectLanAddress(interfaces, { lanAddress: '192.168.50.20' }), '192.168.50.20');
  assert.throws(() => selectLanAddress(interfaces, { interfaceName: 'missing' }), /TV_INTERFACE/);
  assert.throws(() => selectLanAddress(interfaces, { lanAddress: '198.51.100.8' }), /TV_LAN_IP/);
  assert.throws(() => selectLanAddress({ utun0: interfaces.utun0 }), /No private LAN/);
});

test('Invalid payloads, stale generations and invalid JPEG uploads are rejected', async (t) => {
  const f = await fixture(t);
  const pair = await (await f.request('/api/pair', { body: { pin: '123456' } })).json();
  const state = await (await f.request('/api/start', { token: f.host, body: {} })).json();
  assert.equal((await f.request('/api/compatibility', { token: pair.token, body: { generation: state.generation - 1 } })).status, 409);
  assert.equal((await f.request('/api/start', { token: f.host, body: {}, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await f.request('/api/start', { token: f.host, body: { oversized: 'x'.repeat(100000) } })).status, 413);
  const response = await fetch(f.base + '/api/frame', {
    method: 'POST', body: 'not a jpeg',
    headers: { Origin: f.base, Authorization: `Bearer ${f.host}`, 'Content-Type': 'image/jpeg', 'X-Generation': String(state.generation) },
  });
  assert.equal(response.status, 400);
  assert.throws(() => createApplication({ lanAddress: '192.0.2.10', pin: '123' }), /six digits/);
});
