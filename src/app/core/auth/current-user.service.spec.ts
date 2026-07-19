import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CurrentUserService } from './current-user.service';
import { UserApiService, UserProfile } from '../api/user-api.service';

describe('CurrentUserService', () => {
  const profile: UserProfile = {
    id: 'u1',
    email: 'a@test.dev',
    fullName: 'Nguyen Van A',
    username: 'a',
    avatarUrl: null,
    subscription_tier: 'free',
    credits_balance: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  function setup(getMeImpl: () => any) {
    const fakeApi = { getMe: vi.fn(getMeImpl), updateMe: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: UserApiService, useValue: fakeApi }],
    });
    const service = TestBed.inject(CurrentUserService);
    return { service, fakeApi };
  }

  it('load() gọi API 1 lần và cập nhật profile khi thành công', () => {
    const { service, fakeApi } = setup(() => of(profile));

    service.load();

    expect(fakeApi.getMe).toHaveBeenCalledTimes(1);
    expect(service.profile()).toEqual(profile);
  });

  it('gọi load() nhiều lần liên tiếp sau khi đã tải xong không gọi lại API', () => {
    const { service, fakeApi } = setup(() => of(profile));

    service.load();
    service.load();
    service.load();

    expect(fakeApi.getMe).toHaveBeenCalledTimes(1);
  });

  it('khi API lỗi, cờ "đã tải" được reset để lần load() kế tiếp thử lại thay vì im lặng bỏ qua', () => {
    const { service, fakeApi } = setup(() => throwError(() => new Error('network error')));

    service.load();
    expect(fakeApi.getMe).toHaveBeenCalledTimes(1);
    expect(service.profile()).toBeNull();

    service.load();
    expect(fakeApi.getMe).toHaveBeenCalledTimes(2);
  });

  it('clear() xoá profile hiện tại và cho phép load() gọi lại API', () => {
    const { service, fakeApi } = setup(() => of(profile));

    service.load();
    expect(service.profile()).toEqual(profile);

    service.clear();
    expect(service.profile()).toBeNull();

    service.load();
    expect(fakeApi.getMe).toHaveBeenCalledTimes(2);
  });

  it('updateProfile() đồng bộ lại profile signal với dữ liệu server trả về sau khi cập nhật', () => {
    const updated: UserProfile = { ...profile, fullName: 'Ten Moi' };
    const fakeApi = { getMe: vi.fn(() => of(profile)), updateMe: vi.fn(() => of(updated)) };
    TestBed.configureTestingModule({
      providers: [{ provide: UserApiService, useValue: fakeApi }],
    });
    const service = TestBed.inject(CurrentUserService);
    service.load();

    service.updateProfile({ fullName: 'Ten Moi' }).subscribe();

    expect(service.profile()?.fullName).toBe('Ten Moi');
  });
});
