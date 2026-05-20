import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceComic } from './workspace-comic';

describe('WorkspaceComic', () => {
  let component: WorkspaceComic;
  let fixture: ComponentFixture<WorkspaceComic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceComic],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceComic);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
