import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, parse } from 'node:path';
import { tmpdir } from 'node:os';
import { startServer } from '../server.mjs';

// Isolated temporary profile. The test never captures a real desktop.
const profile = await mkdtemp(join(tmpdir(), 'mac-tv-mirror-browser-'));
let port;
let service;
let chrome;
let client;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function findChrome() {
  if (process.env.CHROME_PATH) {
    await access(process.env.CHROME_PATH);
    return process.env.CHROME_PATH;
  }
  if (process.platform === 'darwin') {
    const chrome = join(parse(process.cwd()).root, 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome');
    await access(chrome);
    return chrome;
  }
  for (const command of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [command], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch (_) { /* Try the next browser command. */ }
  }
  throw new Error('Chrome was not found. Set CHROME_PATH to its executable.');
}

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    this.errors = [];
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timeout);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.accept(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails);
    });
  }
  send(method, params = {}, sessionId) {
    return new Promise((accept, reject) => {
      const id = ++this.sequence;
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`DevTools zaman aşımı: ${method}`)); }, 15000);
      this.pending.set(id, { accept, reject, timeout });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  async page(url, preload) {
    const target = await this.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    await this.send('Runtime.enable', {}, sessionId);
    await this.send('Page.enable', {}, sessionId);
    if (preload) await this.send('Page.addScriptToEvaluateOnNewDocument', { source: preload }, sessionId);
    await this.send('Page.navigate', { url }, sessionId);
    return sessionId;
  }
  async evaluate(sessionId, expression) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async until(sessionId, expression, timeout = 20000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await this.evaluate(sessionId, expression)) return;
      await sleep(250);
    }
    const info = await this.evaluate(sessionId, 'document.body.innerText');
    throw new Error(`Tarayıcı kontrolü zaman aşımı: ${expression}\n${info}`);
  }
}

