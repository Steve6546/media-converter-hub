export type StudioTool = 'compress' | 'enhance' | 'thumbnails' | 'subtitles' | 'image';

export type StudioJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface StudioFile {
  name: string;
  url: string;
  size: number;
}

export interface StudioJobResult {
  files?: StudioFile[];
  thumbnails?: StudioFile[];
  subtitles?: StudioFile[];
  warnings?: string[];
}

export interface StudioJob {
  id: string;
  tool: StudioTool;
  fileName: string;
  status: StudioJobStatus;
  progress: number;
  result?: StudioJobResult;
  error?: string;
}
