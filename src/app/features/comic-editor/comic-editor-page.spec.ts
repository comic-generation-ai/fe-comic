import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { ComicEditorPage } from './comic-editor-page';
import { ComicApiService, CreateJobResponse, JobStatusResponse } from '../../core/api/comic-api.service';
import { ProjectApiService, Project, ProjectDetail } from '../../core/api/project-api.service';
import { FrameDto, FramesApiService } from '../../core/api/frames-api.service';

function setup(opts: {
  projectId?: string | null;
  comicApi?: Partial<Record<'createComicJob' | 'getJobStatus' | 'cancelJob', any>>;
  projectApi?: Partial<Record<'createProject' | 'getProject' | 'getMyProjects' | 'deleteProject', any>>;
  framesApi?: Partial<Record<'getFramesByProject' | 'getFrameImageUrl', any>>;
} = {}) {
  const fakeComicApi = {
    createComicJob: vi.fn(),
    getJobStatus: vi.fn(),
    cancelJob: vi.fn(),
    ...opts.comicApi,
  };
  const fakeProjectApi = {
    createProject: vi.fn(),
    getProject: vi.fn(),
    getMyProjects: vi.fn(),
    deleteProject: vi.fn(),
    ...opts.projectApi,
  };
  const fakeFramesApi = {
    getFramesByProject: vi.fn(),
    getFrameImageUrl: vi.fn(),
    ...opts.framesApi,
  };
  const fakeRoute = {
    snapshot: { queryParamMap: { get: (k: string) => (k === 'projectId' ? opts.projectId ?? null : null) } },
  };
  const fakeRouter = { navigate: vi.fn() };

  TestBed.configureTestingModule({
    imports: [ComicEditorPage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ComicApiService, useValue: fakeComicApi },
      { provide: ProjectApiService, useValue: fakeProjectApi },
      { provide: FramesApiService, useValue: fakeFramesApi },
      { provide: ActivatedRoute, useValue: fakeRoute },
      { provide: Router, useValue: fakeRouter },
    ],
  });

  const fixture: ComponentFixture<ComicEditorPage> = TestBed.createComponent(ComicEditorPage);
  const component = fixture.componentInstance;
  return { fixture, component, fakeComicApi, fakeProjectApi, fakeFramesApi, fakeRouter };
}

