'use strict';

const element = (id) => document.getElementById(id);
const ui = window.MirrorI18n;
let token;
let stream = null;
let peer = null;
let peerKey = '';
let sharing = false;
let generation = 0;
let viewer = null;
let stopping = false;
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d', { alpha: false });

async function api(path, body) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST', headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store', signal: AbortSignal.timeout(7000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Local connection error.');
  return data;
}

function showError(message, values) {
  ui.set('error', message || '', values);
  element('error').hidden = !message;
}

function closePeer() {
  if (peer) peer.close();
  peer = null;
  peerKey = '';
}

function clearLocalCapture() {
  sharing = false;
  closePeer();
  if (stream) {
    stream.getTracks().forEach((track) => { track.onended = null; track.stop(); });
    stream = null;
  }
  element('preview').srcObject = null;
  element('preview').hidden = true;
  canvas.width = 0;
  canvas.height = 0;
  element('start').disabled = false;
  element('stop').disabled = true;
}

async function stop() {
  if (stopping) return;
  stopping = true;
  clearLocalCapture();
  ui.set('status', 'Screen sharing stopped.');
  try { await api('/api/stop', {}); }
  catch (error) { showError(error.message); }
  finally { stopping = false; }
}

function waitForIce(connection) {
  return new Promise((resolve) => {
    if (connection.iceGatheringState === 'complete') return resolve();
    const finish = () => { clearTimeout(timer); connection.removeEventListener('icegatheringstatechange', changed); resolve(); };
    const changed = () => { if (connection.iceGatheringState === 'complete') finish(); };
    const timer = setTimeout(finish, 3500);
    connection.addEventListener('icegatheringstatechange', changed);
  });
}

async function makeOffer(currentViewer, currentGeneration) {
  const key = `${currentGeneration}:${currentViewer.id}`;
  if (peerKey === key) return;
  closePeer();
  peerKey = key;
  const connection = new RTCPeerConnection({ iceServers: [] });
  peer = connection;
  stream.getTracks().forEach((track) => connection.addTrack(track, stream));
  const transceiver = connection.getTransceivers()[0];
  if (transceiver && transceiver.setCodecPreferences && window.RTCRtpSender && RTCRtpSender.getCapabilities) {
    const capabilities = RTCRtpSender.getCapabilities('video');
    if (capabilities) {
      const codecs = capabilities.codecs.slice().sort((a, b) => Number(b.mimeType.toLowerCase() === 'video/h264') - Number(a.mimeType.toLowerCase() === 'video/h264'));
      try { transceiver.setCodecPreferences(codecs); } catch (_) { /* Use the browser's default codec order. */ }
    }
  }
  connection.onconnectionstatechange = () => {
    if (peer !== connection) return;
    if (connection.connectionState === 'connected') ui.set('status', 'Sending live video to the TV. No audio is transmitted.');
    if (connection.connectionState === 'failed') ui.set('status', 'WebRTC failed; the TV will try compatibility mode.');
  };
  await connection.setLocalDescription(await connection.createOffer());
  await waitForIce(connection);
  if (peer !== connection || !sharing || generation !== currentGeneration) return;
  await api('/api/signal', { generation: currentGeneration, receiverId: currentViewer.id, signal: connection.localDescription.toJSON() });
}

element('start').addEventListener('click', async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    showError('Open this page in Chrome on the Mac using its localhost address.');
    return;
  }
  element('start').disabled = true;
  showError('');
  try {
    // Capture must start directly from a user gesture; never auto-select a real screen.
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 }, frameRate: { ideal: 25, max: 30 } },
      audio: false,
    });
    const state = await api('/api/start', {});
    generation = state.generation;
    sharing = true;
    stream.getVideoTracks()[0].contentHint = 'detail';
    stream.getVideoTracks()[0].onended = stop;
    element('preview').srcObject = stream;
    element('preview').hidden = false;
    element('stop').disabled = false;
    ui.set('status', 'Screen selected. Waiting for the TV…');
  } catch (error) {
    clearLocalCapture();
    const message = error.name === 'NotAllowedError'
      ? 'Screen sharing was not allowed. Open System Settings → Privacy & Security → Screen & System Audio Recording and allow Chrome. You may need to reopen Chrome.'
      : error.name === 'NotReadableError'
        ? 'The screen could not be captured. Check the macOS screen recording permission and restart Chrome if necessary.'
        : error.name === 'AbortError' ? 'Screen selection was cancelled.' : error.message;
    showError(message);
  }
});
element('stop').addEventListener('click', stop);

async function poll() {
  try {
    const state = await api('/api/host');
    viewer = state.viewer;
    ui.set('viewer-status', viewer ? 'TV paired ✓' : 'Waiting for the TV.');
    if (sharing && !state.sharing && !stopping) {
      clearLocalCapture();
      ui.set('status', 'The sharing session ended. You can start again.');
    }
    if (sharing && state.generation === generation && viewer) {
      if (viewer.compatibility) {
        closePeer();
        ui.set('status', 'Sending compatibility images (roughly 3–5 fps, no audio).');
      } else {
        await makeOffer(viewer, generation);
        for (const message of state.messages) {
          if (peer && message.generation === generation && message.receiverId === viewer.id && message.signal.type === 'answer' && !peer.currentRemoteDescription) {
            await peer.setRemoteDescription(message.signal);
          }
        }
      }
    } else if (!viewer) {
      closePeer();
    }
  } catch (error) {
    showError('Connection: {message}', { message: ui.t(error.message) });
  } finally {
    setTimeout(poll, 800);
  }
}

async function sendFrame() {
  try {
    const video = element('preview');
    if (sharing && viewer && viewer.compatibility && video.readyState >= 2 && video.videoWidth) {
      const frameGeneration = generation;
      const width = Math.min(1280, video.videoWidth);
      const height = Math.max(1, Math.round(video.videoHeight * width / video.videoWidth));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.drawImage(video, 0, 0, width, height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.65));
      if (blob && sharing && generation === frameGeneration) {
        await fetch('/api/frame', {
          method: 'POST', body: blob,
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg', 'X-Generation': String(frameGeneration) },
          signal: AbortSignal.timeout(5000),
        });
      }
    }
  } catch (_) { /* Retry on the next frame if the local connection is interrupted. */ }
  finally { setTimeout(sendFrame, 180); }
}

window.addEventListener('pagehide', () => {
  if (!sharing) return;
  clearLocalCapture();
  fetch('/api/stop', {
    method: 'POST', keepalive: true,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}',
  }).catch(() => {});
});

(async () => {
  try {
    const config = await api('/api/config');
    token = config.token;
    ui.set('tv-url', config.tvUrl);
    element('pair-code').textContent = config.pin;
    element('start').disabled = false;
    ui.set('status', 'Ready. Pair the TV or select a screen to begin.');
    poll();
    sendFrame();
  } catch (error) { showError(error.message); }
})();
