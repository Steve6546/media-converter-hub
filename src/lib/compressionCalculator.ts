/**
 * Video compression size estimation utilities
 * Calculates realistic output file sizes based on actual bitrate formulas
 */

export interface VideoMetadata {
    duration: number;
    fileSize: number;
    totalBitrate: number;
    video: {
        width: number;
        height: number;
        fps: number;
        codec: string;
        bitrate: number;
        profile: string | null;
        pixelFormat: string | null;
    };
    audio: {
        codec: string;
        bitrate: number;
        channels: number;
        sampleRate: number;
    };
}

export interface CompressionSettings {
    targetHeight: number;      // 480, 720, 1080, 1440, 2160
    fps: number;               // 24, 30, 60
    codec: 'h264' | 'h265' | 'av1';
    audioBitrate: number;      // kbps: 64, 96, 128, 192
}

export interface SizeEstimate {
    estimatedBytes: number;
    estimatedMB: number;
    videoBitrate: number;      // kbps
    audioBitrate: number;      // kbps
    totalBitrate: number;      // kbps
    compressionRatio: number;  // 0-1, how much smaller
    qualityImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
    warnings: string[];
}

// Standard resolutions with their target heights
export const RESOLUTIONS = [
    { label: '480p', height: 480, width: 854 },
    { label: '720p', height: 720, width: 1280 },
    { label: '1080p', height: 1080, width: 1920 },
    { label: '1440p', height: 1440, width: 2560 },
    { label: '4K', height: 2160, width: 3840 },
] as const;

export const FPS_OPTIONS = [24, 30, 60] as const;

export const CODEC_OPTIONS = [
    { value: 'h264', label: 'H.264', description: 'Fast encoding, wide compatibility', efficiency: 1.0 },
    { value: 'h265', label: 'H.265 (HEVC)', description: '~40% smaller files', efficiency: 0.6 },
    { value: 'av1', label: 'AV1', description: '~50% smaller, slow encoding', efficiency: 0.5 },
] as const;

export const AUDIO_BITRATE_OPTIONS = [
    { value: 64, label: '64 kbps', description: 'Low quality' },
    { value: 96, label: '96 kbps', description: 'Acceptable' },
    { value: 128, label: '128 kbps', description: 'Standard' },
    { value: 192, label: '192 kbps', description: 'High quality' },
] as const;

/**
 * Calculate estimated output size based on compression settings
 * Formula: (videoBitrate + audioBitrate) × duration / 8
 */
export function calculateEstimatedSize(
    metadata: VideoMetadata,
    settings: CompressionSettings
): SizeEstimate {
    const warnings: string[] = [];

    // Calculate pixel scaling ratio
    const sourcePixels = metadata.video.width * metadata.video.height;
    const targetWidth = Math.round((settings.targetHeight / metadata.video.height) * metadata.video.width);
    const targetPixels = targetWidth * settings.targetHeight;
    const pixelRatio = Math.min(targetPixels / sourcePixels, 1); // Can't upscale

    // Calculate FPS ratio
    const fpsRatio = Math.min(settings.fps / metadata.video.fps, 1);

    // Get codec efficiency multiplier
    const codecInfo = CODEC_OPTIONS.find(c => c.value === settings.codec);
    const codecEfficiency = codecInfo?.efficiency ?? 1.0;

    // Calculate target video bitrate
    // Scale source bitrate by pixel ratio, fps ratio, and codec efficiency
    let videoBitrate = metadata.video.bitrate * pixelRatio * fpsRatio * codecEfficiency;

    // Apply minimum bitrate floors based on resolution
    const minBitrateByHeight: Record<number, number> = {
        480: 800,
        720: 1500,
        1080: 3000,
        1440: 6000,
        2160: 12000,
    };
    const minBitrate = minBitrateByHeight[settings.targetHeight] || 1000;

    // Apply recommended bitrate caps
    const maxBitrateByHeight: Record<number, number> = {
        480: 2500,
        720: 5000,
        1080: 8000,
        1440: 16000,
        2160: 35000,
    };
    const maxBitrate = maxBitrateByHeight[settings.targetHeight] || 10000;

    // Clamp bitrate to reasonable range
    videoBitrate = Math.max(minBitrate * codecEfficiency, Math.min(videoBitrate, maxBitrate));

    const totalBitrate = videoBitrate + settings.audioBitrate;

    // Calculate file size: (bitrate in kbps × duration in seconds) / 8 = size in KB
    const estimatedBytes = (totalBitrate * 1000 * metadata.duration) / 8;
    const estimatedMB = estimatedBytes / (1024 * 1024);

    // Calculate compression ratio
    const compressionRatio = 1 - (estimatedBytes / metadata.fileSize);

    // Determine quality impact
    let qualityImpact: SizeEstimate['qualityImpact'] = 'minimal';
    const bitrateReduction = 1 - (videoBitrate / metadata.video.bitrate);

    if (bitrateReduction > 0.7 || pixelRatio < 0.25) {
        qualityImpact = 'severe';
    } else if (bitrateReduction > 0.5 || pixelRatio < 0.5) {
        qualityImpact = 'significant';
    } else if (bitrateReduction > 0.3 || pixelRatio < 0.75) {
        qualityImpact = 'moderate';
    }

    // Generate warnings
    if (videoBitrate < minBitrate * 0.8) {
        warnings.push('Very low bitrate - visible artifacts likely');
    }

    if (pixelRatio < 0.25) {
        warnings.push('Large resolution drop - significant quality loss');
    }

    if (settings.targetHeight < 720 && metadata.video.height >= 1080) {
        warnings.push('Consider 720p for better balance');
    }

    if (settings.audioBitrate < 96) {
        warnings.push('Low audio quality - may sound compressed');
    }

    return {
        estimatedBytes,
        estimatedMB: Math.round(estimatedMB * 10) / 10,
        videoBitrate: Math.round(videoBitrate),
        audioBitrate: settings.audioBitrate,
        totalBitrate: Math.round(totalBitrate),
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        qualityImpact,
        warnings,
    };
}

/**
 * Get available resolutions based on source video
 * Only returns resolutions <= source resolution
 */
export function getAvailableResolutions(sourceHeight: number) {
    return RESOLUTIONS.filter(r => r.height <= sourceHeight);
}

/**
 * Get available FPS options based on source video
 * Only returns FPS <= source FPS
 */
export function getAvailableFps(sourceFps: number) {
    return FPS_OPTIONS.filter(fps => fps <= Math.ceil(sourceFps));
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}
