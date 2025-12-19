import { DropZone } from './DropZone';
import { ConversionProgress } from './ConversionProgress';
import { useMedia } from '@/contexts/MediaContext';
import { FileAudio, Zap, AlertCircle } from 'lucide-react';

export const ConvertSection = () => {
  const { conversionJobs, startConversion, isBackendConnected } = useMedia();

  const handleFilesDropped = (files: File[]) => {
    files.forEach((file) => {
      startConversion(file);
    });
  };

  const isConverting = conversionJobs.some(
    (job) => job.status === 'uploading' || job.status === 'converting'
  );

  if (!isBackendConnected) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Convert Video to MP3
          </h2>
          <p className="text-muted-foreground">
            Upload your video files and we'll extract high-quality audio in MP3 format.
          </p>
        </div>

        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-destructive/50 bg-destructive/5">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium">Backend Not Connected</p>
              <p className="text-sm text-muted-foreground max-w-md">
                The backend server is not running. Start it with:<br />
                <code className="mt-2 inline-block rounded bg-muted px-2 py-1 font-mono text-xs">
                  cd backend && npm install && npm run dev
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Convert Video to MP3
        </h2>
        <p className="text-muted-foreground">
          Upload your video files and we'll extract high-quality audio in MP3 format.
        </p>
      </div>

      <DropZone onFilesDropped={handleFilesDropped} disabled={isConverting} />

      <ConversionProgress jobs={conversionJobs} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Fast Processing</h3>
            <p className="text-sm text-muted-foreground">
              Optimized conversion powered by FFmpeg
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileAudio className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">High Quality</h3>
            <p className="text-sm text-muted-foreground">
              320kbps MP3 output for crystal-clear audio
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <svg
              className="h-5 w-5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium">Private & Secure</h3>
            <p className="text-sm text-muted-foreground">
              Your files are processed securely
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
