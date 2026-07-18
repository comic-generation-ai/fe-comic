import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-input-comic',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './input-comic.html',
  styleUrl: './input-comic.scss',
})
export class InputComic implements OnInit {
  @Input() storyTitle: string = '';
  @Input() storyScript: string = '';
  @Input() artStyle: string = 'storybook';
  @Input() frameCount: number = 4;
  @Input() isGenerating: boolean = false;
  @Input() isFormValid: boolean = false;

  @Output() storyTitleChange = new EventEmitter<string>();
  @Output() storyScriptChange = new EventEmitter<string>();
  @Output() artStyleChange = new EventEmitter<string>();
  @Output() onFrameCountChange = new EventEmitter<number>();
  @Output() onGenerate = new EventEmitter<void>();

  styles: string[] = ['storybook', 'anime', 'manga', 'retro', 'american_comic'];
  frames: number[] = [3, 4, 5, 6];

  readonly titleMaxLength = 150;
  readonly scriptMaxLength = 1000;

  ngOnInit(): void {
    // Notify parent of initial layout selection on init
    this.onFrameCountChange.emit(this.frameCount);
  }

  setFrameCount(count: number): void {
    this.frameCount = count;
    this.onFrameCountChange.emit(count);
  }

  generateComic(): void {
    this.onGenerate.emit();
  }
}
