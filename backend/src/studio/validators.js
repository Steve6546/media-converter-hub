const {
  MAX_OUTPUT_MB,
  VIDEO_CODECS,
  FPS_OPTIONS,
  RESOLUTION_OPTIONS,
  BITRATE_MODES,
  AUDIO_MODES,
  THUMBNAIL_FORMATS,
  IMAGE_FORMATS,
  SUBTITLE_FORMATS,
} = require('./constants');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const normalizeResolution = (value) =>
  RESOLUTION_OPTIONS.includes(value) ? value : '720p';

const normalizeFps = (value) => {
  const fps = Number(value);
  return FPS_OPTIONS.includes(fps) ? fps : 30;
};

const normalizeCodec = (value) => {
  if (!VIDEO_CODECS.includes(value)) {
    throw new Error('Codec must be h264 or h265');
  }
  return value;
};

const normalizeBitrateMode = (value) =>
  BITRATE_MODES.includes(value) ? value : 'auto';

const normalizeAudioMode = (value) =>
  AUDIO_MODES.includes(value) ? value : 'keep';

const normalizeTargetSize = (value) => {
  const size = toNumber(value, 60);
  return Math.min(Math.max(size, 1), MAX_OUTPUT_MB);
};

const normalizeExportFormats = (value, allowedFormats) => {
  if (Array.isArray(value)) {
    return value.filter((item) => allowedFormats.includes(item));
  }
  return [];
};

const validateCompressOptions = (raw = {}) => ({
  resolution: normalizeResolution(raw.resolution),
  fps: normalizeFps(raw.fps),
  bitrateMode: normalizeBitrateMode(raw.bitrateMode),
  bitrateKbps: Math.max(toNumber(raw.bitrateKbps, 2500), 200),
  codec: normalizeCodec(raw.codec || 'h264'),
  audioMode: normalizeAudioMode(raw.audioMode),
  targetSizeMb: normalizeTargetSize(raw.targetSizeMb),
  brand: raw.brand || {},
});

const validateEnhanceOptions = (raw = {}) => ({
  stabilization: toBoolean(raw.stabilization),
  denoise: toBoolean(raw.denoise, true),
  sharpen: toBoolean(raw.sharpen, true),
  normalizeAudio: toBoolean(raw.normalizeAudio, true),
  loudnessTarget: Math.min(Math.max(toNumber(raw.loudnessTarget, -14), -23), -9),
});

const validateThumbnailOptions = (raw = {}) => ({
  autoExtract: toBoolean(raw.autoExtract, true),
  enableCrop: toBoolean(raw.enableCrop, true),
  addText: toBoolean(raw.addText),
  addLogo: toBoolean(raw.addLogo),
  exportFormat: THUMBNAIL_FORMATS.includes(raw.exportFormat) ? raw.exportFormat : 'png',
  youtubeSafe: toBoolean(raw.youtubeSafe, true),
});

const validateSubtitleOptions = (raw = {}) => ({
  burnIn: toBoolean(raw.burnIn, true),
  exportFormats: normalizeExportFormats(raw.exportFormats, SUBTITLE_FORMATS),
  speechToText: toBoolean(raw.speechToText),
  translate: toBoolean(raw.translate),
});

const validateImageOptions = (raw = {}) => ({
  format: IMAGE_FORMATS.includes(raw.format) ? raw.format : 'webp',
  backgroundRemoval: toBoolean(raw.backgroundRemoval),
  smartResize: toBoolean(raw.smartResize, true),
  upscale: toBoolean(raw.upscale),
  faceBlur: toBoolean(raw.faceBlur),
  removeExif: toBoolean(raw.removeExif, true),
});

module.exports = {
  validateCompressOptions,
  validateEnhanceOptions,
  validateThumbnailOptions,
  validateSubtitleOptions,
  validateImageOptions,
};
