import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateJobDto {
  projectId: string;
  summary: string;
  style: string;
  numPanels: number;
}

export interface JobResponse {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  currentStep?: string;
  progressCurrent?: number;
  progressTotal?: number;
  panels?: any[];
  pageImageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComicApiService {
  // Nhờ proxy.conf.json, đường dẫn `/api` sẽ tự động chuyển hướng về backend (ví dụ: http://localhost:3000/api)
  private readonly baseUrl = '/api/generation-jobs';

  constructor(private http: HttpClient) {}

  // 1. Tạo Job tạo truyện mới
  createComicJob(dto: CreateJobDto): Observable<JobResponse> {
    return this.http.post<JobResponse>(this.baseUrl, dto);
  }

  // 2. Poll trạng thái Job
  getJobStatus(jobId: string): Observable<JobResponse> {
    return this.http.get<JobResponse>(`${this.baseUrl}/${jobId}`);
  }

  // 3. Hủy Job
  cancelJob(jobId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${jobId}`);
  }
}
