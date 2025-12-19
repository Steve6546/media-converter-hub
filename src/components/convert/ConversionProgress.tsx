import { ConversionJob } from '@/types/media';
import { Progress } from '@/components/ui/progress';
import { FileVideo, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversionProgressProps {
  jobs: ConversionJob[];
}

export const ConversionProgress = ({ jobs }: ConversionProgressProps) => {
  if (jobs.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Active Conversions
      </h3>
      <div className="space-y-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className={cn(
              'flex items-center gap-4 rounded-lg border p-4 transition-colors',
              job.status === 'completed' && 'border-green-500/30 bg-green-500/5',
              job.status === 'error' && 'border-destructive/30 bg-destructive/5'
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                job.status === 'completed'
                  ? 'bg-green-500/10 text-green-600'
                  : job.status === 'error'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {job.status === 'completed' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : job.status === 'error' ? (
                <XCircle className="h-5 w-5" />
              ) : (
                <FileVideo className="h-5 w-5" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate max-w-[200px] md:max-w-[400px]">
                  {job.fileName}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {job.status === 'uploading' && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  )}
                  {job.status === 'converting' && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Converting...</span>
                    </>
                  )}
                  {job.status === 'completed' && (
                    <span className="text-green-600">Completed</span>
                  )}
                  {job.status === 'error' && (
                    <span className="text-destructive">{job.error}</span>
                  )}
                </div>
              </div>

              {(job.status === 'uploading' || job.status === 'converting') && (
                <Progress value={job.progress} className="h-1.5" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
