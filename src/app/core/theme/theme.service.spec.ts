import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('mặc định là dark theme khi localStorage chưa lưu gì', () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ThemeService);

    expect(service.isDark).toBe(true);
  });

  it('đọc lại theme đã lưu trong localStorage lúc khởi tạo (light)', () => {
    localStorage.setItem('theme', 'light');
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ThemeService);

    expect(service.isDark).toBe(false);
  });

  it('setTheme() cập nhật trạng thái và ghi lại localStorage', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ThemeService);

    service.setTheme(false);

    expect(service.isDark).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');

    service.setTheme(true);

    expect(service.isDark).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('toggleTheme() đảo ngược trạng thái hiện tại', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(ThemeService);
    const before = service.isDark;

    service.toggleTheme();

    expect(service.isDark).toBe(!before);
  });
});
