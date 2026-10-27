import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const files = new Map();
for (const name of ['sender.html', 'receiver.html', 'i18n.js', 'sender.js', 'receiver.js', 'style.css']) {
  files.set(name, readFileSync(new URL(`./public/${name}`, import.meta.url)));
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sameSecret(value, expected) {
  if (typeof value !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isLoopback(address) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function readBody(req, limit) {
  if (Number(req.headers['content-length']) > limit) {
    req.resume();
    throw new HttpError(413, 'Request too large.');
  }
  let length = 0;
  let oversized = false;
  const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > limit) oversized = true;
    if (!oversized) chunks.push(chunk);
  }
  if (oversized) throw new HttpError(413, 'Request too large.');
  return Buffer.concat(chunks);
}

async function readJson(req) {
  if (!String(req.headers['content-type']).startsWith('application/json')) {
    throw new HttpError(415, 'A JSON request is required.');
  }
  try {
    const value = JSON.parse((await readBody(req, 96 * 1024)).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Invalid JSON.');
  }
}

export function createApplication({ lanAddress, now = Date.now, pin } = {}) {
  if (!lanAddress) throw new Error('A local-network address is required.');
  if (pin !== undefined && !/^[0-9]{6}$/.test(pin)) throw new Error('The pairing code must contain six digits.');
  const hostToken = randomBytes(32).toString('hex');
  const pairCode = pin || String(randomInt(100000, 1000000));
  const allowedHosts = new Set(['localhost', '127.0.0.1', lanAddress]);
  const attempts = new Map();
  let receiver = null;
  let sharing = false;
  let generation = 0;
  let hostLastSeen = now();
  let hostMessages = [];
  let frame = null;

  function stopSharing() {
    sharing = false;
    generation += 1;
    frame = null;
    hostMessages = [];
    if (receiver) receiver.messages = [];
  }

  function housekeeping() {
    if (sharing && now() - hostLastSeen > 20000) stopSharing();
    if (receiver && now() - receiver.lastSeen > 60000) {
      receiver = null;
      hostMessages = [];
    }
    for (const [address, attempt] of attempts) {
      if (now() - attempt.since > 60000) attempts.delete(address);
    }
  }
  const timer = setInterval(housekeeping, 1000);
  timer.unref();

  function bearer(req) {
    return String(req.headers.authorization || '').replace(/^Bearer /, '');
  }

  function requireHost(req) {
    if (!isLoopback(req.socket.remoteAddress) || !sameSecret(bearer(req), hostToken)) {
      throw new HttpError(403, 'This action is only available on the Mac sharing page.');
    }
    hostLastSeen = now();
  }

  function requireReceiver(req, queryToken) {
    if (!receiver || !sameSecret(queryToken || bearer(req), receiver.token)) {
      throw new HttpError(401, 'TV pairing is required.');
    }
    receiver.lastSeen = now();
    return receiver;
  }

  async function handle(req, res) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const authority = req.headers.host || '';
      const url = new URL(req.url, `http://${authority}`);
      const host = new URL(`http://${authority}`);
      if (!allowedHosts.has(host.hostname) || Number(host.port || 80) !== req.socket.localPort) {
        throw new HttpError(403, 'Server address not allowed.');
      }
      if (req.headers['sec-fetch-site'] === 'cross-site') {
        throw new HttpError(403, 'Cross-site request blocked.');
      }
      if (req.method === 'POST' && req.headers.origin !== `http://${authority}`) {
        throw new HttpError(403, 'Request origin could not be verified.');
      }
      housekeeping();
      const local = isLoopback(req.socket.remoteAddress);
      const path = url.pathname;

      if (req.method === 'GET' && path === '/api/health') {
        return json(res, 200, { ok: true });
      }
      if (req.method === 'GET' && path === '/api/config') {
        if (!local) throw new HttpError(403, 'Sharing settings are only available on the Mac.');
        return json(res, 200, {
          token: hostToken,
          pin: pairCode,
          tvUrl: `http://${lanAddress}:${req.socket.localPort}/`,
        });
      }
      if (req.method === 'GET' && path === '/api/host') {
        requireHost(req);
        return json(res, 200, {
          sharing, generation,
          viewer: receiver ? { id: receiver.id, compatibility: receiver.compatibility } : null,
          messages: hostMessages.splice(0),
        });
      }
      if (req.method === 'POST' && path === '/api/start') {
        requireHost(req);
        await readJson(req);
        stopSharing();
        sharing = true;
        hostLastSeen = now();
        if (receiver) receiver.compatibility = false;
        return json(res, 200, { sharing, generation });
      }
      if (req.method === 'POST' && path === '/api/stop') {
        requireHost(req);
        await readJson(req);
        stopSharing();
        return json(res, 200, { sharing, generation });
      }
      if (req.method === 'POST' && path === '/api/pair') {
        const address = req.socket.remoteAddress;
        const attempt = attempts.get(address) || { since: now(), count: 0 };
        attempt.count += 1;
        attempts.set(address, attempt);
        if (attempt.count > 10) throw new HttpError(429, 'Too many attempts. Wait one minute.');
        const data = await readJson(req);
        if (!sameSecret(data.pin, pairCode)) throw new HttpError(401, 'Incorrect pairing code.');
        if (receiver && receiver.address !== address) {
          throw new HttpError(409, 'Another TV is already paired. Close its page and wait one minute.');
        }
        receiver = {
          id: randomBytes(8).toString('hex'),
          token: randomBytes(32).toString('hex'),
          address, lastSeen: now(), compatibility: false, messages: [],
        };
        hostMessages = [];
        frame = null;
        return json(res, 200, { token: receiver.token });
      }
      if (req.method === 'GET' && path === '/api/receiver') {
        const viewer = requireReceiver(req);
        return json(res, 200, {
          sharing, generation, compatibility: viewer.compatibility,
          messages: viewer.messages.splice(0),
        });
      }
      if (req.method === 'POST' && path === '/api/compatibility') {
        const viewer = requireReceiver(req);
        const data = await readJson(req);
        if (data.generation !== generation) throw new HttpError(409, 'The sharing session has changed.');
        viewer.compatibility = true;
        viewer.messages = [];
        hostMessages = [];
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && path === '/api/signal') {
        const fromHost = local && sameSecret(bearer(req), hostToken);
        if (fromHost) requireHost(req);
        else requireReceiver(req);
        const data = await readJson(req);
        if (!sharing || !receiver || data.generation !== generation || data.receiverId !== receiver.id) {
          throw new HttpError(409, 'The sharing session has changed.');
        }
        const signal = data.signal;
        const expectedType = fromHost ? 'offer' : 'answer';
        if (!signal || signal.type !== expectedType || typeof signal.sdp !== 'string' || signal.sdp.length > 80000) {
          throw new HttpError(400, 'Invalid connection message.');
        }
        const queue = fromHost ? receiver.messages : hostMessages;
        if (queue.length >= 8) throw new HttpError(429, 'Connection message limit exceeded.');
        queue.push({ generation, receiverId: receiver.id, signal: { type: signal.type, sdp: signal.sdp } });
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && path === '/api/frame') {
        requireHost(req);
        if (req.headers['content-type'] !== 'image/jpeg') throw new HttpError(415, 'A JPEG image is required.');
        const expectedGeneration = Number(req.headers['x-generation']);
        if (!sharing || expectedGeneration !== generation) throw new HttpError(409, 'Sharing is not active.');
        const bytes = await readBody(req, 1024 * 1024);
        if (!sharing || expectedGeneration !== generation) throw new HttpError(409, 'Sharing has stopped.');
        if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
          throw new HttpError(400, 'Invalid JPEG image.');
        }
        frame = { bytes, created: now() };
        return json(res, 200, { ok: true });
      }
      if (req.method === 'GET' && path === '/api/frame.jpg') {
        requireReceiver(req, url.searchParams.get('key'));
        if (!sharing || !frame || now() - frame.created > 3000) throw new HttpError(404, 'Waiting for a current image.');
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': frame.bytes.length });
        return res.end(frame.bytes);
      }

      if (req.method === 'GET') {
        let name = path.slice(1);
        if (path === '/') name = local ? 'sender.html' : 'receiver.html';
        if (path === '/tv') name = 'receiver.html';
        if (path === '/mac') name = 'sender.html';
        if ((name === 'sender.html' || name === 'sender.js') && !local) {
          throw new HttpError(403, 'The sender page is only available on the Mac.');
        }
        if (files.has(name)) {
          const type = name.endsWith('.html') ? 'text/html' : name.endsWith('.css') ? 'text/css' : 'text/javascript';
          res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
          return res.end(files.get(name));
        }
      }
      throw new HttpError(404, 'Page not found.');
    } catch (error) {
      if (res.destroyed || res.writableEnded) return;
      if (!(error instanceof HttpError)) console.error('Request error:', error.message);
      json(res, error.status || 500, { error: error.status ? error.message : 'An error occurred on the local server.' });
    }
  }
  return { handle, pairCode, close: () => { clearInterval(timer); stopSharing(); } };
}

