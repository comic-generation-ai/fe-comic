import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { StoryBoardPage } from './story-board-page';
import { Project, ProjectApiService } from '../../core/api/project-api.service';
import { FrameDto, FramesApiService } from '../../core/api/frames-api.service';

function setup(opts: {
  projectApi?: Partial<Record<'getMyProjects' | 'deleteProject', any>>;
  framesApi?: Partial<Record<'getFramesByProject' | 'getFrameImageUrl', any>>;
} = {}) {
  const fakeProjectApi = {
    getMyProjects: vi.fn(() => of([])),
    deleteProject: vi.fn(),
    createProject: vi.fn(),
    getProject: vi.fn(),
    ...opts.projectApi,
  };
  const fakeFramesApi = {
    getFramesByProject: vi.fn(() => of([])),
    getFrameImageUrl: vi.fn(),
    ...opts.framesApi,
  };
  TestBed.configureTestingModule({
    imports: [StoryBoardPage],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ProjectApiService, useValue: fakeProjectApi },
      { provide: FramesApiService, useValue: fakeFramesApi },
    ],
  });

  const fixture: ComponentFixture<StoryBoardPage> = TestBed.createComponent(StoryBoardPage);
  const component = fixture.componentInstance;
  const router = TestBed.inject(Router);
  const fakeRouter = { navigate: vi.spyOn(router, 'navigate').mockResolvedValue(true) };
  return { fixture, component, fakeProjectApi, fakeFramesApi, fakeRouter };
}

const project = (over: Partial<Project> = {}): Project => ({
  id: 'c1', title: 'Truyen 1', genre: null, art_style: 'anime', status: 'COMPLETED', credits_used: 0, created_at: new Date().toISOString(),
  ...over,
});

