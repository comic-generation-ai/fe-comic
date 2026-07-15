import { ChangeDetectorRef, Component, HostListener, HostBinding, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PopUp } from '../../shared/ui/pop-up/pop-up';
import { Project, ProjectApiService } from '../../core/api/project-api.service';

export interface ComicProject {
  id: string;
  title: string;
  coverImage: string;
  createdAt: Date;
  style: string;
  status: string;
  isDraft?: boolean;
}

const DEFAULT_GENRE_LABEL = 'Khác';

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
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  private toComicProject(p: Project): ComicProject {
    return {
      id: p.id,
      title: p.title || 'Untitled',
      coverImage: '',
      createdAt: new Date(p.created_at),
      style: p.genre || p.art_style || DEFAULT_GENRE_LABEL,
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

  editComic(event: Event, comic: ComicProject) {
    event.stopPropagation();
    this.router.navigate(['/app/comic-editor']);
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
