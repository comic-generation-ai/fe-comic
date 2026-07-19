import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComicApiService, CreateJobResponse, JobStatusResponse } from './comic-api.service';

describe('ComicApiService', () => {
  let service: ComicApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ComicApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('createComicJob() gửi POST /api/generation-jobs với đúng payload', () => {
    const response: CreateJobResponse = { jobId: 'job-1', status: 'QUEUED' };

    service.createComicJob({ projectId: 'p1', summary: 'tom tat', style: 'anime', numPanels: 4 }).subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpMock.expectOne('/api/generation-jobs');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ projectId: 'p1', summary: 'tom tat', style: 'anime', numPanels: 4 });
    req.flush(response);
  });

  it('getJobStatus() gửi GET /api/generation-jobs/:id', () => {
    const response: JobStatusResponse = { localJob: { id: 'job-1', status: 'RUNNING' }, liveStatus: null };

    service.getJobStatus('job-1').subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpMock.expectOne('/api/generation-jobs/job-1');
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });

  it('cancelJob() gửi DELETE /api/generation-jobs/:id', () => {
    service.cancelJob('job-1').subscribe();

    const req = httpMock.expectOne('/api/generation-jobs/job-1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});
