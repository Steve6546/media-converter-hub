export interface AudioFile {
  id: string;
  name: string;
  originalVideoName: string;
  coverImage: string | null;
  duration: number;
  createdAt: Date;
  audioUrl: string;
  volume: number;
  normalize: boolean;
  trimStart: number;
  trimEnd: number;
  fadeIn: number;   // 0 to 2 seconds
  fadeOut: number;  // 0 to 2 seconds
}

export interface ConversionJob {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'converting' | 'completed' | 'error';
  error?: string;
}

export type SupportedVideoFormat =
  | 'video/mp4'
  | 'video/quicktime'
  | 'video/x-matroska'
  | 'video/x-msvideo'
  | 'video/webm';

export const SUPPORTED_FORMATS: Record<string, SupportedVideoFormat> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
};

export const ACCEPTED_VIDEO_TYPES = Object.values(SUPPORTED_FORMATS);
