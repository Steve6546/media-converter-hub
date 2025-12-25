const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const { getStudioQueue } = require('./studio/queue');
const { ensureStudioDirs, STUDIO_UPLOADS_DIR, STUDIO_OUTPUT_DIR } = require('./studio/paths');
const {
  validateCompressOptions,
  validateEnhanceOptions,
  validateThumbnailOptions,
  validateSubtitleOptions,
  validateImageOptions,
} = require('./studio/validators');
const { probeVideo } = require('./studio/probe');
const {
  checkYtDlpInstalled,
  checkGalleryDlInstalled,
  analyzeUrl,
  downloadMedia,
  downloadImage,
  parseProgress,
  MEDIA_OUTPUT_DIR,
} = require('./media-downloader');


const app = express();
const PORT = process.env.PORT || 3001;
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;
const ffprobePath = process.env.FFPROBE_PATH || (ffprobeStatic && ffprobeStatic.path);

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
}

const isRedisUnavailable = (error) => {
  const message = error instanceof Error ? error.message : '';
  return /(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|CLUSTERDOWN|Connection is closed|Connection closed)/i.test(
    message
  );
};

const getStudioQueueError = (error, fallbackMessage) => {
  if (isRedisUnavailable(error)) {
    return {
      status: 503,
      message: 'Studio queue unavailable. Please start Redis.',
    };
  }

  return {
    status: 500,
    message: error instanceof Error ? error.message : fallbackMessage,
  };
};

// Debug: Print environment info
console.log('=== Redis Configuration ===');
console.log('Platform:', process.platform);
console.log('REDIS_HOST:', process.env.REDIS_HOST || '127.0.0.1');
console.log('REDIS_PORT:', process.env.REDIS_PORT || 6379);
console.log('REDIS_URL:', process.env.REDIS_URL || 'not set');
console.log('===========================\n');

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const OUTPUT_DIR = path.join(__dirname, '../output');
const COVERS_DIR = path.join(__dirname, '../covers');

[UPLOADS_DIR, OUTPUT_DIR, COVERS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

ensureStudioDirs();

// Import security middleware
const {
  helmetConfig,
  corsOptions,
  generalLimiter,
  sanitizeRequest,
  securityLogger,
} = require('./middleware/security');

// Security Middleware
app.use(helmetConfig); // Security headers
app.use(cors(corsOptions)); // Configured CORS (not open to all)
app.use(express.json({ limit: '10mb' })); // JSON with size limit
app.use(sanitizeRequest); // Sanitize requests
app.use(securityLogger); // Log suspicious requests
app.use(generalLimiter); // Rate limiting

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/output', express.static(OUTPUT_DIR));
app.use('/covers', express.static(COVERS_DIR));
app.use('/studio-output', express.static(STUDIO_OUTPUT_DIR));

// Force download for media files (prevents browser from playing them)
app.use('/media-downloads', (req, res, next) => {
  const filename = path.basename(req.path);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  next();
}, express.static(MEDIA_OUTPUT_DIR));


// Multer config for video uploads
const videoStorage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const coverStorage = multer.diskStorage({
  destination: COVERS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp4', '.mov', '.mkv', '.avi', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: MP4, MOV, MKV, AVI, WEBM'));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

const uploadCover = multer({
  storage: coverStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPG, PNG, WEBP, GIF'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const studioStorage = multer.diskStorage({
  destination: STUDIO_UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const studioUpload = multer({
  storage: studioStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const videoTypes = ['.mp4', '.mov', '.mkv', '.avi', '.webm'];
    const imageTypes = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
    const subtitleTypes = ['.srt', '.vtt'];

    if (file.fieldname === 'file') {
      if (videoTypes.includes(ext) || imageTypes.includes(ext)) {
        return cb(null, true);
      }
      return cb(new Error('Invalid studio file type. Allowed: video or image.'));
    }

    if (file.fieldname === 'subtitle') {
      if (subtitleTypes.includes(ext)) {
        return cb(null, true);
      }
      return cb(new Error('Invalid subtitle type. Allowed: SRT, VTT.'));
    }

    return cb(new Error('Unexpected file field'));
  },
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }
});

// In-memory store for audio files (replace with database in production)
const audioFilesStore = new Map();
const activeConversions = new Map();

// In-memory stores for media downloader
const mediaAnalysisCache = new Map(); // Cache for URL analysis results (5 min TTL)
const activeMediaDownloads = new Map(); // Track active downloads

// Get video duration helper
const getVideoDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration);
    });
  });
};

