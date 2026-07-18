import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// SpeechBubbleDto thật của be-comic (src/module/speech-bubbles/entities/speech-bubble.entity.ts)
export interface SpeechBubbleDto {
  id: string;
  frame_id: string;
  text_content: string;
  bubble_type: 'SPEECH' | 'THOUGHT' | 'NARRATION' | 'SHOUT';
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  tail_direction: string | null;
  style_config: Record<string, any>;
}

// FrameDto thật của be-comic (src/module/frames/entities/frame.entity.ts)
export interface FrameDto {
  id: string;
  project_id: string;
  order_index: number;
  image_prompt: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  caption_vi: string | null;
  seed: number | null;
  speech_bubbles?: SpeechBubbleDto[];
}

export interface FrameImageUrlResponse {
  url: string;
  expiresInSec: number;
}

@Injectable({
  providedIn: 'root',
})
export class FramesApiService {
  private readonly baseUrl = '/api/frames';

  constructor(private http: HttpClient) {}

  // GET /api/frames?projectId=xxx — toàn bộ frame (ảnh) đã sinh của 1 project, sắp theo order_index
  getFramesByProject(projectId: string): Observable<FrameDto[]> {
    return this.http.get<FrameDto[]>(this.baseUrl, { params: { projectId } });
  }

  // GET /api/frames/:id/image-url — image_url lưu trong DB chỉ là object key MinIO,
  // phải đổi thành presigned URL mới hiển thị được trực tiếp trên <img>
  getFrameImageUrl(frameId: string): Observable<FrameImageUrlResponse> {
    return this.http.get<FrameImageUrlResponse>(`${this.baseUrl}/${frameId}/image-url`);
  }
}
