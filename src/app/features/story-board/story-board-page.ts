import { ChangeDetectorRef, Component, HostListener, HostBinding, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PopUp } from '../../shared/ui/pop-up/pop-up';
import { Project, ProjectApiService } from '../../core/api/project-api.service';
import { FramesApiService } from '../../core/api/frames-api.service';

export interface ComicProject {
  id: string;
  title: string;
  coverImage: string;
  createdAt: Date;
  style: string;
  status: string;
  isDraft?: boolean;
}

// Phải là 1 trong 5 key STYLES (xem assets/i18n/*.json) — dùng làm fallback khi
// project chưa có art_style (draft) để tránh 'STYLES.<label lạ>' không dịch được.
const DEFAULT_STYLE_KEY = 'storybook';

@Component({
  selector: 'app-story-board-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PopUp, RouterLink],
  templateUrl: './story-board-page.html',
  styleUrl: './story-board-page.scss',
})
export class StoryBoardPage implements OnInit {
  constructor(
    private router: Router,
    private projectApi: ProjectApiService,
    private framesApi: FramesApiService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  comics: ComicProject[] = [];

  // true khi đang chờ /api/projects trả về — tránh chớp empty-state trước khi có kết quả
  loading = true;
  loadError = false;

  ngOnInit() {
    // Chặn gọi API lúc SSR/prerender — URL tương đối không có origin trên server
    if (!isPlatformBrowser(this.platformId)) return;

    this.projectApi.getMyProjects().subscribe({
      next: (projects) => {
        this.comics = projects.map((p) => this.toComicProject(p));
        this.loading = false;
        // App zoneless — mutate state trong .subscribe() không tự vẽ lại view
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        this.loadCoverImages();
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  // Lấy ảnh của frame đầu tiên (order_index nhỏ nhất) đã sinh xong trong mỗi
  // project để làm ảnh bìa card — thay vì luôn hiện icon fallback. Chạy sau khi
  // danh sách project đã hiển thị nên không làm chậm lần render đầu.
  private loadCoverImages() {
    if (this.comics.length === 0) return;

    const covers$ = this.comics.map((comic) =>
      this.framesApi.getFramesByProject(comic.id).pipe(
        map((frames) =>
          [...frames].sort((a, b) => a.order_index - b.order_index).find((f) => !!f.image_url),
        ),
        switchMap((firstFrame) =>
          firstFrame ? this.framesApi.getFrameImageUrl(firstFrame.id) : of(null),
        ),
        map((res) => ({ id: comic.id, url: res?.url ?? '' })),
        // Project draft chưa có frame, hoặc lỗi lấy presigned URL — bỏ qua, giữ fallback icon
        catchError(() => of({ id: comic.id, url: '' })),
      ),
    );

    forkJoin(covers$).subscribe((results) => {
      const urlById = new Map(results.map((r) => [r.id, r.url]));
      this.comics = this.comics.map((c) =>
        urlById.get(c.id) ? { ...c, coverImage: urlById.get(c.id)! } : c,
      );
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  private toComicProject(p: Project): ComicProject {
    return {
      id: p.id,
      title: p.title || 'Untitled',
      coverImage: '',
      createdAt: new Date(p.created_at),
      // style dùng để tra key 'STYLES.<style>' trong i18n — art_style luôn là 1 trong
      // 5 key hợp lệ (đã validate ở be-comic), genre là text tự do nên không dùng ở đây.
      style: p.art_style || DEFAULT_STYLE_KEY,
      status: p.status,
      isDraft: p.status === 'DRAFT',
    };
  }

  selectedDateFilter = 'All Dates';
  selectedGenreFilter = 'All Genres';

  showDateDropdown = false;
  showGenreDropdown = false;

  viewMode: 'grid' | 'list' = 'grid';

  @HostBinding('class.view-list')
  get isListView(): boolean {
    return this.viewMode === 'list';
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  // Danh sách thể loại thật lấy từ dữ liệu đã fetch, thay vì list cứng Sci-Fi/Fantasy/Drama
  get availableGenres(): string[] {
    const genres = new Set(this.comics.map((c) => c.style));
    return Array.from(genres);
  }

  // Lọc danh sách truyện theo Ngày và Phong cách (Genre)
  get filteredComics(): ComicProject[] {
    return this.comics.filter(comic => {
      // 1. Lọc theo thể loại/phong cách
      if (this.selectedGenreFilter !== 'All Genres' && comic.style !== this.selectedGenreFilter) {
        return false;
      }

      // 2. Lọc theo thời gian tạo
      if (this.selectedDateFilter !== 'All Dates') {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - comic.createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (this.selectedDateFilter === 'Today') {
          const isToday = comic.createdAt.getDate() === now.getDate() &&
            comic.createdAt.getMonth() === now.getMonth() &&
            comic.createdAt.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (this.selectedDateFilter === 'This Week') {
          if (diffDays > 7) return false;
        }
      }

      return true;
    });
  }

  toggleDateDropdown(event: Event) {
    event.stopPropagation();
    this.showDateDropdown = !this.showDateDropdown;
    this.showGenreDropdown = false;
  }

  toggleGenreDropdown(event: Event) {
    event.stopPropagation();
    this.showGenreDropdown = !this.showGenreDropdown;
    this.showDateDropdown = false;
  }

  setDateFilter(value: string) {
    this.selectedDateFilter = value;
    this.showDateDropdown = false;
  }

  setGenreFilter(value: string) {
    this.selectedGenreFilter = value;
    this.showGenreDropdown = false;
  }

  showDeletePopup = false;
  comicToDelete?: ComicProject;

  // Click vào card (xem chi tiết) — mở lại project trong comic-editor, hiển thị ảnh đã sinh ở workspace
  viewComic(comic: ComicProject) {
    this.router.navigate(['/app/comic-editor'], { queryParams: { projectId: comic.id } });
  }

  editComic(event: Event, comic: ComicProject) {
    event.stopPropagation();
    this.viewComic(comic);
  }

  deleteComic(event: Event, comic: ComicProject) {
    event.stopPropagation();
    this.comicToDelete = comic;
    this.showDeletePopup = true;
  }

  confirmDelete() {
    if (this.comicToDelete) {
      const target = this.comicToDelete;
      this.projectApi.deleteProject(target.id).subscribe({
        next: () => {
          this.comics = this.comics.filter((c) => c.id !== target.id);
          this.comicToDelete = undefined;
          this.showDeletePopup = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: () => {
          this.comicToDelete = undefined;
          this.showDeletePopup = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
      return;
    }
    this.showDeletePopup = false;
  }

  cancelDelete() {
    this.comicToDelete = undefined;
    this.showDeletePopup = false;
  }

  @HostListener('document:click')
  closeDropdowns() {
    this.showDateDropdown = false;
    this.showGenreDropdown = false;
  }
}
