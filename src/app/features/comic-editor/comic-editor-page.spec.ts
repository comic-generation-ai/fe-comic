import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComicEditorPage } from './comic-editor-page';

describe('ComicEditorPage', () => {
  let component: ComicEditorPage;
  let fixture: ComponentFixture<ComicEditorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComicEditorPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ComicEditorPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