// API: Convert video to MP3 with SSE progress
app.post('/api/convert', uploadVideo.single('video'), async (req, res) => {
  if (!req.file) {
    console.error('❌ [/api/convert] No file provided');
    return res.status(400).json({ error: 'No video file provided' });
  }

  const conversionId = uuidv4();
  const inputPath = req.file.path;
  const outputFileName = `${conversionId}.mp3`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);

  console.log(`✅ [/api/convert] File received: ${req.file.originalname}`);
  console.log(`   Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Conversion ID: ${conversionId}`);

  try {
    const duration = await getVideoDuration(inputPath);
    console.log(`   Duration: ${duration}s`);

    // Store conversion info
    activeConversions.set(conversionId, {
      status: 'pending',
      progress: 0,
      inputPath,
      outputPath,
      duration
    });

    res.json({
      conversionId,
      message: 'Conversion started',
      originalName: req.file.originalname
    });

    // Start conversion in background
    ffmpeg(inputPath)
      .audioCodec('libmp3lame')
      .audioBitrate('320k')
      .audioChannels(2)
      .audioFrequency(44100)
      .output(outputPath)
      .on('start', () => {
        console.log(`🔄 [${conversionId}] Conversion started`);
        activeConversions.set(conversionId, {
          ...activeConversions.get(conversionId),
          status: 'converting'
        });
      })
      .on('progress', (progress) => {
        const percent = Math.min(Math.round(progress.percent || 0), 100);
        activeConversions.set(conversionId, {
          ...activeConversions.get(conversionId),
          progress: percent
        });
      })
      .on('end', () => {
        console.log(`✅ [${conversionId}] Conversion completed`);
        const audioFile = {
          id: uuidv4(),
          conversionId,
          name: path.basename(req.file.originalname, path.extname(req.file.originalname)),
          originalVideoName: req.file.originalname,
          coverImage: null,
          duration: Math.round(duration),
          createdAt: new Date().toISOString(),
          audioUrl: `/output/${outputFileName}`,
          audioPath: outputPath,
          volume: 100,
          trimStart: 0,
          trimEnd: Math.round(duration)
        };

        audioFilesStore.set(audioFile.id, audioFile);
        activeConversions.set(conversionId, {
          ...activeConversions.get(conversionId),
          status: 'completed',
          progress: 100,
          audioFile
        });

        // Clean up input file
        fs.unlink(inputPath, () => { });
      })
      .on('error', (err) => {
        console.error(`❌ [${conversionId}] FFmpeg error: ${err.message}`);
        activeConversions.set(conversionId, {
          ...activeConversions.get(conversionId),
          status: 'error',
          error: err.message
        });
        fs.unlink(inputPath, () => { });
      })
      .run();

  } catch (err) {
    console.error(`❌ [/api/convert] Exception: ${err.message}`);
    fs.unlink(inputPath, () => { });
    return res
      .status(500)
      .json({ error: err && err.message ? err.message : 'Failed to start conversion' });
  }
});

