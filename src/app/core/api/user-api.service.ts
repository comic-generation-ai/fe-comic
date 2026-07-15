import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  subscription_tier: string;
  credits_balance: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  // Nhờ proxy.conf.json, `/api` tự động chuyển hướng về be-comic (http://localhost:3000/api)
  private readonly baseUrl = '/api/users';

  constructor(private http: HttpClient) {}

  getMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/me`);
  }
}
