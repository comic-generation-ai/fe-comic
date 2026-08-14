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

  create(dto: CreateSpeechBubbleRequest): Observable<SpeechBubbleDto> {
    return this.http.post<SpeechBubbleDto>(this.baseUrl, dto);
  }
  update(id: string, dto: UpdateSpeechBubbleRequest): Observable<SpeechBubbleDto> {
    return this.http.patch<SpeechBubbleDto>(`${this.baseUrl}/${id}`, dto);
  }
  remove(id: string): Observable<SpeechBubbleDto> {
    return this.http.delete<SpeechBubbleDto>(`${this.baseUrl}/${id}`);
  }
}