function privateIPv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168);
}

export function selectLanAddress(interfaces, { lanAddress, interfaceName } = {}) {
  const candidates = Object.entries(interfaces).flatMap(([name, addresses]) =>
    (addresses || []).filter((item) => item.family === 'IPv4' && !item.internal && privateIPv4(item.address))
      .map((item) => ({ name, address: item.address })));
  if (lanAddress) {
    if (!candidates.some((item) => item.address === lanAddress)) {
      throw new Error('TV_LAN_IP must be a private IPv4 address assigned to this computer.');
    }
    return lanAddress;
  }
  if (interfaceName) {
    const selected = candidates.find((item) => item.name === interfaceName);
    if (!selected) throw new Error('TV_INTERFACE has no private IPv4 address. Check your network connection.');
    return selected.address;
  }
  const physical = candidates.filter((item) => !/^(lo|utun|tun|tap|wg|docker|veth|br-|bridge|vmnet|vbox|tailscale|zt)/i.test(item.name));
  const preferred = ['en0', 'en1', 'Wi-Fi', 'wlan0', 'Ethernet', 'eth0'];
  physical.sort((a, b) => {
    const rank = (name) => preferred.includes(name) ? preferred.indexOf(name) : preferred.length;
    return rank(a.name) - rank(b.name);
  });
  if (!physical.length) throw new Error('No private LAN IPv4 address found. Connect to Wi-Fi or set TV_INTERFACE / TV_LAN_IP.');
  return physical[0].address;
}

