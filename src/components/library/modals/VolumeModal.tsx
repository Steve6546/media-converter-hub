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
import { Slider } from '@/components/ui/slider';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';

interface VolumeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVolume: number;
  onSave: (volume: number) => void;
}

export const VolumeModal = ({
  open,
  onOpenChange,
  currentVolume,
  onSave,
}: VolumeModalProps) => {
  const [volume, setVolume] = useState(currentVolume);

  const handleSave = () => {
    onSave(volume);
    onOpenChange(false);
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 33 ? Volume : volume < 66 ? Volume1 : Volume2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Volume</DialogTitle>
          <DialogDescription>
            Change the output volume of the audio file
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="flex items-center justify-center gap-4">
            <VolumeIcon className="h-8 w-8 text-muted-foreground" />
            <span className="text-4xl font-bold">{volume}%</span>
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