try {
  service = await startServer({ port: 0, lanAddress: process.env.TV_LAN_IP, interfaceName: process.env.TV_INTERFACE, quiet: true });
  port = service.port;
  const executable = await findChrome();
  chrome = spawn(executable, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--disable-sync', '--disable-component-update', '--no-proxy-server', '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const address = await new Promise((accept, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`Chrome başlatılamadı: ${output.slice(-2000)}`)), 15000);
    chrome.on('error', (error) => { clearTimeout(timeout); reject(error); });
    chrome.on('exit', (code) => { clearTimeout(timeout); reject(new Error(`Chrome kapandı: ${code}`)); });
    chrome.stderr.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timeout); accept(match[1]); }
    });
  });
  const socket = new WebSocket(address);
  await new Promise((accept, reject) => {
    socket.addEventListener('open', accept, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  client = new DevTools(socket);
  const syntheticCapture = `
    navigator.mediaDevices.getDisplayMedia = async function () {
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 360;
      const context = canvas.getContext('2d');
      let count = 0;
      function draw() {
        context.fillStyle = '#1769aa'; context.fillRect(0, 0, 640, 360);
        context.fillStyle = '#fff'; context.font = '32px sans-serif';
        context.fillText('YAPAY TEST GORUNTUSU ' + count++, 30, 180);
      }
      draw();
      const timer = setInterval(draw, 80);
      const stream = canvas.captureStream(15);
      stream.getVideoTracks()[0].addEventListener('ended', () => clearInterval(timer));
      return stream;
    };
  `;
  const sender = await client.page(`http://localhost:${port}/mac?lang=en`, syntheticCapture);
  await client.until(sender, 'document.getElementById("start") && !document.getElementById("start").disabled');
  assert.equal(await client.evaluate(sender, 'document.getElementById("start").textContent'), 'Share my screen');
  await client.evaluate(sender, 'document.getElementById("language").value = "tr"; document.getElementById("language").dispatchEvent(new Event("change"))');
  assert.equal(await client.evaluate(sender, 'document.getElementById("start").textContent'), 'Ekranımı paylaş');
  const config = await (await fetch(`http://127.0.0.1:${port}/api/config`)).json();
  assert.equal(await client.evaluate(sender, 'document.getElementById("tv-url").textContent'), config.tvUrl);
  const forbidden = await fetch(config.tvUrl + 'api/config');
  assert.equal(forbidden.status, 403, 'LAN’dan gönderici anahtarına erişilmemeli.');
  assert.equal((await fetch(config.tvUrl + 'mac')).status, 403, 'LAN’dan gönderici sayfasına erişilmemeli.');
  const receiver = await client.page(config.tvUrl + '?lang=tr');
  await client.until(receiver, 'document.getElementById("pin") !== null');
  await client.evaluate(receiver, 'document.getElementById("pin").value = "000000"; document.getElementById("pair-form").requestSubmit()');
  await client.until(receiver, 'document.getElementById("pair-error").textContent === "Eşleştirme kodu yanlış."');
  await client.evaluate(receiver, `document.getElementById('pin').value = ${JSON.stringify(config.pin)}; document.getElementById('pair-form').requestSubmit();`);
  await client.until(receiver, 'document.getElementById("pair-panel").hidden');
  await client.evaluate(sender, 'document.getElementById("start").click()');
  await client.until(receiver, '!document.getElementById("display").hidden && document.getElementById("display").videoWidth > 0');
  await client.evaluate(receiver, 'document.getElementById("language").value = "en"; document.getElementById("language").dispatchEvent(new Event("change"))');
  assert.equal(await client.evaluate(receiver, 'document.getElementById("fullscreen").textContent'), 'Fullscreen');
  assert.equal(await client.evaluate(receiver, 'document.getElementById("display").videoWidth > 0'), true);
  console.log('OK: English/Turkish UI switching and translated errors work without interrupting the stream.');
  console.log('OK: WebRTC ile yapay görüntü alındı.');

  await client.evaluate(receiver, 'document.getElementById("compatibility").click()');
  await client.until(receiver, '!document.getElementById("frames").hidden && document.getElementById("frames").naturalWidth > 0');
  console.log('OK: JPEG uyumluluk modu ile yapay görüntü alındı.');

  await client.evaluate(sender, 'document.getElementById("stop").click()');
  await client.until(receiver, 'document.getElementById("display").hidden && document.getElementById("frames").hidden && document.getElementById("waiting").hidden === false');
  console.log('OK: Durdurma TV’deki görüntüyü temizledi.');

  await client.evaluate(sender, 'document.getElementById("start").click()');
  await client.until(receiver, '!document.getElementById("display").hidden && document.getElementById("display").videoWidth > 0');
  console.log('OK: Durdurma sonrası yeniden paylaşım çalıştı.');
  await client.evaluate(sender, 'document.getElementById("stop").click()');
  await client.until(receiver, 'document.getElementById("display").hidden && document.getElementById("frames").hidden');

  const legacy = await client.page(config.tvUrl, 'Object.defineProperty(window, "RTCPeerConnection", { value: undefined, configurable: true });');
  await client.until(legacy, 'document.getElementById("pin") !== null');
  await client.evaluate(legacy, `document.getElementById('pin').value = ${JSON.stringify(config.pin)}; document.getElementById('pair-form').requestSubmit();`);
  await client.until(legacy, 'document.getElementById("pair-panel").hidden');
  await client.evaluate(sender, 'document.getElementById("start").click()');
  await client.until(legacy, '!document.getElementById("frames").hidden && document.getElementById("frames").naturalWidth > 0');
  console.log('OK: WebRTC olmayan tarayıcıda otomatik uyumluluk modu çalıştı.');
  await client.evaluate(sender, 'document.getElementById("preview").srcObject.getVideoTracks()[0].dispatchEvent(new Event("ended"))');
  await client.until(legacy, 'document.getElementById("frames").hidden && document.getElementById("waiting").hidden === false');
  console.log('OK: Tarayıcıdan ekran paylaşımı bitirildiğinde TV görüntüsü temizlendi.');
  assert.deepEqual(client.errors, [], 'Tarayıcıda yakalanmamış hata olmamalı.');
  console.log('Tüm tarayıcı kontrolleri başarılı. Gerçek ekran yakalanmadı.');
} finally {
  if (client) client.socket.close();
  if (chrome && chrome.exitCode === null) {
    const exited = new Promise((done) => chrome.once('exit', done));
    chrome.kill('SIGTERM');
    await Promise.race([exited, sleep(3000)]);
    if (chrome.exitCode === null) chrome.kill('SIGKILL');
  }
  if (service) await service.close();
  await rm(profile, { recursive: true, force: true });
}
