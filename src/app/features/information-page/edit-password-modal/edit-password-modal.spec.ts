import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPasswordModal } from './edit-password-modal';

describe('EditPasswordModal', () => {
  let component: EditPasswordModal;
  let fixture: ComponentFixture<EditPasswordModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPasswordModal],
    }).compileComponents();

    fixture = TestBed.createComponent(EditPasswordModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
