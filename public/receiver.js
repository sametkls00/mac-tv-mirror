'use strict';

// ES5 syntax and XMLHttpRequest preserve compatibility with older TV browsers.
(function () {
  var ui = window.MirrorI18n;
  var token = '';
  var peer = null;
  var generation = -1;
  var receiverId = '';
  var isSharing = false;
  var imageMode = false;
  var compatibilityRequested = false;
  var imageTimer = null;
  var fallbackTimer = null;
  var remoteStream = null;
  var soundBusy = false;
  var controlsTimer = null;
  var hintTimer = null;
  var lastFocus = 'fullscreen';
  var lastVideoStats = null;
  var selectBusyUntil = 0;
  var video = document.getElementById('display');
  var image = document.getElementById('frames');
  function el(id) { return document.getElementById(id); }

  function setControlsHidden(hidden) {
    if (hidden) document.body.classList.add('chrome-hidden');
    else document.body.classList.remove('chrome-hidden');
  }

  function scheduleHide() {
    clearTimeout(controlsTimer);
    if (!el('auto-hide').checked || !isSharing || imageMode || video.paused || !video.videoWidth) return;
    controlsTimer = setTimeout(function () {
      var active = document.activeElement;
      // Do not close a TV's native select popup while it is being used.
      if (Date.now() < selectBusyUntil) { scheduleHide(); return; }
      if (active && (el('toolbar').contains(active) || document.querySelector('.language-bar').contains(active))) {
        if (active.id) lastFocus = active.id;
        active.blur();
      }
      setControlsHidden(true);
      el('controls-hint').hidden = false;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(function () { el('controls-hint').hidden = true; }, 2500);
    }, 4500);
  }

  function showControls(event) {
    if (event && event.target && event.target.tagName === 'SELECT' && (event.type === 'keydown' || event.type === 'pointerdown')) {
      selectBusyUntil = Date.now() + 12000;
    }
    var wasHidden = document.body.classList.contains('chrome-hidden');
    setControlsHidden(false);
    clearTimeout(hintTimer);
    el('controls-hint').hidden = true;
    if (wasHidden && event && event.type === 'keydown') {
      var focus = el(lastFocus);
      if (!focus || focus.disabled) focus = el('fit');
      focus.focus();
      // The first Enter wakes controls, rather than activating an unseen button.
      if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    scheduleHide();
  }

  function applyFit() {
    selectBusyUntil = 0;
    var fit = el('fit').value;
    if (fit !== 'cover' && fit !== 'fill') fit = 'contain';
    el('screen').setAttribute('data-fit', fit);
    ui.set('fit-note', fit === 'cover' ? 'Fill crops the source edges. Resolution and screen aspect ratio are different settings.'
      : fit === 'fill' ? 'Stretch fills the TV but distorts the original proportions.'
      : 'Fit preserves proportions and may leave black bars.');
    try { localStorage.setItem('mac-tv-mirror-fit', fit); } catch (_) { /* Storage is optional. */ }
    showControls();
  }

  try {
    var savedFit = localStorage.getItem('mac-tv-mirror-fit');
    if (savedFit === 'contain' || savedFit === 'cover' || savedFit === 'fill') el('fit').value = savedFit;
    el('auto-hide').checked = localStorage.getItem('mac-tv-mirror-auto-hide') !== 'false';
  } catch (_) { /* TV privacy settings may disable storage. */ }
  el('fit').onchange = applyFit;
  el('auto-hide').onchange = function () {
    try { localStorage.setItem('mac-tv-mirror-auto-hide', String(el('auto-hide').checked)); } catch (_) { /* Optional preference only. */ }
    showControls();
  };
  document.addEventListener('keydown', showControls, true);
  document.addEventListener('mousemove', showControls);
  document.addEventListener('pointerdown', showControls, true);
  document.addEventListener('touchstart', showControls, true);
  document.addEventListener('focusin', function () { showControls(); });
  applyFit();

  function api(path, body, done) {
    var request = new XMLHttpRequest();
    request.open(body === null ? 'GET' : 'POST', path, true);
    request.timeout = 7000;
    if (token) request.setRequestHeader('Authorization', 'Bearer ' + token);
    if (body !== null) request.setRequestHeader('Content-Type', 'application/json');
    request.onload = function () {
      var data;
      try { data = JSON.parse(request.responseText); } catch (_) { data = {}; }
      if (request.status < 200 || request.status >= 300) {
        var error = new Error(data.error || 'Local connection error.');
        error.status = request.status;
        done(error);
      } else done(null, data);
    };
    request.onerror = request.ontimeout = function () { done(new Error('Cannot reach the Mac. Check that both devices are on the same Wi-Fi network.')); };
    request.send(body === null ? null : JSON.stringify(body));
  }

  function closePeer() {
    if (peer) peer.close();
    peer = null;
    remoteStream = null;
    soundBusy = false;
    lastVideoStats = null;
    clearTimeout(controlsTimer);
    setControlsHidden(false);
    el('controls-hint').hidden = true;
    ui.set('tv-stats', 'Waiting for decoded-video statistics.');
    video.pause();
    video.muted = true;
    video.srcObject = null;
    video.hidden = true;
    el('sound').disabled = true;
    el('sound').setAttribute('aria-pressed', 'false');
    ui.set('sound', 'Enable sound');
    ui.set('audio-status', 'Waiting for an audio track.');
  }

  function hasAudio() {
    if (!remoteStream) return false;
    var tracks = remoteStream.getAudioTracks();
    for (var i = 0; i < tracks.length; i += 1) {
      if (tracks[i].readyState === 'live') return true;
    }
    return false;
  }

  function updateAudio() {
    if (imageMode) {
      el('sound').disabled = true;
      ui.set('audio-status', 'JPEG compatibility mode has no audio and is not suitable for movies.');
      return;
    }
    if (!peer || !isSharing || !remoteStream) {
      el('sound').disabled = true;
      ui.set('audio-status', 'Waiting for an audio track.');
      return;
    }
    var available = !imageMode && isSharing && hasAudio();
    el('sound').disabled = !available || soundBusy;
    el('sound').setAttribute('aria-pressed', available && !video.muted ? 'true' : 'false');
    ui.set('sound', available && !video.muted ? 'Mute sound' : 'Enable sound');
    ui.set('audio-status', !available
      ? 'No audio track received. Enable Share tab audio on the Mac.'
      : video.muted ? 'Audio received. Press Enable sound on this TV.' : 'Sound enabled. Use the TV volume controls.');
  }

  function startMutedVideo(connection) {
    if (peer !== connection || imageMode || !isSharing) return;
    var playing;
    try { playing = video.play(); }
    catch (_) { requestCompatibility(); return; }
    if (playing && playing.catch) playing.catch(function (error) {
      if (peer !== connection || imageMode || !isSharing) return;
      // A TV's sound autoplay policy is not a video codec failure.
      if (error.name === 'NotAllowedError') {
        video.muted = true;
        updateAudio();
        ui.set('audio-status', 'The TV blocked playback. Press Enable sound to retry on the TV.');
      } else if (error.name !== 'AbortError') requestCompatibility();
    });
  }

  function clearDisplay(message) {
    clearTimeout(fallbackTimer);
    clearTimeout(imageTimer);
    closePeer();
    imageMode = false;
    compatibilityRequested = false;
    image.hidden = true;
    image.removeAttribute('src');
    el('waiting').hidden = false;
    ui.set('waiting-text', message);
  }

  function nextFrame() {
    if (!imageMode || !isSharing) return;
    image.src = '/api/frame.jpg?key=' + encodeURIComponent(token) + '&t=' + new Date().getTime();
  }
  image.onload = function () {
    if (!imageMode || !isSharing) return;
    image.hidden = false;
    el('waiting').hidden = true;
    imageTimer = setTimeout(nextFrame, 180);
  };
  image.onerror = function () {
    if (!imageMode || !isSharing) return;
    image.hidden = true;
    el('waiting').hidden = false;
    ui.set('waiting-text', 'Waiting for a current image from the Mac…');
    imageTimer = setTimeout(nextFrame, 600);
  };

  function useImages() {
    if (imageMode) return;
    clearTimeout(fallbackTimer);
    closePeer();
    imageMode = true;
    ui.set('status', 'Compatibility mode · Video only, no audio');
    ui.set('audio-status', 'JPEG compatibility mode has no audio and is not suitable for movies.');
    ui.set('tv-stats', 'JPEG fallback does not support 60 FPS or audio.');
    el('compatibility').disabled = true;
    ui.set('waiting-text', 'Preparing compatibility images…');
    nextFrame();
  }

  function requestCompatibility() {
    if (!token || !isSharing || compatibilityRequested || imageMode) return;
    compatibilityRequested = true;
    api('/api/compatibility', { generation: generation }, function (error) {
      if (error) {
        compatibilityRequested = false;
        ui.set('status', error.message);
        return;
      }
      useImages();
    });
  }

  function waitForIce(connection, done) {
    if (connection.iceGatheringState === 'complete') { done(); return; }
    var finished = false;
    var timeout = setTimeout(finish, 3500);
    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      connection.removeEventListener('icegatheringstatechange', changed);
      done();
    }
    function changed() { if (connection.iceGatheringState === 'complete') finish(); }
    connection.addEventListener('icegatheringstatechange', changed);
  }

  function receiveOffer(message) {
    if (imageMode || message.generation !== generation) return;
    if (!window.RTCPeerConnection) { requestCompatibility(); return; }
    closePeer();
    var connection;
    try { connection = new RTCPeerConnection({ iceServers: [] }); }
    catch (_) { requestCompatibility(); return; }
    peer = connection;
    remoteStream = null;
    // Give offer/answer negotiation its own deadline; startup and ICE gathering
    // must not consume the entire first-frame budget, especially with audio.
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(requestCompatibility, 11000);
    receiverId = message.receiverId;
    var offerGeneration = generation;
    connection.ontrack = function (event) {
      if (peer !== connection || !isSharing) return;
      if (!remoteStream) {
        try { remoteStream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream(); }
        catch (_) { requestCompatibility(); return; }
      }
      var tracks = event.streams && event.streams[0] ? event.streams[0].getTracks() : [event.track];
      for (var i = 0; i < tracks.length; i += 1) {
        if (!remoteStream.getTrackById(tracks[i].id)) remoteStream.addTrack(tracks[i]);
      }
      event.track.onended = updateAudio;
      if (video.srcObject !== remoteStream) video.srcObject = remoteStream;
      video.hidden = false;
      updateAudio();
      startMutedVideo(connection);
    };
    connection.onconnectionstatechange = function () {
      if (peer === connection && connection.connectionState === 'failed') requestCompatibility();
    };
    try {
      connection.setRemoteDescription(message.signal).then(function () {
        return connection.createAnswer();
      }).then(function (answer) {
        return connection.setLocalDescription(answer);
      }).then(function () {
        waitForIce(connection, function () {
          if (peer !== connection || generation !== offerGeneration || !isSharing) return;
          api('/api/signal', {
            generation: offerGeneration, receiverId: receiverId,
            signal: { type: connection.localDescription.type, sdp: connection.localDescription.sdp }
          }, function (error) { if (error) requestCompatibility(); });
        });
      }).catch(function () { requestCompatibility(); });
    } catch (_) { requestCompatibility(); }
  }

  function videoReady() {
    // Audio can start before the first decoded video frame. Do not cancel
    // the image fallback deadline merely because an audio track is playing.
    if (imageMode || !isSharing || video.paused || !video.videoWidth) return;
    clearTimeout(fallbackTimer);
    el('waiting').hidden = true;
    ui.set('status', 'Live screen · WebRTC');
    scheduleHide();
  }
  video.onplaying = videoReady;
  video.onresize = videoReady;

  function collectVideoStats() {
    var connection = peer;
    if (!connection || imageMode || !isSharing || !connection.getStats) { setTimeout(collectVideoStats, 2000); return; }
    var result;
    try { result = connection.getStats(); }
    catch (_) { setTimeout(collectVideoStats, 2000); return; }
    if (!result || !result.then) { setTimeout(collectVideoStats, 2000); return; }
    result.then(function (reports) {
      if (connection !== peer || imageMode || !isSharing) return;
      var row = null;
      reports.forEach(function (report) {
        if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.mediaType === 'video')) row = report;
      });
      if (!row) return;
      var seconds = lastVideoStats && lastVideoStats.id === row.id ? (row.timestamp - lastVideoStats.timestamp) / 1000 : 0;
      var fps = typeof row.framesPerSecond === 'number' ? row.framesPerSecond : null;
      var mbps = null;
      if (seconds > 0) {
        var frames = row.framesDecoded - lastVideoStats.framesDecoded;
        var bytes = row.bytesReceived - lastVideoStats.bytesReceived;
        if (frames >= 0) fps = frames / seconds;
        if (bytes >= 0) mbps = bytes * 8 / seconds / 1000000;
      }
      lastVideoStats = { id: row.id, timestamp: row.timestamp, framesDecoded: row.framesDecoded, bytesReceived: row.bytesReceived };
      ui.set('tv-stats', 'TV decoded video: {width} × {height} · {fps} FPS · {bitrate} Mbps (not panel refresh rate)', {
        width: video.videoWidth || '—', height: video.videoHeight || '—',
        fps: fps !== null && isFinite(fps) ? fps.toFixed(1) : '—',
        bitrate: mbps !== null && isFinite(mbps) ? mbps.toFixed(2) : '—'
      });
    }).catch(function () { /* Not all TV browsers provide decoding statistics. */ }).then(function () {
      setTimeout(collectVideoStats, 2000);
    });
  }
  collectVideoStats();

  function poll() {
    if (!token) return;
    api('/api/receiver', null, function (error, state) {
      if (error) {
        isSharing = false;
        clearDisplay(error.message);
        ui.set('status', error.message);
        if (error.status === 401) {
          token = '';
          el('pair-panel').hidden = false;
          el('toolbar').hidden = true;
          ui.set('pair-error', 'Session ended. Reconnect using the current code on the Mac.');
          return;
        }
        setTimeout(poll, 1500);
        return;
      }
      var changed = state.generation !== generation;
      var resumed = state.sharing && !isSharing;
      isSharing = state.sharing;
      if (changed || resumed) {
        generation = state.generation;
        clearDisplay(state.sharing ? 'Connecting to the Mac screen…' : 'Click “Share my screen” on the Mac.');
        el('compatibility').disabled = false;
        if (state.sharing) {
          fallbackTimer = setTimeout(requestCompatibility, 11000);
          if (!window.RTCPeerConnection) requestCompatibility();
        }
      }
      if (!state.sharing) {
        ui.set('status', 'Sharing is off · Waiting for the Mac');
      } else if (state.compatibility) {
        useImages();
      } else {
        for (var i = 0; i < state.messages.length; i += 1) {
          if (state.messages[i].signal.type === 'offer') receiveOffer(state.messages[i]);
        }
      }
      setTimeout(poll, 800);
    });
  }

  el('pair-form').onsubmit = function (event) {
    event.preventDefault();
    ui.set('pair-error', '');
    el('pair-button').disabled = true;
    api('/api/pair', { pin: el('pin').value.replace(/\s/g, '') }, function (error, data) {
      el('pair-button').disabled = false;
      if (error) { ui.set('pair-error', error.message); return; }
      token = data.token;
      el('pin').value = '';
      el('pair-panel').hidden = true;
      el('toolbar').hidden = false;
      el('fullscreen').focus();
      poll();
    });
  };
  el('compatibility').onclick = requestCompatibility;
  el('sound').onclick = function () {
    if (!peer || !isSharing || imageMode || !hasAudio() || soundBusy) return;
    var connection = peer;
    if (!video.muted) {
      video.muted = true;
      updateAudio();
      return;
    }
    // Unmute and play directly in this click handler to satisfy TV autoplay rules.
    soundBusy = true;
    video.muted = false;
    updateAudio();
    function finished() {
      if (peer !== connection) return;
      soundBusy = false;
      updateAudio();
    }
    function blocked() {
      if (peer !== connection) return;
      soundBusy = false;
      video.muted = true;
      updateAudio();
      ui.set('audio-status', 'Sound was blocked by the TV browser. Press Enable sound to retry. Video stays live.');
      startMutedVideo(connection);
    }
    try {
      var playing = video.play();
      if (playing && playing.then) playing.then(finished).catch(blocked);
      else finished();
    } catch (_) { blocked(); }
  };
  el('fullscreen').onclick = function () {
    var root = document.documentElement;
    var enter = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!enter) { ui.set('status', 'Use the TV browser menu to enter fullscreen.'); return; }
    try {
      var result = enter.call(root);
      if (result && result.catch) result.catch(function () {});
    } catch (_) { /* Some TVs only expose fullscreen in their browser menu. */ }
  };
})();
