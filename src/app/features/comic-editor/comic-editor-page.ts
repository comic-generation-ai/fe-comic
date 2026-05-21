import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputComic } from './input-comic/input-comic';
import { WorkspaceComic } from './workspace-comic/workspace-comic';
import { EditorComic } from './editor-comic/editor-comic';

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
  isGenerated: boolean = false; // to show/hide editor
  isFormValid: boolean = false; // to enable/disable generate button
  isGenerating: boolean = false; // loading state
  generatedResult: any = null; // result passed to editor and workspace

  constructor(private cdr: ChangeDetectorRef) {
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

    // Simulate API loading state for high quality UX response
    setTimeout(() => {
      this.isGenerating = false;
      this.isGenerated = true;
      this.generatedResult = {
        title: this.storyTitle,
        script: this.storyScript,
        style: this.artStyle,
        frameCount: this.selectedFrames,
        generatedAt: new Date()
      };
      this.cdr.markForCheck(); // Notify Zoneless scheduler of asynchronous changes
      this.cdr.detectChanges(); // Force immediate change detection update
    }, 1500);
  }
}
