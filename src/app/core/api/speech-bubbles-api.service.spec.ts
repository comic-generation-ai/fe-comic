import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SpeechBubbleDto } from './frames-api.service';
import { CreateSpeechBubbleRequest, SpeechBubblesApiService, UpdateSpeechBubbleRequest } from './speech-bubbles-api.service';

describe('SpeechBubblesApiService', () => {
  let service: SpeechBubblesApiService;
  let httpMock: HttpTestingController;

  const bubble: SpeechBubbleDto = {
    id: 'b1', frame_id: 'f1', text_content: 'Xin chao', bubble_type: 'SPEECH',
    pos_x: 10, pos_y: 10, width: 100, height: 80, tail_direction: 'down', style_config: {},
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SpeechBubblesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('create() gửi POST /api/speech-bubbles', () => {
    const payload: CreateSpeechBubbleRequest = {
      frameId: 'f1', textContent: 'Xin chao', bubbleType: 'SPEECH', posX: 10, posY: 10, width: 100, height: 80,
    };

    service.create(payload).subscribe((res) => expect(res).toEqual(bubble));

    const req = httpMock.expectOne('/api/speech-bubbles');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(bubble);
  });

  it('update() gửi PATCH /api/speech-bubbles/:id', () => {
    const payload: UpdateSpeechBubbleRequest = { textContent: 'Doi loi thoai' };

    service.update('b1', payload).subscribe((res) => expect(res).toEqual(bubble));

    const req = httpMock.expectOne('/api/speech-bubbles/b1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);
    req.flush(bubble);
  });

  it('remove() gửi DELETE /api/speech-bubbles/:id', () => {
    service.remove('b1').subscribe((res) => expect(res).toEqual(bubble));

    const req = httpMock.expectOne('/api/speech-bubbles/b1');
    expect(req.request.method).toBe('DELETE');
    req.flush(bubble);
  });
});
