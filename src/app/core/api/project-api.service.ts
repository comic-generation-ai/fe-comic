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

@Injectable({
  providedIn: 'root',
})
export class ProjectApiService {
  // Nhờ proxy.conf.json, `/api` tự động chuyển hướng về be-comic (http://localhost:3000/api)
  private readonly baseUrl = '/api/projects';

  constructor(private http: HttpClient) {}

  // GET /api/projects — được guard JWT, chỉ trả project của user đang đăng nhập
  getMyProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.baseUrl);
  }
}
