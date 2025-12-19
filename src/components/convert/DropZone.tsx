import { useCallback, useState } from 'react';
import { Upload, FileVideo, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCEPTED_VIDEO_TYPES } from '@/types/media';

interface DropZoneProps {
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
}

export const DropZone = ({ onFilesDropped, disabled }: DropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['.mp4', '.mov', '.mkv', '.avi'];
    
    if (!validExtensions.includes(extension)) {
      setError(`Unsupported format: ${extension}. Please use MP4, MOV, MKV, or AVI.`);
      return false;
    }
    
    // Max 2GB file size
    if (file.size > 2 * 1024 * 1024 * 1024) {
      setError('File is too large. Maximum size is 2GB.');
      return false;
    }
    
    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setError(null);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(validateFile);

      if (validFiles.length > 0) {
        onFilesDropped(validFiles);
      }
    },
    [onFilesDropped, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const files = Array.from(e.target.files || []);
      const validFiles = files.filter(validateFile);

      if (validFiles.length > 0) {
        onFilesDropped(validFiles);
      }

      // Reset input
      e.target.value = '';
    },
    [onFilesDropped]
  );

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input
          type="file"
          accept=".mp4,.mov,.mkv,.avi"
          multiple
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 z-10 cursor-pointer opacity-0"
        />

        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full transition-colors',
              isDragging ? 'bg-primary/10' : 'bg-muted'
            )}
          >
            {isDragging ? (
              <FileVideo className="h-8 w-8 text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragging ? 'Drop your video here' : 'Drag & drop video files'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse from your computer
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {['MP4', 'MOV', 'MKV', 'AVI'].map((format) => (
              <span
                key={format}
                className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                {format}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
