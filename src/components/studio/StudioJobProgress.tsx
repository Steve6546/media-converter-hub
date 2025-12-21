import { StudioJob, StudioFile } from '@/types/studio';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { studioApi } from '@/services/studioApi';
import { FileImage, FileText, FileVideo, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface StudioJobProgressProps {
  jobs: StudioJob[];
}

const TOOL_LABELS: Record<string, string> = {
  compress: 'Compression',
  enhance: 'Enhance',
  thumbnails: 'Thumbnails',
  subtitles: 'Subtitles',
  image: 'Image',
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, idx)).toFixed(1)} ${units[idx]}`;
};

const renderFiles = (label: string, files?: StudioFile[]) => {
  if (!files || files.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {files.map((file) => (
          <Button key={file.url} variant="outline" size="sm" asChild>
            <a href={studioApi.getFileUrl(file.url)} download>
              {file.name}
              {file.size ? ` (${formatSize(file.size)})` : ''}
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
};

const getJobIcon = (job: StudioJob) => {
  if (job.tool === 'thumbnails' || job.tool === 'image') {
    return <FileImage className="h-5 w-5" />;
  }
  if (job.tool === 'subtitles') return <FileText className="h-5 w-5" />;
  return <FileVideo className="h-5 w-5" />;
};

export const StudioJobProgress = ({ jobs }: StudioJobProgressProps) => {
  if (jobs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Active Studio Jobs
      </h3>
      <div className="space-y-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className={cn(
              'space-y-3 rounded-lg border p-4 transition-colors',
              job.status === 'completed' && 'border-green-500/30 bg-green-500/5',
              job.status === 'failed' && 'border-destructive/30 bg-destructive/5'
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                  job.status === 'completed'
                    ? 'bg-green-500/10 text-green-600'
                    : job.status === 'failed'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {job.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : job.status === 'failed' ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  getJobIcon(job)
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      {TOOL_LABELS[job.tool] || job.tool}
                    </p>
                    <p className="text-xs text-muted-foreground">{job.fileName}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {(job.status === 'queued' || job.status === 'running') && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>{job.status === 'queued' ? 'Queued' : 'Processing'}</span>
                      </>
                    )}
                    {job.status === 'completed' && (
                      <span className="text-green-600">Completed</span>
                    )}
                    {job.status === 'failed' && (
                      <span className="text-destructive">Failed</span>
                    )}
                  </div>
                </div>

                {(job.status === 'queued' || job.status === 'running') && (
                  <Progress value={job.progress} className="h-1.5" />
                )}
              </div>
            </div>

            {job.status === 'failed' && job.error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{job.error}</span>
              </div>
            )}

            {job.status === 'completed' && job.result && (
              <div className="space-y-3">
                {renderFiles('Output Files', job.result.files)}
                {renderFiles('Thumbnails', job.result.thumbnails)}
                {renderFiles('Subtitles', job.result.subtitles)}
                {job.result.warnings && job.result.warnings.length > 0 && (
                  <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{job.result.warnings.join(' ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
