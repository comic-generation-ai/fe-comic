import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { unauthorizedInterceptor } from './unauthorized-interceptor';
import { AuthSessionService } from '../auth/auth-session.service';
import { CurrentUserService } from '../auth/current-user.service';

describe('unauthorizedInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let authSession: AuthSessionService;
  let currentUser: CurrentUserService;
  let router: Router;

  beforeEach(() => {
    const routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authSession = TestBed.inject(AuthSessionService);
    currentUser = TestBed.inject(CurrentUserService);
    router = TestBed.inject(Router);

    authSession.setSession('test-token', 'test@test.dev');
  });

  afterEach(() => {
    httpMock.verify();
    authSession.clearSession();
  });

  it('khi API trả về 401 Unauthorized, tự động xóa session, clear profile và navigate về /auth/login', () => {
    http.get('/api/protected').subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authSession.isLoggedIn()).toBe(false);
    expect(currentUser.profile()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('khi API trả về mã lỗi khác (vd 500), không tự động logout', () => {
    http.get('/api/protected').subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
      },
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush({ message: 'Server Error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(authSession.isLoggedIn()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
