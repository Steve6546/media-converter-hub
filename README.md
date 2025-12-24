# 🎬 Smart Media Converter

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)

**Download, convert, and process media from 100+ platforms**

[Features](#-features) • [Quick Start](#-quick-start) • [Commands](#-commands) • [Security](#-security) • [Contributing](#-contributing)

</div>

---

## ✨ Features

- 📥 **Media Downloader** - Download videos from YouTube, TikTok, Instagram, Twitter, and 100+ platforms
- 🎵 **Video to MP3** - Convert videos to high-quality MP3 audio
- 🎬 **Video Studio** - Compress, enhance, and edit videos
- 🖼️ **Image Tools** - Resize, convert, and optimize images
- 🌐 **Public Access** - Share via Cloudflare Tunnel (no port forwarding needed)
- 🔒 **Secure** - Rate limiting, input validation, and security headers

---

## 📋 Requirements

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | ≥ 18.0.0 | Runtime |
| **npm** | ≥ 8.0.0 | Package manager |
| **Python** | ≥ 3.8 | For yt-dlp |
| **yt-dlp** | Latest | Media downloading |
| **FFmpeg** | Latest | Media processing |
| **Cloudflared** | Latest | Public tunnels (optional) |
| **Redis** | Latest | Job queue (optional) |

### Windows Installation

```powershell
# Install yt-dlp
pip install -U yt-dlp

# Install Cloudflared (optional, for public access)
winget install Cloudflare.cloudflared

# Install Redis (optional, for video studio)
# Download from: https://github.com/microsoftarchive/redis/releases
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/smart-media-converter.git
cd smart-media-converter

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Start the Application

```powershell
# Local development (recommended for first run)
npm run start:local

# OR: Public access (with Cloudflare tunnels)
npm run start:public
```

### 3. Open in Browser

- **Local**: http://localhost:8080
- **Public**: Check terminal for Cloudflare URL

---

## 🎮 Commands

| Command | Description |
|---------|-------------|
| `npm run start:local` | Start Backend + Frontend locally |
| `npm run start:public` | Start with Cloudflare tunnels for public access |
| `npm run dev` | Frontend development server only |
| `npm run build` | Build for production |
| `npm run stop` | Stop all running services |
| `npm run health` | Check health of all services |
| `npm run update` | Update all dependencies |
| `npm run security:audit` | Run security audit |

### Command Details

#### 🏠 Local Mode (`npm run start:local`)
- Starts Backend on port 3001
- Starts Frontend on port 8080
- No internet exposure
- Best for development

#### 🌐 Public Mode (`npm run start:public`)
- Starts Backend + Frontend
- Creates Cloudflare tunnels automatically
- Generates public URLs
- Works from any device (mobile, tablet, etc.)
- Auto-configures API endpoints

---

## 📁 Project Structure

```
smart-media-converter/
├── 📂 src/                    # Frontend source
│   ├── components/            # React components
│   ├── lib/                   # Utilities & config
│   ├── services/              # API services
│   └── hooks/                 # React hooks
├── 📂 backend/                # Backend source
│   ├── src/
│   │   ├── server.js          # Express server
│   │   ├── media-downloader/  # yt-dlp integration
│   │   └── studio/            # Video processing
│   ├── uploads/               # Temporary uploads
│   └── output/                # Processed files
├── 📂 public/                 # Static assets
│   └── api-config.js          # Runtime API config
├── 📂 scripts/                # Startup scripts
│   ├── start-local.ps1        # Local startup
│   ├── start-public.ps1       # Public startup
│   ├── stop.ps1               # Stop services
│   └── health.ps1             # Health check
├── 📄 package.json            # Frontend dependencies
├── 📄 vite.config.ts          # Vite configuration
└── 📄 README.md               # This file
```

---

## ⚙️ Environment Variables

### Frontend (.env)

```env
# Optional: Override API URL
VITE_API_URL=http://localhost:3001
```

### Backend (backend/.env)

```env
# Server
PORT=3001

# Redis (optional, for video studio queue)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# FFmpeg paths (auto-detected if not set)
FFMPEG_PATH=
FFPROBE_PATH=
```

---

## 🔒 Security

This project implements multiple security layers:

### Backend Security
- ✅ **Helmet** - Security headers (XSS, clickjacking protection)
- ✅ **Rate Limiting** - Prevents abuse (100 requests/15min)
- ✅ **Input Validation** - Validates all user inputs
- ✅ **File Validation** - Checks file types and sizes
- ✅ **CORS** - Configured for allowed origins only

### Frontend Security
- ✅ **No Secrets** - No sensitive data in client code
- ✅ **XSS Protection** - React's built-in escaping
- ✅ **CSP Ready** - Content Security Policy compatible

### Running Security Audit

```powershell
npm run security:audit
```

For more details, see [SECURITY.md](SECURITY.md).

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Media downloading
- [FFmpeg](https://ffmpeg.org/) - Media processing
- [Cloudflare](https://www.cloudflare.com/) - Tunnel service
- [Shadcn/ui](https://ui.shadcn.com/) - UI components

---

<div align="center">

**Made with ❤️ for the open-source community**

[⬆ Back to top](#-smart-media-converter)

</div>
