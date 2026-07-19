import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { InformationPage } from './information-page';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { UserApiService, UserProfile } from '../../core/api/user-api.service';
import { ProjectApiService } from '../../core/api/project-api.service';

const profile: UserProfile = {
  id: 'u1', email: 'a@test.dev', fullName: 'Nguyen Van A', username: 'nva',
  avatarUrl: null, subscription_tier: 'free', credits_balance: 0, created_at: '2026-03-15T00:00:00.000Z',
};

function setup(opts: {
  getMe?: any; getMyProjects?: any; updateMe?: any;
} = {}) {
  const fakeUserApi = { getMe: vi.fn(opts.getMe ?? (() => of(profile))), updateMe: vi.fn(opts.updateMe ?? (() => of(profile))) };
  const fakeProjectApi = { getMyProjects: vi.fn(opts.getMyProjects ?? (() => of([]))), getProject: vi.fn(), createProject: vi.fn(), deleteProject: vi.fn() };

  TestBed.configureTestingModule({
    imports: [InformationPage],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: UserApiService, useValue: fakeUserApi },
      { provide: ProjectApiService, useValue: fakeProjectApi },
    ],
  });

  const fixture: ComponentFixture<InformationPage> = TestBed.createComponent(InformationPage);
  const component = fixture.componentInstance;
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const currentUser = TestBed.inject(CurrentUserService);
  return { fixture, component, fakeUserApi, fakeProjectApi, router, currentUser };
}

describe('InformationPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('ngOnInit() — nạp hồ sơ và số lượng project', () => {
    it('nạp thành công: effect() điền đúng this.user từ profile, stats.projects theo số project', () => {
      const { fixture, component } = setup({ getMyProjects: () => of([{}, {}, {}]) });

      fixture.detectChanges();

      expect(component.user.name).toBe('Nguyen Van A');
      expect(component.user.handle).toBe('@nva');
      expect(component.user.email).toBe('a@test.dev');
      expect(component.user.joinDate).toContain('2026');
      expect(component.stats.projects).toBe(3);
    });

    it('profile không có fullName/username thì dùng email làm tên hiển thị, handle rỗng', () => {
      const { fixture, component } = setup({
        getMe: () => of({ ...profile, fullName: null, username: null }),
      });

      fixture.detectChanges();

      expect(component.user.name).toBe('a@test.dev');
      expect(component.user.handle).toBe('');
    });

    it('lỗi khi lấy danh sách project không làm hỏng trang, stats.projects giữ 0', () => {
      const { fixture, component } = setup({ getMyProjects: () => throwError(() => new Error('500')) });

      fixture.detectChanges();

      expect(component.stats.projects).toBe(0);
    });
  });

  describe('theme / ngôn ngữ', () => {
    it('toggleDarkMode() đổi theme hệ thống', () => {
      const { fixture, component } = setup();
      fixture.detectChanges();
      const before = component.isDarkTheme;

      component.toggleDarkMode();

      expect(component.isDarkTheme).toBe(!before);
    });

    it('changeLanguage() đổi ngôn ngữ hiện tại', () => {
      const { fixture, component } = setup();
      fixture.detectChanges();

      component.changeLanguage('vi');

      expect(component.currentLanguage).toBe('vi');
    });

    it('toggleLangDropdown() bật/tắt dropdown và stopPropagation; closeLangDropdown() tắt khi click ra ngoài', () => {
      const { fixture, component } = setup();
      fixture.detectChanges();
      const event = new MouseEvent('click');
      vi.spyOn(event, 'stopPropagation');

      component.toggleLangDropdown(event);
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showLangDropdown).toBe(true);

      component.closeLangDropdown();
      expect(component.showLangDropdown).toBe(false);
    });
  });

  describe('popup dùng chung (openPopUp) qua các luồng nghiệp vụ', () => {
    it('updatePassword() mở popup thành công, action đóng cả 2 modal', () => {
      const { fixture, component } = setup();
      fixture.detectChanges();
      component.showPasswordModal = true;

      component.updatePassword('newpass123');

      expect(component.showPopUp).toBe(true);
      expect(component.popUpType).toBe('primary');

      component.popUpAction();
      expect(component.showPopUp).toBe(false);
      expect(component.showPasswordModal).toBe(false);
    });

    it('deleteAccount() mở popup cảnh báo nguy hiểm, action điều hướng về trang login', () => {
      const { fixture, component, router } = setup();
      fixture.detectChanges();

      component.deleteAccount();

      expect(component.popUpType).toBe('danger');
      expect(component.showPopUp).toBe(true);

      component.popUpAction();
      expect(component.showPopUp).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('downloadTransactions() gọi window.alert mô phỏng tải xuống', () => {
      const { fixture, component } = setup();
      fixture.detectChanges();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      component.downloadTransactions();

      expect(alertSpy).toHaveBeenCalled();
    });
  });

  describe('saveProfile() — lưu hồ sơ thật lên BE qua CurrentUserService', () => {
    it('thành công: đóng modal sửa hồ sơ, mở popup thông báo thành công', () => {
      const { fixture, component, fakeUserApi } = setup();
      fixture.detectChanges();
      component.showEditModal = true;

      component.saveProfile({ name: 'Ten Moi', handle: '@moi', joinDate: '', email: '', avatar: 'a.png' });

      expect(fakeUserApi.updateMe).toHaveBeenCalledWith({ fullName: 'Ten Moi', username: 'moi', avatarUrl: 'a.png' });
      expect(component.showEditModal).toBe(false);
      expect(component.showPopUp).toBe(true);
      expect(component.popUpType).toBe('primary');
    });

    it('handle rỗng thì gửi username=undefined thay vì chuỗi rỗng', () => {
      const { fixture, component, fakeUserApi } = setup();
      fixture.detectChanges();

      component.saveProfile({ name: 'Ten Moi', handle: '', joinDate: '', email: '', avatar: '' });

      expect(fakeUserApi.updateMe).toHaveBeenCalledWith({ fullName: 'Ten Moi', username: undefined, avatarUrl: undefined });
    });

    it('thất bại: mở popup báo lỗi, không đóng modal sửa hồ sơ', () => {
      const { fixture, component } = setup({ updateMe: () => throwError(() => new Error('403')) });
      fixture.detectChanges();
      component.showEditModal = true;

      component.saveProfile({ name: 'Ten Moi', handle: '', joinDate: '', email: '', avatar: '' });

      expect(component.showEditModal).toBe(true);
      expect(component.showPopUp).toBe(true);
      expect(component.popUpType).toBe('danger');
    });
  });
});
