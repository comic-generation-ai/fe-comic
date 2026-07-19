import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth-guard';
import { AuthSessionService } from '../auth/auth-session.service';

describe('authGuard', () => {
  let authSession: AuthSessionService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });

    authSession = TestBed.inject(AuthSessionService);
    router = TestBed.inject(Router);
    authSession.clearSession();
  });

  afterEach(() => {
    authSession.clearSession();
  });

  it('cho phép truy cập khi đã đăng nhập', () => {
    authSession.setSession('token-123', 'user@test.dev');

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(true);
  });

  it('chuyển hướng về /auth/login khi chưa đăng nhập', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any)) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result)).toBe('/auth/login');
  });
});
