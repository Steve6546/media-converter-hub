import { AudioFile } from '@/types/media';
import { AudioPlayer } from './AudioPlayer';
import { AudioInsights } from './AudioInsights';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Download,
  Pencil,
  Image,
  Volume2,
  Scissors,
  Trash2,
  Music,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AudioCardProps {
  audioFile: AudioFile;
  onRename: () => void;
  onChangeCover: () => void;
  onAdjustVolume: () => void;
  onTrim: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const AudioCard = ({
  audioFile,
  onRename,
  onChangeCover,
  onAdjustVolume,
  onTrim,
  onDownload,
  onDelete,
}: AudioCardProps) => {
  const isTrimmed = audioFile.trimStart > 0 || audioFile.trimEnd < audioFile.duration;
  const volumeDelta = audioFile.volume - 100;
  const isVolumeChanged = volumeDelta !== 0;
  const newDuration = audioFile.trimEnd - audioFile.trimStart;

  // Build tooltip parts with better formatting
  const tooltipParts: string[] = [];
  if (isTrimmed) tooltipParts.push('Trimmed');
  if (isVolumeChanged) tooltipParts.push(`Volume ${volumeDelta >= 0 ? '+' : ''}${volumeDelta}%`);

  const durationInfo = isTrimmed
    ? `Original ${formatDuration(audioFile.duration)} → New ${formatDuration(newDuration)}`
    : null;

  const hasModifications = isTrimmed || isVolumeChanged;

  return (
    <div className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      {/* Cover Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {audioFile.coverImage ? (
          <img
            src={audioFile.coverImage}
            alt={audioFile.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Music className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Overlay with duration */}
        <div className="absolute bottom-2 right-2 rounded bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
          {formatDuration(audioFile.trimEnd - audioFile.trimStart)}
        </div>

        {/* Modification indicators on cover */}
        {hasModifications && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {isTrimmed && (
              <div className="flex items-center gap-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                <Scissors className="h-2.5 w-2.5" />
                <span>Cut</span>
              </div>
            )}
            {isVolumeChanged && (
              <div className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm",
                volumeDelta > 0 ? "bg-emerald-500/90" : "bg-sky-500/90"
              )}>
                <Volume2 className="h-2.5 w-2.5" />
                <span>{volumeDelta > 0 ? '+' : ''}{volumeDelta}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Title and actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium" title={audioFile.name}>
              {audioFile.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {format(audioFile.createdAt, 'MMM d, yyyy')}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onChangeCover}>
                <Image className="mr-2 h-4 w-4" />
                Change Cover
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onAdjustVolume}>
                <Volume2 className="mr-2 h-4 w-4" />
                Adjust Volume
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onTrim}>
                <Scissors className="mr-2 h-4 w-4" />
                Trim Audio
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download MP3
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Waveform Audio Player with Tooltip */}
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-default">
                <AudioPlayer
                  audioUrl={audioFile.audioUrl}
                  volume={audioFile.volume}
                  trimStart={audioFile.trimStart}
                  trimEnd={audioFile.trimEnd}
                  compact
                />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs"
            >
              <div className="space-y-1 text-xs">
                {hasModifications ? (
                  <>
                    <p className="font-medium text-foreground">
                      {tooltipParts.join(' · ')}
                    </p>
                    {durationInfo && (
                      <p className="text-muted-foreground">{durationInfo}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Duration: {formatDuration(audioFile.duration)} (No modifications)
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Audio Intelligence Insights */}
        <AudioInsights
          audioUrl={audioFile.audioUrl}
          duration={audioFile.duration}
          trimStart={audioFile.trimStart}
          trimEnd={audioFile.trimEnd}
          onSuggestTrim={onTrim}
          onSuggestVolume={onAdjustVolume}
        />
      </div>
    </div>
  );
};
