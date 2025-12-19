import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AudioFile, ConversionJob } from '@/types/media';
import { toast } from 'sonner';

interface MediaContextType {
  audioFiles: AudioFile[];
  conversionJobs: ConversionJob[];
  addAudioFile: (file: AudioFile) => void;
  updateAudioFile: (id: string, updates: Partial<AudioFile>) => void;
  deleteAudioFile: (id: string) => void;
  startConversion: (file: File) => Promise<void>;
  downloadAudio: (audioFile: AudioFile) => void;
}

const MediaContext = createContext<MediaContextType | null>(null);

export const useMedia = () => {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
};

// Simulated backend API calls - these would be replaced with real FFmpeg backend
const simulateConversion = async (
  file: File,
  onProgress: (progress: number) => void
): Promise<{ audioUrl: string; duration: number }> => {
  // Simulate upload progress
  for (let i = 0; i <= 30; i += 5) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    onProgress(i);
  }

  // Simulate conversion progress
  for (let i = 30; i <= 100; i += 10) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    onProgress(i);
  }

  // In a real implementation, this would return the URL from the backend
  // For now, we create a placeholder audio URL
  const audioUrl = URL.createObjectURL(new Blob([file], { type: 'audio/mpeg' }));
  const duration = Math.floor(Math.random() * 300) + 60; // Random duration between 60-360 seconds

  return { audioUrl, duration };
};

export const MediaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [conversionJobs, setConversionJobs] = useState<ConversionJob[]>([]);

  const addAudioFile = useCallback((file: AudioFile) => {
    setAudioFiles((prev) => [file, ...prev]);
  }, []);

  const updateAudioFile = useCallback((id: string, updates: Partial<AudioFile>) => {
    setAudioFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, ...updates } : file))
    );
    toast.success('Audio file updated');
  }, []);

  const deleteAudioFile = useCallback((id: string) => {
    setAudioFiles((prev) => prev.filter((file) => file.id !== id));
    toast.success('Audio file deleted');
  }, []);

  const startConversion = useCallback(async (file: File) => {
    const jobId = crypto.randomUUID();

    const job: ConversionJob = {
      id: jobId,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    };

    setConversionJobs((prev) => [...prev, job]);

    try {
      const updateProgress = (progress: number) => {
        setConversionJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  progress,
                  status: progress < 30 ? 'uploading' : 'converting',
                }
              : j
          )
        );
      };

      const { audioUrl, duration } = await simulateConversion(file, updateProgress);

      const audioFile: AudioFile = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        originalVideoName: file.name,
        coverImage: null,
        duration,
        createdAt: new Date(),
        audioUrl,
        volume: 100,
        trimStart: 0,
        trimEnd: duration,
      };

      addAudioFile(audioFile);

      setConversionJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, progress: 100, status: 'completed' } : j
        )
      );

      toast.success(`Successfully converted ${file.name}`);

      // Remove completed job after delay
      setTimeout(() => {
        setConversionJobs((prev) => prev.filter((j) => j.id !== jobId));
      }, 3000);
    } catch (error) {
      setConversionJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: 'error', error: 'Conversion failed' }
            : j
        )
      );
      toast.error(`Failed to convert ${file.name}`);
    }
  }, [addAudioFile]);

  const downloadAudio = useCallback((audioFile: AudioFile) => {
    // In a real implementation, this would fetch the processed audio from the backend
    // with applied volume and trim settings
    const link = document.createElement('a');
    link.href = audioFile.audioUrl;
    link.download = `${audioFile.name}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading ${audioFile.name}.mp3`);
  }, []);

  return (
    <MediaContext.Provider
      value={{
        audioFiles,
        conversionJobs,
        addAudioFile,
        updateAudioFile,
        deleteAudioFile,
        startConversion,
        downloadAudio,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
};
