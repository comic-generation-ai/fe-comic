import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputComic } from './input-comic/input-comic';
import { WorkspaceComic } from './workspace-comic/workspace-comic';
import { EditorComic } from './editor-comic/editor-comic';
import { ComicEditorService } from './comic-editor.service';
import { ComicApiService } from '../../core/api/comic-api.service';

@Component({
  selector: 'app-comic-editor-page',
  standalone: true,
  imports: [CommonModule, InputComic, WorkspaceComic, EditorComic],
  templateUrl: './comic-editor-page.html',
  styleUrl: './comic-editor-page.scss',
})
export class ComicEditorPage {
  // Input states managed in parent for synchronization
  storyTitle: string = '';
  storyScript: string = '';
  artStyle: string = 'Manga';
  selectedFrames: number = 4; // layoutType

  // Page level state variables requested for step state management
  viewMode: 'input' | 'edit' = 'input'; // unified viewMode
  isFormValid: boolean = false; // to enable/disable generate button
  isGenerating: boolean = false; // loading state
  generatedResult: any = null; // result passed to editor and workspace
  generationError: string | null = null;

  // BE chưa có luồng chọn/tạo Project cho FE (chưa có auth + project picker).
  // Dùng tạm projectId đã seed sẵn ở local DB để test tích hợp FE-BE.
  private readonly DEV_PROJECT_ID = '8118902a-36b6-4afd-a5c1-1e64acaeeefc';

  constructor(
    private cdr: ChangeDetectorRef,
    private editorService: ComicEditorService,
    private comicApi: ComicApiService,
  ) {
    this.checkValidation();
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

    this.comicApi
      .createComicJob({
        projectId: this.DEV_PROJECT_ID,
        summary: this.storyScript,
        style: this.artStyle,
        numPanels: this.selectedFrames,
      })
      .subscribe({
        next: (res) => {
          this.isGenerating = false;
          this.viewMode = 'edit';
          this.generatedResult = {
            jobId: res.jobId,
            status: res.status,
            title: this.storyTitle,
            script: this.storyScript,
            style: this.artStyle,
            frameCount: this.selectedFrames,
            generatedAt: new Date(),
          };
          this.cdr.markForCheck(); // Notify Zoneless scheduler of asynchronous changes
          this.cdr.detectChanges(); // Force immediate change detection update
        },
        error: (err) => {
          this.isGenerating = false;
          this.generationError = err?.error?.message || 'Không thể tạo truyện tranh. Vui lòng thử lại.';
          console.error('[ComicEditorPage] createComicJob failed:', err);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
  }

  // Go back to input configuration panel
  goBack(): void {
    this.viewMode = 'input';
    this.generatedResult = null; // reset to original state
    this.editorService.reset(); // reset central workspace state
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}
