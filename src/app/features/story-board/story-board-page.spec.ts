import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoryBoardPage } from './story-board-page';

describe('StoryBoardPage', () => {
  let component: StoryBoardPage;
  let fixture: ComponentFixture<StoryBoardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoryBoardPage],
    }).compileComponents();

    fixture = TestBed.createComponent(StoryBoardPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
