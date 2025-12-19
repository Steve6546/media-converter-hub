export interface AudioFile {
  id: string;
  name: string;
  originalVideoName: string;
  coverImage: string | null;
  duration: number;
  createdAt: Date;
  audioUrl: string;
  volume: number;
  trimStart: number;
  trimEnd: number;
}

export interface ConversionJob {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'converting' | 'completed' | 'error';
  error?: string;
}

export type SupportedVideoFormat = 'video/mp4' | 'video/quicktime' | 'video/x-matroska' | 'video/x-msvideo';

export const SUPPORTED_FORMATS: Record<string, SupportedVideoFormat> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
};

export const ACCEPTED_VIDEO_TYPES = Object.values(SUPPORTED_FORMATS);
