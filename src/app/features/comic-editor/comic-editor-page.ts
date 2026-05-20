import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputComic } from './input-comic/input-comic';
import { WorkspaceComic } from './workspace-comic/workspace-comic';
import { EditorComic } from './editor-comic/editor-comic';

@Component({
  selector: 'app-comic-editor-page',
  imports: [CommonModule, InputComic, WorkspaceComic, EditorComic],
  templateUrl: './comic-editor-page.html',
  styleUrl: './comic-editor-page.scss',
})
export class ComicEditorPage {
  comicData: any = null;
  hasResult = false;

  onGenerateComplete(data: any) {
    this.comicData = data;
    this.hasResult = true;
  }
}
