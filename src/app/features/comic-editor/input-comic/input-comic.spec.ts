import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputComic } from './input-comic';

describe('InputComic', () => {
  let component: InputComic;
  let fixture: ComponentFixture<InputComic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputComic],
    }).compileComponents();

    fixture = TestBed.createComponent(InputComic);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
