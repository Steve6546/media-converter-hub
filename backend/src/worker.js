const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const { Worker } = require('bullmq');
const { studioQueueName, getConnection } = require('./studio/queue');
const { ensureStudioDirs, STUDIO_OUTPUT_DIR } = require('./studio/paths');
const { MAX_OUTPUT_MB } = require('./studio/constants');

ensureStudioDirs();

const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;
const ffprobePath = process.env.FFPROBE_PATH || (ffprobeStatic && ffprobeStatic.path);

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
}

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const safeUnlink = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
};

const getVideoDuration = (filePath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata && metadata.format ? metadata.format.duration : 0;
      resolve(duration || 0);
    });
  });

const buildOutputDir = (jobId) => {
  const dirPath = path.join(STUDIO_OUTPUT_DIR, String(jobId));
  ensureDir(dirPath);
  return dirPath;
};

const buildPublicUrl = (jobId, fileName) => `/studio-output/${jobId}/${fileName}`;

const escapeFilterPath = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.replace(/:/g, '\\:').replace(/'/g, "\\'");
};

const runFfmpeg = (command, job, rangeStart = 0, rangeEnd = 100) =>
  new Promise((resolve, reject) => {
    command
      .on('progress', (progress) => {
        if (!progress || typeof progress.percent !== 'number') return;
        const scaled = rangeStart + (progress.percent / 100) * (rangeEnd - rangeStart);
        const value = Math.max(0, Math.min(100, Math.round(scaled)));
        job.updateProgress(value);
      })
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

const processCompress = async (job) => {
  const { input, options } = job.data;
  const outputDir = buildOutputDir(job.id);
  const outputFile = `compress_${job.id}.mp4`;
  const outputPath = path.join(outputDir, outputFile);
  const warnings = [];

  const duration = await getVideoDuration(input.path);
  const targetSizeMb = Math.min(options.targetSizeMb || MAX_OUTPUT_MB, MAX_OUTPUT_MB);

  let audioBitrateKbps = 0;
  if (options.audioMode === 'compress-96') audioBitrateKbps = 96;
  if (options.audioMode === 'compress-128') audioBitrateKbps = 128;
  if (options.audioMode === 'keep') audioBitrateKbps = 192;

  const totalBitrateKbps = Math.max(
    300,
    Math.floor((targetSizeMb * 1024 * 1024 * 8) / Math.max(duration, 1) / 1000)
  );

  const videoBitrateKbps =
    options.bitrateMode === 'manual'
      ? Math.max(options.bitrateKbps, 200)
      : Math.max(totalBitrateKbps - audioBitrateKbps, 200);

  const height = options.resolution === '1080p' ? 1080 : options.resolution === '720p' ? 720 : 480;
  const videoFilters = [`scale=-2:${height}`, `fps=${options.fps}`].join(',');
  const videoCodec = options.codec === 'h265' ? 'libx265' : 'libx264';

  const buildCommand = (useAudioCopy) => {
    const outputOptions = [
      '-vf',
      videoFilters,
      '-c:v',
      videoCodec,
      '-b:v',
      `${videoBitrateKbps}k`,
      '-preset',
      'medium',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-fs',
      `${targetSizeMb}M`,
    ];

    if (options.bitrateMode === 'auto') {
      outputOptions.push(
        '-maxrate',
        `${videoBitrateKbps}k`,
        '-bufsize',
        `${videoBitrateKbps * 2}k`
      );
    }

    if (options.audioMode === 'remove') {
      outputOptions.push('-an');
    } else if (options.audioMode === 'keep' && useAudioCopy) {
      outputOptions.push('-c:a', 'copy');
    } else {
      outputOptions.push('-c:a', 'aac', '-b:a', `${audioBitrateKbps}k`);
    }

    return ffmpeg(input.path).outputOptions(outputOptions).output(outputPath);
  };

  try {
    await runFfmpeg(buildCommand(true), job);
  } catch (error) {
    if (options.audioMode === 'keep') {
      safeUnlink(outputPath);
      warnings.push('Original audio codec not supported. Re-encoding to AAC.');
      await runFfmpeg(buildCommand(false), job);
    } else {
      throw error;
    }
  }
  job.updateProgress(100);

  const size = fs.statSync(outputPath).size;
  const brand = options.brand || {};
  if (brand.watermark) {
    warnings.push('Brand watermark is not configured in this build.');
  }
  if (brand.intro || brand.outro) {
    warnings.push('Intro/outro stitching is not configured in this build.');
  }
  if (brand.frameBorder) {
    warnings.push('Frame/border rendering is not configured in this build.');
  }
  return {
    files: [
      {
        name: outputFile,
        url: buildPublicUrl(job.id, outputFile),
        size,
      },
    ],
    warnings,
  };
};

const processEnhance = async (job) => {
  const { input, options } = job.data;
  const outputDir = buildOutputDir(job.id);
  const outputFile = `enhance_${job.id}.mp4`;
  const outputPath = path.join(outputDir, outputFile);

  const videoFilters = [];
  if (options.stabilization) videoFilters.push('deshake');
  if (options.denoise) videoFilters.push('hqdn3d');
  if (options.sharpen) videoFilters.push('unsharp=5:5:0.8:3:3:0.4');

  const audioFilters = [];
  if (options.normalizeAudio) {
    audioFilters.push(`loudnorm=I=${options.loudnessTarget}:TP=-2:LRA=11`);
  }

  const command = ffmpeg(input.path)
    .outputOptions([
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
    ])
    .output(outputPath);

  if (videoFilters.length) {
    command.videoFilters(videoFilters.join(','));
  }

  if (audioFilters.length) {
    command.audioFilters(audioFilters.join(','));
  }

  await runFfmpeg(command, job);
  job.updateProgress(100);

  const size = fs.statSync(outputPath).size;
  return {
    files: [
      {
        name: outputFile,
        url: buildPublicUrl(job.id, outputFile),
        size,
      },
    ],
  };
};

const processThumbnails = async (job) => {
  const { input, options } = job.data;
  const outputDir = path.join(buildOutputDir(job.id), 'thumbnails');
  ensureDir(outputDir);
  const warnings = [];

  const duration = await getVideoDuration(input.path);
  const frameCount = 12;
  const fps = duration > 0 ? frameCount / duration : 1;
  const format = options.exportFormat || 'png';

  const filters = [];
  if (options.enableCrop) {
    filters.push("crop='if(gt(iw/ih,16/9),ih*16/9,iw)':'if(gt(iw/ih,16/9),ih,iw*9/16)'");
  }
  if (options.youtubeSafe) {
    filters.push('scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2');
  }
  filters.push(`fps=${fps}`);

  if (options.addText) {
    warnings.push('Thumbnail text overlay is not configured in this build.');
  }

  if (options.addLogo) {
    warnings.push('Thumbnail logo overlay is not configured in this build.');
  }

  const outputTemplate = path.join(outputDir, `thumb_%02d.${format}`);
  const command = ffmpeg(input.path)
    .outputOptions(['-vf', filters.join(','), '-vsync', 'vfr'])
    .output(outputTemplate);

  await runFfmpeg(command, job);

  const files = fs
    .readdirSync(outputDir)
    .filter((name) => name.toLowerCase().endsWith(`.${format}`))
    .map((name) => ({
      name,
      url: buildPublicUrl(job.id, `thumbnails/${name}`),
      size: fs.statSync(path.join(outputDir, name)).size,
    }));

  job.updateProgress(100);

  return { thumbnails: files, warnings };
};

const processSubtitles = async (job) => {
  const { input, options, assets } = job.data;
  const subtitleAsset = assets && assets.subtitle ? assets.subtitle : null;
  if (!subtitleAsset) {
    throw new Error('Subtitle file is required for subtitles job');
  }

  const outputDir = buildOutputDir(job.id);
  const results = { files: [], subtitles: [], warnings: [] };
  let progressStart = 0;
  let progressEnd = 100;

  if (options.speechToText) {
    results.warnings.push('Speech-to-text is not configured in this build.');
  }

  if (options.translate) {
    results.warnings.push('Translation is not configured in this build.');
  }

  if (options.burnIn) {
    progressEnd = options.exportFormats.length ? 70 : 100;
    const outputFile = `subtitles_${job.id}.mp4`;
    const outputPath = path.join(outputDir, outputFile);
    const subtitlePath = escapeFilterPath(subtitleAsset.path);
    const command = ffmpeg(input.path)
      .outputOptions([
        '-vf',
        `subtitles='${subtitlePath}'`,
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-movflags',
        '+faststart',
      ])
      .output(outputPath);

    await runFfmpeg(command, job, progressStart, progressEnd);
    results.files.push({
      name: outputFile,
      url: buildPublicUrl(job.id, outputFile),
      size: fs.statSync(outputPath).size,
    });
    progressStart = progressEnd;
  }

  for (const format of options.exportFormats) {
    const outputFile = `subtitles_${job.id}.${format}`;
    const outputPath = path.join(outputDir, outputFile);
    const command = ffmpeg(subtitleAsset.path)
      .outputOptions(['-f', format === 'vtt' ? 'webvtt' : 'srt'])
      .output(outputPath);

    await runFfmpeg(command, job, progressStart, 100);
    results.subtitles.push({
      name: outputFile,
      url: buildPublicUrl(job.id, outputFile),
      size: fs.statSync(outputPath).size,
    });
    progressStart = 100;
  }

  job.updateProgress(100);
  return results;
};

const processImage = async (job) => {
  const { input, options } = job.data;
  const outputDir = buildOutputDir(job.id);
  const outputFile = `image_${job.id}.${options.format || 'webp'}`;
  const outputPath = path.join(outputDir, outputFile);
  const warnings = [];

  const filters = [];
  if (options.upscale) {
    filters.push('scale=iw*2:ih*2');
  } else if (options.smartResize) {
    filters.push('scale=min(1920,iw):-2');
  }

  if (options.backgroundRemoval) {
    warnings.push('Background removal is not available in this build.');
  }

  if (options.faceBlur) {
    warnings.push('Face blur is not available in this build.');
  }

  const outputOptions = ['-frames:v', '1'];
  if (options.removeExif) {
    outputOptions.push('-map_metadata', '-1');
  }

  const command = ffmpeg(input.path).outputOptions(outputOptions).output(outputPath);
  if (filters.length) {
    command.videoFilters(filters.join(','));
  }

  await runFfmpeg(command, job);
  job.updateProgress(100);

  const size = fs.statSync(outputPath).size;
  return {
    files: [
      {
        name: outputFile,
        url: buildPublicUrl(job.id, outputFile),
        size,
      },
    ],
    warnings,
  };
};

const cleanupJobFiles = (jobData) => {
  if (jobData && jobData.input && jobData.input.path) {
    safeUnlink(jobData.input.path);
  }

  if (jobData && jobData.assets && jobData.assets.subtitle) {
    safeUnlink(jobData.assets.subtitle.path);
  }
};

const worker = new Worker(
  studioQueueName,
  async (job) => {
    try {
      switch (job.name) {
        case 'compress':
          return await processCompress(job);
        case 'enhance':
          return await processEnhance(job);
        case 'thumbnails':
          return await processThumbnails(job);
        case 'subtitles':
          return await processSubtitles(job);
        case 'image':
          return await processImage(job);
        default:
          throw new Error('Unknown studio tool');
      }
    } finally {
      cleanupJobFiles(job.data);
    }
  },
  { connection: getConnection(), concurrency: 2 }
);

worker.on('failed', (job, err) => {
  console.error(`Studio job ${job && job.id ? job.id : 'unknown'} failed:`, err.message);
});

console.log('Studio worker started');
