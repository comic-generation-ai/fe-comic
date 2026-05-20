import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-editor-comic',
  imports: [],
  templateUrl: './editor-comic.html',
  styleUrl: './editor-comic.scss',
})
export class EditorComic {
  @Input() comicData: any = null;
}
