import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { StudioJob, StudioJobResult, StudioTool, StudioJobStatus } from '@/types/studio';
import { studioApi, StudioJobAssets, StudioJobProgress } from '@/services/studioApi';
import { toast } from 'sonner';
import { createClientId } from '@/lib/id';

interface StudioContextType {
  studioJobs: StudioJob[];
  startStudioJob: (
    tool: StudioTool,
    file: File,
    options: Record<string, unknown>,
    assets?: StudioJobAssets
  ) => Promise<void>;
  clearStudioJobs: () => void;
}

const StudioContext = createContext<StudioContextType | null>(null);

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};

const mapStatus = (status: string): StudioJobStatus => {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'active') return 'running';
  return 'queued';
};

const mapResult = (result: unknown): StudioJobResult | undefined => {
  if (!result || typeof result !== 'object') return undefined;
  return result as StudioJobResult;
};

export const StudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [studioJobs, setStudioJobs] = useState<StudioJob[]>([]);

  const startStudioJob = useCallback(
    async (
      tool: StudioTool,
      file: File,
      options: Record<string, unknown>,
      assets?: StudioJobAssets
    ) => {
      const localId = createClientId();
      try {
        const response = await studioApi.startJob(tool, file, options, assets);
        const jobId = String(response.jobId);

        const job: StudioJob = {
          id: jobId,
          tool,
          fileName: file.name,
          status: 'queued',
          progress: 0,
        };

        setStudioJobs((prev) => [job, ...prev]);

        studioApi.subscribeToProgress(
          jobId,
          (data: StudioJobProgress) => {
            if (data.status === 'not_found' || data.status === 'error') {
              const message =
                typeof data.error === 'string' && data.error
                  ? data.error
                  : data.status === 'not_found'
                  ? 'Job not found'
                  : 'Failed to load job';
              setStudioJobs((prev) =>
                prev.map((item) =>
                  item.id === jobId
                    ? { ...item, status: 'failed', error: message }
                    : item
                )
              );
              return;
            }

            const status = mapStatus(data.status);
            const result = mapResult(data.result);
            const progress = typeof data.progress === 'number' ? data.progress : 0;

            setStudioJobs((prev) =>
              prev.map((item) =>
                item.id === jobId
                  ? {
                      ...item,
                      status,
                      progress,
                      result,
                      error: data.error || undefined,
                    }
                  : item
              )
            );

            if (status === 'completed') {
              toast.success(`${tool} job completed`);
            }

            if (status === 'failed') {
              toast.error(`${tool} job failed: ${data.error || 'Unknown error'}`);
            }
          },
          (error) => {
            setStudioJobs((prev) =>
              prev.map((item) =>
                item.id === jobId
                  ? { ...item, status: 'failed', error: error.message }
                  : item
              )
            );
            toast.error(`${tool} job failed: ${error.message}`);
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to queue job';
        setStudioJobs((prev) => [
          {
            id: localId,
            tool,
            fileName: file.name,
            status: 'failed',
            progress: 0,
            error: message,
          },
          ...prev,
        ]);
        toast.error(message);
      }
    },
    []
  );

  const clearStudioJobs = useCallback(() => {
    setStudioJobs([]);
  }, []);

  return (
    <StudioContext.Provider
      value={{
        studioJobs,
        startStudioJob,
        clearStudioJobs,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};
