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
    this.pages = [];
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
    this.pages.push({ sessionId, url });
    return sessionId;
  }
  async evaluate(sessionId, expression, { userGesture = false } = {}) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture }, sessionId);
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
    const diagnostics = [];
    for (const page of this.pages) {
      diagnostics.push({ url: page.url, detail: await this.evaluate(page.sessionId, `({
        text: document.body.innerText,
        captures: window.__captures && window.__captures.length,
        audioContexts: window.__audioContexts && window.__audioContexts.map((context) => ({ state: context.state, time: context.currentTime })),
        peerEvents: window.__peerEvents,
        playErrors: window.__playErrors,
        lastLiveStats: window.__lastLiveStats,
        peers: window.__peers && window.__peers.map((p) => ({ connection: p.connectionState, ice: p.iceConnectionState, signaling: p.signalingState })),
        video: document.getElementById('display') && { paused: document.getElementById('display').paused, muted: document.getElementById('display').muted, ready: document.getElementById('display').readyState, error: document.getElementById('display').error && document.getElementById('display').error.message }
      })`) });
    }
    throw new Error(`Tarayıcı kontrolü zaman aşımı: ${expression}\n${info}\n${JSON.stringify({ diagnostics, errors: this.errors }, null, 2)}`);
  }
}

try {
  service = await startServer({ port: 0, lanAddress: process.env.TV_LAN_IP, interfaceName: process.env.TV_INTERFACE, quiet: true });
  port = service.port;
  const executable = await findChrome();
  chrome = spawn(executable, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--disable-sync', '--disable-component-update', '--no-proxy-server', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
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
    window.__captures = [];
    window.__audioTracks = [];
    window.__audioContexts = [];
    navigator.mediaDevices.getDisplayMedia = async function (options) {
      window.__captureOptions = options;
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
      if (!window.__omitAudio && (options.audio || window.__unexpectedAudio)) {
        const audio = new AudioContext();
        window.__audioContexts.push(audio);
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const destination = audio.createMediaStreamDestination();
        gain.gain.value = 0.02;
        oscillator.frequency.value = 440;
        oscillator.connect(gain).connect(destination);
        oscillator.start();
        await audio.resume();
        const audioTrack = destination.stream.getAudioTracks()[0];
        stream.addTrack(audioTrack);
        window.__audioTracks.push(audioTrack);
        const audioStop = audioTrack.stop.bind(audioTrack);
        audioTrack.stop = function () { audioStop(); oscillator.stop(); audio.close(); };
      }
      const videoTrack = stream.getVideoTracks()[0];
      const nativeConstraints = videoTrack.applyConstraints.bind(videoTrack);
      videoTrack.applyConstraints = async function (constraints) {
        if (window.__rejectQualityOnce) {
          window.__rejectQualityOnce = false;
          throw new DOMException('Synthetic constraint rejection', 'OverconstrainedError');
        }
        return nativeConstraints(constraints);
      };
      const videoStop = videoTrack.stop.bind(videoTrack);
      videoTrack.stop = function () { clearInterval(timer); videoStop(); };
      window.__captures.push(stream);
      return stream;
    };
  `;
  const receiverInstrumentation = `
    window.__peers = [];
    window.__peerEvents = [];
    window.__playErrors = [];
    const NativePeer = window.RTCPeerConnection;
    if (NativePeer) {
      window.RTCPeerConnection = function (configuration) {
        const connection = new NativePeer(configuration);
        window.__peers.push(connection);
        ['connectionstatechange', 'iceconnectionstatechange', 'signalingstatechange'].forEach((type) => connection.addEventListener(type, () => window.__peerEvents.push({ type, connection: connection.connectionState, ice: connection.iceConnectionState, signaling: connection.signalingState })));
        connection.addEventListener('track', (event) => window.__peerEvents.push({ type: 'track', kind: event.track.kind }));
        return connection;
      };
      window.RTCPeerConnection.prototype = NativePeer.prototype;
    }
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.id === 'display' && !this.muted && window.__blockSoundOnce) {
        window.__blockSoundOnce = false;
        return Promise.reject(new DOMException('Synthetic autoplay rejection', 'NotAllowedError'));
      }
      const promise = nativePlay.call(this);
      if (promise) promise.catch((error) => window.__playErrors.push({ name: error.name, message: error.message }));
      return promise;
    };
    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) { this.__testUrl = url; return nativeOpen.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function () {
      if (this.__testUrl === '/api/compatibility' && window.__peers.length) {
        window.__peers[window.__peers.length - 1].getStats().then((reports) => {
          window.__lastLiveStats = Array.from(reports.values()).filter((report) => ['inbound-rtp', 'outbound-rtp', 'codec'].includes(report.type));
        });
      }
      return nativeSend.apply(this, arguments);
    };
  `;
  const sender = await client.page(`http://localhost:${port}/mac?lang=en`, receiverInstrumentation + '\n' + syntheticCapture);
  await client.until(sender, 'document.getElementById("start") && !document.getElementById("start").disabled');
  assert.equal(await client.evaluate(sender, 'document.getElementById("start").textContent'), 'Share my screen');
  await client.evaluate(sender, 'document.getElementById("language").value = "tr"; document.getElementById("language").dispatchEvent(new Event("change"))');
  assert.equal(await client.evaluate(sender, 'document.getElementById("start").textContent'), 'Ekranımı paylaş');
  const config = await (await fetch(`http://127.0.0.1:${port}/api/config`)).json();
  assert.equal(await client.evaluate(sender, 'document.getElementById("tv-url").textContent'), config.tvUrl);
  const forbidden = await fetch(config.tvUrl + 'api/config');
  assert.equal(forbidden.status, 403, 'LAN’dan gönderici anahtarına erişilmemeli.');
  assert.equal((await fetch(config.tvUrl + 'mac')).status, 403, 'LAN’dan gönderici sayfasına erişilmemeli.');
  const receiver = await client.page(config.tvUrl + '?lang=tr', receiverInstrumentation);
  await client.until(receiver, 'document.getElementById("pin") !== null');
  await client.evaluate(receiver, 'document.getElementById("pin").value = "000000"; document.getElementById("pair-form").requestSubmit()');
  await client.until(receiver, 'document.getElementById("pair-error").textContent === "Eşleştirme kodu yanlış."');
  await client.evaluate(receiver, `document.getElementById('pin').value = ${JSON.stringify(config.pin)}; document.getElementById('pair-form').requestSubmit();`, { userGesture: true });
  await client.until(receiver, 'document.getElementById("pair-panel").hidden');
  await client.evaluate(sender, 'document.getElementById("start").click()', { userGesture: true });
  await client.until(receiver, '!document.getElementById("display").hidden && document.getElementById("display").videoWidth > 0');
  await client.evaluate(receiver, 'document.getElementById("language").value = "en"; document.getElementById("language").dispatchEvent(new Event("change"))');
  assert.equal(await client.evaluate(receiver, 'document.getElementById("fullscreen").textContent'), 'Fullscreen');
  assert.equal(await client.evaluate(receiver, 'document.getElementById("display").videoWidth > 0'), true);
  console.log('OK: English/Turkish UI switching and translated errors work without interrupting the stream.');
  console.log('OK: WebRTC ile yapay görüntü alındı.');

  assert.equal(await client.evaluate(sender, 'window.__captureOptions.video.displaySurface'), 'browser');
  assert.equal(await client.evaluate(sender, 'window.__captureOptions.video.frameRate.ideal'), 60);
  assert.equal(await client.evaluate(sender, 'window.__captureOptions.video.frameRate.max'), 60);
  await client.until(sender, 'window.__peers[0].getSenders().some((sender) => sender.track && sender.track.kind === "video" && sender.getParameters().encodings[0].maxFramerate === 60)');
  await client.until(sender, `(async () => {
    const pages = document.getElementById('stats-sent').textContent;
    return pages.includes('FPS') && document.getElementById('stats-bitrate').textContent.includes('Mbps');
  })()`);
  assert.match(await client.evaluate(sender, 'document.getElementById("stats-target").textContent'), /60 FPS/);
  assert.equal(await client.evaluate(sender, 'document.getElementById("preview").srcObject.getVideoTracks()[0].contentHint'), 'motion');
  assert.equal(await client.evaluate(sender, 'document.getElementById("preview").muted'), true);
  await client.until(receiver, '!document.getElementById("sound").disabled && document.getElementById("display").srcObject.getAudioTracks().length === 1');
  assert.equal(await client.evaluate(receiver, 'document.getElementById("display").muted'), true);
  await client.until(receiver, `(async () => {
    const reports = await window.__peers[window.__peers.length - 1].getStats();
    return Array.from(reports.values()).some((report) => report.type === 'inbound-rtp' && report.kind === 'audio' && report.bytesReceived > 0);
  })()`);
  console.log('OK: Audio packets arrive over WebRTC; both previews initially stay muted.');

  await client.evaluate(receiver, 'window.__blockSoundOnce = true; document.getElementById("sound").click()', { userGesture: true });
  await client.until(receiver, 'document.getElementById("audio-status").textContent.indexOf("Sound was blocked") === 0');
  assert.equal(await client.evaluate(receiver, 'document.getElementById("display").muted && document.getElementById("frames").hidden'), true);
  assert.equal(await client.evaluate(receiver, 'window.__peers[window.__peers.length - 1].connectionState'), 'connected');
  await client.evaluate(receiver, 'document.getElementById("sound").click()', { userGesture: true });
  await client.until(receiver, '!document.getElementById("display").muted && document.getElementById("sound").textContent === "Mute sound"');
  await client.until(receiver, `(async () => {
    const reports = await window.__peers[window.__peers.length - 1].getStats();
    return Array.from(reports.values()).some((report) => report.type === 'inbound-rtp' && report.kind === 'audio' && report.totalAudioEnergy > 0);
  })()`);
  console.log('OK: The receiver decodes non-zero synthetic audio energy after enabling sound.');
  await client.evaluate(receiver, 'document.getElementById("sound").click()', { userGesture: true });
  assert.equal(await client.evaluate(receiver, 'document.getElementById("display").muted'), true);
  console.log('OK: Sound requires a TV-side click, can be muted, and a rejected sound attempt does not disable live video.');

  const captureCount = await client.evaluate(sender, 'window.__captures.length');
  const originalAudioId = await client.evaluate(sender, 'document.getElementById("preview").srcObject.getAudioTracks()[0].id');
  await client.evaluate(sender, 'document.getElementById("resolution").value = "720"; document.getElementById("fps").value = "30"; document.getElementById("quality").value = "economy"; document.getElementById("adaptive").checked = false; document.getElementById("apply-quality").click()', { userGesture: true });
  await client.until(sender, 'document.getElementById("quality-status").textContent.indexOf("Ayarlar, ekran") === 0');
  assert.equal(await client.evaluate(sender, 'window.__captures.length'), captureCount);
  assert.equal(await client.evaluate(sender, 'document.getElementById("preview").srcObject.getAudioTracks()[0].id'), originalAudioId);
  assert.equal(await client.evaluate(sender, 'document.getElementById("preview").srcObject.getVideoTracks()[0].getConstraints().frameRate.max'), 30);
  assert.equal(await client.evaluate(sender, 'window.__peers[0].getSenders().find((sender) => sender.track && sender.track.kind === "video").getParameters().encodings[0].maxFramerate'), 30);
  assert.match(await client.evaluate(sender, 'document.getElementById("stats-target").textContent'), /720p.*30 FPS/);
  await client.evaluate(sender, 'window.__rejectQualityOnce = true; document.getElementById("fps").value = "60"; document.getElementById("apply-quality").click()', { userGesture: true });
  await client.until(sender, 'document.getElementById("quality-status").textContent.indexOf("Tarayıcı bu ayarları reddetti.") === 0');
  assert.equal(await client.evaluate(sender, 'document.getElementById("fps").value'), '30');
  assert.equal(await client.evaluate(sender, 'document.getElementById("preview").srcObject.getVideoTracks()[0].readyState'), 'live');
  await client.evaluate(sender, 'document.getElementById("resolution").value = "1080"; document.getElementById("fps").value = "60"; document.getElementById("quality").value = "balanced"; document.getElementById("apply-quality").click()', { userGesture: true });
  await client.until(sender, 'document.getElementById("quality-status").textContent.indexOf("Ayarlar, ekran") === 0');
  assert.equal(await client.evaluate(sender, 'document.getElementById("preview").srcObject.getVideoTracks()[0].getConstraints().frameRate.max'), 60);
  assert.equal(await client.evaluate(sender, 'window.__peers[0].getSenders().find((sender) => sender.track && sender.track.kind === "video").getParameters().encodings[0].maxFramerate'), 60);
  console.log('OK: Live 720p/30 and 1080p/60 target changes preserve the same audio/capture; rejected constraints roll back.');

  await client.evaluate(sender, 'document.getElementById("adaptive").checked = true; document.getElementById("apply-quality").click()', { userGesture: true });
  await client.until(sender, 'document.getElementById("quality-status").textContent.indexOf("Ayarlar, ekran") === 0');
  await client.evaluate(sender, `(() => {
    const connection = window.__peers[0];
    window.__realSenderStats = connection.getStats.bind(connection);
    connection.getStats = async function () {
      const reports = await window.__realSenderStats();
      return new Map(Array.from(reports.entries()).map(([id, row]) => [id,
        row.type === 'outbound-rtp' && row.kind === 'video' ? { ...row, qualityLimitationReason: 'bandwidth' } : row]));
    };
  })()`);
  await client.until(sender, 'window.__peers[0].getSenders().some((sender) => sender.track && sender.track.kind === "video" && sender.getParameters().encodings[0].scaleResolutionDownBy > 1)', 15000);
  assert.equal(await client.evaluate(sender, 'window.__peers[0].getSenders().find((sender) => sender.track && sender.track.kind === "video").getParameters().encodings[0].maxFramerate'), 60);
  await client.evaluate(sender, 'window.__peers[0].getStats = window.__realSenderStats');
  console.log('OK: Sustained simulated congestion reduces detail while keeping the selected 60 FPS target.');

  for (const fit of ['cover', 'fill', 'contain']) {
    await client.evaluate(receiver, `document.getElementById('fit').value = ${JSON.stringify(fit)}; document.getElementById('fit').dispatchEvent(new Event('change'))`);
    assert.equal(await client.evaluate(receiver, 'getComputedStyle(document.getElementById("display")).objectFit'), fit);
  }
  await client.until(receiver, 'document.getElementById("tv-stats").textContent.indexOf("TV decoded video:") === 0');
  await client.evaluate(receiver, 'document.getElementById("auto-hide").checked = true; document.getElementById("auto-hide").dispatchEvent(new Event("change"))');
  await client.until(receiver, 'document.body.classList.contains("chrome-hidden")', 9000);
  await client.evaluate(receiver, 'document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))');
  assert.equal(await client.evaluate(receiver, 'document.body.classList.contains("chrome-hidden")'), false);
  assert.equal(await client.evaluate(receiver, 'getComputedStyle(document.getElementById("toolbar")).visibility'), 'visible');
  await client.evaluate(receiver, 'document.getElementById("auto-hide").checked = false; document.getElementById("auto-hide").dispatchEvent(new Event("change"))');
  console.log('OK: TV aspect-ratio controls, measured decoding stats, and keyboard wake-up of hidden controls work.');

  await client.evaluate(receiver, 'document.getElementById("compatibility").click()');
  await client.until(receiver, '!document.getElementById("frames").hidden && document.getElementById("frames").naturalWidth > 0');
  assert.equal(await client.evaluate(receiver, 'document.getElementById("sound").disabled && document.getElementById("display").srcObject === null'), true);
  console.log('OK: JPEG uyumluluk modu ile yapay görüntü alındı.');

  await client.evaluate(sender, 'document.getElementById("stop").click()');
  await client.until(receiver, 'document.getElementById("display").hidden && document.getElementById("frames").hidden && document.getElementById("waiting").hidden === false');
  console.log('OK: Durdurma TV’deki görüntüyü temizledi.');

  await client.evaluate(sender, 'window.__omitAudio = true; document.getElementById("start").click()', { userGesture: true });
  await client.until(receiver, '!document.getElementById("display").hidden && document.getElementById("display").videoWidth > 0');
  assert.equal(await client.evaluate(receiver, 'document.getElementById("sound").disabled'), true);
  await client.until(sender, 'document.getElementById("audio-status").textContent.indexOf("Ses izi alınamadı.") === 0');
  console.log('OK: A browser returning no audio still shares video and explains how to retry with tab audio.');
  await client.evaluate(sender, 'document.getElementById("stop").click()');
  await client.until(receiver, 'document.getElementById("display").hidden && document.getElementById("frames").hidden');

  await client.evaluate(sender, 'window.__omitAudio = false; window.__unexpectedAudio = true; document.getElementById("profile").value = "screen"; document.getElementById("share-audio").checked = false; document.getElementById("start").click()', { userGesture: true });
  await client.until(receiver, '!document.getElementById("display").hidden && document.getElementById("display").videoWidth > 0');
  assert.equal(await client.evaluate(sender, 'window.__captureOptions.audio'), false);
  assert.equal(await client.evaluate(sender, 'document.getElementById("preview").srcObject.getAudioTracks().length'), 0);
  assert.equal(await client.evaluate(sender, 'window.__audioTracks[window.__audioTracks.length - 1].readyState'), 'ended');
  assert.equal(await client.evaluate(sender, 'document.getElementById("preview").srcObject.getVideoTracks()[0].contentHint'), 'detail');
  assert.equal(await client.evaluate(receiver, 'document.getElementById("sound").disabled'), true);
  console.log('OK: Explicit audio opt-out removes even an unexpected audio track; presentation mode is preserved.');
  await client.evaluate(sender, 'document.getElementById("stop").click()');
  await client.until(receiver, 'document.getElementById("display").hidden && document.getElementById("frames").hidden');

  const legacy = await client.page(config.tvUrl, 'Object.defineProperty(window, "RTCPeerConnection", { value: undefined, configurable: true });');
  await client.until(legacy, 'document.getElementById("pin") !== null');
  await client.evaluate(legacy, `document.getElementById('pin').value = ${JSON.stringify(config.pin)}; document.getElementById('pair-form').requestSubmit();`);
  await client.until(legacy, 'document.getElementById("pair-panel").hidden');
  await client.evaluate(sender, 'window.__unexpectedAudio = false; document.getElementById("share-audio").checked = true; document.getElementById("start").click()', { userGesture: true });
  await client.until(legacy, '!document.getElementById("frames").hidden && document.getElementById("frames").naturalWidth > 0');
  console.log('OK: WebRTC olmayan tarayıcıda otomatik uyumluluk modu çalıştı.');
  await client.evaluate(sender, 'document.getElementById("preview").srcObject.getVideoTracks()[0].dispatchEvent(new Event("ended"))');
  await client.until(legacy, 'document.getElementById("frames").hidden && document.getElementById("waiting").hidden === false');
  assert.equal(await client.evaluate(sender, 'window.__captures.every((stream) => stream.getTracks().every((track) => track.readyState === "ended")) && window.__audioTracks.every((track) => track.readyState === "ended")'), true);
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
