import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Project, ProjectApiService, ProjectDetail } from './project-api.service';

describe('ProjectApiService', () => {
  let service: ProjectApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('createProject() gửi POST /api/projects với payload đầy đủ', () => {
    const project: Project = {
      id: 'p1', title: 'Truyen 1', genre: null, art_style: null, status: 'DRAFT', credits_used: 0, created_at: '2026-01-01',
    };

    service
      .createProject({ title: 'Truyen 1', rawPrompt: 'tom tat', genre: 'fantasy', artStyle: 'anime' })
      .subscribe((res) => expect(res).toEqual(project));

    const req = httpMock.expectOne('/api/projects');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Truyen 1', rawPrompt: 'tom tat', genre: 'fantasy', artStyle: 'anime' });
    req.flush(project);
  });

  it('getMyProjects() gửi GET /api/projects', () => {
    const projects: Project[] = [];

    service.getMyProjects().subscribe((res) => expect(res).toEqual(projects));

    const req = httpMock.expectOne('/api/projects');
    expect(req.request.method).toBe('GET');
    req.flush(projects);
  });

  it('getProject() gửi GET /api/projects/:id', () => {
    const detail: ProjectDetail = {
      id: 'p1', title: 'Truyen 1', genre: null, art_style: null, status: 'DRAFT', credits_used: 0, created_at: '2026-01-01', raw_prompt: 'tom tat',
    };

    service.getProject('p1').subscribe((res) => expect(res).toEqual(detail));

    const req = httpMock.expectOne('/api/projects/p1');
    expect(req.request.method).toBe('GET');
    req.flush(detail);
  });

  it('deleteProject() gửi DELETE /api/projects/:id', () => {
    service.deleteProject('p1').subscribe((res) => expect(res).toEqual({ id: 'p1', deleted: true }));

    const req = httpMock.expectOne('/api/projects/p1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ id: 'p1', deleted: true });
  });
});
