// Pure settings, statistics and adaptation helpers; also exercised by Node tests.
export const FRAME_RATES = [15, 24, 30, 60];
const SIZES = { auto: [1920, 1080], '720': [1280, 720], '1080': [1920, 1080] };
const QUALITIES = { economy: 0.5, balanced: 1, high: 1.5 };
const LEVELS = [
  { scale: 1, bitrate: 1 },
  { scale: 1.25, bitrate: 0.75 },
  { scale: 1.5, bitrate: 0.55 },
  { scale: 2, bitrate: 0.35 },
];

export function normalizeSettings(input = {}) {
  return {
    resolution: Object.hasOwn(SIZES, input.resolution) ? input.resolution : '1080',
    fps: FRAME_RATES.includes(Number(input.fps)) ? Number(input.fps) : 60,
    quality: Object.hasOwn(QUALITIES, input.quality) ? input.quality : 'balanced',
    adaptive: input.resolution === 'auto' || input.adaptive !== false,
  };
}

export function captureConstraints(input) {
  const settings = normalizeSettings(input);
  const [width, height] = SIZES[settings.resolution];
  return {
    width: { ideal: width, max: width },
    height: { ideal: height, max: height },
    frameRate: { ideal: settings.fps, max: settings.fps },
  };
}

export function encodingSettings(input, level = 0) {
  const settings = normalizeSettings(input);
  const stage = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, Math.trunc(level) || 0))];
  const base = settings.resolution === '720' ? 3000000 : 6000000;
  return {
    maxFramerate: settings.fps,
    maxBitrate: Math.round(base * settings.fps / 30 * QUALITIES[settings.quality] * stage.bitrate),
    scaleResolutionDownBy: stage.scale,
  };
}

export function jpegSettings(input) {
  const settings = normalizeSettings(input);
  return {
    width: settings.quality === 'economy' ? 960 : 1280,
    quality: settings.quality === 'economy' ? 0.45 : settings.quality === 'high' ? 0.8 : 0.65,
  };
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function outboundSample(reports, previous = null) {
  const rows = Array.from(reports.values());
  const report = rows.find((row) => row.type === 'outbound-rtp' && (row.kind === 'video' || row.mediaType === 'video') && !row.isRemote);
  if (!report) return null;
  const remote = rows.find((row) => row.id === report.remoteId && row.type === 'remote-inbound-rtp');
  const transport = rows.find((row) => row.id === report.transportId);
  const pair = rows.find((row) => row.id === transport?.selectedCandidatePairId)
    || rows.find((row) => row.type === 'candidate-pair' && row.state === 'succeeded' && row.nominated);
  const same = previous && previous.id === report.id;
  const seconds = same ? (report.timestamp - previous.timestamp) / 1000 : 0;
  const bytesDelta = same ? report.bytesSent - previous.bytesSent : 0;
  const frames = finite(report.framesSent) ?? finite(report.framesEncoded);
  const framesDelta = same && frames !== null && previous.frames !== null ? frames - previous.frames : null;
  const fps = seconds > 0 && framesDelta !== null && framesDelta >= 0 ? framesDelta / seconds : finite(report.framesPerSecond);
  let lossPercent = finite(remote?.fractionLost);
  if (lossPercent !== null) lossPercent = Math.min(100, Math.max(0, lossPercent * 100));
  else if (same && finite(remote?.packetsLost) !== null && previous.packetsLost !== null) {
    const sent = report.packetsSent - previous.packetsSent;
    const lost = remote.packetsLost - previous.packetsLost;
    if (sent > 0 && lost >= 0) lossPercent = Math.min(100, lost / sent * 100);
  }
  const rttSeconds = finite(pair?.currentRoundTripTime) ?? finite(remote?.roundTripTime);
  const encodedDelta = same && finite(report.framesEncoded) !== null && previous.framesEncoded !== null
    ? report.framesEncoded - previous.framesEncoded : 0;
  const encodeDelta = same && finite(report.totalEncodeTime) !== null && previous.totalEncodeTime !== null
    ? report.totalEncodeTime - previous.totalEncodeTime : null;
  return {
    id: report.id, timestamp: report.timestamp, bytesSent: report.bytesSent,
    frames, packetsSent: report.packetsSent, packetsLost: finite(remote?.packetsLost),
    framesEncoded: finite(report.framesEncoded), totalEncodeTime: finite(report.totalEncodeTime),
    width: finite(report.frameWidth), height: finite(report.frameHeight), fps,
    mbps: seconds > 0 && bytesDelta >= 0 ? bytesDelta * 8 / seconds / 1000000 : null,
    rttMs: rttSeconds === null ? null : rttSeconds * 1000,
    lossPercent, encodeMs: encodedDelta > 0 && encodeDelta !== null && encodeDelta >= 0 ? encodeDelta * 1000 / encodedDelta : null,
    limitation: report.qualityLimitationReason || null,
  };
}

export function initialAdaptation() {
  return { level: 0, bad: 0, good: 0, changedAt: 0 };
}

export function adaptQuality(state, sample, now, input) {
  const settings = normalizeSettings(input);
  if (!settings.adaptive) return initialAdaptation();
  if (!sample) return state;
  const hasData = sample.rttMs !== null || sample.lossPercent !== null || sample.encodeMs !== null;
  const congested = (sample.lossPercent !== null && sample.lossPercent > 3)
    || (sample.rttMs !== null && sample.rttMs > 250)
    || (sample.encodeMs !== null && sample.encodeMs > 1000 / settings.fps * 0.9)
    || sample.limitation === 'cpu' || sample.limitation === 'bandwidth';
  const next = { ...state, bad: congested ? state.bad + 1 : 0, good: !congested && hasData ? state.good + 1 : 0 };
  if (next.bad >= 3 && now - state.changedAt >= 10000 && state.level < 3) {
    return { level: state.level + 1, bad: 0, good: 0, changedAt: now };
  }
  if (next.good >= 10 && now - state.changedAt >= 20000 && state.level > 0) {
    return { level: state.level - 1, bad: 0, good: 0, changedAt: now };
  }
  return next;
}
