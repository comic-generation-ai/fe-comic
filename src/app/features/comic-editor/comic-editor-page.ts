import { Component, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InputComic } from './input-comic/input-comic';
import { WorkspaceComic } from './workspace-comic/workspace-comic';
import { EditorComic } from './editor-comic/editor-comic';
import { ComicEditorService } from './comic-editor.service';
import { ComicApiService, JobStatusResponse, Panel } from '../../core/api/comic-api.service';
import { ProjectApiService } from '../../core/api/project-api.service';
import { FrameDto, FramesApiService } from '../../core/api/frames-api.service';
import { Subscription, interval, switchMap, takeWhile, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { I18nService } from '../../core/i18n/i18n.service';

const FRAME_STATUS_MAP: Record<FrameDto['status'], Panel['status']> = {
  PENDING: 'PENDING',
  GENERATING: 'PROCESSING',
  COMPLETED: 'SUCCESS',
  FAILED: 'FAILED',
};

interface GeneratedResult {
  jobId: string;
  title: string;
  script: string;
  style: string;
  frameCount: number;
  generatedAt: Date;
  panels: Panel[];
  currentStep: string;
  progressCurrent: number;
  progressTotal: number;
  pageImageUrl?: string;
}

@Component({
  selector: 'app-comic-editor-page',
  standalone: true,
  imports: [CommonModule, InputComic, WorkspaceComic, EditorComic],
  templateUrl: './comic-editor-page.html',
  styleUrl: './comic-editor-page.scss',
})
export class ComicEditorPage implements OnInit, OnDestroy {
  storyTitle: string = '';
  storyScript: string = '';
  artStyle: string = 'manga';
  selectedFrames: number = 4;
  viewMode: 'input' | 'edit' = 'input';
  isEditorPanelOpen: boolean = false;
  editorTab: 'frame' | 'bubble' | 'text' = 'frame';
  isFormValid: boolean = false;
  isGenerating: boolean = false;
  generatedResult: GeneratedResult | null = null;
  generationError: string | null = null;
  private activeProjectId: string = '';

  private pipelineSub?: Subscription;
  private pollSub?: Subscription;

  constructor(
    private cdr: ChangeDetectorRef,
    private editorService: ComicEditorService,
    private comicApi: ComicApiService,
    private projectApi: ProjectApiService,
    private framesApi: FramesApiService,
    private route: ActivatedRoute,
    private router: Router,
    private i18nService: I18nService,
  ) {
    this.checkValidation();
  }

  ngOnInit(): void {
    const projectId = this.route.snapshot.queryParamMap.get('projectId');
    if (projectId) {
      this.loadExistingProject(projectId);
    }
  }

  ngOnDestroy(): void {
    this.pipelineSub?.unsubscribe();
    this.pollSub?.unsubscribe();
  }

  private loadExistingProject(projectId: string): void {
    this.isGenerating = true;
    this.generationError = null;
    this.isEditorPanelOpen = false;

    this.pipelineSub = forkJoin({
      project: this.projectApi.getProject(projectId),
      frames: this.framesApi.getFramesByProject(projectId),
    })
      .pipe(
        switchMap(({ project, frames }) => {
          const sortedFrames = [...frames].sort((a, b) => a.order_index - b.order_index);
          const imageUrls$ = sortedFrames.map((frame) =>
            frame.image_url
              ? this.framesApi.getFrameImageUrl(frame.id).pipe(
                catchError(() => of(null)),
              )
              : of(null),
          );
          return (imageUrls$.length ? forkJoin(imageUrls$) : of([])).pipe(
            switchMap((imageResults) => of({ project, frames: sortedFrames, imageResults })),
          );
        }),
      )
      .subscribe({
        next: ({ project, frames, imageResults }) => {
          const panels: Panel[] = frames.map((frame, i) => ({
            index: frame.order_index,
            captionVi: frame.caption_vi || '',
            imageUrl: imageResults[i]?.url || '',
            promptEn: frame.image_prompt || '',
            seed: frame.seed || 0,
            status: FRAME_STATUS_MAP[frame.status],
          }));

          this.storyTitle = project.title || '';
          this.storyScript = project.raw_prompt || '';
          this.artStyle = project.art_style || 'storybook';
          this.selectedFrames = frames.length || 4;
          this.activeProjectId = projectId;

          this.editorService.reset();
          this.editorService.hydrateBubblesFromFrames(frames);
          this.generatedResult = {
            jobId: '',
            title: this.storyTitle,
            script: this.storyScript,
            style: this.artStyle,
            frameCount: this.selectedFrames,
            generatedAt: new Date(project.created_at),
            panels,
            currentStep: this.i18nService.lang === 'vi' ? 'Hoàn tất' : 'Completed',
            progressCurrent: panels.length,
            progressTotal: panels.length,
          };
          this.viewMode = 'edit';
          this.isGenerating = false;
          this.checkValidation();
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isGenerating = false;
          this.generationError = this.i18nService.lang === 'vi'
            ? 'Không thể tải lại truyện tranh này. Vui lòng thử lại.'
            : 'Failed to reload this comic. Please try again.';
          console.error('[ComicEditorPage] loadExistingProject failed:', err);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
  }

  // Check validation of all inputs
  checkValidation(): void {
    const trimmedTitle = (this.storyTitle || '').trim();
    const trimmedScript = (this.storyScript || '').trim();
    const wordCount = trimmedScript ? trimmedScript.split(/\s+/).filter(Boolean).length : 0;

    const isTitleValid = trimmedTitle.length >= 2;
    const isScriptValid = trimmedScript.length >= 15 && wordCount >= 2;

    this.isFormValid =
      isTitleValid &&
      isScriptValid &&
      !!this.artStyle &&
      !!this.selectedFrames && this.selectedFrames > 0;
  }

  // Handle changes in input fields
  onInputChange(field: string, value: any): void {
    if (field === 'storyTitle') this.storyTitle = value;
    if (field === 'storyScript') this.storyScript = value;
    if (field === 'artStyle') this.artStyle = value;
    if (field === 'selectedFrames') this.selectedFrames = value;

    this.checkValidation();
  }

  generateComic(): void {
    this.checkValidation();
    if (!this.isFormValid || this.isGenerating) return;

    this.isGenerating = true;
    this.generationError = null;
    this.isEditorPanelOpen = false;
    this.editorService.reset(); 

    this.pipelineSub?.unsubscribe();
    this.pollSub?.unsubscribe();

    this.pipelineSub = this.projectApi
      .createProject({
        title: this.storyTitle,
        rawPrompt: this.storyScript,
        artStyle: this.artStyle,
      })
      .pipe(
        switchMap((project) => {
          this.activeProjectId = project.id;
          return this.comicApi.createComicJob({
            projectId: project.id,
            summary: this.storyScript,
            style: this.artStyle,
            numPanels: this.selectedFrames,
          });
        }),
      )
      .subscribe({
        next: (jobRes) => {
          this.viewMode = 'edit';
          this.generatedResult = {
            jobId: jobRes.jobId,
            title: this.storyTitle,
            script: this.storyScript,
            style: this.artStyle,
            frameCount: this.selectedFrames,
            generatedAt: new Date(),
            panels: [],
            currentStep: this.i18nService.lang === 'vi' ? 'Đang khởi tạo...' : 'Initializing...',
            progressCurrent: 0,
            progressTotal: this.selectedFrames,
          };
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          this.startPolling(jobRes.jobId);
        },
        error: (err) => {
          this.isGenerating = false;
          this.generationError = err?.error?.message || (this.i18nService.lang === 'vi'
            ? 'Không thể tạo truyện tranh. Vui lòng thử lại.'
            : 'Failed to generate comic. Please try again.');
          console.error('[ComicEditorPage] generateComic failed:', err);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
  }

  private startPolling(jobId: string): void {
    this.pollSub = interval(2000)
      .pipe(
        switchMap(() => this.comicApi.getJobStatus(jobId)),
        takeWhile(
          (res) => res.localJob.status === 'QUEUED' || res.localJob.status === 'RUNNING',
          true,
        ),
      )
      .subscribe({
        next: (res) => this.handleJobStatus(res),
        error: (err) => {
          this.isGenerating = false;
          this.generationError = this.i18nService.lang === 'vi'
            ? 'Mất kết nối khi theo dõi tiến trình sinh truyện.'
            : 'Connection lost while tracking comic generation progress.';
          console.error('[ComicEditorPage] polling failed:', err);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
  }

  private handleJobStatus(res: JobStatusResponse): void {
    if (!this.generatedResult) return;

    if (res.liveStatus) {
      this.generatedResult.panels = res.liveStatus.panels;
      this.generatedResult.currentStep = res.liveStatus.currentStep;
      this.generatedResult.progressCurrent = res.liveStatus.progressCurrent;
      this.generatedResult.progressTotal = res.liveStatus.progressTotal;
      this.generatedResult.pageImageUrl = res.liveStatus.pageImageUrl;
    }

    switch (res.localJob.status) {
      case 'COMPLETED':
        this.isGenerating = false;
        this.generatedResult.currentStep = this.i18nService.lang === 'vi' ? 'Hoàn tất' : 'Completed';
        this.framesApi.getFramesByProject(this.activeProjectId).subscribe((frames) => {
          this.editorService.hydrateBubblesFromFrames(frames);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
        break;
      case 'FAILED':
        this.isGenerating = false;
        this.generationError =
          res.localJob.error_message || res.liveStatus?.errorMessage || res.error || (this.i18nService.lang === 'vi' ? 'Sinh truyện tranh thất bại.' : 'Comic generation failed.');
        break;
      case 'CANCELLED':
        this.isGenerating = false;
        this.generationError = this.i18nService.lang === 'vi' ? 'Job sinh truyện đã bị huỷ.' : 'Comic generation job has been cancelled.';
        break;
    }

    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  // Toggle the editor-comic tab open/closed above workspace-comic
  toggleEditorPanel(): void {
    this.isEditorPanelOpen = !this.isEditorPanelOpen;
  }

  // Scroll down to the JSON section in workspace-comic
  openJsonTab(): void {
    setTimeout(() => {
      const jsonElem = document.getElementById('workspace-json-section');
      if (jsonElem) {
        jsonElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  // Go back to input configuration panel (Hủy job & xóa project nếu đang vẽ mà chưa xong)
  goBack(): void {
    if (this.isGenerating) {
      if (this.generatedResult?.jobId) {
        this.comicApi
          .cancelJob(this.generatedResult.jobId)
          .pipe(
            catchError((err) => {
              console.error('[ComicEditorPage] cancelJob failed:', err);
              return of(null);
            }),
          )
          .subscribe();
      }

      if (this.activeProjectId) {
        this.projectApi
          .deleteProject(this.activeProjectId)
          .pipe(
            catchError((err) => {
              console.error('[ComicEditorPage] deleteProject failed:', err);
              return of(null);
            }),
          )
          .subscribe();
      }
    }

    this.pipelineSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.viewMode = 'input';
    this.generatedResult = null; // reset to original state (không lưu job id)
    this.generationError = null;
    this.isGenerating = false;
    this.isEditorPanelOpen = false;
    this.activeProjectId = '';
    this.editorService.reset(); // reset central workspace state
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}
