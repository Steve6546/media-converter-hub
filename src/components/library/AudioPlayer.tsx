import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Stop at trim end
      if (audio.currentTime >= trimEnd) {
        audio.pause();
        audio.currentTime = trimStart;
        setIsPlaying(false);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      audio.currentTime = trimStart;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [trimStart, trimEnd]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (audio.currentTime < trimStart || audio.currentTime >= trimEnd) {
        audio.currentTime = trimStart;
      }
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (value[0] / 100) * (trimEnd - trimStart) + trimStart;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 
    ? ((currentTime - trimStart) / (trimEnd - trimStart)) * 100 
    : 0;

  return (
    <div className={cn('flex items-center gap-3', compact ? 'gap-2' : 'gap-3')}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

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
        <Slider
          value={[Math.max(0, Math.min(100, progress))]}
          max={100}
          step={0.1}
          onValueChange={handleSeek}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-10">
          {formatTime(trimEnd - trimStart)}
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
