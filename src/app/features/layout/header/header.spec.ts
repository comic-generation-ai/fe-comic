import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Header } from './header';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { ThemeService } from '../../../core/theme/theme.service';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  let component: Header;
  let router: Router;
  let authSession: AuthSessionService;
  let currentUser: CurrentUserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    authSession = TestBed.inject(AuthSessionService);
    currentUser = TestBed.inject(CurrentUserService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    authSession.clearSession();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('ngOnInit() gọi currentUser.load() để nạp hồ sơ người dùng', () => {
    const spy = vi.spyOn(currentUser, 'load');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  describe('displayName / avatarInitial', () => {
    it('rỗng khi chưa có profile', () => {
      fixture.detectChanges();
      expect(component.displayName).toBe('');
      expect(component.avatarInitial).toBe('?');
    });

    it('ưu tiên fullName, sau đó username, sau đó email', () => {
      fixture.detectChanges();
      currentUser.profile.set({ id: 'u1', email: 'a@test.dev', fullName: 'Nguyen Van A', username: 'nva', avatarUrl: null, subscription_tier: 'free', credits_balance: 0, created_at: '2026-01-01' });
      expect(component.displayName).toBe('Nguyen Van A');
      expect(component.avatarInitial).toBe('N');

      currentUser.profile.set({ id: 'u1', email: 'a@test.dev', fullName: null, username: 'nva', avatarUrl: null, subscription_tier: 'free', credits_balance: 0, created_at: '2026-01-01' });
      expect(component.displayName).toBe('nva');

      currentUser.profile.set({ id: 'u1', email: 'a@test.dev', fullName: null, username: null, avatarUrl: null, subscription_tier: 'free', credits_balance: 0, created_at: '2026-01-01' });
      expect(component.displayName).toBe('a@test.dev');
    });
  });

  describe('toggleTheme()', () => {
    it('đổi theme trực tiếp khi trình duyệt không hỗ trợ View Transitions API', () => {
      fixture.detectChanges();
      const themeService = TestBed.inject(ThemeService);
      const before = component.isDark;

      component.toggleTheme();

      expect(component.isDark).toBe(!before);
      void themeService;
    });

    it('dùng document.startViewTransition khi trình duyệt hỗ trợ (giả lập API)', async () => {
      fixture.detectChanges();
      const before = component.isDark;
      const animate = vi.fn();
      (document.documentElement as any).animate = animate;
      (document as any).startViewTransition = vi.fn((cb: () => Promise<void>) => {
        cb();
        return { ready: Promise.resolve(), finished: Promise.resolve() };
      });

      component.toggleTheme(new MouseEvent('click', { clientX: 10, clientY: 10 }));
      await Promise.resolve();

      expect(component.isDark).toBe(!before);
      delete (document as any).startViewTransition;
    });
  });

  describe('dropdown / mobile menu / notifications', () => {
    beforeEach(() => fixture.detectChanges());

    it('toggleDropdown() bật/tắt và đóng notifications khi mở', () => {
      const event = new MouseEvent('click');
      vi.spyOn(event, 'stopPropagation');
      component.showNotifications = true;

      component.toggleDropdown(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showDropdown).toBe(true);
      expect(component.showNotifications).toBe(false);
    });

    it('toggleMobileMenu() bật/tắt và đóng dropdown/notifications khi mở', () => {
      component.showDropdown = true;
      component.showNotifications = true;

      component.toggleMobileMenu();

      expect(component.showMobileMenu).toBe(true);
      expect(component.showDropdown).toBe(false);
      expect(component.showNotifications).toBe(false);
    });

    it('toggleNotifications() mặc định đóng cả dropdown và mobile menu', () => {
      component.showDropdown = true;
      component.showMobileMenu = true;

      component.toggleNotifications(new MouseEvent('click'));

      expect(component.showNotifications).toBe(true);
      expect(component.showDropdown).toBe(false);
      expect(component.showMobileMenu).toBe(false);
    });

    it('toggleNotifications(fromMobile=true) không đóng mobile menu', () => {
      component.showMobileMenu = true;

      component.toggleNotifications(new MouseEvent('click'), true);

      expect(component.showNotifications).toBe(true);
      expect(component.showMobileMenu).toBe(true);
    });

    it('onClickOutside() đóng dropdown/notifications khi click ngoài header, giữ nguyên khi click bên trong', () => {
      component.showDropdown = true;
      component.showNotifications = true;

      const outside = document.createElement('div');
      document.body.appendChild(outside);
      component.onClickOutside({ target: outside } as unknown as Event);
      expect(component.showDropdown).toBe(false);
      outside.remove();

      component.showDropdown = true;
      component.onClickOutside({ target: fixture.nativeElement } as unknown as Event);
      expect(component.showDropdown).toBe(true);
    });

    it('onResize() đóng mobile menu khi màn hình rộng hơn 768px', () => {
      component.showMobileMenu = true;
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);

      component.onResize({});

      expect(component.showMobileMenu).toBe(false);
    });
  });

  describe('logout() / navigateToProfile()', () => {
    beforeEach(() => fixture.detectChanges());

    it('logout() xoá phiên đăng nhập, đóng toàn bộ menu và điều hướng về trang login', () => {
      authSession.setSession('token', 'a@test.dev');
      currentUser.profile.set({ id: 'u1', email: 'a@test.dev', fullName: 'A', username: 'a', avatarUrl: null, subscription_tier: 'free', credits_balance: 0, created_at: '2026-01-01' });
      component.showDropdown = true;
      component.showMobileMenu = true;

      component.logout();

      expect(authSession.isLoggedIn()).toBe(false);
      expect(currentUser.profile()).toBeNull();
      expect(component.showDropdown).toBe(false);
      expect(component.showMobileMenu).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('navigateToProfile() đóng menu và điều hướng tới trang hồ sơ', () => {
      component.showDropdown = true;
      component.showMobileMenu = true;

      component.navigateToProfile();

      expect(component.showDropdown).toBe(false);
      expect(component.showMobileMenu).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/app/profile']);
    });
  });

  // Bấm thẳng vào phần tử DOM thật để khớp đúng các hàm lắng nghe sự kiện
  // (click) khai báo trong header.html — tăng độ bao phủ "functions" của
  // template, không thêm hành vi nghiệp vụ mới so với các test method ở trên.
  describe('tương tác trực tiếp trên DOM (khớp các hàm lắng nghe sự kiện trong template)', () => {
    beforeEach(() => fixture.detectChanges());

    it('bấm chuông thông báo mở modal thông báo', () => {
      fixture.nativeElement.querySelector('.btn-notification').click();
      expect(component.showNotifications).toBe(true);
    });

    it('bấm avatar mở dropdown; trong dropdown: bấm thông tin user, đổi theme, đổi ngôn ngữ, đăng xuất', () => {
      fixture.nativeElement.querySelector('.btn-avatar').click();
      fixture.detectChanges();
      expect(component.showDropdown).toBe(true);

      fixture.nativeElement.querySelector('.lang-pill:nth-child(1)').click();
      expect(component.i18n.lang).toBe('vi');
      fixture.nativeElement.querySelectorAll('.lang-pill')[1].click();
      expect(component.i18n.lang).toBe('en');

      const before = component.isDark;
      fixture.nativeElement.querySelector('.dropdown-item:not(.no-hover)').click();
      expect(component.isDark).toBe(!before);

      fixture.nativeElement.querySelector('.btn-logout').click();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('bấm thông tin user trong dropdown điều hướng sang trang hồ sơ', () => {
      fixture.nativeElement.querySelector('.btn-avatar').click();
      fixture.detectChanges();

      fixture.nativeElement.querySelector('.dropdown-user-info').click();

      expect(router.navigate).toHaveBeenCalledWith(['/app/profile']);
    });

    it('bấm nút hamburger mở drawer di động; trong drawer: bấm thông báo, theme, đăng xuất', () => {
      fixture.nativeElement.querySelector('.btn-hamburger').click();
      fixture.detectChanges();
      expect(component.showMobileMenu).toBe(true);

      fixture.nativeElement.querySelector('.drawer-notification-container .drawer-action-btn').click();
      expect(component.showNotifications).toBe(true);
      expect(component.showMobileMenu).toBe(true); // fromMobile=true nên không tự đóng drawer

      const before = component.isDark;
      fixture.nativeElement.querySelectorAll('.drawer-action-btn')[1].click();
      expect(component.isDark).toBe(!before);

      fixture.nativeElement.querySelector('.mobile-drawer .btn-logout').click();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });
});
