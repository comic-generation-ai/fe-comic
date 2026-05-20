import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorComic } from './editor-comic';

describe('EditorComic', () => {
  let component: EditorComic;
  let fixture: ComponentFixture<EditorComic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorComic],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorComic);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
