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

// Frame.status (be-comic) -> Panel.status (dùng chung UI với luồng generate mới)
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
  // Input states managed in parent for synchronization
  storyTitle: string = '';
  storyScript: string = '';
  artStyle: string = 'manga';
  selectedFrames: number = 4; // layoutType

  // Page level state variables requested for step state management
  viewMode: 'input' | 'edit' = 'input'; // unified viewMode
  isFormValid: boolean = false; // to enable/disable generate button
  isGenerating: boolean = false; // loading state
  generatedResult: GeneratedResult | null = null; // result passed to editor and workspace
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
  ) {
    this.checkValidation();
  }

  ngOnInit(): void {
    // Mở lại 1 project có sẵn từ story-board: /app/comic-editor?projectId=xxx
    const projectId = this.route.snapshot.queryParamMap.get('projectId');
    if (projectId) {
      this.loadExistingProject(projectId);
    }
  }

  ngOnDestroy(): void {
    this.pipelineSub?.unsubscribe();
    this.pollSub?.unsubscribe();
  }

  // Load 1 project đã tạo trước đó (từ story-board) và hiển thị lại các ảnh đã sinh trong workspace
  private loadExistingProject(projectId: string): void {
    this.isGenerating = true;
    this.generationError = null;

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
            currentStep: 'Hoàn tất',
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
          this.generationError = 'Không thể tải lại truyện tranh này. Vui lòng thử lại.';
          console.error('[ComicEditorPage] loadExistingProject failed:', err);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
  }

  // Check validation of all inputs
  checkValidation(): void {
    this.isFormValid =
      !!this.storyTitle && this.storyTitle.trim().length > 0 &&
      !!this.storyScript && this.storyScript.trim().length > 0 &&
      !!this.artStyle &&
      !!this.selectedFrames && this.selectedFrames > 0;

    console.log('[ComicEditorPage] checkValidation:', {
      storyTitle: this.storyTitle,
      storyScript: this.storyScript,
      artStyle: this.artStyle,
      selectedFrames: this.selectedFrames,
      isFormValid: this.isFormValid
    });
  }

  // Handle changes in input fields
  onInputChange(field: string, value: any): void {
    if (field === 'storyTitle') this.storyTitle = value;
    if (field === 'storyScript') this.storyScript = value;
    if (field === 'artStyle') this.artStyle = value;
    if (field === 'selectedFrames') this.selectedFrames = value;

    this.checkValidation();
  }

  // Triggered when user clicks Generate Comic
  generateComic(): void {
    this.checkValidation();
    if (!this.isFormValid || this.isGenerating) return;

    this.isGenerating = true;
    this.generationError = null;
    this.editorService.reset(); // Reset central editor state

    this.pipelineSub?.unsubscribe();
    this.pollSub?.unsubscribe();

    // 1) Tạo project thật (không còn projectId hard-code) 2) tạo job sinh truyện trên project đó
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
            currentStep: 'Đang khởi tạo...',
            progressCurrent: 0,
            progressTotal: this.selectedFrames,
          };
          this.cdr.markForCheck();
          this.cdr.detectChanges();
          this.startPolling(jobRes.jobId);
        },
        error: (err) => {
          this.isGenerating = false;
          this.generationError = err?.error?.message || 'Không thể tạo truyện tranh. Vui lòng thử lại.';
          console.error('[ComicEditorPage] generateComic failed:', err);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
  }

  // Poll GET /api/generation-jobs/:id mỗi 2s cho tới khi job xong (COMPLETED/FAILED/CANCELLED)
  private startPolling(jobId: string): void {
    this.pollSub = interval(2000)
      .pipe(
        switchMap(() => this.comicApi.getJobStatus(jobId)),
        takeWhile(
          (res) => res.localJob.status === 'QUEUED' || res.localJob.status === 'RUNNING',
          true, // vẫn xử lý lần emit cuối (khi job vừa chuyển sang trạng thái kết thúc)
        ),
      )
      .subscribe({
        next: (res) => this.handleJobStatus(res),
        error: (err) => {
          this.isGenerating = false;
          this.generationError = 'Mất kết nối khi theo dõi tiến trình sinh truyện.';
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
        this.generatedResult.currentStep = 'Hoàn tất';
        // Callback này chạy async (sau khi HTTP response về), tức là SAU dòng
        // cdr.detectChanges() ở cuối hàm — nếu không tự ép CD lại ở đây thì bong
        // bóng vừa hydrate xong sẽ không tự hiện ra, phải chờ người dùng click.
        this.framesApi.getFramesByProject(this.activeProjectId).subscribe((frames) => {
          this.editorService.hydrateBubblesFromFrames(frames);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
        break;
      case 'FAILED':
        this.isGenerating = false;
        this.generationError =
          res.localJob.error_message || res.liveStatus?.errorMessage || res.error || 'Sinh truyện tranh thất bại.';
        break;
      case 'CANCELLED':
        this.isGenerating = false;
        this.generationError = 'Job sinh truyện đã bị huỷ.';
        break;
    }

    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  // Go back to input configuration panel
  goBack(): void {
    this.pipelineSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.viewMode = 'input';
    this.generatedResult = null; // reset to original state
    this.generationError = null;
    this.isGenerating = false;
    this.editorService.reset(); // reset central workspace state
    // Bỏ ?projectId khỏi URL — tránh load lại project cũ nếu người dùng F5 sau khi Back
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}
