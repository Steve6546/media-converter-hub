# Smart Media Converter Backend

Node.js + Express backend with FFmpeg for video-to-MP3 conversion and audio editing.

## Requirements

- Node.js 18+
- Redis (BullMQ queue)
- FFmpeg (provided via `ffmpeg-static`, or system install on PATH)

### Installing FFmpeg (Optional)

The backend now uses `ffmpeg-static` and `ffprobe-static` by default. If you prefer a system install, follow:

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html and add to PATH.

## Setup

```bash
cd backend
npm install
```

## Running

**Development:**
```bash
npm run dev
```

**Worker (required for studio jobs):**
```bash
npm run dev:worker
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:3001` by default.

## API Endpoints

### Convert Video to MP3
```
POST /api/convert
Content-Type: multipart/form-data

Body: video (file)

Response: { conversionId, message, originalName }
```

### Get Conversion Progress (SSE)
```
GET /api/convert/:conversionId/progress

Response: Server-Sent Events with progress updates
```

### Get All Audio Files
```
GET /api/audio

Response: Array of audio file objects
```

### Get Single Audio File
```
GET /api/audio/:id
```

### Update Audio Metadata
```
PATCH /api/audio/:id
Content-Type: application/json

Body: { name?, coverImage?, volume?, trimStart?, trimEnd? }
```

### Upload Cover Image
```
POST /api/audio/:id/cover
Content-Type: multipart/form-data

Body: cover (file)
```

### Download Processed Audio
```
GET /api/audio/:id/download

Downloads the MP3 with volume and trim settings applied
```

### Apply Edits Permanently
```
POST /api/audio/:id/apply-edits
Content-Type: application/json

Body: { volume?, trimStart?, trimEnd? }

Applies edits and updates the source file
```

### Delete Audio File
```
DELETE /api/audio/:id
```

### Health Check
```
GET /api/health
```

## Studio / Optimizer API

### Create Studio Job
```
POST /api/studio/jobs
Content-Type: multipart/form-data

Fields:
  tool: compress | enhance | thumbnails | subtitles | image
  options: JSON string
  file: video or image file
  subtitle: optional .srt or .vtt file

Response: { jobId }
```

### Studio Job Status
```
GET /api/studio/jobs/:jobId
```

### Studio Job Progress (SSE)
```
GET /api/studio/jobs/:jobId/stream
```

## Studio Job Schemas
Reference schemas are defined in `backend/src/studio/schemas.js`.

### Compress
```json
{
  "tool": "compress",
  "input": {
    "path": "string",
    "originalName": "string",
    "mimeType": "string",
    "size": 0
  },
  "options": {
    "resolution": "1080p | 720p | 480p",
    "fps": 60,
    "bitrateMode": "auto | manual",
    "bitrateKbps": 2500,
    "codec": "h264 | h265",
    "audioMode": "keep | remove | compress-128 | compress-96",
    "targetSizeMb": 1,
    "brand": {
      "watermark": false,
      "watermarkPosition": "bottom-right",
      "watermarkOpacity": 40,
      "intro": false,
      "outro": false,
      "frameBorder": false,
      "platformPreset": "youtube"
    }
  }
}
```

### Enhance
```json
{
  "tool": "enhance",
  "input": {
    "path": "string",
    "originalName": "string",
    "mimeType": "string",
    "size": 0
  },
  "options": {
    "stabilization": false,
    "denoise": true,
    "sharpen": true,
    "normalizeAudio": true,
    "loudnessTarget": -14
  }
}
```

### Thumbnails
```json
{
  "tool": "thumbnails",
  "input": {
    "path": "string",
    "originalName": "string",
    "mimeType": "string",
    "size": 0
  },
  "options": {
    "autoExtract": true,
    "enableCrop": true,
    "addText": false,
    "addLogo": false,
    "exportFormat": "png",
    "youtubeSafe": true
  }
}
```

### Subtitles
```json
{
  "tool": "subtitles",
  "input": {
    "path": "string",
    "originalName": "string",
    "mimeType": "string",
    "size": 0
  },
  "assets": {
    "subtitle": {
      "path": "string",
      "originalName": "string",
      "mimeType": "string",
      "size": 0
    }
  },
  "options": {
    "burnIn": true,
    "exportFormats": ["srt", "vtt"],
    "speechToText": false,
    "translate": false
  }
}
```

### Image
```json
{
  "tool": "image",
  "input": {
    "path": "string",
    "originalName": "string",
    "mimeType": "string",
    "size": 0
  },
  "options": {
    "format": "webp",
    "backgroundRemoval": false,
    "smartResize": true,
    "upscale": false,
    "faceBlur": false,
    "removeExif": true
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| REDIS_URL | - | Redis connection string |
| REDIS_HOST | 127.0.0.1 | Redis host |
| REDIS_PORT | 6379 | Redis port |
| FFMPEG_PATH | - | Path to ffmpeg binary if not in PATH |
| FFPROBE_PATH | - | Path to ffprobe binary if not in PATH |

## File Storage

- `uploads/` - Temporary video uploads (deleted after conversion)
- `output/` - Converted MP3 files
- `covers/` - Cover images

For production, replace the in-memory store with a proper database (PostgreSQL, MongoDB, etc.).
