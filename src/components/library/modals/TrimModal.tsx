import { useState, useRef, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  Music
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duration: number;
  audioUrl: string;
  currentTrimStart: number;
  currentTrimEnd: number;
  currentFadeIn: number;
  currentFadeOut: number;
  onSave: (trimStart: number, trimEnd: number, fadeIn: number, fadeOut: number) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const formatTimeShort = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseTime = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0;
    const secParts = parts[1].split('.');
    const secs = parseInt(secParts[0]) || 0;
    const ms = secParts[1] ? parseInt(secParts[1]) / 100 : 0;
    return mins * 60 + secs + ms;
  }
  return parseFloat(timeStr) || 0;
};

// Detect silence regions in audio buffer
const detectSilenceRegions = (audioBuffer: AudioBuffer, threshold = 0.02): number[] => {
  const silencePoints: number[] = [];
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
  const data = audioBuffer.getChannelData(0);

  for (let i = 0; i < data.length; i += windowSize) {
    let sum = 0;
    const end = Math.min(i + windowSize, data.length);
    for (let j = i; j < end; j++) {
      sum += Math.abs(data[j]);
    }
    const avg = sum / (end - i);
    if (avg < threshold) {
      silencePoints.push(i / sampleRate);
    }
  }

  return silencePoints;
};

// Detect beat/peak points in audio buffer (approximate)
const detectBeatPoints = (audioBuffer: AudioBuffer): number[] => {
  const beatPoints: number[] = [];
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
  const data = audioBuffer.getChannelData(0);

  let prevEnergy = 0;
  for (let i = 0; i < data.length; i += windowSize) {
    let energy = 0;
    const end = Math.min(i + windowSize, data.length);
    for (let j = i; j < end; j++) {
      energy += data[j] * data[j];
    }

    // Beat detection: energy spike
    if (energy > prevEnergy * 1.5 && energy > 0.01) {
      const time = i / sampleRate;
      // Avoid adding points too close together
      if (beatPoints.length === 0 || time - beatPoints[beatPoints.length - 1] > 0.3) {
        beatPoints.push(time);
      }
    }
    prevEnergy = energy;
  }

  return beatPoints;
};

