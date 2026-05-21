import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-editor-comic',
  standalone: true,
  imports: [],
  templateUrl: './editor-comic.html',
  styleUrl: './editor-comic.scss',
})
export class EditorComic {
  @Input() comicData: any = null;
}
