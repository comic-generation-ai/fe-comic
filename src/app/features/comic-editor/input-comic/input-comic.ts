import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-input-comic',
  imports: [],
  templateUrl: './input-comic.html',
  styleUrl: './input-comic.scss',
})
export class InputComic {
  @Output() onGenerateSuccess = new EventEmitter<any>();
}
