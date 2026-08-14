import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Project {
  id: string;
  title: string | null;
  genre: string | null;
  art_style: string | null;
  status: string;
  created_at: string;
}

export interface ProjectDetail extends Project {
  raw_prompt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectApiService {
  private readonly baseUrl = '/api/projects';

  constructor(private http: HttpClient) {}

  createProject(dto: {
    title: string;
    rawPrompt: string;
    genre?: string;
    artStyle?: string;
  }): Observable<Project> {
    return this.http.post<Project>(this.baseUrl, dto);
  }

  getMyProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.baseUrl);
  }

  getProject(id: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`${this.baseUrl}/${id}`);
  }

  deleteProject(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.http.delete<{ id: string; deleted: boolean }>(`${this.baseUrl}/${id}`);
  }
}
