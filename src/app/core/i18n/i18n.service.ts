import { Injectable, signal } from '@angular/core';
import viTranslations from '../../../assets/i18n/vi.json';
import enTranslations from '../../../assets/i18n/en.json';

const TRANSLATIONS: Record<'vi' | 'en', any> = {
  vi: viTranslations,
  en: enTranslations
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private currentLang = signal<'vi' | 'en'>('en');

  get lang() {
    return this.currentLang();
  }

  setLang(lang: 'vi' | 'en') {
    this.currentLang.set(lang);
  }

  translate(key: string): string {
    const keys = key.split('.');
    let translation: any = TRANSLATIONS[this.currentLang()];

    for (const k of keys) {
      if (translation && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        return key; // fallback to key
      }
    }

    return translation;
  }
}
