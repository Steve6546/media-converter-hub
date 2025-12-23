/**
 * Media Downloader Module
 * Uses yt-dlp to analyze and download media from various platforms
 * With fallback mechanisms for platforms with broken extractors (like TikTok)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
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
        // Don't use shell: true to avoid issues with special characters in URLs
        // The & character in URLs was being interpreted as a shell command separator
        const spawnOptions = {
            windowsHide: true,
            ...options,
        };

        const ytdlp = spawn(YT_DLP_CMD, [...YT_DLP_ARGS, ...args], spawnOptions);

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
 * Gallery-dl integration for image platforms
 */
const GALLERY_DL_CMD = process.platform === 'win32' ? 'python' : 'gallery-dl';
const GALLERY_DL_ARGS = process.platform === 'win32' ? ['-m', 'gallery_dl'] : [];

const executeGalleryDl = (args, options = {}) => {
    return new Promise((resolve, reject) => {
        const gallerydl = spawn(GALLERY_DL_CMD, [...GALLERY_DL_ARGS, ...args], {
            windowsHide: true,
            ...options,
        });

        let stdout = '';
        let stderr = '';

        gallerydl.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        gallerydl.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        gallerydl.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr || `gallery-dl exited with code ${code}`));
            }
        });

        gallerydl.on('error', (err) => {
            reject(new Error(`Failed to start gallery-dl: ${err.message}. Make sure gallery-dl is installed.`));
        });
    });
};

const checkGalleryDlInstalled = async () => {
    try {
        const version = await executeGalleryDl(['--version']);
        return { installed: true, version: version.trim() };
    } catch (error) {
        return { installed: false, error: error.message };
    }
};

/**
 * TikTok Fallback Scraper
 * When yt-dlp's TikTok extractor is broken, we try to fetch video info directly
 */
