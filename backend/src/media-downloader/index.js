/**
 * Media Downloader Module
 * Uses yt-dlp to analyze and download media from various platforms
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Directory for media downloads
const MEDIA_OUTPUT_DIR = path.join(__dirname, '../../media-downloads');

// Ensure output directory exists
if (!fs.existsSync(MEDIA_OUTPUT_DIR)) {
    fs.mkdirSync(MEDIA_OUTPUT_DIR, { recursive: true });
}

/**
 * Execute yt-dlp command and return output
 */
// Use python -m yt_dlp for better Windows compatibility
const YT_DLP_CMD = process.platform === 'win32' ? 'python' : 'yt-dlp';
const YT_DLP_ARGS = process.platform === 'win32' ? ['-m', 'yt_dlp'] : [];

const executeYtDlp = (args, options = {}) => {
    return new Promise((resolve, reject) => {
        const ytdlp = spawn(YT_DLP_CMD, [...YT_DLP_ARGS, ...args], {
            shell: true,
            ...options,
        });

        let stdout = '';
        let stderr = '';

        ytdlp.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ytdlp.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ytdlp.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr || `yt-dlp exited with code ${code}`));
            }
        });

        ytdlp.on('error', (err) => {
            reject(new Error(`Failed to start yt-dlp: ${err.message}. Make sure yt-dlp is installed.`));
        });
    });
};

/**
 * Check if yt-dlp is installed
 */
const checkYtDlpInstalled = async () => {
    try {
        const version = await executeYtDlp(['--version']);
        return { installed: true, version: version.trim() };
    } catch (error) {
        return { installed: false, error: error.message };
    }
};

/**
 * Detect platform from URL
 */
const detectPlatform = (url) => {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
        return { name: 'YouTube', icon: 'youtube', color: '#FF0000' };
    }
    if (urlLower.includes('tiktok.com')) {
        return { name: 'TikTok', icon: 'tiktok', color: '#000000' };
    }
    if (urlLower.includes('instagram.com')) {
        return { name: 'Instagram', icon: 'instagram', color: '#E4405F' };
    }
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
        return { name: 'X (Twitter)', icon: 'twitter', color: '#1DA1F2' };
    }
    if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch')) {
        return { name: 'Facebook', icon: 'facebook', color: '#1877F2' };
    }
    if (urlLower.includes('vimeo.com')) {
        return { name: 'Vimeo', icon: 'vimeo', color: '#1AB7EA' };
    }
    if (urlLower.includes('twitch.tv')) {
        return { name: 'Twitch', icon: 'twitch', color: '#9146FF' };
    }
    if (urlLower.includes('reddit.com')) {
        return { name: 'Reddit', icon: 'reddit', color: '#FF4500' };
    }
    if (urlLower.includes('dailymotion.com')) {
        return { name: 'Dailymotion', icon: 'video', color: '#0066DC' };
    }

    return { name: 'Unknown', icon: 'link', color: '#6B7280' };
};

/**
 * Validate URL format
 */
const validateUrl = (url) => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
};

/**
 * Format file size from bytes to human-readable
 */
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return null;
    const mb = bytes / (1024 * 1024);
    return Math.round(mb * 10) / 10;
};

/**
 * Parse format information from yt-dlp
 */
const parseFormats = (formats) => {
    if (!formats || !Array.isArray(formats)) return [];

    const videoFormats = [];
    const audioFormats = [];

    for (const format of formats) {
        // Skip formats without proper identifiers
        if (!format.format_id) continue;

        const isVideoOnly = format.vcodec !== 'none' && format.acodec === 'none';
        const isAudioOnly = format.acodec !== 'none' && format.vcodec === 'none';
        const hasVideo = format.vcodec && format.vcodec !== 'none';
        const hasAudio = format.acodec && format.acodec !== 'none';

        if (hasVideo) {
            const height = format.height || 0;
            const width = format.width || 0;
            const fps = format.fps || 30;
            const filesize = format.filesize || format.filesize_approx || 0;

            // Determine quality label
            let quality = 'Unknown';
            if (height >= 2160) quality = '4K';
            else if (height >= 1440) quality = '1440p';
            else if (height >= 1080) quality = '1080p';
            else if (height >= 720) quality = '720p';
            else if (height >= 480) quality = '480p';
            else if (height >= 360) quality = '360p';
            else if (height > 0) quality = `${height}p`;

            videoFormats.push({
                format_id: format.format_id,
                quality,
                resolution: width && height ? `${width}x${height}` : null,
                fps: Math.round(fps),
                size_mb: formatFileSize(filesize),
                ext: format.ext || 'mp4',
                vcodec: format.vcodec,
                acodec: format.acodec,
                has_audio: hasAudio,
                is_video_only: isVideoOnly,
                tbr: format.tbr, // Total bitrate
            });
        }

        if (isAudioOnly) {
            const filesize = format.filesize || format.filesize_approx || 0;
            const abr = format.abr || format.tbr || 0;

            audioFormats.push({
                format_id: format.format_id,
                quality: abr ? `${Math.round(abr)}kbps` : 'Unknown',
                size_mb: formatFileSize(filesize),
                ext: format.ext || 'mp3',
                acodec: format.acodec,
                abr: Math.round(abr),
            });
        }
    }

    // Sort video formats by resolution (highest first)
    videoFormats.sort((a, b) => {
        const resA = parseInt(a.quality) || 0;
        const resB = parseInt(b.quality) || 0;
        return resB - resA;
    });

    // Deduplicate video formats by quality, keeping best (with audio preferred)
    const seenQualities = new Set();
    const uniqueVideoFormats = [];

    for (const format of videoFormats) {
        const key = `${format.quality}-${format.fps}`;
        if (!seenQualities.has(key)) {
            seenQualities.add(key);
            uniqueVideoFormats.push(format);
        }
    }

    // Sort audio formats by bitrate (highest first)
    audioFormats.sort((a, b) => (b.abr || 0) - (a.abr || 0));

    return {
        video: uniqueVideoFormats.slice(0, 10), // Limit to top 10 video options
        audio: audioFormats.slice(0, 5), // Limit to top 5 audio options
    };
};

