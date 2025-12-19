import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoverImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage: string | null;
  audioFileId: string;
  onSave: (file: File) => Promise<void>;
  onRemove: () => void;
}

export const CoverImageModal = ({
  open,
  onOpenChange,
  currentImage,
  audioFileId,
  onSave,
  onRemove,
}: CoverImageModalProps) => {
  const [preview, setPreview] = useState<string | null>(currentImage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (selectedFile) {
      setIsUploading(true);
      try {
        await onSave(selectedFile);
        onOpenChange(false);
      } finally {
        setIsUploading(false);
      }
    } else if (preview === null && currentImage !== null) {
      // User removed the image
      onRemove();
      onOpenChange(false);
    } else {
      onOpenChange(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setSelectedFile(null);
  };

  // Reset state when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setPreview(currentImage);
      setSelectedFile(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Cover Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 border-dashed transition-colors hover:border-primary/50',
              preview ? 'border-transparent' : 'border-border'
            )}
          >
            {preview ? (
              <img
                src={preview}
                alt="Cover preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <span className="text-sm">Click to upload image</span>
              </div>
            )}
          </div>

          {preview && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRemove}
            >
              Remove Image
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};