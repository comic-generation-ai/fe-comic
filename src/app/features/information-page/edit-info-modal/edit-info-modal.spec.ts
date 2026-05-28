import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditInfoModal } from './edit-info-modal';

describe('EditInfoModal', () => {
  let component: EditInfoModal;
  let fixture: ComponentFixture<EditInfoModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditInfoModal],
    }).compileComponents();

    fixture = TestBed.createComponent(EditInfoModal);
    component = fixture.componentInstance;
    component.userProfile = {
      name: 'Felix Vane',
      handle: '@felix_creations',
      joinDate: 'March 2024',
      email: 'felix.vane@comical.studio',
      avatar: 'assets/images/avatar.png',
      bio: 'Storyteller'
    };
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