/**
 * Analyze URL and extract media information
 */
const analyzeUrl = async (url) => {
    if (!validateUrl(url)) {
        throw new Error('Invalid URL format');
    }

    const platform = detectPlatform(url);

    try {
        // Use yt-dlp to extract info without downloading
        const output = await executeYtDlp([
            '-j', // Output JSON
            '--no-playlist', // Single video only
            '--no-warnings',
            url,
        ]);

        const info = JSON.parse(output);

        const formats = parseFormats(info.formats);

        return {
            success: true,
            metadata: {
                title: info.title || 'Unknown Title',
                description: info.description ? info.description.substring(0, 500) : null,
                platform: platform.name,
                platformIcon: platform.icon,
                platformColor: platform.color,
                uploader: info.uploader || info.channel || null,
                uploader_url: info.uploader_url || info.channel_url || null,
                thumbnail: info.thumbnail || null,
                duration: info.duration || null,
                duration_string: info.duration_string || null,
                view_count: info.view_count || null,
                like_count: info.like_count || null,
                upload_date: info.upload_date || null,
                extractor: info.extractor || null,
                webpage_url: info.webpage_url || url,
            },
            download_options: formats,
        };
    } catch (error) {
        // Parse yt-dlp error messages for better UX
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes('private video') || errorMsg.includes('sign in')) {
            throw new Error('This video is private or requires sign-in');
        }
        if (errorMsg.includes('video unavailable') || errorMsg.includes('not available')) {
            throw new Error('This video is not available');
        }
        if (errorMsg.includes('unsupported url')) {
            throw new Error('This URL is not supported');
        }
        if (errorMsg.includes('failed to start yt-dlp')) {
            throw new Error('yt-dlp is not installed. Please install it to use this feature.');
        }

        throw new Error(`Failed to analyze URL: ${error.message}`);
    }
};

/**
 * Download media with progress tracking
 * Returns a child process that emits progress events
 */
const downloadMedia = (url, formatId, options = {}) => {
    const {
        audioOnly = false,
        outputDir = MEDIA_OUTPUT_DIR,
        filename = null,
    } = options;

    const downloadId = uuidv4();
    const outputTemplate = filename
        ? path.join(outputDir, filename)
        : path.join(outputDir, `${downloadId}.%(ext)s`);

    const args = [
        '--newline', // Progress on new lines
        '-o', outputTemplate,
        '--no-playlist',
        '--no-warnings',
    ];

    if (audioOnly) {
        args.push('-x'); // Extract audio
        args.push('--audio-format', 'mp3');
        args.push('--audio-quality', '0'); // Best quality
    } else if (formatId) {
        // Try to get format with audio, fallback to merging best audio
        args.push('-f', `${formatId}+bestaudio/best[height<=1080]/best`);
    } else {
        args.push('-f', 'best[height<=1080]/best');
    }

    args.push(url);

    const process = spawn(YT_DLP_CMD, [...YT_DLP_ARGS, ...args], { shell: true });

    return {
        downloadId,
        process,
        outputDir,
        outputTemplate,
    };
};

/**
 * Parse download progress from yt-dlp output
 */
const parseProgress = (line) => {
    // Match progress line: [download]  45.2% of 50.25MiB at 1.20MiB/s ETA 00:25
    const progressMatch = line.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+~?(\d+\.?\d*)(K|M|G)?iB\s+at\s+([\d.]+)(K|M|G)?iB\/s\s+ETA\s+(\d+:\d+)/i);

    if (progressMatch) {
        const [, percent, size, sizeUnit, speed, speedUnit, eta] = progressMatch;
        return {
            type: 'progress',
            percent: parseFloat(percent),
            size: parseFloat(size),
            sizeUnit: sizeUnit || 'M',
            speed: parseFloat(speed),
            speedUnit: speedUnit || 'M',
            eta,
        };
    }

    // Match destination line: [download] Destination: filename.mp4
    const destMatch = line.match(/\[download\]\s+Destination:\s+(.+)/);
    if (destMatch) {
        return {
            type: 'destination',
            path: destMatch[1].trim(),
        };
    }

    // Match merge line: [Merger] Merging formats into "filename.mp4"
    const mergeMatch = line.match(/\[Merger\]\s+Merging formats into "(.+)"/);
    if (mergeMatch) {
        return {
            type: 'merging',
            path: mergeMatch[1],
        };
    }

    // Match completion: [download] 100% of ...
    if (line.includes('[download] 100%') || line.includes('has already been downloaded')) {
        return { type: 'complete' };
    }

    return null;
};

module.exports = {
    checkYtDlpInstalled,
    validateUrl,
    detectPlatform,
    analyzeUrl,
    downloadMedia,
    parseProgress,
    MEDIA_OUTPUT_DIR,
};
