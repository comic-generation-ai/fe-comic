import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Project {
  id: string;
  title: string | null;
  genre: string | null;
  art_style: string | null;
  status: string;
  credits_used: number;
  created_at: string;
}

// Chi tiết project — findOne (be-comic) trả thêm raw_prompt so với list findAll
export interface ProjectDetail extends Project {
  raw_prompt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectApiService {
  // Nhờ proxy.conf.json, `/api` tự động chuyển hướng về be-comic (http://localhost:3000/api)
  private readonly baseUrl = '/api/projects';

  constructor(private http: HttpClient) {}

  // POST /api/projects — được guard JWT, project tạo ra gắn với user đang đăng nhập
  createProject(dto: {
    title: string;
    rawPrompt: string;
    genre?: string;
    artStyle?: string;
  }): Observable<Project> {
    return this.http.post<Project>(this.baseUrl, dto);
  }

  // GET /api/projects — được guard JWT, chỉ trả project của user đang đăng nhập
  getMyProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.baseUrl);
  }

  // GET /api/projects/:id — dùng khi mở lại 1 project có sẵn từ story-board
  getProject(id: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`${this.baseUrl}/${id}`);
  }

  // DELETE /api/projects/:id — guard JWT + kiểm tra chủ sở hữu ở BE
  deleteProject(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.http.delete<{ id: string; deleted: boolean }>(`${this.baseUrl}/${id}`);
  }
}
