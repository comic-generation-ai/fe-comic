import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  let service: AuthSessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthSessionService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('chưa có phiên đăng nhập thì getToken()/getEmail() trả về null và isLoggedIn() = false', () => {
    expect(service.getToken()).toBeNull();
    expect(service.getEmail()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('setSession() lưu token/email vào localStorage và isLoggedIn() = true', () => {
    service.setSession('jwt-token', 'user@test.dev');

    expect(service.getToken()).toBe('jwt-token');
    expect(service.getEmail()).toBe('user@test.dev');
    expect(service.isLoggedIn()).toBe(true);
    expect(localStorage.getItem('comic_access_token')).toBe('jwt-token');
    expect(localStorage.getItem('comic_user_email')).toBe('user@test.dev');
  });

  it('clearSession() xoá toàn bộ phiên đăng nhập đã lưu', () => {
    service.setSession('jwt-token', 'user@test.dev');

    service.clearSession();

    expect(service.getToken()).toBeNull();
    expect(service.getEmail()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('setSession() gọi lần sau ghi đè phiên cũ (đổi tài khoản trên cùng trình duyệt)', () => {
    service.setSession('token-a', 'a@test.dev');
    service.setSession('token-b', 'b@test.dev');

    expect(service.getToken()).toBe('token-b');
    expect(service.getEmail()).toBe('b@test.dev');
  });
});
