import { Injectable, signal, effect } from '@angular/core';
import darkTheme from '../../../assets/theme/_dark.json';
import lightTheme from '../../../assets/theme/_light.json';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkTheme = signal<boolean>(true);

  constructor() {
    this.initializeTheme();
    
    // Tự động áp dụng theme mỗi khi trạng thái thay đổi
    effect(() => {
      this.applyTheme(this.isDarkTheme());
    });
  }

  get isDark() {
    return this.isDarkTheme();
  }

  setTheme(isDark: boolean) {
    this.isDarkTheme.set(isDark);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
  }

  toggleTheme() {
    this.setTheme(!this.isDarkTheme());
  }

  private initializeTheme() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      this.isDarkTheme.set(savedTheme === 'dark');
    }
  }

  private applyTheme(isDark: boolean) {
    if (typeof document !== 'undefined') {
      const themeVars = isDark ? darkTheme : lightTheme;

      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }

      // Gán động các CSS variable vào root element
      Object.entries(themeVars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    }
  }
}
