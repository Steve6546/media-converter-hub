import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Mic2, Music, Mic, Volume, Volume1, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VolumeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVolume: number;
  currentNormalize: boolean;
  audioUrl: string;
  trimStart: number;
  trimEnd: number;
  onSave: (volume: number, normalize: boolean) => void;
}

interface Preset {
  id: string;
  label: string;
  description: string;
  volume: number;
  normalize: boolean;
  icon: typeof Mic2;
  gradient: string;
  activeGradient: string;
}

export const VolumeModal = ({
  open,
  onOpenChange,
  currentVolume,
  currentNormalize,
  audioUrl,
  trimStart,
  trimEnd,
  onSave,
}: VolumeModalProps) => {
  const [volume, setVolume] = useState(currentVolume);
  const [normalize, setNormalize] = useState(currentNormalize);
  const [peak, setPeak] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setVolume(currentVolume);
    setNormalize(currentNormalize);
    setActivePreset(null);
  }, [currentVolume, currentNormalize, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let context: AudioContext | null = null;
    let isClosed = false;

    const analyze = async () => {
      try {
        setIsAnalyzing(true);
        context = new AudioContext();
        const response = await fetch(audioUrl);
        const buffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(buffer);
        if (cancelled) return;

        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.max(0, Math.floor(trimStart * sampleRate));
        const endSample = Math.min(audioBuffer.length, Math.floor(trimEnd * sampleRate));
        const range = Math.max(endSample - startSample, 1);
        const step = Math.max(1, Math.floor(range / 100000));

        let maxPeak = 0;
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
          const data = audioBuffer.getChannelData(channel);
          for (let i = startSample; i < endSample; i += step) {
            const value = Math.abs(data[i]);
            if (value > maxPeak) maxPeak = value;
          }
        }

        setPeak(maxPeak);
      } catch {
        setPeak(null);
      } finally {
        if (context && !isClosed) {
          isClosed = true;
          context.close().catch(() => { });
        }
        if (!cancelled) {
          setIsAnalyzing(false);
        }
      }
    };

    analyze();

    return () => {
      cancelled = true;
      if (context && !isClosed) {
        isClosed = true;
        context.close().catch(() => { });
      }
    };
  }, [audioUrl, open, trimEnd, trimStart]);

  const presets: Preset[] = useMemo(
    () => [
      {
        id: 'podcast',
        label: 'Podcast',
        description: 'Optimized for speech clarity',
        volume: 120,
        normalize: true,
        icon: Mic2,
        gradient: 'from-violet-500/20 to-purple-500/20',
        activeGradient: 'from-violet-500/40 to-purple-500/40',
      },
      {
        id: 'music',
        label: 'Music',
        description: 'Balanced for instruments',
        volume: 100,
        normalize: false,
        icon: Music,
        gradient: 'from-blue-500/20 to-cyan-500/20',
        activeGradient: 'from-blue-500/40 to-cyan-500/40',
      },
      {
        id: 'voice',
        label: 'Voice Note',
        description: 'Maximum voice presence',
        volume: 140,
        normalize: true,
        icon: Mic,
        gradient: 'from-amber-500/20 to-orange-500/20',
        activeGradient: 'from-amber-500/40 to-orange-500/40',
      },
    ],
    []
  );

  const estimatedPeak = peak !== null ? peak * (volume / 100) : null;
  const isClipping = estimatedPeak !== null && estimatedPeak > 1;
  const peakPercentage = estimatedPeak !== null ? Math.min(150, estimatedPeak * 100) : 0;

  // Calculate color zones for VU meter
  const getBarColor = (level: number) => {
    if (level > 100) return 'bg-red-500';
    if (level > 80) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const handlePresetClick = (preset: Preset) => {
    setVolume(preset.volume);
    setNormalize(preset.normalize);
    setActivePreset(preset.id);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    // Clear active preset when manually adjusting
    const matchingPreset = presets.find(p => p.volume === newVolume && p.normalize === normalize);
    setActivePreset(matchingPreset?.id || null);
  };

  const handleSave = () => {
    onSave(volume, normalize);
    onOpenChange(false);
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 33 ? Volume : volume < 66 ? Volume1 : Volume2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-hidden">
        {/* Studio Header */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

        <DialogHeader className="relative">
          <DialogTitle className="text-xl">Mini Audio Studio</DialogTitle>
          <DialogDescription>
            Professional audio levels with one click
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 relative">
          {/* Volume Display */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative flex items-center gap-3 bg-card/50 backdrop-blur-sm rounded-2xl px-6 py-3 border">
                <VolumeIcon className="h-7 w-7 text-primary" />
                <span className="text-4xl font-bold tabular-nums">{volume}%</span>
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Choose a preset</p>
            <div className="grid grid-cols-3 gap-3">
              {presets.map((preset) => {
                const Icon = preset.icon;
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      'group relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200',
                      'hover:scale-[1.02] hover:shadow-lg',
                      isActive
                        ? `bg-gradient-to-br ${preset.activeGradient} border-primary/50 shadow-md`
                        : `bg-gradient-to-br ${preset.gradient} border-border/50 hover:border-primary/30`
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                      isActive ? 'bg-primary/20' : 'bg-background/50 group-hover:bg-primary/10'
                    )}>
                      <Icon className={cn(
                        'h-5 w-5 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                      )} />
                    </div>
                    <div className="text-center">
                      <p className={cn(
                        'text-sm font-medium',
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {preset.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                    {isActive && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Volume Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Fine-tune volume</p>
              <span className="text-xs text-muted-foreground/70">{volume}%</span>
            </div>
            <Slider
              value={[volume]}
              onValueChange={(v) => handleVolumeChange(v[0])}
              max={200}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground/50">
              <span>0%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>

          {/* Normalize Toggle */}
          <div className="flex items-center justify-between rounded-xl border bg-card/30 p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Normalize (LUFS)</p>
              <p className="text-xs text-muted-foreground">Target -14 LUFS for consistent levels</p>
            </div>
            <Switch
              checked={normalize}
              onCheckedChange={(checked) => {
                setNormalize(checked);
                const matchingPreset = presets.find(p => p.volume === volume && p.normalize === checked);
                setActivePreset(matchingPreset?.id || null);
              }}
            />
          </div>

          {/* Peak Indicator - VU Meter Style */}
          <div className="rounded-xl border bg-card/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Peak Level</p>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full transition-colors',
                isAnalyzing
                  ? 'bg-muted text-muted-foreground'
                  : isClipping
                    ? 'bg-red-500/20 text-red-500 animate-pulse'
                    : estimatedPeak !== null && estimatedPeak > 0.8
                      ? 'bg-yellow-500/20 text-yellow-600'
                      : 'bg-emerald-500/20 text-emerald-600'
              )}>
                {isAnalyzing
                  ? 'Analyzing...'
                  : estimatedPeak === null
                    ? 'Unavailable'
                    : isClipping
                      ? '⚠ CLIPPING'
                      : estimatedPeak > 0.8
                        ? 'High'
                        : 'Safe'}
              </span>
            </div>

            {/* VU Meter Segments */}
            <div className="flex gap-0.5 h-6 items-end">
              {Array.from({ length: 30 }).map((_, i) => {
                const segmentLevel = (i + 1) * (150 / 30);
                const isActive = peakPercentage >= segmentLevel;
                const segmentColor = i >= 26 ? 'bg-red-500' : i >= 20 ? 'bg-yellow-500' : 'bg-emerald-500';

                return (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 rounded-sm transition-all duration-75',
                      isActive ? segmentColor : 'bg-muted/30',
                      isActive && i >= 26 && 'animate-pulse'
                    )}
                    style={{ height: `${60 + (i * 1.3)}%` }}
                  />
                );
              })}
            </div>

            {/* Scale markers */}
            <div className="flex justify-between text-[10px] text-muted-foreground/50 px-0.5">
              <span>0</span>
              <span>50%</span>
              <span>100%</span>
              <span className="text-red-400/50">150%</span>
            </div>

            {/* Warning message */}
            {isClipping && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 rounded-lg p-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Reduce volume to prevent audio distortion</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="min-w-[100px]">
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
