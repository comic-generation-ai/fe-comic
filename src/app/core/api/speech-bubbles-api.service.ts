import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SpeechBubbleDto } from './frames-api.service';

// Payload khớp CreateSpeechBubbleDto / UpdateSpeechBubbleDto của be-comic
// (src/module/speech-bubbles/dto/*.ts)
export interface CreateSpeechBubbleRequest {
  frameId: string;
  textContent: string;
  bubbleType: SpeechBubbleDto['bubble_type'];
  posX: number;
  posY: number;
  width: number;
  height: number;
  tailDirection?: string;
  styleConfig?: Record<string, any>;
}

export type UpdateSpeechBubbleRequest = Partial<CreateSpeechBubbleRequest>;

@Injectable({
  providedIn: 'root',
})
export class SpeechBubblesApiService {
  private readonly baseUrl = '/api/speech-bubbles';

  constructor(private http: HttpClient) {}

  // POST /api/speech-bubbles — bong bóng vừa thêm ở FE (id tạm local) chưa tồn tại trong DB
  create(dto: CreateSpeechBubbleRequest): Observable<SpeechBubbleDto> {
    return this.http.post<SpeechBubbleDto>(this.baseUrl, dto);
  }

  // PATCH /api/speech-bubbles/:id — bong bóng đã có sẵn trong DB (do BE sinh hoặc đã save trước đó)
  update(id: string, dto: UpdateSpeechBubbleRequest): Observable<SpeechBubbleDto> {
    return this.http.patch<SpeechBubbleDto>(`${this.baseUrl}/${id}`, dto);
  }

  // DELETE /api/speech-bubbles/:id — bong bóng đã bị xoá ở FE nhưng vẫn còn tồn tại trong DB
  remove(id: string): Observable<SpeechBubbleDto> {
    return this.http.delete<SpeechBubbleDto>(`${this.baseUrl}/${id}`);
  }
}
