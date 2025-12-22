import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AudioFile, ConversionJob } from '@/types/media';
import { mediaApi, AudioFileResponse } from '@/services/mediaApi';
import { toast } from 'sonner';
import { createClientId } from '@/lib/id';

interface MediaContextType {
  audioFiles: AudioFile[];
  conversionJobs: ConversionJob[];
  isLoading: boolean;
  isBackendConnected: boolean;
  addAudioFile: (file: AudioFile) => void;
  updateAudioFile: (id: string, updates: Partial<AudioFile>) => void;
  deleteAudioFile: (id: string) => void;
  startConversion: (file: File) => Promise<void>;
  downloadAudio: (audioFile: AudioFile) => void;
  uploadCoverImage: (id: string, file: File) => Promise<void>;
  applyEdits: (id: string, edits: { volume?: number; trimStart?: number; trimEnd?: number }) => Promise<void>;
  refreshAudioFiles: () => Promise<void>;
}

const MediaContext = createContext<MediaContextType | null>(null);

export const useMedia = () => {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
};

// Convert API response to AudioFile type
const mapApiResponseToAudioFile = (response: AudioFileResponse): AudioFile => ({
  id: response.id,
  name: response.name,
  originalVideoName: response.originalVideoName,
  coverImage: response.coverImage ? mediaApi.getFileUrl(response.coverImage) : null,
  duration: response.duration,
  createdAt: new Date(response.createdAt),
  audioUrl: mediaApi.getFileUrl(response.audioUrl),
  volume: response.volume,
  normalize: (response as any).normalize ?? false,
  trimStart: response.trimStart,
  trimEnd: response.trimEnd,
  fadeIn: (response as any).fadeIn ?? 0,
  fadeOut: (response as any).fadeOut ?? 0,
});

export const MediaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [conversionJobs, setConversionJobs] = useState<ConversionJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Check backend connection and load initial data
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        const isConnected = await mediaApi.healthCheck();
        setIsBackendConnected(isConnected);

        if (isConnected) {
          const files = await mediaApi.getAudioFiles();
          setAudioFiles(files.map(mapApiResponseToAudioFile));
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
        setIsBackendConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const refreshAudioFiles = useCallback(async () => {
    try {
      const files = await mediaApi.getAudioFiles();
      setAudioFiles(files.map(mapApiResponseToAudioFile));
    } catch (error) {
      console.error('Failed to refresh audio files:', error);
    }
  }, []);

  const addAudioFile = useCallback((file: AudioFile) => {
    setAudioFiles((prev) => [file, ...prev]);
  }, []);

  const updateAudioFile = useCallback(async (id: string, updates: Partial<AudioFile>) => {
    try {
      // Update local state optimistically
      setAudioFiles((prev) =>
        prev.map((file) => (file.id === id ? { ...file, ...updates } : file))
      );

      // Sync with backend
      await mediaApi.updateAudioFile(id, {
        name: updates.name,
        volume: updates.volume,
        trimStart: updates.trimStart,
        trimEnd: updates.trimEnd,
      });

      toast.success('Audio file updated');
    } catch (error) {
      toast.error('Failed to update audio file');
      // Revert on error
      refreshAudioFiles();
    }
  }, [refreshAudioFiles]);

  const deleteAudioFile = useCallback(async (id: string) => {
    try {
      await mediaApi.deleteAudioFile(id);
      setAudioFiles((prev) => prev.filter((file) => file.id !== id));
      toast.success('Audio file deleted');
    } catch (error) {
      toast.error('Failed to delete audio file');
    }
  }, []);

  const startConversion = useCallback(async (file: File): Promise<void> => {
    const jobId = createClientId();

    const job: ConversionJob = {
      id: jobId,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    };

    setConversionJobs((prev) => [...prev, job]);

    try {
      // Start the conversion
      const { conversionId } = await mediaApi.startConversion(file);

      // Update job with conversion ID
      setConversionJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, status: 'converting' as const } : j
        )
      );

      // Subscribe to progress updates
      mediaApi.subscribeToProgress(
        conversionId,
        (data) => {
          setConversionJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? {
                  ...j,
                  progress: data.progress,
                  status: data.status === 'error' ? 'error' :
                    data.status === 'completed' ? 'completed' :
                      data.status === 'converting' ? 'converting' : 'uploading',
                  error: data.error,
                }
                : j
            )
          );

          // When completed, add the audio file
          if (data.status === 'completed' && data.audioFile) {
            const audioFile = mapApiResponseToAudioFile(data.audioFile);
            addAudioFile(audioFile);
            toast.success(`Successfully converted ${file.name}`);

            // Remove completed job after delay
            setTimeout(() => {
              setConversionJobs((prev) => prev.filter((j) => j.id !== jobId));
            }, 3000);
          }

          if (data.status === 'error') {
            toast.error(`Failed to convert ${file.name}: ${data.error}`);
          }
        },
        (error) => {
          setConversionJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? { ...j, status: 'error' as const, error: error.message }
                : j
            )
          );
          toast.error(`Conversion error: ${error.message}`);
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start conversion';
      setConversionJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: 'error' as const, error: message }
            : j
        )
      );
      toast.error(`Failed to start conversion for ${file.name}: ${message}`);
    }
  }, [addAudioFile]);

  const downloadAudio = useCallback((audioFile: AudioFile) => {
    mediaApi.downloadAudio(audioFile.id, audioFile.name);
    toast.success(`Downloading ${audioFile.name}.mp3`);
  }, []);

  const uploadCoverImage = useCallback(async (id: string, file: File) => {
    try {
      const updatedFile = await mediaApi.uploadCoverImage(id, file);
      const audioFile = mapApiResponseToAudioFile(updatedFile);

      setAudioFiles((prev) =>
        prev.map((f) => (f.id === id ? audioFile : f))
      );

      toast.success('Cover image updated');
    } catch (error) {
      toast.error('Failed to upload cover image');
    }
  }, []);

  const applyEdits = useCallback(async (id: string, edits: { volume?: number; trimStart?: number; trimEnd?: number }) => {
    try {
      toast.loading('Applying edits...', { id: 'apply-edits' });

      const updatedFile = await mediaApi.applyEdits(id, edits);
      const audioFile = mapApiResponseToAudioFile(updatedFile);

      setAudioFiles((prev) =>
        prev.map((f) => (f.id === id ? audioFile : f))
      );

      toast.success('Edits applied successfully', { id: 'apply-edits' });
    } catch (error) {
      toast.error('Failed to apply edits', { id: 'apply-edits' });
    }
  }, []);

  return (
    <MediaContext.Provider
      value={{
        audioFiles,
        conversionJobs,
        isLoading,
        isBackendConnected,
        addAudioFile,
        updateAudioFile,
        deleteAudioFile,
        startConversion,
        downloadAudio,
        uploadCoverImage,
        applyEdits,
        refreshAudioFiles,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
};