export const TrimModal = ({
  open,
  onOpenChange,
  duration,
  audioUrl,
  currentTrimStart,
  currentTrimEnd,
  currentFadeIn,
  currentFadeOut,
  onSave,
}: TrimModalProps) => {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  const [trimStart, setTrimStart] = useState(currentTrimStart);
  const [trimEnd, setTrimEnd] = useState(currentTrimEnd);
  const [fadeIn, setFadeIn] = useState(currentFadeIn);
  const [fadeOut, setFadeOut] = useState(currentFadeOut);
  const [startInput, setStartInput] = useState(formatTimeShort(currentTrimStart));
  const [endInput, setEndInput] = useState(formatTimeShort(currentTrimEnd));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [silencePoints, setSilencePoints] = useState<number[]>([]);
  const [beatPoints, setBeatPoints] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTrimStart(currentTrimStart);
      setTrimEnd(currentTrimEnd);
      setFadeIn(currentFadeIn);
      setFadeOut(currentFadeOut);
      setStartInput(formatTimeShort(currentTrimStart));
      setEndInput(formatTimeShort(currentTrimEnd));
      setIsPlaying(false);
      setCurrentTime(0);
      setIsReady(false);
    }
  }, [open, currentTrimStart, currentTrimEnd, currentFadeIn, currentFadeOut]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!open || !waveformRef.current) return;

    const container = waveformRef.current;

    const waveSurfer = WaveSurfer.create({
      container,
      waveColor: '#94A3B8',
      progressColor: '#6366F1',
      cursorColor: '#EF4444',
      cursorWidth: 2,
      height: 100,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
    });

    waveSurferRef.current = waveSurfer;
    waveSurfer.load(audioUrl);

    waveSurfer.on('ready', () => {
      setIsReady(true);
      // Analyze audio for silence and beats
      analyzeAudio();
    });

    waveSurfer.on('audioprocess', () => {
      const time = waveSurfer.getCurrentTime();
      setCurrentTime(time);
      // Stop at trim end
      if (time >= trimEnd) {
        waveSurfer.pause();
        waveSurfer.setTime(trimStart);
        setIsPlaying(false);
      }
    });

    waveSurfer.on('finish', () => {
      setIsPlaying(false);
      waveSurfer.setTime(trimStart);
    });

    waveSurfer.on('click', (relativeX) => {
      const clickTime = relativeX * duration;
      if (clickTime >= trimStart && clickTime <= trimEnd) {
        waveSurfer.setTime(clickTime);
      }
    });

    return () => {
      waveSurfer.destroy();
      waveSurferRef.current = null;
      setIsReady(false);
    };
  }, [open, audioUrl, duration]);

  // Analyze audio for silence and beat detection
  const analyzeAudio = useCallback(async () => {
    if (!audioUrl) return;

    setIsAnalyzing(true);
    try {
      const context = new AudioContext();
      const response = await fetch(audioUrl);
      const buffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(buffer);

      const silence = detectSilenceRegions(audioBuffer);
      const beats = detectBeatPoints(audioBuffer);

      setSilencePoints(silence);
      setBeatPoints(beats);

      context.close().catch(() => { });
    } catch (error) {
      console.error('Audio analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [audioUrl]);

  const handleSliderChange = (value: number[]) => {
    const [start, end] = value;
    setTrimStart(start);
    setTrimEnd(end);
    setStartInput(formatTimeShort(start));
    setEndInput(formatTimeShort(end));
  };

  const handleStartInputChange = (value: string) => {
    setStartInput(value);
    const seconds = parseTime(value);
    if (seconds >= 0 && seconds < trimEnd) {
      setTrimStart(seconds);
    }
  };

  const handleEndInputChange = (value: string) => {
    setEndInput(value);
    const seconds = parseTime(value);
    if (seconds > trimStart && seconds <= duration) {
      setTrimEnd(seconds);
    }
  };

  const handlePreview = () => {
    const waveSurfer = waveSurferRef.current;
    if (!waveSurfer) return;

    if (isPlaying) {
      waveSurfer.pause();
      setIsPlaying(false);
    } else {
      waveSurfer.setTime(trimStart);
      waveSurfer.play();
      setIsPlaying(true);
    }
  };

  const handleSnapToSilence = (position: 'start' | 'end') => {
    if (silencePoints.length === 0) return;

    if (position === 'start') {
      // Find first silence point
      const point = silencePoints.find(p => p > 0) || 0;
      setTrimStart(point);
      setStartInput(formatTimeShort(point));
    } else {
      // Find last silence point before end
      const point = [...silencePoints].reverse().find(p => p < duration) || duration;
      setTrimEnd(point);
      setEndInput(formatTimeShort(point));
    }
  };

  const handleSnapToBeat = (position: 'start' | 'end') => {
    if (beatPoints.length === 0) return;

    if (position === 'start') {
      // Find first beat
      const point = beatPoints[0] || 0;
      setTrimStart(point);
      setStartInput(formatTimeShort(point));
    } else {
      // Find last beat
      const point = beatPoints[beatPoints.length - 1] || duration;
      setTrimEnd(point);
      setEndInput(formatTimeShort(point));
    }
  };

  const handleSave = () => {
    onSave(trimStart, trimEnd, fadeIn, fadeOut);
    onOpenChange(false);
  };

  const handleReset = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    setFadeIn(0);
    setFadeOut(0);
    setStartInput(formatTimeShort(0));
    setEndInput(formatTimeShort(duration));
  };

  const newDuration = trimEnd - trimStart;
  const trimStartPercent = (trimStart / duration) * 100;
  const trimEndPercent = (trimEnd / duration) * 100;
  const fadeInPercent = Math.min((fadeIn / newDuration) * 100, 50);
  const fadeOutPercent = Math.min((fadeOut / newDuration) * 100, 50);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Trim Audio
          </DialogTitle>
          <DialogDescription>
            Adjust trim points, add fades, and preview changes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Waveform */}
          <div className="space-y-2">
            <div className="relative rounded-lg border bg-muted/50 p-2">
              {/* Trim region overlay */}
              <div className="absolute inset-2 pointer-events-none z-10">
                {/* Left trim area (darker) */}
                <div
                  className="absolute inset-y-0 left-0 bg-background/70"
                  style={{ width: `${trimStartPercent}%` }}
                />
                {/* Right trim area (darker) */}
                <div
                  className="absolute inset-y-0 right-0 bg-background/70"
                  style={{ width: `${100 - trimEndPercent}%` }}
                />
                {/* Fade in overlay */}
                {fadeIn > 0 && (
                  <div
                    className="absolute inset-y-0 bg-gradient-to-r from-primary/30 to-transparent"
                    style={{
                      left: `${trimStartPercent}%`,
                      width: `${fadeInPercent}%`
                    }}
                  />
                )}
                {/* Fade out overlay */}
                {fadeOut > 0 && (
                  <div
                    className="absolute inset-y-0 bg-gradient-to-l from-primary/30 to-transparent"
                    style={{
                      right: `${100 - trimEndPercent}%`,
                      width: `${fadeOutPercent}%`
                    }}
                  />
                )}
              </div>

              <div ref={waveformRef} className="h-24" />

              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading waveform...
                  </div>
                </div>
              )}
            </div>

            {/* Current time indicator */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Trim Slider */}
          <div className="space-y-3">
            <Label>Trim Region</Label>
            <Slider
              value={[trimStart, trimEnd]}
              onValueChange={handleSliderChange}
              max={duration}
              step={0.1}
              className="w-full"
            />

            {/* Time inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="start" className="text-xs">Start</Label>
                <Input
                  id="start"
                  value={startInput}
                  onChange={(e) => handleStartInputChange(e.target.value)}
                  placeholder="0:00"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end" className="text-xs">End</Label>
                <Input
                  id="end"
                  value={endInput}
                  onChange={(e) => handleEndInputChange(e.target.value)}
                  placeholder="0:00"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Snap Controls */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Smart Snap
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Snap Start to:</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSnapToSilence('start')}
                    disabled={silencePoints.length === 0 || isAnalyzing}
                    className="flex-1"
                  >
                    Silence
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSnapToBeat('start')}
                    disabled={beatPoints.length === 0 || isAnalyzing}
                    className="flex-1"
                  >
                    Beat
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Snap End to:</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSnapToSilence('end')}
                    disabled={silencePoints.length === 0 || isAnalyzing}
                    className="flex-1"
                  >
                    Silence
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSnapToBeat('end')}
                    disabled={beatPoints.length === 0 || isAnalyzing}
                    className="flex-1"
                  >
                    Beat
                  </Button>
                </div>
              </div>
            </div>
            {isAnalyzing && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Analyzing audio...
              </p>
            )}
          </div>

          {/* Fade Controls */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Fade Effects
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Fade In</span>
                  <span className="text-muted-foreground">{fadeIn.toFixed(1)}s</span>
                </div>
                <Slider
                  value={[fadeIn]}
                  onValueChange={(v) => setFadeIn(v[0])}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Fade Out</span>
                  <span className="text-muted-foreground">{fadeOut.toFixed(1)}s</span>
                </div>
                <Slider
                  value={[fadeOut]}
                  onValueChange={(v) => setFadeOut(v[0])}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Duration info */}
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="text-sm text-muted-foreground">New Duration</span>
            <span className="font-medium">
              {formatTimeShort(newDuration)}
              {(fadeIn > 0 || fadeOut > 0) && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (with {fadeIn > 0 ? `${fadeIn.toFixed(1)}s fade in` : ''}
                  {fadeIn > 0 && fadeOut > 0 ? ', ' : ''}
                  {fadeOut > 0 ? `${fadeOut.toFixed(1)}s fade out` : ''})
                </span>
              )}
            </span>
          </div>

          {/* Preview and Reset buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePreview}
              disabled={!isReady}
            >
              {isPlaying ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause Preview
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Preview Trim
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Apply Trim</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
