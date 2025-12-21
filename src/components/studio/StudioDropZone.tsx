import { useCallback, useState } from 'react';
import { Upload, FileVideo, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudioDropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.mkv',
  '.avi',
  '.webm',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
];

const FORMAT_LABELS = ['MP4', 'MOV', 'MKV', 'AVI', 'WEBM', 'JPG', 'PNG', 'WEBP', 'AVIF'];

export const StudioDropZone = ({ onFileSelected, disabled }: StudioDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError(`Unsupported format: ${extension}. Please use MP4, MOV, MKV, AVI, WEBM, JPG, PNG, WEBP, or AVIF.`);
      return false;
    }

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
        onFileSelected(validFiles[0]);
      }
    },
    [disabled, onFileSelected]
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
        onFileSelected(validFiles[0]);
      }

      e.target.value = '';
    },
    [onFileSelected]
  );

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
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
              {isDragging ? 'Drop your media here' : 'Drag & drop video or image files'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse from your computer
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {FORMAT_LABELS.map((format) => (
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
