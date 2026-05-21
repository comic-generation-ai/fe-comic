import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-workspace-comic',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './workspace-comic.html',
  styleUrl: './workspace-comic.scss',
})
export class WorkspaceComic {
  @Input() comicData: any = null;
  @Input() selectedFrames: number = 4;

  get panels(): number[] {
    return Array.from({ length: this.selectedFrames }, (_, i) => i + 1);
  }
}