export async function startServer({ port = 8765, lanAddress, interfaceName, quiet = false } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer from 0 to 65535.');
  lanAddress = selectLanAddress(networkInterfaces(), { lanAddress, interfaceName });
  const app = createApplication({ lanAddress });
  const servers = [];
  let actualPort = port;
  try {
    for (const address of ['127.0.0.1', lanAddress]) {
      const server = createServer(app.handle);
      server.requestTimeout = 15000;
      server.headersTimeout = 10000;
      servers.push(server);
      await new Promise((accept, reject) => {
        server.once('error', reject);
        server.listen(actualPort, address, accept);
      });
      actualPort = server.address().port;
    }
  } catch (error) {
    app.close();
    for (const server of servers) { server.close(); server.closeAllConnections(); }
    throw error;
  }
  if (!quiet) {
    console.log(`\nMac: http://localhost:${actualPort}/mac`);
    console.log(`TV : http://${lanAddress}:${actualPort}/`);
    console.log(`Pairing code / Eşleştirme kodu: ${app.pairCode}`);
    console.log('No screen is shared until you select one. Stop the server with Ctrl+C.');
    console.log('Ekran seçilene kadar paylaşım yapılmaz. Sunucuyu durdurmak için Ctrl+C.\n');
  }
  return {
    port: actualPort,
    lanAddress,
    close: async () => {
      app.close();
      await Promise.all(servers.map((server) => new Promise((done) => {
        server.close(done);
        server.closeAllConnections();
      })));
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const service = await startServer({ port: Number(process.env.PORT || 8765), lanAddress: process.env.TV_LAN_IP, interfaceName: process.env.TV_INTERFACE });
    const finish = async () => { await service.close(); process.exit(0); };
    process.once('SIGINT', finish);
    process.once('SIGTERM', finish);
  } catch (error) {
    console.error(`Could not start / Başlatılamadı: ${error.message}`);
    process.exitCode = 1;
  }
}
