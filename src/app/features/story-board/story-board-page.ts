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
  frameCount?: number;
}

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

  loading = true;
  loadError = false;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadProjects();
  }

  loadProjects() {
    this.loading = true;
    this.loadError = false;

    this.projectApi.getMyProjects().subscribe({
      next: (projects) => {
        this.comics = projects.map((p) => this.toComicProject(p));
        this.loading = false;
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

  retryLoad() {
    this.loadProjects();
  }

  private loadCoverImages() {
    if (this.comics.length === 0) return;

    const covers$ = this.comics.map((comic) =>
      this.framesApi.getFramesByProject(comic.id).pipe(
        map((frames) => {
          const sorted = [...frames].sort((a, b) => a.order_index - b.order_index);
          const firstFrame = sorted.find((f) => !!f.image_url);
          return {
            firstFrame,
            count: frames.length
          };
        }),
        switchMap((res) => {
          if (res.firstFrame) {
            return this.framesApi.getFrameImageUrl(res.firstFrame.id).pipe(
              map((urlRes) => ({ id: comic.id, url: urlRes?.url ?? '', count: res.count })),
              catchError(() => of({ id: comic.id, url: '', count: res.count }))
            );
          } else {
            return of({ id: comic.id, url: '', count: res.count });
          }
        }),
        catchError(() => of({ id: comic.id, url: '', count: 0 })),
      ),
    );

    forkJoin(covers$).subscribe((results) => {
      const dataById = new Map(results.map((r) => [r.id, { url: r.url, count: r.count }]));
      this.comics = this.comics.map((c) => {
        const data = dataById.get(c.id);
        if (data) {
          return {
            ...c,
            coverImage: data.url || c.coverImage,
            frameCount: data.count
          };
        }
        return c;
      });
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
      style: p.art_style || DEFAULT_STYLE_KEY,
      status: p.status,
      isDraft: p.status === 'DRAFT',
    };
  }

  selectedDateFilter = 'All Dates';
  selectedGenreFilter = 'All Genres';
  selectedFrameFilter: 'All Frames' | number = 'All Frames';

  showDateDropdown = false;
  showGenreDropdown = false;
  showFrameDropdown = false;

  viewMode: 'grid' | 'list' = 'grid';

  @HostBinding('class.view-list')
  get isListView(): boolean {
    return this.viewMode === 'list';
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  get availableGenres(): string[] {
    const genres = new Set(this.comics.map((c) => c.style));
    return Array.from(genres);
  }

  get filteredComics(): ComicProject[] {
    return this.comics.filter(comic => {
      if (this.selectedGenreFilter !== 'All Genres' && comic.style !== this.selectedGenreFilter) {
        return false;
      }
      if (this.selectedFrameFilter !== 'All Frames' && comic.frameCount !== this.selectedFrameFilter) {
        return false;
      }
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
    this.showFrameDropdown = false;
  }

  toggleGenreDropdown(event: Event) {
    event.stopPropagation();
    this.showGenreDropdown = !this.showGenreDropdown;
    this.showDateDropdown = false;
    this.showFrameDropdown = false;
  }

  toggleFrameDropdown(event: Event) {
    event.stopPropagation();
    this.showFrameDropdown = !this.showFrameDropdown;
    this.showDateDropdown = false;
    this.showGenreDropdown = false;
  }

  setDateFilter(value: string) {
    this.selectedDateFilter = value;
    this.showDateDropdown = false;
  }

  setGenreFilter(value: string) {
    this.selectedGenreFilter = value;
    this.showGenreDropdown = false;
  }

  setFrameFilter(value: 'All Frames' | number) {
    this.selectedFrameFilter = value;
    this.showFrameDropdown = false;
  }

  showDeletePopup = false;
  showSuccessPopup = false;
  comicToDelete?: ComicProject;

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
          this.showSuccessPopup = true;
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

  closeSuccessPopup() {
    this.showSuccessPopup = false;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  @HostListener('document:click')
  closeDropdowns() {
    this.showDateDropdown = false;
    this.showGenreDropdown = false;
    this.showFrameDropdown = false;
  }
}
