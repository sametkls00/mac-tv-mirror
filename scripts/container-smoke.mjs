import assert from 'node:assert/strict';

const senderUrl = process.env.TEST_SENDER_URL || 'http://127.0.0.1:18765';
const receiverUrl = process.env.TEST_RECEIVER_URL || 'http://127.0.0.1:18766';
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function request(base, path, { token, body, headers = {} } = {}) {
  return fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { Origin: base, 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(3000),
  });
}

let ready = false;
for (let attempt = 0; attempt < 20; attempt += 1) {
  try {
    if ((await request(senderUrl, '/api/health')).ok) { ready = true; break; }
  } catch (_) { /* The container may still be starting. */ }
  await sleep(500);
}
assert.equal(ready, true, 'The container sender endpoint must start.');
const config = await (await request(senderUrl, '/api/config')).json();
assert.equal(typeof config.token, 'string');
const spoofed = { 'X-Forwarded-For': '127.0.0.1', 'X-Real-IP': '127.0.0.1' };
for (const path of ['/mac', '/sender.js', '/api/config', '/api/host']) {
  assert.equal((await request(receiverUrl, path, { token: config.token, headers: spoofed })).status, 403, path);
}
assert.equal((await request(receiverUrl, '/api/start', { token: config.token, body: {}, headers: spoofed })).status, 403);
const pair = await (await request(receiverUrl, '/api/pair', { body: { pin: config.pin } })).json();
const start = await request(senderUrl, '/api/start', { token: config.token, body: {} });
assert.equal(start.status, 200);
assert.equal((await (await request(receiverUrl, '/api/receiver', { token: pair.token })).json()).sharing, true);
assert.equal((await request(senderUrl, '/api/stop', { token: config.token, body: {} })).status, 200);
assert.equal((await (await request(receiverUrl, '/api/receiver', { token: pair.token })).json()).sharing, false);
console.log('OK: Container pairing/start/stop work; the receiver port cannot access sender controls even with spoofed headers and a sender token.');
