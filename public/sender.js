'use strict';

import { normalizeSettings, captureConstraints, encodingSettings, jpegSettings, outboundSample, initialAdaptation, adaptQuality } from './quality.js';

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
let shareAudioRequested = false;
let activeQuality = readQuality();
let adaptation = initialAdaptation();
let previousStats = null;
let settingsBusy = false;
let encodingQueue = Promise.resolve();
let encoderLimitsApplied = false;
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d', { alpha: false });

function readQuality() {
  const settings = normalizeSettings({ resolution: element('resolution').value, fps: element('fps').value, quality: element('quality').value, adaptive: element('adaptive').checked });
  if (settings.resolution === 'auto') element('adaptive').checked = true;
  element('adaptive').disabled = settings.resolution === 'auto';
  return settings;
}

function writeQuality(settings) {
  element('resolution').value = settings.resolution;
  element('fps').value = String(settings.fps);
  element('quality').value = settings.quality;
  element('adaptive').checked = settings.adaptive;
}

function videoSender(connection = peer) {
  return connection && connection.getSenders().find((sender) => sender.track && sender.track.kind === 'video');
}

function configureEncoding(connection, settings, level) {
  const job = async () => {
    if (peer !== connection || !sharing) return false;
    const sender = videoSender(connection);
    if (!sender || !sender.setParameters) return false;
    const parameters = sender.getParameters();
    if (!parameters.encodings || !parameters.encodings.length) return false;
    const encoding = encodingSettings(settings, level);
    for (const row of parameters.encodings) Object.assign(row, encoding);
    // Ask the browser to sacrifice detail before the requested motion cadence.
    parameters.degradationPreference = 'maintain-framerate';
    await sender.setParameters(parameters);
    if (peer === connection) encoderLimitsApplied = true;
    return true;
  };
  const result = encodingQueue.then(job);
  encodingQueue = result.catch(() => {});
  return result;
}

function resetStatistics() {
  previousStats = null;
  for (const id of ['stats-capture', 'stats-sent', 'stats-bitrate', 'stats-rtt', 'stats-loss']) element(id).textContent = '—';
  ui.set('adaptation-status', 'Waiting for a live connection.');
}

function showTarget(settings) {
  const label = settings.resolution === 'auto' ? ui.t('Auto (up to 1080p)') : `${settings.resolution}p`;
  element('stats-target').textContent = `${label} · ${settings.fps} FPS`;
}

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
  const hadPeer = Boolean(peer);
  if (peer) peer.close();
  peer = null;
  peerKey = '';
  encoderLimitsApplied = false;
  if (hadPeer) {
    adaptation = initialAdaptation();
    resetStatistics();
  }
}

