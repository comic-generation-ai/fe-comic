import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPasswordModal } from './edit-password-modal';

describe('EditPasswordModal', () => {
  let component: EditPasswordModal;
  let fixture: ComponentFixture<EditPasswordModal>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EditPasswordModal],
    });

    fixture = TestBed.createComponent(EditPasswordModal);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('save() — kiểm tra hợp lệ trước khi phát onSave', () => {
    it('thiếu mật khẩu mới hoặc xác nhận: báo lỗi, không phát onSave', () => {
      fixture.detectChanges();
      let saved = false;
      component.onSave.subscribe(() => (saved = true));

      component.save();

      expect(component.feedbackType).toBe('error');
      expect(component.feedbackMessage.length).toBeGreaterThan(0);
      expect(saved).toBe(false);
    });

    it('mật khẩu dưới 6 ký tự: báo lỗi, không phát onSave', () => {
      fixture.detectChanges();
      component.newPassword = '123';
      component.confirmPassword = '123';
      let saved = false;
      component.onSave.subscribe(() => (saved = true));

      component.save();

      expect(component.feedbackType).toBe('error');
      expect(saved).toBe(false);
    });

    it('hai mật khẩu không khớp: báo lỗi lấy từ i18n, không phát onSave', () => {
      fixture.detectChanges();
      component.newPassword = 'password1';
      component.confirmPassword = 'password2';
      let saved = false;
      component.onSave.subscribe(() => (saved = true));

      component.save();

      expect(component.feedbackType).toBe('error');
      expect(saved).toBe(false);
    });

    it('hợp lệ: phát onSave kèm mật khẩu mới', () => {
      fixture.detectChanges();
      component.newPassword = 'password123';
      component.confirmPassword = 'password123';
      let saved: string | undefined;
      component.onSave.subscribe((v) => (saved = v));

      component.save();

      expect(saved).toBe('password123');
    });

    it('thông báo lỗi tự biến mất sau 4 giây', () => {
      vi.useFakeTimers();
      fixture.detectChanges();

      component.save(); // thiếu trường -> báo lỗi
      expect(component.feedbackMessage.length).toBeGreaterThan(0);

      vi.advanceTimersByTime(4000);

      expect(component.feedbackMessage).toBe('');
      expect(component.feedbackType).toBe('');
      vi.useRealTimers();
    });
  });

  it('cancel() phát onClose', () => {
    fixture.detectChanges();
    let closed = false;
    component.onClose.subscribe(() => (closed = true));

    component.cancel();

    expect(closed).toBe(true);
  });

  describe('tương tác trực tiếp trên DOM', () => {
    it('bấm nút Lưu/Huỷ ở footer gọi đúng save()/cancel()', () => {
      fixture.detectChanges();
      let closed = false;
      component.onClose.subscribe(() => (closed = true));

      fixture.nativeElement.querySelector('.btn-footer.btn-cancel').click();
      expect(closed).toBe(true);

      fixture.nativeElement.querySelector('.btn-footer.btn-save').click();
      expect(component.feedbackType).toBe('error'); // form rỗng -> save() báo lỗi ngay
    });
  });
});
