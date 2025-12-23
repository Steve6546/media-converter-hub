import { getApiBaseUrl } from '@/lib/apiConfig';

const API_BASE_URL = getApiBaseUrl();

export interface StudioJobResponse {
  jobId: string;
}

export interface StudioJobProgress {
  id: string;
  tool: string;
  status: string;
  progress: number;
  result?: unknown;
  error?: string | null;
}

export interface StudioJobAssets {
  subtitle?: File;
}

class StudioApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getFileUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return `${this.baseUrl}${path}`;
  }

  async startJob(
    tool: string,
    file: File,
    options: Record<string, unknown>,
    assets?: StudioJobAssets
  ): Promise<StudioJobResponse> {
    const formData = new FormData();
    formData.append('tool', tool);
    formData.append('options', JSON.stringify(options));
    formData.append('file', file);

    if (assets?.subtitle) {
      formData.append('subtitle', assets.subtitle);
    }

    const response = await fetch(`${this.baseUrl}/api/studio/jobs`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start studio job');
    }

    return response.json();
  }

  subscribeToProgress(
    jobId: string,
    onProgress: (data: StudioJobProgress) => void,
    onError: (error: Error) => void
  ): () => void {
    const eventSource = new EventSource(
      `${this.baseUrl}/api/studio/jobs/${jobId}/stream`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onProgress(data);

        if (data.status === 'completed' || data.status === 'failed') {
          eventSource.close();
        }
      } catch (err) {
        onError(new Error('Failed to parse studio progress'));
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      onError(new Error('Connection to server lost'));
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }

  async probeVideo(file: File): Promise<{
    duration: number;
    fileSize: number;
    totalBitrate: number;
    video: {
      width: number;
      height: number;
      fps: number;
      codec: string;
      bitrate: number;
      profile: string | null;
      pixelFormat: string | null;
    };
    audio: {
      codec: string;
      bitrate: number;
      channels: number;
      sampleRate: number;
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/studio/probe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to probe video');
    }

    return response.json();
  }
}

export const studioApi = new StudioApiService(API_BASE_URL);
