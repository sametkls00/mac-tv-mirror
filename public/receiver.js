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
  var video = document.getElementById('display');
  var image = document.getElementById('frames');
  function el(id) { return document.getElementById(id); }

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
    video.srcObject = null;
    video.hidden = true;
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
    receiverId = message.receiverId;
    var offerGeneration = generation;
    connection.ontrack = function (event) {
      if (peer !== connection || !isSharing) return;
      video.srcObject = event.streams[0] || new MediaStream([event.track]);
      video.hidden = false;
      var playing = video.play();
      if (playing && playing.catch) playing.catch(function () { requestCompatibility(); });
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

  video.onplaying = function () {
    if (imageMode || !isSharing) return;
    clearTimeout(fallbackTimer);
    el('waiting').hidden = true;
    ui.set('status', 'Live screen · No audio');
  };

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
