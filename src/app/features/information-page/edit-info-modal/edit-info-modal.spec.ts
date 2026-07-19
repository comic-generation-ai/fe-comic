import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditInfoModal, UserProfileInfo } from './edit-info-modal';

const baseProfile: UserProfileInfo = {
  name: 'Felix Vane',
  handle: '@felix_creations',
  joinDate: 'March 2024',
  email: 'felix.vane@comical.studio',
  avatar: 'assets/images/avatar.png',
};

describe('EditInfoModal', () => {
  let component: EditInfoModal;
  let fixture: ComponentFixture<EditInfoModal>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EditInfoModal],
    });

    fixture = TestBed.createComponent(EditInfoModal);
    component = fixture.componentInstance;
    component.userProfile = { ...baseProfile };
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('ngOnInit() nhân bản userProfile thành localProfile (không dùng chung tham chiếu)', () => {
    fixture.detectChanges();

    expect(component.localProfile).toEqual(baseProfile);
    component.localProfile.name = 'Ten khac';
    expect(component.userProfile.name).toBe('Felix Vane'); // input gốc không bị đổi theo
  });

  it('avatarInitial lấy chữ cái đầu tên trong localProfile', () => {
    fixture.detectChanges();
    expect(component.avatarInitial).toBe('F');
  });

  describe('chọn/xoá ảnh đại diện', () => {
    it('selectPreset() gán avatar theo url được chọn', () => {
      fixture.detectChanges();
      component.selectPreset('assets/images/avatars/avatar-3.png');
      expect(component.localProfile.avatar).toBe('assets/images/avatars/avatar-3.png');
    });

    it('removePhoto() xoá avatar hiện tại', () => {
      fixture.detectChanges();
      component.removePhoto();
      expect(component.localProfile.avatar).toBe('');
    });

    it('onPresetError() ẩn ô preset khi ảnh mẫu chưa tồn tại', () => {
      fixture.detectChanges();
      const btn = document.createElement('div');
      btn.className = 'preset-avatar-btn';
      const img = document.createElement('img');
      btn.appendChild(img);

      component.onPresetError({ target: img } as unknown as Event);

      expect(btn.getAttribute('style')).toContain('display:none');
    });

    it('triggerFileInput() bấm hộ vào input file ẩn', () => {
      fixture.detectChanges();
      const input = document.createElement('input');
      const clickSpy = vi.spyOn(input, 'click');

      component.triggerFileInput(input);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('onFileSelected() không làm gì khi người dùng huỷ chọn file (không có file)', () => {
      fixture.detectChanges();
      const before = component.localProfile.avatar;

      component.onFileSelected({ target: { files: [] } } as unknown as Event);

      expect(component.localProfile.avatar).toBe(before);
    });
  });

  describe('save()/cancel()', () => {
    it('save() từ chối khi tên rỗng, không phát onSave', () => {
      fixture.detectChanges();
      component.localProfile.name = '   ';
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      let saved = false;
      component.onSave.subscribe(() => (saved = true));

      component.save();

      expect(alertSpy).toHaveBeenCalled();
      expect(saved).toBe(false);
    });

    it('save() tự thêm dấu @ vào handle nếu thiếu, rồi phát onSave', () => {
      fixture.detectChanges();
      component.localProfile.handle = 'no_at_prefix';
      let saved: UserProfileInfo | undefined;
      component.onSave.subscribe((v) => (saved = v));

      component.save();

      expect(component.localProfile.handle).toBe('@no_at_prefix');
      expect(saved?.handle).toBe('@no_at_prefix');
    });

    it('save() giữ nguyên handle đã có sẵn dấu @', () => {
      fixture.detectChanges();
      component.localProfile.handle = '@already';

      component.save();

      expect(component.localProfile.handle).toBe('@already');
    });

    it('cancel() phát onClose', () => {
      fixture.detectChanges();
      let closed = false;
      component.onClose.subscribe(() => (closed = true));

      component.cancel();

      expect(closed).toBe(true);
    });
  });

  describe('tương tác trực tiếp trên DOM', () => {
    it('bấm nút Lưu/Huỷ ở footer gọi đúng save()/cancel()', () => {
      fixture.detectChanges();
      let saved = false;
      let closed = false;
      component.onSave.subscribe(() => (saved = true));
      component.onClose.subscribe(() => (closed = true));

      fixture.nativeElement.querySelector('.btn-footer.btn-cancel').click();
      expect(closed).toBe(true);

      fixture.nativeElement.querySelector('.btn-footer.btn-save').click();
      expect(saved).toBe(true);
    });

    it('bấm avatar mẫu gọi selectPreset() với đúng url', () => {
      fixture.detectChanges();

      const presetBtn = fixture.nativeElement.querySelector('.preset-avatar-btn');
      presetBtn.click();

      expect(component.localProfile.avatar).toBe(component.presetAvatars[0]);
    });
  });
});
