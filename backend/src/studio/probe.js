/**
 * Video probe utility for extracting comprehensive metadata using ffprobe
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

// Set paths
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;
const ffprobePath = process.env.FFPROBE_PATH || (ffprobeStatic && ffprobeStatic.path);

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath);
}

/**
 * Probe a video file and extract comprehensive metadata
 * @param {string} filePath - Path to the video file
 * @returns {Promise<Object>} Video metadata
 */
const probeVideo = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                return reject(new Error(`Failed to probe video: ${err.message}`));
            }

            if (!metadata || !metadata.format) {
                return reject(new Error('Invalid video file or unsupported format'));
            }

            // Find video and audio streams
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

            if (!videoStream) {
                return reject(new Error('No video stream found in file'));
            }

            // Parse frame rate (can be "30/1" or "29.97" format)
            let fps = 30;
            if (videoStream.r_frame_rate) {
                const parts = videoStream.r_frame_rate.split('/');
                if (parts.length === 2) {
                    fps = parseFloat(parts[0]) / parseFloat(parts[1]);
                } else {
                    fps = parseFloat(videoStream.r_frame_rate);
                }
            } else if (videoStream.avg_frame_rate) {
                const parts = videoStream.avg_frame_rate.split('/');
                if (parts.length === 2) {
                    fps = parseFloat(parts[0]) / parseFloat(parts[1]);
                } else {
                    fps = parseFloat(videoStream.avg_frame_rate);
                }
            }

            // Calculate video bitrate (in kbps)
            let videoBitrate = 0;
            if (videoStream.bit_rate) {
                videoBitrate = Math.round(parseInt(videoStream.bit_rate, 10) / 1000);
            } else if (metadata.format.bit_rate && audioStream) {
                // Estimate video bitrate from total - audio
                const totalBitrate = parseInt(metadata.format.bit_rate, 10) / 1000;
                const audioBitrate = audioStream.bit_rate
                    ? parseInt(audioStream.bit_rate, 10) / 1000
                    : 128;
                videoBitrate = Math.max(0, Math.round(totalBitrate - audioBitrate));
            } else if (metadata.format.bit_rate) {
                videoBitrate = Math.round(parseInt(metadata.format.bit_rate, 10) / 1000 * 0.9);
            }

            // Get audio bitrate (in kbps)
            let audioBitrate = 0;
            let audioChannels = 0;
            let audioSampleRate = 0;
            let audioCodec = 'none';

            if (audioStream) {
                audioBitrate = audioStream.bit_rate
                    ? Math.round(parseInt(audioStream.bit_rate, 10) / 1000)
                    : 128; // Default estimate
                audioChannels = audioStream.channels || 2;
                audioSampleRate = audioStream.sample_rate
                    ? parseInt(audioStream.sample_rate, 10)
                    : 44100;
                audioCodec = audioStream.codec_name || 'unknown';
            }

            // Detect HDR
            const isHDR = detectHDR(videoStream);

            // Build result
            const result = {
                duration: parseFloat(metadata.format.duration) || 0,
                fileSize: parseInt(metadata.format.size, 10) || 0,
                totalBitrate: metadata.format.bit_rate
                    ? Math.round(parseInt(metadata.format.bit_rate, 10) / 1000)
                    : videoBitrate + audioBitrate,
                video: {
                    width: videoStream.width || 0,
                    height: videoStream.height || 0,
                    fps: Math.round(fps * 100) / 100,
                    codec: videoStream.codec_name || 'unknown',
                    bitrate: videoBitrate,
                    profile: videoStream.profile || null,
                    pixelFormat: videoStream.pix_fmt || null,
                },
                audio: {
                    codec: audioCodec,
                    bitrate: audioBitrate,
                    channels: audioChannels,
                    sampleRate: audioSampleRate,
                },
                hdr: isHDR,
            };

            resolve(result);
        });
    });
};

/**
 * Detect if video has HDR content
 * @param {Object} videoStream - Video stream metadata
 * @returns {Object} HDR detection result
 */
const detectHDR = (videoStream) => {
    const result = {
        detected: false,
        type: null,
        colorSpace: null,
        colorTransfer: null,
        colorPrimaries: null,
    };

    if (!videoStream) return result;

    // Check color metadata
    const colorSpace = videoStream.color_space || '';
    const colorTransfer = videoStream.color_transfer || '';
    const colorPrimaries = videoStream.color_primaries || '';
    const pixFmt = videoStream.pix_fmt || '';

    // HDR10 detection: bt2020 color primaries + smpte2084 transfer
    if (colorPrimaries.includes('bt2020') || colorSpace.includes('bt2020')) {
        result.colorPrimaries = colorPrimaries;
        result.colorSpace = colorSpace;
        result.colorTransfer = colorTransfer;

        if (colorTransfer.includes('smpte2084') || colorTransfer.includes('pq')) {
            result.detected = true;
            result.type = 'HDR10';
        } else if (colorTransfer.includes('arib-std-b67') || colorTransfer.includes('hlg')) {
            result.detected = true;
            result.type = 'HLG';
        }
    }

    // Check for 10-bit or higher pixel formats
    if (pixFmt.includes('10le') || pixFmt.includes('10be') ||
        pixFmt.includes('12le') || pixFmt.includes('12be') ||
        pixFmt.includes('p010') || pixFmt.includes('p016')) {
        if (result.detected) {
            result.bitDepth = pixFmt.includes('12') ? 12 : 10;
        }
    }

    // Check for Dolby Vision (usually indicated in side data)
    if (videoStream.side_data_list) {
        const dvMetadata = videoStream.side_data_list.find(sd =>
            sd.side_data_type && sd.side_data_type.toLowerCase().includes('dolby')
        );
        if (dvMetadata) {
            result.detected = true;
            result.type = 'Dolby Vision';
        }
    }

    return result;
};

module.exports = {
    probeVideo,
    detectHDR,
};
