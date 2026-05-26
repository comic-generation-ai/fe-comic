import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformationPage } from './information-page';

describe('InformationPage', () => {
  let component: InformationPage;
  let fixture: ComponentFixture<InformationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformationPage],
    }).compileComponents();

    fixture = TestBed.createComponent(InformationPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
