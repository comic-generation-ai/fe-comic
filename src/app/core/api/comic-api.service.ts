import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateJobDto {
  projectId: string;
  summary: string;
  style: string;
  numPanels: number;
}

export interface CreateJobResponse {
  jobId: string;
  status: 'QUEUED' | 'RUNNING';
}
export interface Panel {
  index: number;
  captionVi: string;
  imageUrl: string;
  promptEn: string;
  seed: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}

export interface LiveStatus {
  jobId: string;
  status: number; // enum số của orchestrator: 2=STORY_GENERATING, 4=IMAGE_GENERATING, 6=SUCCESS, 7=FAILED, 8=CANCELLED
  progressCurrent: number;
  progressTotal: number;
  pageImageUrl: string;
  errorMessage: string;
  currentStep: string;
  panels: Panel[];
}

export interface LocalJob {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  error_message?: string;
}

export interface JobStatusResponse {
  localJob: LocalJob;
  liveStatus: LiveStatus | null;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComicApiService {
  private readonly baseUrl = '/api/generation-jobs';

  constructor(private http: HttpClient) {}
  createComicJob(dto: CreateJobDto): Observable<CreateJobResponse> {
    return this.http.post<CreateJobResponse>(this.baseUrl, dto);
  }

  getJobStatus(jobId: string): Observable<JobStatusResponse> {
    return this.http.get<JobStatusResponse>(`${this.baseUrl}/${jobId}`);
  }
  cancelJob(jobId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${jobId}`);
  }
}
