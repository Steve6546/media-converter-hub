import { useState } from 'react';
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

interface TrimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duration: number;
  currentTrimStart: number;
  currentTrimEnd: number;
  onSave: (trimStart: number, trimEnd: number) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseTime = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0;
    const secs = parseInt(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseInt(timeStr) || 0;
};

export const TrimModal = ({
  open,
  onOpenChange,
  duration,
  currentTrimStart,
  currentTrimEnd,
  onSave,
}: TrimModalProps) => {
  const [trimStart, setTrimStart] = useState(currentTrimStart);
  const [trimEnd, setTrimEnd] = useState(currentTrimEnd);
  const [startInput, setStartInput] = useState(formatTime(currentTrimStart));
  const [endInput, setEndInput] = useState(formatTime(currentTrimEnd));

  const handleSliderChange = (value: number[]) => {
    const [start, end] = value;
    setTrimStart(start);
    setTrimEnd(end);
    setStartInput(formatTime(start));
    setEndInput(formatTime(end));
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

  const handleSave = () => {
    onSave(trimStart, trimEnd);
    onOpenChange(false);
  };

  const handleReset = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    setStartInput(formatTime(0));
    setEndInput(formatTime(duration));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Trim Audio</DialogTitle>
          <DialogDescription>
            Adjust the start and end points to trim your audio
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Timeline visualization */}
          <div className="space-y-3">
            <div className="relative h-12 rounded-lg bg-muted">
              <div
                className="absolute h-full rounded-lg bg-primary/30"
                style={{
                  left: `${(trimStart / duration) * 100}%`,
                  width: `${((trimEnd - trimStart) / duration) * 100}%`,
                }}
              />
              <Slider
                value={[trimStart, trimEnd]}
                onValueChange={handleSliderChange}
                max={duration}
                step={1}
                className="absolute inset-0"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(0)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                value={startInput}
                onChange={(e) => handleStartInputChange(e.target.value)}
                placeholder="0:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Time</Label>
              <Input
                id="end"
                value={endInput}
                onChange={(e) => handleEndInputChange(e.target.value)}
                placeholder="0:00"
              />
            </div>
          </div>

          {/* Duration info */}
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="text-sm text-muted-foreground">New Duration</span>
            <span className="font-medium">
              {formatTime(trimEnd - trimStart)}
            </span>
          </div>

          <Button variant="outline" className="w-full" onClick={handleReset}>
            Reset to Original
          </Button>
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
