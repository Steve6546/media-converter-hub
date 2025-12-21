const MAX_OUTPUT_MB = 100;
const VIDEO_CODECS = ['h264', 'h265'];
const FPS_OPTIONS = [60, 30, 24];
const RESOLUTION_OPTIONS = ['1080p', '720p', '480p'];
const BITRATE_MODES = ['auto', 'manual'];
const AUDIO_MODES = ['keep', 'remove', 'compress-128', 'compress-96'];
const THUMBNAIL_FORMATS = ['png', 'jpg', 'webp'];
const IMAGE_FORMATS = ['jpg', 'png', 'webp', 'avif'];
const SUBTITLE_FORMATS = ['srt', 'vtt'];

module.exports = {
  MAX_OUTPUT_MB,
  VIDEO_CODECS,
  FPS_OPTIONS,
  RESOLUTION_OPTIONS,
  BITRATE_MODES,
  AUDIO_MODES,
  THUMBNAIL_FORMATS,
  IMAGE_FORMATS,
  SUBTITLE_FORMATS,
};
