import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FrameDto, FrameImageUrlResponse, FramesApiService } from './frames-api.service';

describe('FramesApiService', () => {
  let service: FramesApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FramesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getFramesByProject() gửi GET /api/frames kèm query projectId', () => {
    const frames: FrameDto[] = [];

    service.getFramesByProject('p1').subscribe((res) => expect(res).toEqual(frames));

    const req = httpMock.expectOne((r) => r.url === '/api/frames' && r.params.get('projectId') === 'p1');
    expect(req.request.method).toBe('GET');
    req.flush(frames);
  });

  it('getFrameImageUrl() gửi GET /api/frames/:id/image-url', () => {
    const response: FrameImageUrlResponse = { url: 'https://minio/x.png', expiresInSec: 3600 };

    service.getFrameImageUrl('f1').subscribe((res) => expect(res).toEqual(response));

    const req = httpMock.expectOne('/api/frames/f1/image-url');
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });
});
