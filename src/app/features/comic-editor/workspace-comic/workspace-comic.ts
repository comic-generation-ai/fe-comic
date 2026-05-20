import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-workspace-comic',
  imports: [],
  templateUrl: './workspace-comic.html',
  styleUrl: './workspace-comic.scss',
})
export class WorkspaceComic {
  @Input() comicData: any = null;
}
