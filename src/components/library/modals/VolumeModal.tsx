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
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';
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

  useEffect(() => {
    if (!open) return;
    setVolume(currentVolume);
    setNormalize(currentNormalize);
  }, [currentVolume, currentNormalize, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let context: AudioContext | null = null;

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
        if (context) {
          context.close();
        }
        if (!cancelled) {
          setIsAnalyzing(false);
        }
      }
    };

    analyze();

    return () => {
      cancelled = true;
      if (context) {
        context.close();
      }
    };
  }, [audioUrl, open, trimEnd, trimStart]);

  const presets = useMemo(
    () => [
      { id: 'podcast', label: 'Podcast', volume: 120, normalize: true },
      { id: 'music', label: 'Music', volume: 100, normalize: false },
      { id: 'voice', label: 'Voice note', volume: 140, normalize: true },
    ],
    []
  );

  const estimatedPeak = peak !== null ? peak * (volume / 100) : null;
  const isClipping = estimatedPeak !== null && estimatedPeak > 1;

  const handleSave = () => {
    onSave(volume, normalize);
    onOpenChange(false);
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 33 ? Volume : volume < 66 ? Volume1 : Volume2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Volume</DialogTitle>
          <DialogDescription>
            Shape loudness with presets and safe normalization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="flex items-center justify-center gap-4">
            <VolumeIcon className="h-8 w-8 text-muted-foreground" />
            <span className="text-4xl font-bold">{volume}%</span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Presets</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVolume(preset.volume);
                    setNormalize(preset.normalize);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Slider
              value={[volume]}
              onValueChange={(v) => setVolume(v[0])}
              max={200}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Normalize (LUFS)</p>
              <p className="text-xs text-muted-foreground">Target -14 LUFS for consistent levels</p>
            </div>
            <Switch checked={normalize} onCheckedChange={setNormalize} />
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Peak Indicator</p>
              <span
                className={cn(
                  'text-xs',
                  isClipping ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {isAnalyzing
                  ? 'Analyzing...'
                  : estimatedPeak === null
                  ? 'Unavailable'
                  : isClipping
                  ? 'Clipping risk'
                  : 'Safe'}
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className={cn(
                  'h-2 rounded-full transition-colors',
                  isClipping ? 'bg-destructive' : 'bg-emerald-500'
                )}
                style={{
                  width: `${Math.min(100, Math.max(5, (estimatedPeak || 0) * 100))}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {estimatedPeak !== null
                ? `Estimated peak ${(estimatedPeak * 100).toFixed(0)}% after gain`
                : 'Peak estimation uses a quick client-side scan.'}
            </p>
          </div>

          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVolume(50)}
            >
              50%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVolume(100)}
            >
              100%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVolume(150)}
            >
              150%
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