function updateAudioStatus() {
  if (!sharing || !stream) {
    ui.set('audio-status', 'No screen or audio is being captured.');
  } else if (viewer && viewer.compatibility) {
    ui.set('audio-status', 'JPEG compatibility mode cannot send audio. Use a WebRTC-capable TV browser for movies.');
  } else if (stream.getAudioTracks().some((track) => track.readyState === 'live')) {
    ui.set('audio-status', 'Audio track captured. Choose Enable sound on the TV. Keep the source player and tab unmuted.');
  } else {
    ui.set('audio-status', shareAudioRequested
      ? 'No audio track was provided. Stop and share the film tab again with Share tab audio enabled.'
      : 'Audio sharing is off. Only video is being captured.');
  }
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
  element('profile').disabled = false;
  element('share-audio').disabled = false;
  element('quality-controls').disabled = false;
  element('apply-quality').disabled = true;
  settingsBusy = false;
  adaptation = initialAdaptation();
  resetStatistics();
  updateAudioStatus();
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
  const transceiver = connection.getTransceivers().find((item) => item.sender.track && item.sender.track.kind === 'video');
  if (transceiver && transceiver.setCodecPreferences && window.RTCRtpSender && RTCRtpSender.getCapabilities) {
    const capabilities = RTCRtpSender.getCapabilities('video');
    if (capabilities) {
      const codecs = capabilities.codecs.slice().sort((a, b) => Number(b.mimeType.toLowerCase() === 'video/h264') - Number(a.mimeType.toLowerCase() === 'video/h264'));
      try { transceiver.setCodecPreferences(codecs); } catch (_) { /* Use the browser's default codec order. */ }
    }
  }
  connection.onconnectionstatechange = () => {
    if (peer !== connection) return;
    if (connection.connectionState === 'connected') ui.set('status', 'Live connection established. Check the audio status below.');
    if (connection.connectionState === 'failed') ui.set('status', 'WebRTC failed; the TV will try compatibility mode.');
  };
  await connection.setLocalDescription(await connection.createOffer());
  try {
    const configured = await configureEncoding(connection, activeQuality, adaptation.level);
    if (!configured) ui.set('quality-status', 'The browser did not expose encoder controls. Capture limits still apply; actual output may differ.');
  } catch (_) {
    ui.set('quality-status', 'The browser rejected encoder limits. Capture continues; actual output may differ.');
  }
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
  element('profile').disabled = true;
  element('share-audio').disabled = true;
  element('quality-controls').disabled = true;
  activeQuality = readQuality();
  adaptation = initialAdaptation();
  showTarget(activeQuality);
  const movie = element('profile').value === 'movie';
  shareAudioRequested = element('share-audio').checked;
  showError('');
  try {
    // Capture must start directly from a user gesture; never auto-select a real screen.
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        ...captureConstraints(activeQuality),
        ...(movie ? { displaySurface: 'browser' } : {}),
      },
      audio: shareAudioRequested ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false } : false,
      selfBrowserSurface: 'exclude',
      surfaceSwitching: 'include',
      systemAudio: shareAudioRequested ? 'include' : 'exclude',
    });
    // Enforce the explicit opt-out even if a browser returns an unexpected audio track.
    if (!shareAudioRequested) {
      stream.getAudioTracks().forEach((track) => { track.stop(); stream.removeTrack(track); });
    }
    const state = await api('/api/start', {});
    generation = state.generation;
    sharing = true;
    stream.getVideoTracks()[0].contentHint = movie ? 'motion' : 'detail';
    stream.getVideoTracks()[0].onended = stop;
    stream.getAudioTracks().forEach((track) => { track.onended = updateAudioStatus; });
    // Local preview must remain muted to avoid echo; the captured audio still goes to WebRTC.
    element('preview').muted = true;
    element('preview').srcObject = stream;
    element('preview').hidden = false;
    element('stop').disabled = false;
    element('quality-controls').disabled = false;
    element('apply-quality').disabled = false;
    ui.set('quality-status', 'Selected limits are active. Compare the target with the measured statistics below.');
    updateAudioStatus();
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
for (const id of ['resolution', 'fps', 'quality', 'adaptive']) {
  element(id).addEventListener('change', () => {
    const requested = readQuality();
    if (!sharing) showTarget(requested);
    else ui.set('quality-status', 'Selection changed. Press Apply without stopping to update the active stream.');
  });
}

element('apply-quality').addEventListener('click', async () => {
  if (!sharing || !stream || settingsBusy) return;
  const currentStream = stream;
  const track = stream.getVideoTracks()[0];
  const previous = activeQuality;
  const requested = readQuality();
  const oldConstraints = track.getConstraints();
  settingsBusy = true;
  element('quality-controls').disabled = true;
  showError('');
  ui.set('quality-status', 'Applying settings to the current capture…');
  try {
    await track.applyConstraints(captureConstraints(requested));
    if (!sharing || stream !== currentStream) return;
    // Encoding changes may not exist in JPEG mode; capture limits still apply.
    if (peer) {
      const configured = await configureEncoding(peer, requested, 0);
      if (!configured) throw new Error('Encoder controls are not available yet. Try again once the live connection is ready.');
    }
    activeQuality = requested;
    adaptation = initialAdaptation();
    previousStats = null;
    showTarget(activeQuality);
    ui.set('quality-status', 'Settings applied without restarting screen or audio capture.');
  } catch (error) {
    if (!sharing || stream !== currentStream) return;
    let restored = true;
    try { await track.applyConstraints(oldConstraints); }
    catch (_) { restored = false; }
    if (peer) {
      try { await configureEncoding(peer, previous, adaptation.level); }
      catch (_) { restored = false; }
    }
    writeQuality(previous);
    ui.set('quality-status', restored
      ? 'The browser rejected these settings. Previous settings were restored; sharing continues.'
      : 'Some settings could not be restored. Sharing continues; check measured output or select the source again.');
    showError(error.message);
  } finally {
    if (stream === currentStream || !sharing) {
      settingsBusy = false;
      element('quality-controls').disabled = false;
      element('apply-quality').disabled = !sharing;
    }
  }
});