const fetchTikTokFallback = async (url) => {
    return new Promise((resolve, reject) => {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.tiktok.com/',
        };

        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: headers,
        };

        const req = protocol.request(options, (res) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchTikTokFallback(res.headers.location).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`TikTok returned status ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    // Try to find SIGI_STATE or __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON
                    let jsonMatch = data.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
                    if (!jsonMatch) {
                        jsonMatch = data.match(/<script id="SIGI_STATE"[^>]*>([^<]+)<\/script>/);
                    }

                    if (jsonMatch) {
                        const jsonData = JSON.parse(jsonMatch[1]);
                        resolve({ success: true, data: jsonData, html: data });
                    } else {
                        // Return HTML for further processing
                        resolve({ success: false, html: data, reason: 'No JSON data found' });
                    }
                } catch (e) {
                    resolve({ success: false, html: data, reason: e.message });
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`Failed to fetch TikTok page: ${e.message}`));
        });

        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('TikTok request timeout'));
        });

        req.end();
    });
};

/**
 * Extract TikTok video ID from various URL formats
 */
const extractTikTokVideoId = (url) => {
    // Pattern 1: https://www.tiktok.com/@user/video/1234567890
    const videoPattern = url.match(/\/video\/(\d+)/);
    if (videoPattern) return { type: 'video', id: videoPattern[1] };

    // Pattern 2: https://www.tiktok.com/music/name-1234567890
    const musicPattern = url.match(/\/music\/[^-]+-(\d+)/);
    if (musicPattern) return { type: 'music', id: musicPattern[1] };

    // Pattern 3: Short URLs (vm.tiktok.com, vt.tiktok.com) - need to resolve
    return { type: 'unknown', id: null };
};

/**
 * Analyze URL with gallery-dl (for images)
 * Uses -g flag to get direct image URLs
 */
const analyzeWithGalleryDl = async (url, platform) => {
    try {
        // Use -g to get direct URLs (simpler than parsing -j JSON)
        const output = await executeGalleryDl([
            '-g', // Get URLs only
            url,
        ]);

        const imageUrls = output.trim().split('\n').filter(line => line.startsWith('http'));

        if (imageUrls.length === 0) {
            throw new Error('No images found');
        }

        // Get the first image as thumbnail
        const thumbnailUrl = imageUrls[0];

        // Extract filename from URL
        const getFilename = (imageUrl) => {
            try {
                const urlPath = new URL(imageUrl).pathname;
                return urlPath.split('/').pop() || 'image.jpg';
            } catch {
                return 'image.jpg';
            }
        };

        return {
            success: true,
            isImage: true,
            metadata: {
                title: `${platform.name} Image`,
                description: null,
                platform: platform.name,
                platformIcon: platform.icon,
                platformColor: platform.color,
                uploader: null,
                thumbnail: thumbnailUrl,
                duration: null,
                duration_string: null,
                view_count: null,
                like_count: null,
                upload_date: null,
                extractor: 'gallery-dl',
                webpage_url: url,
            },
            download_options: {
                video: [],
                audio: [],
                images: imageUrls.map((imageUrl, index) => {
                    const filename = getFilename(imageUrl);
                    const ext = filename.split('.').pop()?.split('?')[0] || 'jpg';
                    return {
                        format_id: `image_${index}`,
                        quality: 'Original',
                        url: imageUrl,
                        filename: filename,
                        ext: ext,
                        size_mb: null,
                    };
                }),
            },
        };
    } catch (error) {
        throw new Error(`Failed to analyze image URL: ${error.message}`);
    }
};


/**
 * Detect platform from URL
 */
const detectPlatform = (url) => {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
        return { name: 'YouTube', icon: 'youtube', color: '#FF0000', isImagePlatform: false };
    }
    if (urlLower.includes('tiktok.com')) {
        return { name: 'TikTok', icon: 'tiktok', color: '#000000', isImagePlatform: false };
    }
    if (urlLower.includes('instagram.com')) {
        return { name: 'Instagram', icon: 'instagram', color: '#E4405F', isImagePlatform: true };
    }
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
        return { name: 'X (Twitter)', icon: 'twitter', color: '#1DA1F2', isImagePlatform: true };
    }
    if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch')) {
        return { name: 'Facebook', icon: 'facebook', color: '#1877F2', isImagePlatform: false };
    }
    if (urlLower.includes('vimeo.com')) {
        return { name: 'Vimeo', icon: 'vimeo', color: '#1AB7EA', isImagePlatform: false };
    }
    if (urlLower.includes('twitch.tv')) {
        return { name: 'Twitch', icon: 'twitch', color: '#9146FF', isImagePlatform: false };
    }
    if (urlLower.includes('reddit.com')) {
        return { name: 'Reddit', icon: 'reddit', color: '#FF4500', isImagePlatform: true };
    }
    if (urlLower.includes('dailymotion.com')) {
        return { name: 'Dailymotion', icon: 'video', color: '#0066DC', isImagePlatform: false };
    }
    if (urlLower.includes('pinterest.com') || urlLower.includes('pin.it')) {
        return { name: 'Pinterest', icon: 'image', color: '#E60023', isImagePlatform: true };
    }
    if (urlLower.includes('imgur.com')) {
        return { name: 'Imgur', icon: 'image', color: '#1BB76E', isImagePlatform: true };
    }
    if (urlLower.includes('flickr.com')) {
        return { name: 'Flickr', icon: 'image', color: '#0063DC', isImagePlatform: true };
    }
    if (urlLower.includes('deviantart.com')) {
        return { name: 'DeviantArt', icon: 'image', color: '#05CC47', isImagePlatform: true };
    }

    return { name: 'Unknown', icon: 'link', color: '#6B7280', isImagePlatform: false };
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
 * Get TikTok-specific extraction arguments
 * Uses browser impersonation when available (requires curl_cffi)
 */
const getTikTokArgs = () => {
    return [
        // Try browser impersonation (requires curl_cffi)
        '--impersonate', 'chrome',
        // Fallback user agent if impersonation not available
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Add referer header
        '--referer', 'https://www.tiktok.com/',
        // Add custom headers to look more like a real browser
        '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        '--add-header', 'Accept-Language:en-US,en;q=0.9',
        '--add-header', 'sec-ch-ua:"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        '--add-header', 'sec-ch-ua-mobile:?0',
        '--add-header', 'sec-ch-ua-platform:"Windows"',
        '--add-header', 'sec-fetch-dest:document',
        '--add-header', 'sec-fetch-mode:navigate',
        '--add-header', 'sec-fetch-site:none',
        '--add-header', 'sec-fetch-user:?1',
        '--add-header', 'upgrade-insecure-requests:1',
    ];
};

/**
 * Analyze URL and extract media information
 */
const analyzeUrl = async (url) => {
    if (!validateUrl(url)) {
        throw new Error('Invalid URL format');
    }

    const platform = detectPlatform(url);
    const isTikTok = platform.name === 'TikTok';

    // Build base arguments
    const baseArgs = [
        '-j', // Output JSON
        '--no-playlist', // Single video only
        '--no-warnings',
    ];

    // Add platform-specific arguments
    if (isTikTok) {
        baseArgs.push(...getTikTokArgs());
    }

    // Multiple extraction strategies - try each until one succeeds
    const strategies = [
        // Strategy 1: Enhanced headers with TikTok API extraction
        [...baseArgs, url],
        // Strategy 2: Simpler approach with just user-agent (no extractor args that might fail)
        ...(isTikTok ? [[
            '-j',
            '--no-playlist',
            '--no-warnings',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--referer', 'https://www.tiktok.com/',
            url,
        ]] : []),
        // Strategy 3: Try with browser cookies if available (Chrome)
        ...(isTikTok ? [[
            '-j',
            '--no-playlist',
            '--no-warnings',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--cookies-from-browser', 'chrome',
            url,
        ]] : []),
        // Strategy 4: Minimal args - let yt-dlp figure it out
        ...(isTikTok ? [[
            '-j',
            '--no-playlist',
            url,
        ]] : []),
    ];

    let lastError = null;

    for (let i = 0; i < strategies.length; i++) {
        const args = strategies[i];
        if (!args || args.length === 0) continue;

        try {
            console.log(`🔍 [analyzeUrl] Strategy ${i + 1}/${strategies.length} for ${platform.name}...`);
            const output = await executeYtDlp(args);

            const info = JSON.parse(output);

            const formats = parseFormats(info.formats);

            return {
                success: true,
                isImage: false,
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
        } catch (strategyError) {
            console.log(`⚠️ [analyzeUrl] Strategy ${i + 1} failed: ${strategyError.message}`);
            lastError = strategyError;
            // Continue to next strategy
        }
    }

    // All strategies failed
    const errorMsg = lastError?.message?.toLowerCase() || '';

    // If TikTok extractor is marked as broken, try our fallback scraper
    if (isTikTok && (errorMsg.includes('marked as broken') || errorMsg.includes('no working app info'))) {
        console.log(`🔄 [analyzeUrl] TikTok yt-dlp extractor is broken, trying fallback scraper...`);

        // Check URL type
        const urlInfo = extractTikTokVideoId(url);

        if (urlInfo.type === 'music') {
            throw new Error('❌ روابط الموسيقى/الأصوات غير مدعومة حالياً. يرجى استخدام رابط فيديو TikTok مباشر.\n\n' +
                'Music/Sound URLs are not supported. Please use a direct TikTok video URL instead.\n' +
                'Example: https://www.tiktok.com/@username/video/1234567890');
        }

        try {
            const fallbackResult = await fetchTikTokFallback(url);

            if (fallbackResult.success && fallbackResult.data) {
                // Try to extract video info from the JSON data
                const data = fallbackResult.data;
                let videoInfo = null;

                // Navigate TikTok's complex JSON structure
                if (data.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct) {
                    videoInfo = data.__DEFAULT_SCOPE__['webapp.video-detail'].itemInfo.itemStruct;
                } else if (data.ItemModule) {
                    const videoId = Object.keys(data.ItemModule)[0];
                    videoInfo = data.ItemModule[videoId];
                }

                if (videoInfo) {
                    const video = videoInfo.video || {};
                    const author = videoInfo.author || {};

                    return {
                        success: true,
                        isImage: false,
                        metadata: {
                            title: videoInfo.desc || 'TikTok Video',
                            description: videoInfo.desc || null,
                            platform: platform.name,
                            platformIcon: platform.icon,
                            platformColor: platform.color,
                            uploader: author.uniqueId || author.nickname || null,
                            uploader_url: author.uniqueId ? `https://www.tiktok.com/@${author.uniqueId}` : null,
                            thumbnail: video.cover || video.dynamicCover || null,
                            duration: video.duration || null,
                            duration_string: video.duration ? formatDuration(video.duration) : null,
                            view_count: videoInfo.stats?.playCount || null,
                            like_count: videoInfo.stats?.diggCount || null,
                            upload_date: videoInfo.createTime ? new Date(videoInfo.createTime * 1000).toISOString().split('T')[0].replace(/-/g, '') : null,
                            extractor: 'tiktok-fallback',
                            webpage_url: url,
                        },
                        download_options: {
                            video: [{
                                format_id: 'tiktok-fallback',
                                quality: video.height ? `${video.height}p` : 'Original',
                                resolution: video.width && video.height ? `${video.width}x${video.height}` : null,
                                fps: 30,
                                size_mb: null,
                                ext: 'mp4',
                                has_audio: true,
                                downloadUrl: video.playAddr || video.downloadAddr || null,
                            }],
                            audio: [],
                        },
                    };
                }
            }

            // Fallback didn't work, throw helpful error
            throw new Error('⚠️ دعم TikTok معطل مؤقتاً في yt-dlp.\n\n' +
                'TikTok support is temporarily broken in yt-dlp.\n' +
                'Please try updating yt-dlp: python -m pip install --upgrade yt-dlp\n' +
                'Or wait for a fix from the yt-dlp team.');

        } catch (fallbackError) {
            if (fallbackError.message.includes('روابط الموسيقى') || fallbackError.message.includes('معطل مؤقتاً')) {
                throw fallbackError;
            }
            console.log(`❌ [analyzeUrl] TikTok fallback failed: ${fallbackError.message}`);
        }
    }

    // If yt-dlp says "no video formats", try gallery-dl for images
    if (errorMsg.includes('no video formats') || platform.isImagePlatform) {
        try {
            console.log(`📷 [analyzeUrl] Trying gallery-dl for image platform: ${platform.name}`);
            return await analyzeWithGalleryDl(url, platform);
        } catch (galleryError) {
            // If gallery-dl also fails, throw the original or gallery error
            throw new Error(`No video or image found. ${galleryError.message}`);
        }
    }

    // Parse yt-dlp error messages for better UX
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
    if (errorMsg.includes('unable to extract')) {
        throw new Error('Unable to extract video data. The website may have changed. Please try updating yt-dlp.');
    }
    // TikTok IP blocking detection
    if (errorMsg.includes('ip address is blocked') || errorMsg.includes('blocked from accessing')) {
        throw new Error('🚫 عنوان IP الخاص بك محظور من قبل TikTok.\n\n' +
            'Your IP address is blocked by TikTok.\n' +
            'Solutions:\n' +
            '• Use a VPN to change your IP address\n' +
            '• Try again later from a different network\n' +
            '• The video may be region-restricted');
    }
    if (errorMsg.includes('marked as broken') || errorMsg.includes('no working app info')) {
        throw new Error('⚠️ دعم هذا الموقع معطل مؤقتاً. يرجى المحاولة لاحقاً أو تحديث yt-dlp.\n\n' +
            'This site\'s support is temporarily broken. Try: python -m pip install -U --pre yt-dlp');
    }

    throw new Error(`Failed to analyze URL: ${lastError?.message || 'Unknown error'}`);
};

