import { getApiBaseUrl } from '@/lib/apiConfig';

const API_BASE_URL = getApiBaseUrl();

export interface AudioFileResponse {
  id: string;
  conversionId: string;
  name: string;
  originalVideoName: string;
  coverImage: string | null;
  duration: number;
  createdAt: string;
  audioUrl: string;
  volume: number;
  trimStart: number;
  trimEnd: number;
}

export interface ConversionStartResponse {
  conversionId: string;
  message: string;
  originalName: string;
}

export interface ConversionProgress {
  status: 'pending' | 'converting' | 'completed' | 'error';
  progress: number;
  audioFile?: AudioFileResponse;
  error?: string;
}

class MediaApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Get full URL for static files
  getFileUrl(path: string): string {
    if (path.startsWith('http')) return path;
    return `${this.baseUrl}${path}`;
  }

  // Convert video to MP3
  async startConversion(file: File): Promise<ConversionStartResponse> {
    const formData = new FormData();
    formData.append('video', file);

    const response = await fetch(`${this.baseUrl}/api/convert`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start conversion');
    }

    return response.json();
  }

  // Subscribe to conversion progress via SSE
  subscribeToProgress(
    conversionId: string,
    onProgress: (data: ConversionProgress) => void,
    onError: (error: Error) => void
  ): () => void {
    const eventSource = new EventSource(
      `${this.baseUrl}/api/convert/${conversionId}/progress`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onProgress(data);

        if (data.status === 'completed' || data.status === 'error') {
          eventSource.close();
        }
      } catch (err) {
        onError(new Error('Failed to parse progress data'));
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      onError(new Error('Connection to server lost'));
      eventSource.close();
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  }

  // Get all audio files
  async getAudioFiles(): Promise<AudioFileResponse[]> {
    const response = await fetch(`${this.baseUrl}/api/audio`);

    if (!response.ok) {
      throw new Error('Failed to fetch audio files');
    }

    return response.json();
  }

  // Get single audio file
  async getAudioFile(id: string): Promise<AudioFileResponse> {
    const response = await fetch(`${this.baseUrl}/api/audio/${id}`);

    if (!response.ok) {
      throw new Error('Audio file not found');
    }

    return response.json();
  }

  // Update audio file metadata
  async updateAudioFile(
    id: string,
    updates: Partial<Pick<AudioFileResponse, 'name' | 'coverImage' | 'volume' | 'trimStart' | 'trimEnd'>>
  ): Promise<AudioFileResponse> {
    const response = await fetch(`${this.baseUrl}/api/audio/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update audio file');
    }

    return response.json();
  }

  // Upload cover image
  async uploadCoverImage(id: string, file: File): Promise<AudioFileResponse> {
    const formData = new FormData();
    formData.append('cover', file);

    const response = await fetch(`${this.baseUrl}/api/audio/${id}/cover`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload cover image');
    }

    return response.json();
  }

  // Delete audio file
  async deleteAudioFile(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/audio/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete audio file');
    }
  }

  // Download processed audio
  downloadAudio(id: string, fileName: string): void {
    const url = `${this.baseUrl}/api/audio/${id}/download`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Apply edits permanently
  async applyEdits(
    id: string,
    edits: { volume?: number; trimStart?: number; trimEnd?: number }
  ): Promise<AudioFileResponse> {
    const response = await fetch(`${this.baseUrl}/api/audio/${id}/apply-edits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(edits),
    });

    if (!response.ok) {
      throw new Error('Failed to apply edits');
    }

    return response.json();
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const mediaApi = new MediaApiService(API_BASE_URL);
