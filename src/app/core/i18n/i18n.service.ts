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

  translate(key: string, params?: any): string {
    const keys = key.split('.');
    let translation: any = TRANSLATIONS[this.currentLang()];

    for (const k of keys) {
      if (translation && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        return key; // fallback to key
      }
    }

    if (typeof translation === 'string' && params) {
      Object.keys(params).forEach(p => {
        translation = translation.replace(new RegExp(`{{${p}}}`, 'g'), String(params[p]));
      });
    }

    return translation;
  }
}
