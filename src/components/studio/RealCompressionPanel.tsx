import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Monitor,
    Film,
    Volume2,
    Zap,
    AlertTriangle,
    TrendingDown,
    Loader2,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVideoMetadata } from '@/hooks/useVideoMetadata';
import {
    VideoMetadata,
    CompressionSettings,
    calculateEstimatedSize,
    getAvailableResolutions,
    getAvailableFps,
    getRecommendedCrf,
    estimateSizeFromCrf,
    RESOLUTIONS,
    CODEC_OPTIONS,
    AUDIO_BITRATE_OPTIONS,
    CRF_PRESETS,
    formatFileSize,
    formatDuration,
} from '@/lib/compressionCalculator';

interface RealCompressionPanelProps {
    file: File;
    onSettingsChange: (settings: CompressionSettings & { estimatedSize: number }) => void;
    onStartCompress: () => void;
}

export const RealCompressionPanel = ({
    file,
    onSettingsChange,
    onStartCompress,
}: RealCompressionPanelProps) => {
    const { metadata, isLoading, error, probeVideo } = useVideoMetadata();

    // Compression settings state
    const [mode, setMode] = useState<'size' | 'quality'>('size');
    const [targetHeight, setTargetHeight] = useState(1080);
    const [fps, setFps] = useState<number | 'auto'>('auto');
    const [codec, setCodec] = useState<'h264' | 'h265' | 'av1'>('h264');
    const [audioBitrate, setAudioBitrate] = useState(128);
    const [crf, setCrf] = useState(23);

    // Probe video when file changes
    useEffect(() => {
        if (file) {
            probeVideo(file);
        }
    }, [file, probeVideo]);

    // Update settings when metadata is available
    useEffect(() => {
        if (metadata) {
            // Set to source resolution or closest available
            const availableRes = getAvailableResolutions(metadata.video.height);
            if (availableRes.length > 0) {
                const closest = availableRes.reduce((prev, curr) =>
                    Math.abs(curr.height - metadata.video.height) < Math.abs(prev.height - metadata.video.height) ? curr : prev
                );
                setTargetHeight(closest.height);
            }

            // Default to Auto FPS
            setFps('auto');
        }
    }, [metadata]);

    // Calculate size estimate
    const sizeEstimate = useMemo(() => {
        if (!metadata) return null;
        return calculateEstimatedSize(metadata, {
            targetHeight,
            fps,
            codec,
            audioBitrate,
            mode,
            crf: mode === 'quality' ? crf : undefined,
        });
    }, [metadata, targetHeight, fps, codec, audioBitrate, mode, crf]);

    // Notify parent of settings changes
    useEffect(() => {
        if (sizeEstimate) {
            onSettingsChange({
                targetHeight,
                fps,
                codec,
                audioBitrate,
                mode,
                crf: mode === 'quality' ? crf : undefined,
                estimatedSize: sizeEstimate.estimatedBytes,
            });
        }
    }, [sizeEstimate, targetHeight, fps, codec, audioBitrate, mode, crf, onSettingsChange]);

    const availableResolutions = metadata ? getAvailableResolutions(metadata.video.height) : RESOLUTIONS;
    const availableFpsOptions = metadata ? getAvailableFps(metadata.video.fps) : [24, 30, 60];

    const resolutionIndex = availableResolutions.findIndex(r => r.height === targetHeight);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm">Analyzing video...</p>
                        <p className="text-xs">Extracting resolution, bitrate, and duration</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-destructive/50">
                <CardContent className="py-8">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                        <p className="text-sm font-medium">Failed to analyze video</p>
                        <p className="text-xs text-muted-foreground">{error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!metadata) {
        return null;
    }

    return (
        <div className="space-y-4">
            {/* Source Info Panel */}
            <Card className="bg-muted/30">
                <CardContent className="py-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Resolution</p>
                            <p className="font-medium">{metadata.video.width} × {metadata.video.height}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="font-medium">{formatDuration(metadata.duration)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Original Size</p>
                            <p className="font-medium">{formatFileSize(metadata.fileSize)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Bitrate</p>
                            <p className="font-medium">{Math.round(metadata.video.bitrate).toLocaleString()} kbps</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Frame Rate</p>
                            <div className="flex items-center gap-1">
                                <p className="font-medium">{metadata.video.fps.toFixed(1)} fps</p>
                                {metadata.hdr?.detected && (
                                    <Badge variant="secondary" className="text-[10px] bg-purple-500/20 text-purple-400">
                                        {metadata.hdr.type || 'HDR'}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Video: {metadata.video.codec.toUpperCase()}</span>
                        <span>•</span>
                        <span>Audio: {metadata.audio.codec.toUpperCase()}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Main Compression Controls */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Zap className="h-5 w-5" />
                        Real-Time Compression
                    </CardTitle>
                    <CardDescription>
                        Adjust settings and see estimated output size instantly
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Mode Toggle */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            Optimization Mode
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant={mode === 'size' ? 'default' : 'outline'}
                                className="w-full"
                                onClick={() => setMode('size')}
                            >
                                <TrendingDown className="mr-2 h-4 w-4" />
                                Optimize Size
                            </Button>
                            <Button
                                variant={mode === 'quality' ? 'default' : 'outline'}
                                className="w-full"
                                onClick={() => setMode('quality')}
                            >
                                ⭐ Optimize Quality
                            </Button>
                        </div>
                    </div>

                    {/* CRF Slider (Quality Mode) */}
                    {mode === 'quality' && (
                        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                            <Label className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    Quality Level (CRF)
                                </span>
                                <span className="flex items-center gap-1">
                                    {Array.from({ length: sizeEstimate?.qualityScore || 3 }).map((_, i) => (
                                        <span key={i} className="text-yellow-500">⭐</span>
                                    ))}
                                    {Array.from({ length: 5 - (sizeEstimate?.qualityScore || 3) }).map((_, i) => (
                                        <span key={i} className="text-muted-foreground/30">⭐</span>
                                    ))}
                                </span>
                            </Label>
                            <Slider
                                value={[crf]}
                                onValueChange={([v]) => setCrf(v)}
                                min={18}
                                max={32}
                                step={1}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Best Quality (18)</span>
                                <span className="font-medium">CRF: {crf}</span>
                                <span>Smallest Size (32)</span>
                            </div>
                            <div className="rounded-md bg-muted/50 p-2 text-center text-sm">
                                {CRF_PRESETS.find(p => p.value === crf)?.label || 'Custom'}: {CRF_PRESETS.find(p => p.value === crf)?.description || `CRF ${crf}`}
                            </div>
                        </div>
                    )}

                    {/* Resolution Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                                <Monitor className="h-4 w-4" />
                                Resolution
                            </Label>
                            <Badge variant="secondary">
                                {availableResolutions[resolutionIndex]?.label || '1080p'}
                            </Badge>
                        </div>
                        <Slider
                            value={[resolutionIndex >= 0 ? resolutionIndex : 0]}
                            onValueChange={(v) => {
                                const res = availableResolutions[v[0]];
                                if (res) setTargetHeight(res.height);
                            }}
                            max={availableResolutions.length - 1}
                            step={1}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            {availableResolutions.map((r) => (
                                <span key={r.height} className={cn(
                                    r.height === targetHeight && 'text-foreground font-medium'
                                )}>
                                    {r.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* FPS Selection */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Film className="h-4 w-4" />
                            Frame Rate
                        </Label>
                        <RadioGroup
                            value={fps.toString()}
                            onValueChange={(v) => setFps(v === 'auto' ? 'auto' : Number(v))}
                            className="grid grid-cols-4 gap-2"
                        >
                            {availableFpsOptions.map((f) => (
                                <div key={f} className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50">
                                    <RadioGroupItem value={f.toString()} id={`fps-${f}`} />
                                    <Label htmlFor={`fps-${f}`} className="flex-1 cursor-pointer">
                                        {f === 'auto' ? (
                                            <span className="flex items-center gap-1">
                                                Auto
                                                <span className="text-xs text-muted-foreground">({metadata?.video.fps.toFixed(0)})</span>
                                            </span>
                                        ) : (
                                            `${f} fps`
                                        )}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Codec Selection */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Codec
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            {CODEC_OPTIONS.map((c) => (
                                <button
                                    key={c.value}
                                    onClick={() => setCodec(c.value as typeof codec)}
                                    className={cn(
                                        'rounded-lg border p-3 text-left transition-colors',
                                        codec === c.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/40'
                                    )}
                                >
                                    <p className="text-sm font-medium">{c.label}</p>
                                    <p className="text-xs text-muted-foreground">{c.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Audio Bitrate */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Volume2 className="h-4 w-4" />
                            Audio Quality
                        </Label>
                        <RadioGroup
                            value={audioBitrate.toString()}
                            onValueChange={(v) => setAudioBitrate(Number(v))}
                            className="grid grid-cols-4 gap-2"
                        >
                            {AUDIO_BITRATE_OPTIONS.map((a) => (
                                <div key={a.value} className="flex items-center space-x-2 rounded-lg border p-2 hover:bg-muted/50">
                                    <RadioGroupItem value={a.value.toString()} id={`audio-${a.value}`} />
                                    <Label htmlFor={`audio-${a.value}`} className="cursor-pointer text-xs">
                                        {a.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                </CardContent>
            </Card>

            {/* Estimated Output Panel */}
            {sizeEstimate && (
                <Card className={cn(
                    'transition-colors',
                    sizeEstimate.qualityImpact === 'severe' && 'border-destructive/50 bg-destructive/5',
                    sizeEstimate.qualityImpact === 'significant' && 'border-orange-500/50 bg-orange-500/5'
                )}>
                    <CardContent className="py-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="h-5 w-5 text-emerald-500" />
                                    <span className="text-lg font-semibold">
                                        {sizeEstimate.estimatedMB} MB
                                    </span>
                                    <Badge variant="outline" className="text-emerald-600">
                                        ↓ {Math.round(sizeEstimate.compressionRatio * 100)}% smaller
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Video: {sizeEstimate.videoBitrate.toLocaleString()} kbps |
                                    Audio: {sizeEstimate.audioBitrate} kbps
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {sizeEstimate.qualityImpact !== 'minimal' && (
                                    <Badge
                                        variant={sizeEstimate.qualityImpact === 'severe' ? 'destructive' : 'secondary'}
                                    >
                                        {sizeEstimate.qualityImpact === 'moderate' && 'Moderate quality impact'}
                                        {sizeEstimate.qualityImpact === 'significant' && 'Significant quality loss'}
                                        {sizeEstimate.qualityImpact === 'severe' && 'Severe quality loss'}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Warnings */}
                        {sizeEstimate.warnings.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {sizeEstimate.warnings.map((warning, i) => (
                                    <div key={i} className="flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1 text-xs text-orange-600">
                                        <AlertTriangle className="h-3 w-3" />
                                        {warning}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Info Note */}
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                    Estimated size is calculated from: (Video Bitrate + Audio Bitrate) × Duration.
                    Actual size may vary slightly based on content complexity.
                </p>
            </div>

            {/* Compress Button */}
            <Button onClick={onStartCompress} className="w-full" size="lg">
                <Zap className="mr-2 h-4 w-4" />
                Start Compression
            </Button>
        </div>
    );
};
