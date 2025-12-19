const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const OUTPUT_DIR = path.join(__dirname, '../output');
const COVERS_DIR = path.join(__dirname, '../covers');

[UPLOADS_DIR, OUTPUT_DIR, COVERS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/output', express.static(OUTPUT_DIR));
app.use('/covers', express.static(COVERS_DIR));

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

// In-memory store for audio files (replace with database in production)
const audioFilesStore = new Map();
const activeConversions = new Map();

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
    return res.status(400).json({ error: 'No video file provided' });
  }

  const conversionId = uuidv4();
  const inputPath = req.file.path;
  const outputFileName = `${conversionId}.mp3`;
  const outputPath = path.join(OUTPUT_DIR, outputFileName);

  try {
    const duration = await getVideoDuration(inputPath);

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
        fs.unlink(inputPath, () => {});
      })
      .on('error', (err) => {
        activeConversions.set(conversionId, {
          ...activeConversions.get(conversionId),
          status: 'error',
          error: err.message
        });
        fs.unlink(inputPath, () => {});
      })
      .run();

  } catch (err) {
    fs.unlink(inputPath, () => {});
    return res.status(500).json({ error: 'Failed to start conversion' });
  }
});

// API: Get conversion progress (SSE)
app.get('/api/convert/:conversionId/progress', (req, res) => {
  const { conversionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendProgress = () => {
    const conversion = activeConversions.get(conversionId);
    if (!conversion) {
      res.write(`data: ${JSON.stringify({ status: 'not_found' })}\n\n`);
      res.end();
      return;
    }

    res.write(`data: ${JSON.stringify(conversion)}\n\n`);

    if (conversion.status === 'completed' || conversion.status === 'error') {
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
    fs.unlink(oldCoverPath, () => {});
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
    fs.unlink(audioFile.audioPath, () => {});
  }

  // Delete cover if exists
  if (audioFile.coverImage && audioFile.coverImage.startsWith('/covers/')) {
    const coverPath = path.join(__dirname, '..', audioFile.coverImage);
    fs.unlink(coverPath, () => {});
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
      fs.unlink(tempOutputPath, () => {});
    });
  } catch (err) {
    fs.unlink(tempOutputPath, () => {});
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
    fs.unlink(tempOutputPath, () => {});
    res.status(500).json({ error: 'Failed to apply edits' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Smart Media Converter API running on port ${PORT}`);
  console.log(`Uploads directory: ${UPLOADS_DIR}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
});