// API: Get conversion progress (SSE)
app.get('/api/convert/:conversionId/progress', (req, res) => {
  const { conversionId } = req.params;
  console.log(`📊 [/api/convert/progress] Polling: ${conversionId}`);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendProgress = () => {
    const conversion = activeConversions.get(conversionId);
    if (!conversion) {
      console.warn(`⚠️  [${conversionId}] Conversion not found`);
      res.write(`data: ${JSON.stringify({ status: 'not_found' })}\n\n`);
      res.end();
      return;
    }

    res.write(`data: ${JSON.stringify(conversion)}\n\n`);

    if (conversion.status === 'completed' || conversion.status === 'error') {
      console.log(`📊 [${conversionId}] Progress stream ended (${conversion.status})`);
      res.end();
      return;
    }
  };

  sendProgress();
  const interval = setInterval(sendProgress, 500);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// API: Get all audio files
app.get('/api/audio', (req, res) => {
  const files = Array.from(audioFilesStore.values());
  res.json(files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// API: Get single audio file
app.get('/api/audio/:id', (req, res) => {
  const audioFile = audioFilesStore.get(req.params.id);
  if (!audioFile) {
    return res.status(404).json({ error: 'Audio file not found' });
  }
  res.json(audioFile);
});

// API: Update audio file metadata
app.patch('/api/audio/:id', (req, res) => {
  const audioFile = audioFilesStore.get(req.params.id);
  if (!audioFile) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  const { name, coverImage, volume, trimStart, trimEnd } = req.body;

  if (name !== undefined) audioFile.name = name;
  if (coverImage !== undefined) audioFile.coverImage = coverImage;
  if (volume !== undefined) audioFile.volume = volume;
  if (trimStart !== undefined) audioFile.trimStart = trimStart;
  if (trimEnd !== undefined) audioFile.trimEnd = trimEnd;

  audioFilesStore.set(audioFile.id, audioFile);
  res.json(audioFile);
});

// API: Upload cover image
app.post('/api/audio/:id/cover', uploadCover.single('cover'), (req, res) => {
  const audioFile = audioFilesStore.get(req.params.id);
  if (!audioFile) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No cover image provided' });
  }

  // Delete old cover if exists
  if (audioFile.coverImage && audioFile.coverImage.startsWith('/covers/')) {
    const oldCoverPath = path.join(__dirname, '..', audioFile.coverImage);
    fs.unlink(oldCoverPath, () => { });
  }

  audioFile.coverImage = `/covers/${req.file.filename}`;
  audioFilesStore.set(audioFile.id, audioFile);
  res.json(audioFile);
});

// API: Delete audio file
app.delete('/api/audio/:id', (req, res) => {
  const audioFile = audioFilesStore.get(req.params.id);
  if (!audioFile) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  // Delete audio file
  if (audioFile.audioPath) {
    fs.unlink(audioFile.audioPath, () => { });
  }

  // Delete cover if exists
  if (audioFile.coverImage && audioFile.coverImage.startsWith('/covers/')) {
    const coverPath = path.join(__dirname, '..', audioFile.coverImage);
    fs.unlink(coverPath, () => { });
  }

  audioFilesStore.delete(audioFile.id);
  res.json({ message: 'Audio file deleted' });
});

// API: Download processed audio (with volume and trim applied)
app.get('/api/audio/:id/download', async (req, res) => {
  const audioFile = audioFilesStore.get(req.params.id);
  if (!audioFile) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  const needsProcessing = audioFile.volume !== 100 ||
    audioFile.trimStart > 0 ||
    audioFile.trimEnd < audioFile.duration;

  if (!needsProcessing) {
    // No processing needed, send original file
    return res.download(audioFile.audioPath, `${audioFile.name}.mp3`);
  }

  // Process with FFmpeg
  const tempOutputPath = path.join(OUTPUT_DIR, `processed_${uuidv4()}.mp3`);
  const volumeFilter = audioFile.volume / 100;

  try {
    await new Promise((resolve, reject) => {
      let command = ffmpeg(audioFile.audioPath)
        .setStartTime(audioFile.trimStart)
        .setDuration(audioFile.trimEnd - audioFile.trimStart)
        .audioFilters(`volume=${volumeFilter}`)
        .audioCodec('libmp3lame')
        .audioBitrate('320k')
        .output(tempOutputPath);

      command
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    res.download(tempOutputPath, `${audioFile.name}.mp3`, (err) => {
      // Clean up temp file after download
      fs.unlink(tempOutputPath, () => { });
    });
  } catch (err) {
    fs.unlink(tempOutputPath, () => { });
    res.status(500).json({ error: 'Failed to process audio' });
  }
});

// API: Apply audio edits (volume/trim) permanently
app.post('/api/audio/:id/apply-edits', async (req, res) => {
  const audioFile = audioFilesStore.get(req.params.id);
  if (!audioFile) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  const { volume, trimStart, trimEnd } = req.body;
  const newVolume = volume !== undefined ? volume : audioFile.volume;
  const newTrimStart = trimStart !== undefined ? trimStart : audioFile.trimStart;
  const newTrimEnd = trimEnd !== undefined ? trimEnd : audioFile.trimEnd;

  const needsProcessing = newVolume !== 100 ||
    newTrimStart > 0 ||
    newTrimEnd < audioFile.duration;

  if (!needsProcessing) {
    return res.json(audioFile);
  }

  const tempOutputPath = path.join(OUTPUT_DIR, `edited_${uuidv4()}.mp3`);
  const volumeFilter = newVolume / 100;

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(audioFile.audioPath)
        .setStartTime(newTrimStart)
        .setDuration(newTrimEnd - newTrimStart)
        .audioFilters(`volume=${volumeFilter}`)
        .audioCodec('libmp3lame')
        .audioBitrate('320k')
        .output(tempOutputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Get new duration
    const newDuration = await getVideoDuration(tempOutputPath);

    // Replace old file with new
    fs.unlinkSync(audioFile.audioPath);
    const newFileName = `${audioFile.id}.mp3`;
    const newFilePath = path.join(OUTPUT_DIR, newFileName);
    fs.renameSync(tempOutputPath, newFilePath);

    // Update audio file record
    audioFile.audioPath = newFilePath;
    audioFile.audioUrl = `/output/${newFileName}`;
    audioFile.duration = Math.round(newDuration);
    audioFile.volume = 100; // Reset to 100 since it's now baked in
    audioFile.trimStart = 0;
    audioFile.trimEnd = Math.round(newDuration);

    audioFilesStore.set(audioFile.id, audioFile);
    res.json(audioFile);
  } catch (err) {
    fs.unlink(tempOutputPath, () => { });
    res.status(500).json({ error: 'Failed to apply edits' });
  }
});

// API: Probe video for metadata
app.post('/api/studio/probe', studioUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const filePath = req.file.path;

  try {
    const metadata = await probeVideo(filePath);

    // Clean up the uploaded file after probing
    fs.unlink(filePath, () => { });

    res.json(metadata);
  } catch (error) {
    // Clean up on error too
    fs.unlink(filePath, () => { });

    const message = error instanceof Error ? error.message : 'Failed to probe video';
    res.status(400).json({ error: message });
  }
});

// API: Generate quick preview
app.post('/api/studio/preview', studioUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const filePath = req.file.path;
  const options = JSON.parse(req.body.options || '{}');

  try {
    const queue = getStudioQueue();
    const job = await queue.add('preview', {
      input: {
        name: req.file.originalname,
        path: filePath,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      options: {
        resolution: options.resolution || '480p',
        fps: options.fps || 30,
        codec: options.codec || 'h264',
        crf: options.crf || 28,
        duration: options.duration || 10, // Max 10 seconds preview
      },
    });

    res.json({
      jobId: job.id,
      message: 'Preview generation started',
    });
  } catch (error) {
    fs.unlink(filePath, () => { });
    const message = error instanceof Error ? error.message : 'Failed to start preview';
    res.status(500).json({ error: message });
  }
});

// API: Create studio job
app.post('/api/studio/jobs', studioUpload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'subtitle', maxCount: 1 },
]), async (req, res) => {
  try {
    const tool = req.body.tool;
    let rawOptions = {};
    if (req.body.options) {
      try {
        rawOptions = JSON.parse(req.body.options);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid options JSON' });
      }
    }
    const file = req.files && req.files.file ? req.files.file[0] : null;
    const subtitle = req.files && req.files.subtitle ? req.files.subtitle[0] : null;

    if (!file) {
      return res.status(400).json({ error: 'No studio file provided' });
    }

    if (tool === 'subtitles' && !subtitle) {
      return res.status(400).json({ error: 'Subtitle file is required' });
    }

    const fileExt = path.extname(file.originalname).toLowerCase();
    const videoTypes = ['.mp4', '.mov', '.mkv', '.avi', '.webm'];
    const imageTypes = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
    const expectsVideo = ['compress', 'enhance', 'thumbnails', 'subtitles'].includes(tool);

    if (expectsVideo && !videoTypes.includes(fileExt)) {
      return res.status(400).json({ error: 'Selected tool requires a video file' });
    }

    if (tool === 'image' && !imageTypes.includes(fileExt)) {
      return res.status(400).json({ error: 'Selected tool requires an image file' });
    }

    let options;
    try {
      switch (tool) {
        case 'compress':
          options = validateCompressOptions(rawOptions);
          break;
        case 'enhance':
          options = validateEnhanceOptions(rawOptions);
          break;
        case 'thumbnails':
          options = validateThumbnailOptions(rawOptions);
          break;
        case 'subtitles':
          options = validateSubtitleOptions(rawOptions);
          break;
        case 'image':
          options = validateImageOptions(rawOptions);
          break;
        default:
          return res.status(400).json({ error: 'Invalid studio tool' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid studio options';
      return res.status(400).json({ error: message });
    }

    const jobData = {
      tool,
      input: {
        path: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      options,
      assets: {},
      createdAt: new Date().toISOString(),
    };

    if (subtitle) {
      jobData.assets.subtitle = {
        path: subtitle.path,
        originalName: subtitle.originalname,
        mimeType: subtitle.mimetype,
        size: subtitle.size,
      };
    }

    const studioQueue = getStudioQueue();
    const job = await studioQueue.add(tool, jobData, {
      removeOnComplete: false,
      removeOnFail: false,
    });

    res.json({ jobId: job.id });
  } catch (error) {
    const { status, message } = getStudioQueueError(error, 'Failed to queue studio job');
    res.status(status).json({ error: message });
  }
});

// API: Get studio job status
app.get('/api/studio/jobs/:jobId', async (req, res) => {
  try {
    const studioQueue = getStudioQueue();
    const job = await studioQueue.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = typeof job.progress === 'number' ? job.progress : 0;

    res.json({
      id: job.id,
      tool: job.name,
      status: state,
      progress,
      result: job.returnvalue || null,
      error: job.failedReason || null,
    });
  } catch (error) {
    const { status, message } = getStudioQueueError(error, 'Failed to load job status');
    res.status(status).json({ error: message });
  }
});

// API: Stream studio job progress (SSE)
app.get('/api/studio/jobs/:jobId/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const studioQueue = getStudioQueue();

  const sendUpdate = async () => {
    try {
      const job = await studioQueue.getJob(req.params.jobId);
      if (!job) {
        res.write(`data: ${JSON.stringify({ status: 'not_found' })}\n\n`);
        res.end();
        return;
      }

      const state = await job.getState();
      const progress = typeof job.progress === 'number' ? job.progress : 0;
      const payload = {
        id: job.id,
        tool: job.name,
        status: state,
        progress,
        result: job.returnvalue || null,
        error: job.failedReason || null,
      };

      res.write(`data: ${JSON.stringify(payload)}\n\n`);

      if (state === 'completed' || state === 'failed') {
        res.end();
      }
    } catch (error) {
      const { message } = getStudioQueueError(error, 'Failed to load job');
      res.write(`data: ${JSON.stringify({ status: 'error', error: message })}\n\n`);
      res.end();
    }
  };

  await sendUpdate();
  if (res.writableEnded) {
    return;
  }

  const interval = setInterval(sendUpdate, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// ==========================================
// MEDIA DOWNLOADER API ENDPOINTS
// ==========================================

// API: Check yt-dlp availability
app.get('/api/media/status', async (req, res) => {
  try {
    const status = await checkYtDlpInstalled();
    res.json(status);
  } catch (error) {
    res.status(500).json({ installed: false, error: error.message });
  }
});

// API: Analyze media URL
app.post('/api/media/analyze', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Check cache first (5 minute TTL)
  const cachedResult = mediaAnalysisCache.get(url);
  if (cachedResult && Date.now() - cachedResult.timestamp < 5 * 60 * 1000) {
    console.log(`📦 [/api/media/analyze] Cache hit for: ${url}`);
    return res.json(cachedResult.data);
  }

  console.log(`🔍 [/api/media/analyze] Analyzing: ${url}`);

  try {
    const result = await analyzeUrl(url);

    // Cache the result
    mediaAnalysisCache.set(url, {
      data: result,
      timestamp: Date.now(),
    });

    res.json(result);
  } catch (error) {
    console.error(`❌ [/api/media/analyze] Error: ${error.message}`);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// API: Start media download
app.post('/api/media/download', async (req, res) => {
  const { url, format_id, audio_only = false } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`📥 [/api/media/download] Starting download: ${url} (format: ${format_id || 'best'})`);

  try {
    const { downloadId, process, outputDir } = downloadMedia(url, format_id, {
      audioOnly: audio_only,
    });

    // Track the download
    activeMediaDownloads.set(downloadId, {
      status: 'starting',
      progress: 0,
      url,
      format_id,
      audio_only,
      startedAt: Date.now(),
      process,
      outputPath: null,
      error: null,
    });

    // Handle process output for progress tracking
    let lastOutputPath = null;

    process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        const parsed = parseProgress(line);
        if (parsed) {
          const download = activeMediaDownloads.get(downloadId);
          if (download) {
            if (parsed.type === 'progress') {
              download.status = 'downloading';
              download.progress = parsed.percent;
              download.speed = `${parsed.speed}${parsed.speedUnit}iB/s`;
              download.eta = parsed.eta;
            } else if (parsed.type === 'destination') {
              lastOutputPath = parsed.path;
            } else if (parsed.type === 'merging') {
              download.status = 'merging';
              lastOutputPath = parsed.path;
            } else if (parsed.type === 'complete') {
              download.progress = 100;
            }
            activeMediaDownloads.set(downloadId, download);
          }
        }
      }
    });

    process.stderr.on('data', (data) => {
      console.error(`[yt-dlp stderr] ${data.toString()}`);
    });

    process.on('close', (code) => {
      const download = activeMediaDownloads.get(downloadId);
      if (download) {
        if (code === 0) {
          // Find the downloaded file
          let finalPath = lastOutputPath;
          if (!finalPath) {
            // Try to find the file in output dir
            const files = fs.readdirSync(outputDir);
            const downloadedFile = files.find((f) => f.startsWith(downloadId));
            if (downloadedFile) {
              finalPath = path.join(outputDir, downloadedFile);
            }
          }

          download.status = 'completed';
          download.progress = 100;
          download.outputPath = finalPath;
          download.downloadUrl = finalPath
            ? `/media-downloads/${path.basename(finalPath)}`
            : null;
          download.completedAt = Date.now();
          console.log(`✅ [/api/media/download] Completed: ${downloadId}`);
        } else {
          download.status = 'failed';
          download.error = `Download failed with exit code ${code}`;
          console.error(`❌ [/api/media/download] Failed: ${downloadId}`);
        }
        activeMediaDownloads.set(downloadId, download);
      }
    });

    process.on('error', (err) => {
      const download = activeMediaDownloads.get(downloadId);
      if (download) {
        download.status = 'failed';
        download.error = err.message;
        activeMediaDownloads.set(downloadId, download);
      }
    });

    res.json({
      success: true,
      downloadId,
      message: 'Download started',
    });
  } catch (error) {
    console.error(`❌ [/api/media/download] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// API: Get download status
app.get('/api/media/download/:downloadId', (req, res) => {
  const { downloadId } = req.params;
  const download = activeMediaDownloads.get(downloadId);

  if (!download) {
    return res.status(404).json({ error: 'Download not found' });
  }

  res.json({
    id: downloadId,
    status: download.status,
    progress: download.progress,
    speed: download.speed || null,
    eta: download.eta || null,
    downloadUrl: download.downloadUrl || null,
    error: download.error || null,
  });
});

// API: Stream download progress (SSE)
app.get('/api/media/download/:downloadId/stream', (req, res) => {
  const { downloadId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = () => {
    const download = activeMediaDownloads.get(downloadId);
    if (!download) {
      res.write(`data: ${JSON.stringify({ status: 'not_found' })}\n\n`);
      res.end();
      return;
    }

    res.write(
      `data: ${JSON.stringify({
        id: downloadId,
        status: download.status,
        progress: download.progress,
        speed: download.speed || null,
        eta: download.eta || null,
        downloadUrl: download.downloadUrl || null,
        error: download.error || null,
      })}\n\n`
    );

    if (download.status === 'completed' || download.status === 'failed') {
      res.end();
    }
  };

  sendUpdate();
  const interval = setInterval(sendUpdate, 500);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// API: Cancel download
app.delete('/api/media/download/:downloadId', (req, res) => {
  const { downloadId } = req.params;
  const download = activeMediaDownloads.get(downloadId);

  if (!download) {
    return res.status(404).json({ error: 'Download not found' });
  }

  if (download.process && download.status === 'downloading') {
    download.process.kill('SIGTERM');
    download.status = 'cancelled';
    activeMediaDownloads.set(downloadId, download);
  }

  res.json({ success: true, message: 'Download cancelled' });
});

// API: List recent downloads
app.get('/api/media/downloads', (req, res) => {
  const downloads = Array.from(activeMediaDownloads.entries())
    .map(([id, data]) => ({
      id,
      status: data.status,
      progress: data.progress,
      downloadUrl: data.downloadUrl || null,
      startedAt: data.startedAt,
      completedAt: data.completedAt || null,
    }))
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 20);

  res.json(downloads);
});

// Rate limiting for streaming downloads
const activeStreams = new Map();
const MAX_CONCURRENT_STREAMS = 5;

// API: Direct Streaming Download (No Server Storage)
// This streams yt-dlp output directly to the client
app.get('/api/media/stream', async (req, res) => {
  const { url, format_id, audio_only, title } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Check concurrent stream limit
  if (activeStreams.size >= MAX_CONCURRENT_STREAMS) {
    return res.status(429).json({ error: 'Too many concurrent downloads. Please try again later.' });
  }

  const streamId = uuidv4();
  console.log(`📥 [/api/media/stream] Starting stream: ${streamId}`);

  // Sanitize filename
  const sanitizeFilename = (name) => {
    return (name || 'download')
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  };

  const filename = sanitizeFilename(title || 'video');
  const isAudio = audio_only === 'true';
  const ext = isAudio ? 'mp3' : 'mp4';

  // Set response headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.${ext}"`);
  res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-cache');

  // Build yt-dlp args for streaming to stdout
  const YT_DLP_CMD = process.platform === 'win32' ? 'python' : 'yt-dlp';
  const YT_DLP_ARGS = process.platform === 'win32' ? ['-m', 'yt_dlp'] : [];

  const args = [
    ...YT_DLP_ARGS,
    '-o', '-', // Output to stdout
    '--no-playlist',
    '--no-warnings',
    '--retries', '3',
  ];

  if (isAudio) {
    args.push('-x');
    args.push('--audio-format', 'mp3');
    args.push('--audio-quality', '0');
  } else if (format_id) {
    args.push('-f', `${format_id}+bestaudio[ext=m4a]/${format_id}+bestaudio/${format_id}/best`);
  } else {
    args.push('-f', 'best[height<=1080]/best');
  }

  args.push(url);

  console.log(`🎬 [Stream ${streamId}] Command: ${YT_DLP_CMD} ${args.join(' ')}`);

  const { spawn } = require('child_process');
  const ytdlp = spawn(YT_DLP_CMD, args, { windowsHide: true });

  // Track active stream
  activeStreams.set(streamId, { process: ytdlp, startedAt: Date.now() });

  let hasError = false;
  let bytesStreamed = 0;

  ytdlp.stdout.on('data', (chunk) => {
    if (!res.writableEnded) {
      res.write(chunk);
      bytesStreamed += chunk.length;
    }
  });

  ytdlp.stderr.on('data', (data) => {
    const msg = data.toString();
    // Only log actual errors, not progress
    if (msg.includes('ERROR') || msg.includes('error')) {
      console.error(`❌ [Stream ${streamId}] Error: ${msg}`);
      hasError = true;
    }
  });

  ytdlp.on('close', (code) => {
    activeStreams.delete(streamId);

    if (code === 0) {
      console.log(`✅ [Stream ${streamId}] Completed. Streamed ${(bytesStreamed / 1024 / 1024).toFixed(2)} MB`);
    } else if (!hasError) {
      console.error(`❌ [Stream ${streamId}] Process exited with code ${code}`);
    }

    if (!res.writableEnded) {
      res.end();
    }
  });

  ytdlp.on('error', (err) => {
    activeStreams.delete(streamId);
    console.error(`❌ [Stream ${streamId}] Process error: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start download' });
    } else if (!res.writableEnded) {
      res.end();
    }
  });

  // Cleanup on client disconnect
  req.on('close', () => {
    if (activeStreams.has(streamId)) {
      console.log(`🛑 [Stream ${streamId}] Client disconnected, killing process`);
      ytdlp.kill('SIGTERM');
      activeStreams.delete(streamId);
    }
  });

  req.on('aborted', () => {
    if (activeStreams.has(streamId)) {
      console.log(`🛑 [Stream ${streamId}] Request aborted, killing process`);
      ytdlp.kill('SIGTERM');
      activeStreams.delete(streamId);
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      let message = 'File is too large.';
      if (req.path === '/api/convert') {
        message = 'File is too large. Maximum size is 500MB.';
      } else if (req.path === '/api/studio/jobs') {
        message = 'File is too large. Maximum size is 2GB.';
      } else if (req.path.endsWith('/cover')) {
        message = 'File is too large. Maximum size is 10MB.';
      }
      return res.status(413).json({ error: message });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return res.status(400).json({ error: message });
  }

  next();
});

app.listen(PORT, () => {
  console.log(`Smart Media Converter API running on port ${PORT}`);
  console.log(`Uploads directory: ${UPLOADS_DIR}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
});
