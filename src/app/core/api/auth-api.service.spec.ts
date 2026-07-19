import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiEnvelope, AuthApiService, LoginResult, RegisteredUser } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('register() gửi POST /api/auth/register với đúng payload', () => {
    const envelope: ApiEnvelope<RegisteredUser> = {
      success: true, code: 0, message: 'ok', data: { id: 'u1', email: 'a@test.dev', fullName: 'A' },
    };

    service
      .register({ email: 'a@test.dev', password: 'pw123456', confirmPassword: 'pw123456', fullName: 'A' })
      .subscribe((res) => expect(res).toEqual(envelope));

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@test.dev', password: 'pw123456', confirmPassword: 'pw123456', fullName: 'A' });
    req.flush(envelope);
  });

  it('login() gửi POST /api/auth/login với đúng payload', () => {
    const envelope: ApiEnvelope<LoginResult> = {
      success: true, code: 0, message: 'ok', data: { email: 'a@test.dev', token: 't', refreshToken: 'r' },
    };

    service.login({ email: 'a@test.dev', password: 'pw123456' }).subscribe((res) => expect(res).toEqual(envelope));

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(envelope);
  });

  it('login() thất bại (sai mật khẩu) rơi vào nhánh error với envelope success:false', () => {
    const envelope: ApiEnvelope<LoginResult> = { success: false, code: 401, message: 'Sai mật khẩu', data: null };

    service.login({ email: 'a@test.dev', password: 'sai' }).subscribe({
      next: () => {
        throw new Error('không được next khi HTTP trả lỗi');
      },
      error: (err) => expect(err.error).toEqual(envelope),
    });

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(envelope, { status: 401, statusText: 'Unauthorized' });
  });
});