describe('ComicEditorPage', () => {
  it('should create', () => {
    const { fixture, component } = setup();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('checkValidation() / onInputChange()', () => {
    it('form không hợp lệ khi thiếu tiêu đề hoặc kịch bản', () => {
      const { component } = setup();
      expect(component.isFormValid).toBe(false);
    });

    it('form hợp lệ khi đủ tiêu đề, kịch bản, phong cách và số khung > 0', () => {
      const { component } = setup();

      component.onInputChange('storyTitle', 'Truyen cua toi');
      component.onInputChange('storyScript', 'Ngay xua ngay xua');
      component.onInputChange('artStyle', 'anime');
      component.onInputChange('selectedFrames', 4);

      expect(component.isFormValid).toBe(true);
    });

    it('chuỗi chỉ toàn khoảng trắng không được coi là hợp lệ', () => {
      const { component } = setup();

      component.onInputChange('storyTitle', '   ');
      component.onInputChange('storyScript', 'Ngay xua ngay xua');

      expect(component.isFormValid).toBe(false);
    });
  });

  describe('generateComic()', () => {
    it('không gọi API nào khi form chưa hợp lệ', () => {
      const { component, fakeProjectApi } = setup();

      component.generateComic();

      expect(fakeProjectApi.createProject).not.toHaveBeenCalled();
    });

    it('luồng thành công: tạo project rồi tạo job, cập nhật generatedResult và bắt đầu polling', () => {
      const project: Project = {
        id: 'p1', title: 'T', genre: null, art_style: 'anime', status: 'DRAFT', credits_used: 0, created_at: '2026-01-01',
      };
      const jobRes: CreateJobResponse = { jobId: 'job-1', status: 'QUEUED' };
      const { component, fakeProjectApi, fakeComicApi } = setup({
        projectApi: { createProject: vi.fn(() => of(project)) },
        comicApi: { createComicJob: vi.fn(() => of(jobRes)), getJobStatus: vi.fn(() => of({ localJob: { id: 'job-1', status: 'RUNNING' }, liveStatus: null } as JobStatusResponse)) },
      });
      component.onInputChange('storyTitle', 'T');
      component.onInputChange('storyScript', 'S');

      component.generateComic();

      expect(fakeProjectApi.createProject).toHaveBeenCalledWith({ title: 'T', rawPrompt: 'S', artStyle: 'manga' });
      expect(fakeComicApi.createComicJob).toHaveBeenCalledWith({ projectId: 'p1', summary: 'S', style: 'manga', numPanels: 4 });
      expect(component.viewMode).toBe('edit');
      expect(component.generatedResult?.jobId).toBe('job-1');
    });

    it('lỗi khi tạo project/job: hiển thị thông báo lỗi từ response, dừng trạng thái isGenerating', () => {
      const { component, fakeProjectApi } = setup({
        projectApi: { createProject: vi.fn(() => throwError(() => ({ error: { message: 'Hết credit' } }))) },
      });
      component.onInputChange('storyTitle', 'T');
      component.onInputChange('storyScript', 'S');

      component.generateComic();

      expect(component.isGenerating).toBe(false);
      expect(component.generationError).toBe('Hết credit');
    });

    it('lỗi không có message cụ thể thì dùng thông báo mặc định', () => {
      const { component } = setup({
        projectApi: { createProject: vi.fn(() => throwError(() => ({}))) },
      });
      component.onInputChange('storyTitle', 'T');
      component.onInputChange('storyScript', 'S');

      component.generateComic();

      expect(component.generationError).toBe('Không thể tạo truyện tranh. Vui lòng thử lại.');
    });
  });

  describe('polling trạng thái job (startPolling/handleJobStatus)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function setupPolling(statuses: JobStatusResponse[]) {
      const project: Project = {
        id: 'p1', title: 'T', genre: null, art_style: 'manga', status: 'DRAFT', credits_used: 0, created_at: '2026-01-01',
      };
      const getJobStatus = vi.fn();
      statuses.forEach((s) => getJobStatus.mockReturnValueOnce(of(s)));

      const { component, fakeFramesApi } = setup({
        projectApi: { createProject: vi.fn(() => of(project)) },
        comicApi: { createComicJob: vi.fn(() => of({ jobId: 'job-1', status: 'QUEUED' } as CreateJobResponse)), getJobStatus },
        framesApi: { getFramesByProject: vi.fn(() => of([])) },
      });
      component.onInputChange('storyTitle', 'T');
      component.onInputChange('storyScript', 'S');
      component.generateComic();
      return { component, getJobStatus, fakeFramesApi };
    }

    it('job COMPLETED: nạp lại frame và đánh dấu hoàn tất, dừng polling', () => {
      const { component, getJobStatus, fakeFramesApi } = setupPolling([
        { localJob: { id: 'job-1', status: 'COMPLETED' }, liveStatus: null },
      ]);

      vi.advanceTimersByTime(2000);

      expect(component.isGenerating).toBe(false);
      expect(component.generatedResult?.currentStep).toBe('Hoàn tất');
      expect(fakeFramesApi.getFramesByProject).toHaveBeenCalledWith('p1');

      vi.advanceTimersByTime(2000);
      expect(getJobStatus).toHaveBeenCalledTimes(1); // takeWhile dừng, không poll thêm
    });

    it('job FAILED: hiển thị lỗi lấy từ localJob.error_message', () => {
      const { component } = setupPolling([
        { localJob: { id: 'job-1', status: 'FAILED', error_message: 'GPU qua tai' }, liveStatus: null },
      ]);

      vi.advanceTimersByTime(2000);

      expect(component.isGenerating).toBe(false);
      expect(component.generationError).toBe('GPU qua tai');
    });

    it('job CANCELLED: hiển thị thông báo đã huỷ', () => {
      const { component } = setupPolling([
        { localJob: { id: 'job-1', status: 'CANCELLED' }, liveStatus: null },
      ]);

      vi.advanceTimersByTime(2000);

      expect(component.generationError).toBe('Job sinh truyện đã bị huỷ.');
    });

    it('còn RUNNING thì tiếp tục poll, cập nhật tiến độ từ liveStatus', () => {
      const { component, getJobStatus } = setupPolling([
        { localJob: { id: 'job-1', status: 'RUNNING' }, liveStatus: { jobId: 'job-1', status: 4, progressCurrent: 1, progressTotal: 4, pageImageUrl: '', errorMessage: '', currentStep: 'Đang vẽ khung 1', panels: [] } },
        { localJob: { id: 'job-1', status: 'COMPLETED' }, liveStatus: null },
      ]);

      vi.advanceTimersByTime(2000);
      expect(component.generatedResult?.currentStep).toBe('Đang vẽ khung 1');
      expect(component.generatedResult?.progressCurrent).toBe(1);
      expect(component.isGenerating).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(getJobStatus).toHaveBeenCalledTimes(2);
      expect(component.isGenerating).toBe(false);
    });

    it('mất kết nối khi polling: hiển thị thông báo lỗi tương ứng', () => {
      const project: Project = {
        id: 'p1', title: 'T', genre: null, art_style: 'manga', status: 'DRAFT', credits_used: 0, created_at: '2026-01-01',
      };
      const { component } = setup({
        projectApi: { createProject: vi.fn(() => of(project)) },
        comicApi: {
          createComicJob: vi.fn(() => of({ jobId: 'job-1', status: 'QUEUED' } as CreateJobResponse)),
          getJobStatus: vi.fn(() => throwError(() => new Error('network down'))),
        },
      });
      component.onInputChange('storyTitle', 'T');
      component.onInputChange('storyScript', 'S');
      component.generateComic();

      vi.advanceTimersByTime(2000);

      expect(component.isGenerating).toBe(false);
      expect(component.generationError).toBe('Mất kết nối khi theo dõi tiến trình sinh truyện.');
    });
  });

  describe('mở lại project có sẵn (loadExistingProject qua ngOnInit + ?projectId=)', () => {
    it('nạp thành công: ánh xạ trạng thái frame, lấy URL ảnh từng khung, chuyển sang chế độ chỉnh sửa', () => {
      const project: ProjectDetail = {
        id: 'p1', title: 'Truyen cu', genre: null, art_style: 'anime', status: 'DONE', credits_used: 1,
        created_at: '2026-01-01', raw_prompt: 'Tom tat cu',
      };
      const frames: FrameDto[] = [
        { id: 'f1', project_id: 'p1', order_index: 0, image_prompt: 'p', image_url: 'key1.png', thumbnail_url: null, status: 'COMPLETED', caption_vi: 'loi thoai', seed: 1 },
        { id: 'f2', project_id: 'p1', order_index: 1, image_prompt: null, image_url: null, thumbnail_url: null, status: 'PENDING', caption_vi: null, seed: null },
      ];
      const { component, fixture } = setup({
        projectId: 'p1',
        projectApi: { getProject: vi.fn(() => of(project)) },
        framesApi: {
          getFramesByProject: vi.fn(() => of(frames)),
          getFrameImageUrl: vi.fn(() => of({ url: 'https://minio/key1-signed.png', expiresInSec: 3600 })),
        },
      });

      fixture.detectChanges(); // trigger ngOnInit

      expect(component.viewMode).toBe('edit');
      expect(component.storyTitle).toBe('Truyen cu');
      expect(component.generatedResult?.panels[0].status).toBe('SUCCESS'); // COMPLETED -> SUCCESS
      expect(component.generatedResult?.panels[0].imageUrl).toBe('https://minio/key1-signed.png');
      expect(component.generatedResult?.panels[1].status).toBe('PENDING'); // PENDING -> PENDING
      expect(component.generatedResult?.panels[1].imageUrl).toBe(''); // không có image_url -> không gọi getFrameImageUrl
      expect(component.isGenerating).toBe(false);
    });

    it('lỗi khi tải lại project: hiển thị thông báo lỗi, không đổi viewMode', () => {
      const { component, fixture } = setup({
        projectId: 'p1',
        projectApi: { getProject: vi.fn(() => throwError(() => new Error('not found'))) },
        framesApi: { getFramesByProject: vi.fn(() => of([])) },
      });

      fixture.detectChanges();

      expect(component.isGenerating).toBe(false);
      expect(component.generationError).toBe('Không thể tải lại truyện tranh này. Vui lòng thử lại.');
      expect(component.viewMode).toBe('input');
    });

    it('lấy URL ảnh lỗi cho 1 khung không làm hỏng cả trang (catchError trả null)', () => {
      const project: ProjectDetail = {
        id: 'p1', title: 'T', genre: null, art_style: 'anime', status: 'DONE', credits_used: 0,
        created_at: '2026-01-01', raw_prompt: 'S',
      };
      const frames: FrameDto[] = [
        { id: 'f1', project_id: 'p1', order_index: 0, image_prompt: null, image_url: 'key.png', thumbnail_url: null, status: 'COMPLETED', caption_vi: null, seed: null },
      ];
      const { component, fixture } = setup({
        projectId: 'p1',
        projectApi: { getProject: vi.fn(() => of(project)) },
        framesApi: {
          getFramesByProject: vi.fn(() => of(frames)),
          getFrameImageUrl: vi.fn(() => throwError(() => new Error('signed url expired'))),
        },
      });

      fixture.detectChanges();

      expect(component.generationError).toBeNull();
      expect(component.generatedResult?.panels[0].imageUrl).toBe('');
    });

    it('không có ?projectId thì không gọi tải lại project nào', () => {
      const { fixture, component } = setup({ projectId: null });

      fixture.detectChanges();

      expect(component.viewMode).toBe('input');
      expect(component.generatedResult).toBeNull();
    });
  });

  describe('goBack()', () => {
    it('reset toàn bộ trạng thái trang và điều hướng bỏ query param projectId', () => {
      const { component, fixture, fakeRouter } = setup();
      fixture.detectChanges();
      component.onInputChange('storyTitle', 'T');
      component.viewMode = 'edit';

      component.goBack();

      expect(component.viewMode).toBe('input');
      expect(component.generatedResult).toBeNull();
      expect(component.generationError).toBeNull();
      expect(component.isGenerating).toBe(false);
      expect(fakeRouter.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {} }));
    });
  });

  describe('ngOnDestroy()', () => {
    it('huỷ đăng ký subscription mà không ném lỗi khi chưa từng generate', () => {
      const { component, fixture } = setup();
      fixture.detectChanges();

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
