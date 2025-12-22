import { useState, useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl: string;
  volume: number;
  trimStart: number;
  trimEnd: number;
  compact?: boolean;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const AudioPlayer = ({
  audioUrl,
  volume,
  trimStart,
  trimEnd,
  compact = false,
}: AudioPlayerProps) => {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const container = waveformRef.current;
    if (!container) return;

    const waveSurfer = WaveSurfer.create({
      container,
      waveColor: '#CBD5F5',
      progressColor: '#6366F1',
      cursorColor: 'transparent',
      height: compact ? 36 : 48,
      barWidth: compact ? 2 : 3,
      barGap: compact ? 2 : 3,
      barRadius: 2,
      normalize: true,
    });

    waveSurferRef.current = waveSurfer;
    waveSurfer.load(audioUrl);

    const handleReady = () => {
      const total = waveSurfer.getDuration();
      setDuration(total);
      // Clamp volume to valid range [0, 1] for HTML5 audio
      waveSurfer.setVolume(Math.min(1, Math.max(0, volume / 100)));
      waveSurfer.setTime(trimStart);
    };

    const handleAudioProcess = () => {
      const time = waveSurfer.getCurrentTime();
      setCurrentTime(time);
      if (trimEnd > trimStart && time >= trimEnd) {
        waveSurfer.pause();
        waveSurfer.setTime(trimStart);
        setIsPlaying(false);
      }
    };

    const handleFinish = () => {
      setIsPlaying(false);
      waveSurfer.setTime(trimStart);
    };

    waveSurfer.on('ready', handleReady);
    waveSurfer.on('audioprocess', handleAudioProcess);
    waveSurfer.on('finish', handleFinish);

    return () => {
      waveSurfer.destroy();
      waveSurferRef.current = null;
    };
  }, [audioUrl, compact, trimEnd, trimStart]);

  useEffect(() => {
    const waveSurfer = waveSurferRef.current;
    if (!waveSurfer) return;

    // Clamp volume to valid range [0, 1] for HTML5 audio
    waveSurfer.setVolume(Math.min(1, Math.max(0, volume / 100)));
  }, [volume]);

  useEffect(() => {
    const waveSurfer = waveSurferRef.current;
    if (!waveSurfer) return;

    const time = waveSurfer.getCurrentTime();
    if (time < trimStart || time > trimEnd) {
      waveSurfer.setTime(trimStart);
      setCurrentTime(trimStart);
    }
  }, [trimStart, trimEnd]);

  useEffect(() => {
    const waveSurfer = waveSurferRef.current;
    if (!waveSurfer) return;

    if (!isPlaying) {
      waveSurfer.pause();
    }
  }, [isPlaying]);

  const togglePlay = () => {
    const waveSurfer = waveSurferRef.current;
    if (!waveSurfer) return;

    if (isPlaying) {
      waveSurfer.pause();
      setIsPlaying(false);
      return;
    }

    const time = waveSurfer.getCurrentTime();
    if (time < trimStart || time >= trimEnd) {
      waveSurfer.setTime(trimStart);
    }
    waveSurfer.play();
    setIsPlaying(true);
  };

  const adjustedDuration = trimEnd - trimStart;
  const safeDuration = duration > 0 ? duration : adjustedDuration;
  const progress =
    safeDuration > 0
      ? ((currentTime - trimStart) / (trimEnd - trimStart || 1)) * 100
      : 0;

  const trimOverlay =
    safeDuration > 0
      ? {
        left: `${(trimStart / safeDuration) * 100}%`,
        width: `${((trimEnd - trimStart) / safeDuration) * 100}%`,
      }
      : { left: '0%', width: '100%' };

  return (
    <div className={cn('flex items-center gap-3', compact ? 'gap-2' : 'gap-3')}>
      <Button
        variant="outline"
        size="icon"
        className={cn(
          'flex-shrink-0 rounded-full',
          compact ? 'h-8 w-8' : 'h-10 w-10'
        )}
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />
        ) : (
          <Play className={cn(compact ? 'h-3 w-3' : 'h-4 w-4', 'ml-0.5')} />
        )}
      </Button>

      <div className="flex flex-1 items-center gap-2">
        <span className="text-xs text-muted-foreground w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <div className={cn('relative flex-1', compact ? 'h-9' : 'h-11')}>
          <div
            className="absolute inset-y-0 rounded-sm bg-primary/10"
            style={trimOverlay}
          />
          <div ref={waveformRef} className="h-full" />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 bg-primary/20"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-10">
          {formatTime(adjustedDuration)}
        </span>
      </div>

      {!compact && (
        <div className="hidden items-center gap-2 md:flex">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground w-8">
            {volume}%
          </span>
        </div>
      )}
    </div>
  );
};