describe('StoryBoardPage', () => {
  it('should create', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('ngOnInit() — nạp danh sách project', () => {
    it('nạp thành công: ánh xạ project sang ComicProject, tắt loading, gọi lấy ảnh bìa', () => {
      const { fixture, component, fakeFramesApi } = setup({
        projectApi: { getMyProjects: vi.fn(() => of([project({ id: 'c1', title: '', status: 'DRAFT', art_style: null })])) },
      });

      fixture.detectChanges();

      expect(component.loading).toBe(false);
      expect(component.loadError).toBe(false);
      expect(component.comics[0].title).toBe('Untitled'); // fallback khi title rỗng
      expect(component.comics[0].style).toBe('storybook'); // fallback khi chưa có art_style
      expect(component.comics[0].isDraft).toBe(true);
      expect(fakeFramesApi.getFramesByProject).toHaveBeenCalledWith('c1');
    });

    it('lỗi khi gọi API: bật loadError, tắt loading', () => {
      const { fixture, component } = setup({
        projectApi: { getMyProjects: vi.fn(() => throwError(() => new Error('500'))) },
      });

      fixture.detectChanges();

      expect(component.loading).toBe(false);
      expect(component.loadError).toBe(true);
    });

    it('danh sách rỗng thì không gọi lấy ảnh bìa', () => {
      const { fixture, fakeFramesApi } = setup({ projectApi: { getMyProjects: vi.fn(() => of([])) } });

      fixture.detectChanges();

      expect(fakeFramesApi.getFramesByProject).not.toHaveBeenCalled();
    });
  });

  describe('loadCoverImages() (chạy sau khi có danh sách project)', () => {
    it('lấy URL ảnh khung đầu tiên đã có image_url làm ảnh bìa', () => {
      const frames: FrameDto[] = [
        { id: 'f1', project_id: 'c1', order_index: 1, image_prompt: null, image_url: null, thumbnail_url: null, status: 'PENDING', caption_vi: null, seed: null },
        { id: 'f2', project_id: 'c1', order_index: 0, image_prompt: null, image_url: 'key.png', thumbnail_url: null, status: 'COMPLETED', caption_vi: null, seed: null },
      ];
      const { fixture, component } = setup({
        projectApi: { getMyProjects: vi.fn(() => of([project()])) },
        framesApi: {
          getFramesByProject: vi.fn(() => of(frames)),
          getFrameImageUrl: vi.fn(() => of({ url: 'https://minio/cover.png', expiresInSec: 3600 })),
        },
      });

      fixture.detectChanges();

      expect(component.comics[0].coverImage).toBe('https://minio/cover.png');
    });

    it('project chưa có frame nào có ảnh (toàn draft) thì giữ nguyên ảnh bìa rỗng', () => {
      const { fixture, component } = setup({
        projectApi: { getMyProjects: vi.fn(() => of([project()])) },
        framesApi: { getFramesByProject: vi.fn(() => of([])) },
      });

      fixture.detectChanges();

      expect(component.comics[0].coverImage).toBe('');
    });

    it('lỗi khi lấy URL ảnh (hết hạn presigned URL) không làm hỏng cả trang, giữ ảnh bìa rỗng', () => {
      const frames: FrameDto[] = [
        { id: 'f1', project_id: 'c1', order_index: 0, image_prompt: null, image_url: 'key.png', thumbnail_url: null, status: 'COMPLETED', caption_vi: null, seed: null },
      ];
      const { fixture, component } = setup({
        projectApi: { getMyProjects: vi.fn(() => of([project()])) },
        framesApi: {
          getFramesByProject: vi.fn(() => of(frames)),
          getFrameImageUrl: vi.fn(() => throwError(() => new Error('expired'))),
        },
      });

      fixture.detectChanges();

      expect(component.comics[0].coverImage).toBe('');
      expect(component.loadError).toBe(false);
    });
  });

  describe('lọc và chế độ xem (filteredComics/availableGenres/toggleViewMode)', () => {
    it('toggleViewMode() đổi qua lại grid/list, isListView phản ánh đúng', () => {
      const { component } = setup();
      expect(component.isListView).toBe(false);

      component.toggleViewMode();
      expect(component.viewMode).toBe('list');
      expect(component.isListView).toBe(true);

      component.toggleViewMode();
      expect(component.viewMode).toBe('grid');
    });

    it('availableGenres() trả về tập hợp không trùng lặp các style hiện có', () => {
      const { fixture, component } = setup({
        projectApi: { getMyProjects: vi.fn(() => of([project({ id: 'a', art_style: 'anime' }), project({ id: 'b', art_style: 'anime' }), project({ id: 'c', art_style: 'manga' })])) },
      });
      fixture.detectChanges();

      expect(component.availableGenres.sort()).toEqual(['anime', 'manga']);
    });

    it('filteredComics() lọc theo thể loại đã chọn', () => {
      const { fixture, component } = setup({
        projectApi: { getMyProjects: vi.fn(() => of([project({ id: 'a', art_style: 'anime' }), project({ id: 'b', art_style: 'manga' })])) },
      });
      fixture.detectChanges();

      component.setGenreFilter('anime');

      expect(component.filteredComics.length).toBe(1);
      expect(component.filteredComics[0].id).toBe('a');
    });

    it('filteredComics() lọc "Today" chỉ giữ project tạo hôm nay', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);
      const { fixture, component } = setup({
        projectApi: {
          getMyProjects: vi.fn(() =>
            of([
              project({ id: 'today', created_at: new Date().toISOString() }),
              project({ id: 'old', created_at: yesterday.toISOString() }),
            ]),
          ),
        },
      });
      fixture.detectChanges();

      component.setDateFilter('Today');

      expect(component.filteredComics.map((c) => c.id)).toEqual(['today']);
    });
  });

  describe('dropdown lọc (date/genre)', () => {
    it('toggleDateDropdown()/toggleGenreDropdown() loại trừ lẫn nhau và stopPropagation', () => {
      const { component } = setup();
      const event = new MouseEvent('click');
      vi.spyOn(event, 'stopPropagation');

      component.toggleDateDropdown(event);
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showDateDropdown).toBe(true);

      component.toggleGenreDropdown(new MouseEvent('click'));
      expect(component.showGenreDropdown).toBe(true);
      expect(component.showDateDropdown).toBe(false);
    });

    it('closeDropdowns() (click ra ngoài) đóng cả hai dropdown', () => {
      const { component } = setup();
      component.showDateDropdown = true;
      component.showGenreDropdown = true;

      component.closeDropdowns();

      expect(component.showDateDropdown).toBe(false);
      expect(component.showGenreDropdown).toBe(false);
    });

    it('setDateFilter()/setGenreFilter() cập nhật giá trị và đóng dropdown tương ứng', () => {
      const { component } = setup();
      component.showDateDropdown = true;
      component.showGenreDropdown = true;

      component.setDateFilter('This Week');
      component.setGenreFilter('anime');

      expect(component.selectedDateFilter).toBe('This Week');
      expect(component.showDateDropdown).toBe(false);
      expect(component.selectedGenreFilter).toBe('anime');
      expect(component.showGenreDropdown).toBe(false);
    });
  });

  describe('xem/sửa/xoá truyện', () => {
    it('viewComic()/editComic() điều hướng sang comic-editor kèm projectId', () => {
      const { component, fakeRouter } = setup();
      const comic = { id: 'c1', title: 'T', coverImage: '', createdAt: new Date(), style: 'anime', status: 'COMPLETED' };

      component.viewComic(comic);
      expect(fakeRouter.navigate).toHaveBeenCalledWith(['/app/comic-editor'], { queryParams: { projectId: 'c1' } });

      const event = new MouseEvent('click');
      vi.spyOn(event, 'stopPropagation');
      component.editComic(event, comic);
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('deleteComic() mở popup xác nhận với đúng truyện được chọn', () => {
      const { component } = setup();
      const comic = { id: 'c1', title: 'T', coverImage: '', createdAt: new Date(), style: 'anime', status: 'COMPLETED' };
      const event = new MouseEvent('click');
      vi.spyOn(event, 'stopPropagation');

      component.deleteComic(event, comic);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showDeletePopup).toBe(true);
      expect(component.comicToDelete).toBe(comic);
    });

    it('confirmDelete() thành công: xoá khỏi danh sách, đóng popup', () => {
      const { fixture, component, fakeProjectApi } = setup({
        projectApi: {
          getMyProjects: vi.fn(() => of([project({ id: 'c1' })])),
          deleteProject: vi.fn(() => of({ id: 'c1', deleted: true })),
        },
      });
      fixture.detectChanges();
      component.deleteComic(new MouseEvent('click'), component.comics[0]);

      component.confirmDelete();

      expect(fakeProjectApi.deleteProject).toHaveBeenCalledWith('c1');
      expect(component.comics.length).toBe(0);
      expect(component.showDeletePopup).toBe(false);
    });

    it('confirmDelete() lỗi: vẫn đóng popup, không ném lỗi ra ngoài', () => {
      const { fixture, component } = setup({
        projectApi: {
          getMyProjects: vi.fn(() => of([project({ id: 'c1' })])),
          deleteProject: vi.fn(() => throwError(() => new Error('403'))),
        },
      });
      fixture.detectChanges();
      component.deleteComic(new MouseEvent('click'), component.comics[0]);

      component.confirmDelete();

      expect(component.showDeletePopup).toBe(false);
      expect(component.comics.length).toBe(1); // xoá thất bại nên vẫn còn trong danh sách
    });

    it('confirmDelete() không làm gì khi không có comicToDelete', () => {
      const { component, fakeProjectApi } = setup();

      component.confirmDelete();

      expect(fakeProjectApi.deleteProject).not.toHaveBeenCalled();
      expect(component.showDeletePopup).toBe(false);
    });

    it('cancelDelete() đóng popup và bỏ chọn truyện cần xoá', () => {
      const { component } = setup();
      component.comicToDelete = { id: 'c1', title: 'T', coverImage: '', createdAt: new Date(), style: 'anime', status: 'COMPLETED' };
      component.showDeletePopup = true;

      component.cancelDelete();

      expect(component.comicToDelete).toBeUndefined();
      expect(component.showDeletePopup).toBe(false);
    });
  });

  // Bấm thẳng vào phần tử DOM thật để khớp đúng các hàm lắng nghe sự kiện
  // (click) khai báo trong story-board-page.html — tăng độ bao phủ
  // "functions" của template, không thêm hành vi nghiệp vụ mới.
  describe('tương tác trực tiếp trên DOM (khớp các hàm lắng nghe sự kiện trong template)', () => {
    it('mở dropdown lọc ngày/thể loại rồi bấm chọn 1 mục thay đổi đúng bộ lọc', () => {
      const { fixture, component } = setup({
        projectApi: { getMyProjects: vi.fn(() => of([project({ id: 'a', art_style: 'anime' })])) },
      });
      fixture.detectChanges();

      fixture.nativeElement.querySelectorAll('.dropdown-trigger')[0].click(); // mở dropdown ngày
      fixture.detectChanges();
      fixture.nativeElement.querySelectorAll('.dropdown-menu .dropdown-item')[1].click(); // "Today"
      expect(component.selectedDateFilter).toBe('Today');

      fixture.nativeElement.querySelectorAll('.dropdown-trigger')[1].click(); // mở dropdown thể loại
      fixture.detectChanges();
      fixture.nativeElement.querySelectorAll('.dropdown-menu .dropdown-item')[1].click(); // "anime"
      expect(component.selectedGenreFilter).toBe('anime');
    });

    it('bấm nút đổi chế độ xem grid/list', () => {
      const { fixture, component } = setup();
      fixture.detectChanges();

      fixture.nativeElement.querySelector('.btn-layout-toggle').click();

      expect(component.viewMode).toBe('list');
    });

    it('bấm thẻ truyện xem chi tiết, bấm nút sửa/xoá trên thẻ không mở nhầm chi tiết', () => {
      const { fixture, component, fakeRouter } = setup({
        projectApi: { getMyProjects: vi.fn(() => of([project({ id: 'c1' })])) },
      });
      fixture.detectChanges();

      fixture.nativeElement.querySelector('.comic-card').click();
      expect(fakeRouter.navigate).toHaveBeenCalledWith(['/app/comic-editor'], { queryParams: { projectId: 'c1' } });

      fakeRouter.navigate.mockClear();
      fixture.nativeElement.querySelector('.btn-delete').click();
      expect(component.showDeletePopup).toBe(true);
      expect(fakeRouter.navigate).not.toHaveBeenCalled(); // stopPropagation chặn viewComic() của thẻ cha
    });

    it('bấm nút Xác nhận/Huỷ trên popup xoá gọi đúng confirmDelete()/cancelDelete()', () => {
      const { fixture, component, fakeProjectApi } = setup({
        projectApi: {
          getMyProjects: vi.fn(() => of([project({ id: 'c1' })])),
          deleteProject: vi.fn(() => of({ id: 'c1', deleted: true })),
        },
      });
      fixture.detectChanges();
      component.deleteComic(new MouseEvent('click'), component.comics[0]);
      // checkNoChanges=false: [isOpen] của <app-pop-up> lần đầu chuyển false->true
      // trong cùng 1 test khiến Angular 21 báo NG0100 giả ở bước tự kiểm tra lại.
      fixture.detectChanges(false);

      fixture.nativeElement.querySelector('app-pop-up .btn-cancel').click();
      expect(component.showDeletePopup).toBe(false);
      expect(fakeProjectApi.deleteProject).not.toHaveBeenCalled();

      component.deleteComic(new MouseEvent('click'), component.comics[0]);
      fixture.detectChanges(false);
      fixture.nativeElement.querySelector('app-pop-up .btn-confirm').click();
      expect(fakeProjectApi.deleteProject).toHaveBeenCalledWith('c1');
    });
  });
});