/**
 * Format duration in seconds to string
 */
const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    // Detect platform for specific arguments
    const platform = detectPlatform(url);
    const isTikTok = platform.name === 'TikTok';

    const args = [
        '--newline', // Progress on new lines
        '-o', outputTemplate,
        '--no-playlist',
        '--no-warnings',
    ];

    // Add TikTok-specific arguments for downloads too
    if (isTikTok) {
        args.push(...getTikTokArgs());
    }

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

    const process = spawn(YT_DLP_CMD, [...YT_DLP_ARGS, ...args], { windowsHide: true });

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

/**
 * Download image using gallery-dl
 */
const downloadImage = (url, options = {}) => {
    const {
        outputDir = MEDIA_OUTPUT_DIR,
    } = options;

    const downloadId = uuidv4();
    const outputTemplate = path.join(outputDir, `${downloadId}.{extension}`);

    const args = [
        '-d', outputDir,
        '--filename', `${downloadId}.{extension}`,
        url,
    ];

    const process = spawn(GALLERY_DL_CMD, [...GALLERY_DL_ARGS, ...args], { windowsHide: true });

    return {
        downloadId,
        process,
        outputDir,
        outputTemplate,
    };
};

module.exports = {
    checkYtDlpInstalled,
    checkGalleryDlInstalled,
    validateUrl,
    detectPlatform,
    analyzeUrl,
    analyzeWithGalleryDl,
    downloadMedia,
    downloadImage,
    parseProgress,
    MEDIA_OUTPUT_DIR,
};
