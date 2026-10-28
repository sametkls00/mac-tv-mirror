import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, captureConstraints, encodingSettings, jpegSettings, outboundSample, initialAdaptation, adaptQuality } from '../public/quality.js';

test('60 FPS is the default capture and encoding target, not a reported measurement', () => {
  const settings = normalizeSettings();
  assert.equal(settings.fps, 60);
  assert.deepEqual(captureConstraints(settings).frameRate, { ideal: 60, max: 60 });
  assert.equal(encodingSettings(settings).maxFramerate, 60);
  assert.equal(encodingSettings(settings).maxBitrate, 12000000);
  for (const fps of [15, 24, 30, 60]) {
    assert.equal(captureConstraints({ fps }).frameRate.max, fps);
    assert.equal(encodingSettings({ fps }).maxFramerate, fps);
  }
  assert.equal(normalizeSettings({ fps: 120 }).fps, 60);
});

test('Resolution and quality settings are bounded and preserve room for the source aspect ratio', () => {
  assert.deepEqual(captureConstraints({ resolution: '720', fps: 60 }), {
    width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: { ideal: 60, max: 60 },
  });
  assert.equal(normalizeSettings({ resolution: 'invalid', quality: 'invalid' }).resolution, '1080');
  assert.equal(normalizeSettings({ resolution: 'auto', adaptive: false }).adaptive, true);
  assert.equal(normalizeSettings({ adaptive: false }).adaptive, false);
  assert.equal(encodingSettings({ resolution: '720', quality: 'economy', fps: 60 }).maxBitrate, 3000000);
  assert.deepEqual(jpegSettings({ quality: 'economy' }), { width: 960, quality: 0.45 });
  assert.equal(jpegSettings({ quality: 'high' }).width, 1280);
});

test('Statistics distinguish measured frame rate and bitrate from the selected target', () => {
  function reports(timestamp, bytes, frames, extra = {}) {
    return new Map([
      ['video', { id: 'video', type: 'outbound-rtp', kind: 'video', remoteId: 'remote', transportId: 'transport', timestamp, bytesSent: bytes, framesSent: frames, framesEncoded: frames, totalEncodeTime: frames * 0.004, packetsSent: frames * 10, frameWidth: 1152, frameHeight: 720, qualityLimitationReason: 'none', ...extra }],
      ['remote', { id: 'remote', type: 'remote-inbound-rtp', fractionLost: 0.025 }],
      ['transport', { id: 'transport', type: 'transport', selectedCandidatePairId: 'pair' }],
      ['pair', { id: 'pair', type: 'candidate-pair', currentRoundTripTime: 0.02 }],
    ]);
  }
  const first = outboundSample(reports(1000, 1000000, 30));
  assert.equal(first.fps, null);
  assert.equal(first.mbps, null);
  const second = outboundSample(reports(3000, 2000000, 90), first);
  assert.equal(second.fps, 30); // Never substitute the user's 60 FPS target.
  assert.equal(second.mbps, 4);
  assert.equal(second.width, 1152);
  assert.equal(second.height, 720);
  assert.equal(second.rttMs, 20);
  assert.equal(second.lossPercent, 2.5);
  assert.ok(Math.abs(second.encodeMs - 4) < 0.0001);
  const restarted = outboundSample(reports(100, 0, 0, { id: 'new-video' }), second);
  assert.equal(restarted.mbps, null);
  assert.equal(restarted.fps, null);
  assert.equal(outboundSample(new Map()), null);
});

test('Unsupported statistics remain unknown instead of fabricated zero values', () => {
  const reports = new Map([['video', { id: 'video', type: 'outbound-rtp', kind: 'video', timestamp: 1000, bytesSent: 0 }]]);
  const sample = outboundSample(reports);
  assert.equal(sample.rttMs, null);
  assert.equal(sample.lossPercent, null);
  assert.equal(sample.encodeMs, null);
  assert.equal(sample.fps, null);
});

test('Adaptation reduces detail and bitrate first and never changes the selected FPS', () => {
  const settings = normalizeSettings({ fps: 60 });
  const bad = { lossPercent: 8, rttMs: 400, encodeMs: 4, limitation: 'bandwidth' };
  let state = initialAdaptation();
  for (const time of [10000, 12000, 14000]) state = adaptQuality(state, bad, time, settings);
  assert.equal(state.level, 1);
  assert.equal(encodingSettings(settings, state.level).maxFramerate, 60);
  assert.ok(encodingSettings(settings, state.level).maxBitrate < encodingSettings(settings).maxBitrate);
  assert.ok(encodingSettings(settings, state.level).scaleResolutionDownBy > 1);
  const after = adaptQuality(state, bad, 15000, settings);
  assert.equal(after.level, 1); // Hysteresis prevents oscillation.
  assert.equal(adaptQuality(state, bad, 20000, { ...settings, adaptive: false }).level, 0);
});

test('Adaptation recovers gradually after sustained healthy statistics', () => {
  const good = { lossPercent: 0, rttMs: 10, encodeMs: 2, limitation: 'none' };
  let state = { ...initialAdaptation(), level: 2, changedAt: 1000 };
  for (let sample = 0; sample < 10; sample += 1) state = adaptQuality(state, good, 21000 + sample * 2000, { fps: 60 });
  assert.equal(state.level, 1);
  assert.equal(encodingSettings({ fps: 60 }, state.level).maxFramerate, 60);
  assert.deepEqual(adaptQuality(state, null, 60000, { fps: 60 }), state);
});
