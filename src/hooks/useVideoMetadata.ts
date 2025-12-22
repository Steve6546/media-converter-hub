import { useState, useCallback } from 'react';
import { studioApi } from '@/services/studioApi';
import { VideoMetadata } from '@/lib/compressionCalculator';

export interface UseVideoMetadataResult {
    metadata: VideoMetadata | null;
    isLoading: boolean;
    error: string | null;
    probeVideo: (file: File) => Promise<VideoMetadata | null>;
    reset: () => void;
}

/**
 * Hook for probing video files to extract metadata
 * Used for real-time compression size estimation
 */
export function useVideoMetadata(): UseVideoMetadataResult {
    const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const probeVideo = useCallback(async (file: File): Promise<VideoMetadata | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await studioApi.probeVideo(file);
            setMetadata(result);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to analyze video';
            setError(message);
            setMetadata(null);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setMetadata(null);
        setIsLoading(false);
        setError(null);
    }, []);

    return {
        metadata,
        isLoading,
        error,
        probeVideo,
        reset,
    };
}
