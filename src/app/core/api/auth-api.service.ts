import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// be-comic (ResponseCommon) luôn trả cùng 1 envelope, kể cả khi thất bại
// (email không tồn tại, sai mật khẩu...) — HTTP status set thủ công nên
// những trường hợp đó rơi vào nhánh `error` của HttpClient, không phải `next`.
export interface ApiEnvelope<T> {
  success: boolean;
  code: number;
  message: string;
  data: T | null;
}

export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  fullName: string;
}

export interface LoginResult {
  email: string;
  token: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  // Nhờ proxy.conf.json, `/api` tự động chuyển hướng về be-comic (http://localhost:3000/api)
  private readonly baseUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  register(payload: RegisterPayload): Observable<ApiEnvelope<RegisteredUser>> {
    return this.http.post<ApiEnvelope<RegisteredUser>>(`${this.baseUrl}/register`, payload);
  }

  login(payload: LoginPayload): Observable<ApiEnvelope<LoginResult>> {
    return this.http.post<ApiEnvelope<LoginResult>>(`${this.baseUrl}/login`, payload);
  }
}
