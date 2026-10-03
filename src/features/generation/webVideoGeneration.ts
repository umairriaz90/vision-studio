import type { JobResponse, JobStatus, VideoGenerationParams } from '@/types/electron';

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';

function backendUrl(): string {
  return (import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendUrl()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.detail || `Backend request failed (${response.status}).`);
  }
  return payload as T;
}

/** Browser equivalent of the Electron video IPC surface. */
export const webVideoGeneration = {
  generateVideo: async (params: VideoGenerationParams): Promise<JobResponse> => {
    if (params.image_path) {
      return {
        success: false,
        error: 'Image-to-video from a local file is available in the desktop app. Use text-to-video in the web app.',
      };
    }

    const result = await request<{ job_id: string }>('/api/generate/video', {
      method: 'POST',
      body: JSON.stringify({ ...params, image_path: null, seed: params.seed ?? -1 }),
    });
    return { success: true, jobId: result.job_id };
  },

  getStatus: (jobId: string) => request<JobStatus>(`/api/jobs/${encodeURIComponent(jobId)}`),
};

export function isWebVideoGenerationAvailable(): boolean {
  return typeof window !== 'undefined' && !window.electron;
}
