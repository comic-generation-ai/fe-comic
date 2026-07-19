import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserApiService, UserProfile } from './user-api.service';

describe('UserApiService', () => {
  let service: UserApiService;
  let httpMock: HttpTestingController;

  const profile: UserProfile = {
    id: 'u1', email: 'a@test.dev', fullName: 'A', username: 'a', avatarUrl: null,
    subscription_tier: 'free', credits_balance: 0, created_at: '2026-01-01',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getMe() gửi GET /api/users/me', () => {
    service.getMe().subscribe((res) => expect(res).toEqual(profile));

    const req = httpMock.expectOne('/api/users/me');
    expect(req.request.method).toBe('GET');
    req.flush(profile);
  });

  it('updateMe() gửi PATCH /api/users/me với payload', () => {
    service.updateMe({ fullName: 'B' }).subscribe((res) => expect(res).toEqual({ ...profile, fullName: 'B' }));

    const req = httpMock.expectOne('/api/users/me');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ fullName: 'B' });
    req.flush({ ...profile, fullName: 'B' });
  });
});
