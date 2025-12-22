import { useState, useEffect, useCallback } from 'react';

export interface AudioInsights {
    hasSilenceAtStart: boolean;   // Silence >0.5s at beginning
    hasSilenceAtEnd: boolean;     // Silence >0.5s at end
    isLowVolume: boolean;         // Peak < 0.3
    isVeryShort: boolean;         // Duration < 10s
    isVeryLong: boolean;          // Duration > 30min
    peakLevel: number;            // 0-1 scale
    isAnalyzing: boolean;
    isAnalyzed: boolean;
}

const SILENCE_THRESHOLD = 0.02;
const LOW_VOLUME_THRESHOLD = 0.3;
const VERY_SHORT_SECONDS = 10;
const VERY_LONG_SECONDS = 30 * 60; // 30 minutes

/**
 * Analyzes audio buffer for silence regions
 */
function detectSilence(
    audioBuffer: AudioBuffer,
    threshold = SILENCE_THRESHOLD
): { silenceAtStart: number; silenceAtEnd: number } {
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
    const data = audioBuffer.getChannelData(0);

    // Detect silence at start
    let silenceAtStart = 0;
    for (let i = 0; i < data.length; i += windowSize) {
        let sum = 0;
        const end = Math.min(i + windowSize, data.length);
        for (let j = i; j < end; j++) {
            sum += Math.abs(data[j]);
        }
        const avg = sum / (end - i);
        if (avg < threshold) {
            silenceAtStart = end / sampleRate;
        } else {
            break;
        }
    }

    // Detect silence at end
    let silenceAtEnd = 0;
    for (let i = data.length - 1; i >= 0; i -= windowSize) {
        let sum = 0;
        const start = Math.max(i - windowSize, 0);
        for (let j = start; j <= i; j++) {
            sum += Math.abs(data[j]);
        }
        const avg = sum / (i - start + 1);
        if (avg < threshold) {
            silenceAtEnd = (data.length - start) / sampleRate;
        } else {
            break;
        }
    }

    return { silenceAtStart, silenceAtEnd };
}

/**
 * Finds the peak level in the audio buffer
 */
function detectPeakLevel(audioBuffer: AudioBuffer): number {
    let maxPeak = 0;
    const step = Math.max(1, Math.floor(audioBuffer.length / 50000));

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const data = audioBuffer.getChannelData(channel);
        for (let i = 0; i < data.length; i += step) {
            const value = Math.abs(data[i]);
            if (value > maxPeak) maxPeak = value;
        }
    }

    return maxPeak;
}

/**
 * Hook for analyzing audio and providing smart insights
 */
export function useAudioAnalysis(
    audioUrl: string | null,
    duration: number,
    trimStart = 0,
    trimEnd?: number
): AudioInsights {
    const effectiveTrimEnd = trimEnd ?? duration;

    const [insights, setInsights] = useState<AudioInsights>({
        hasSilenceAtStart: false,
        hasSilenceAtEnd: false,
        isLowVolume: false,
        isVeryShort: duration < VERY_SHORT_SECONDS,
        isVeryLong: duration > VERY_LONG_SECONDS,
        peakLevel: 0,
        isAnalyzing: false,
        isAnalyzed: false,
    });

    const analyze = useCallback(async () => {
        if (!audioUrl) return;

        setInsights(prev => ({ ...prev, isAnalyzing: true }));

        let context: AudioContext | null = null;
        try {
            context = new AudioContext();
            const response = await fetch(audioUrl);
            const buffer = await response.arrayBuffer();
            const audioBuffer = await context.decodeAudioData(buffer);

            const { silenceAtStart, silenceAtEnd } = detectSilence(audioBuffer);
            const peakLevel = detectPeakLevel(audioBuffer);

            const effectiveDuration = effectiveTrimEnd - trimStart;

            setInsights({
                hasSilenceAtStart: silenceAtStart > 0.5 && trimStart < silenceAtStart,
                hasSilenceAtEnd: silenceAtEnd > 0.5 && effectiveTrimEnd > duration - silenceAtEnd,
                isLowVolume: peakLevel < LOW_VOLUME_THRESHOLD,
                isVeryShort: effectiveDuration < VERY_SHORT_SECONDS,
                isVeryLong: effectiveDuration > VERY_LONG_SECONDS,
                peakLevel,
                isAnalyzing: false,
                isAnalyzed: true,
            });
        } catch (error) {
            console.error('Audio analysis failed:', error);
            setInsights(prev => ({
                ...prev,
                isAnalyzing: false,
                isAnalyzed: true,
            }));
        } finally {
            if (context) {
                context.close().catch(() => { });
            }
        }
    }, [audioUrl, duration, trimStart, effectiveTrimEnd]);

    useEffect(() => {
        if (audioUrl && !insights.isAnalyzed && !insights.isAnalyzing) {
            // Debounce to avoid too many analyses
            const timer = setTimeout(analyze, 500);
            return () => clearTimeout(timer);
        }
    }, [audioUrl, analyze, insights.isAnalyzed, insights.isAnalyzing]);

    return insights;
}