async function poll() {
  try {
    const state = await api('/api/host');
    viewer = state.viewer;
    updateAudioStatus();
    ui.set('viewer-status', viewer ? 'TV paired ✓' : 'Waiting for the TV.');
    if (sharing && !state.sharing && !stopping) {
      clearLocalCapture();
      ui.set('status', 'The sharing session ended. You can start again.');
    }
    if (sharing && state.generation === generation && viewer) {
      if (viewer.compatibility) {
        closePeer();
        ui.set('status', 'Sending compatibility images (roughly 3–5 fps, no audio).');
        ui.set('adaptation-status', 'JPEG fallback: selected WebRTC FPS and bitrate limits do not apply.');
      } else {
        await makeOffer(viewer, generation);
        for (const message of state.messages) {
          if (peer && message.generation === generation && message.receiverId === viewer.id && message.signal.type === 'answer' && !peer.currentRemoteDescription) {
            await peer.setRemoteDescription(message.signal);
            try { await configureEncoding(peer, activeQuality, adaptation.level); }
            catch (_) { ui.set('quality-status', 'The browser rejected encoder limits. Capture continues; actual output may differ.'); }
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
      const jpeg = jpegSettings(activeQuality);
      const width = Math.min(jpeg.width, video.videoWidth);
      const height = Math.max(1, Math.round(video.videoHeight * width / video.videoWidth));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.drawImage(video, 0, 0, width, height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', jpeg.quality));
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

async function collectStatistics() {
  const connection = peer;
  try {
    showTarget(sharing ? activeQuality : readQuality());
    if (sharing && stream) {
      const capture = stream.getVideoTracks()[0].getSettings();
      element('stats-capture').textContent = `${capture.width || '—'} × ${capture.height || '—'} · ${Number.isFinite(capture.frameRate) ? capture.frameRate.toFixed(1) : '—'} FPS`;
    }
    if (!connection || connection.connectionState !== 'connected') return;
    const reports = await connection.getStats();
    if (peer !== connection || !sharing) return;
    const sample = outboundSample(reports, previousStats);
    if (!sample) return;
    previousStats = sample;
    element('stats-sent').textContent = `${sample.width ?? '—'} × ${sample.height ?? '—'} · ${sample.fps === null ? '—' : sample.fps.toFixed(1)} FPS`;
    element('stats-bitrate').textContent = sample.mbps === null ? '—' : `${sample.mbps.toFixed(2)} Mbps`;
    element('stats-rtt').textContent = sample.rttMs === null ? '—' : `${sample.rttMs.toFixed(0)} ms`;
    element('stats-loss').textContent = sample.lossPercent === null ? '—' : `${sample.lossPercent.toFixed(1)} %`;
    if (!settingsBusy && encoderLimitsApplied) {
      const next = adaptQuality(adaptation, sample, performance.now(), activeQuality);
      if (next.level !== adaptation.level) {
        try {
          if (await configureEncoding(connection, activeQuality, next.level)) adaptation = next;
          else ui.set('quality-status', 'The browser did not expose encoder controls. Capture limits still apply; actual output may differ.');
        } catch (_) { ui.set('quality-status', 'The browser rejected encoder limits. Capture continues; actual output may differ.'); }
      } else adaptation = next;
    }
    const budget = encodingSettings(activeQuality, adaptation.level);
    if (!encoderLimitsApplied) {
      ui.set('adaptation-status', 'Encoder limits are unavailable. Only the measured output is reliable.');
      return;
    }
    ui.set('adaptation-status', activeQuality.adaptive
      ? 'Adaptive level {level}/3 · scale {scale}× · bitrate cap {bitrate} Mbps · FPS target {fps}'
      : 'Adaptive quality off · bitrate cap {bitrate} Mbps · FPS target {fps}',
    { level: adaptation.level, scale: budget.scaleResolutionDownBy, bitrate: (budget.maxBitrate / 1000000).toFixed(1), fps: activeQuality.fps });
  } catch (_) { /* Missing stats are not a capture failure. Retry without inventing values. */ }
  finally { setTimeout(collectStatistics, 2000); }
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
    showTarget(activeQuality);
    collectStatistics();
  } catch (error) { showError(error.message); }
})();
