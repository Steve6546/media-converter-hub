# Smart Media Converter Backend

Node.js + Express backend with FFmpeg for video-to-MP3 conversion and audio editing.

## Requirements

- Node.js 18+
- FFmpeg installed and available in PATH

### Installing FFmpeg

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

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |

## File Storage

- `uploads/` - Temporary video uploads (deleted after conversion)
- `output/` - Converted MP3 files
- `covers/` - Cover images

For production, replace the in-memory store with a proper database (PostgreSQL, MongoDB, etc.).
