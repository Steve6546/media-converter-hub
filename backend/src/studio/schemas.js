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

const COMMON_INPUT_SCHEMA = {
  path: 'string',
  originalName: 'string',
  mimeType: 'string',
  size: 'number',
};

const BRAND_SCHEMA = {
  watermark: 'boolean',
  watermarkPosition: 'top-left|top-right|bottom-left|bottom-right|center',
  watermarkOpacity: 'number(10-100)',
  intro: 'boolean',
  outro: 'boolean',
  frameBorder: 'boolean',
  platformPreset: 'tiktok|reels|youtube',
};

const studioJobSchemas = {
  compress: {
    tool: 'compress',
    input: COMMON_INPUT_SCHEMA,
    options: {
      resolution: RESOLUTION_OPTIONS,
      fps: FPS_OPTIONS,
      bitrateMode: BITRATE_MODES,
      bitrateKbps: 'number(>=200)',
      codec: VIDEO_CODECS,
      audioMode: AUDIO_MODES,
      targetSizeMb: `number(1-${MAX_OUTPUT_MB})`,
      brand: BRAND_SCHEMA,
    },
  },
  enhance: {
    tool: 'enhance',
    input: COMMON_INPUT_SCHEMA,
    options: {
      stabilization: 'boolean',
      denoise: 'boolean',
      sharpen: 'boolean',
      normalizeAudio: 'boolean',
      loudnessTarget: 'number(-23 to -9)',
    },
  },
  thumbnails: {
    tool: 'thumbnails',
    input: COMMON_INPUT_SCHEMA,
    options: {
      autoExtract: 'boolean',
      enableCrop: 'boolean',
      addText: 'boolean',
      addLogo: 'boolean',
      exportFormat: THUMBNAIL_FORMATS,
      youtubeSafe: 'boolean',
    },
  },
  subtitles: {
    tool: 'subtitles',
    input: COMMON_INPUT_SCHEMA,
    assets: {
      subtitle: COMMON_INPUT_SCHEMA,
    },
    options: {
      burnIn: 'boolean',
      exportFormats: SUBTITLE_FORMATS,
      speechToText: 'boolean',
      translate: 'boolean',
    },
  },
  image: {
    tool: 'image',
    input: COMMON_INPUT_SCHEMA,
    options: {
      format: IMAGE_FORMATS,
      backgroundRemoval: 'boolean',
      smartResize: 'boolean',
      upscale: 'boolean',
      faceBlur: 'boolean',
      removeExif: 'boolean',
    },
  },
};

module.exports = {
  studioJobSchemas,
};
