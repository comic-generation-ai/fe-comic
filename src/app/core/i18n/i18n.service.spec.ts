import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(I18nService);
  });

  it('mặc định ngôn ngữ là "en"', () => {
    expect(service.lang).toBe('en');
  });

  it('setLang() đổi ngôn ngữ hiện tại', () => {
    service.setLang('vi');
    expect(service.lang).toBe('vi');
  });

  it('translate() trả về đúng chuỗi dịch theo key lồng nhau', () => {
    expect(service.translate('COMMON.EDIT')).toBe('Edit');
  });

  it('translate() trả về nguyên key khi không tìm thấy bản dịch', () => {
    expect(service.translate('KHONG_TON_TAI.XXX')).toBe('KHONG_TON_TAI.XXX');
  });

  it('translate() thay thế tham số {{param}} trong chuỗi dịch', () => {
    expect(service.translate('EDITOR_COMIC.FRAME_NUM', { num: 3 })).toBe('Frame #3');
  });

  it('translate() đổi theo ngôn ngữ hiện tại sau khi setLang()', () => {
    const en = service.translate('COMMON.EDIT');
    service.setLang('vi');
    const vi = service.translate('COMMON.EDIT');

    expect(vi).not.toBe(en);
  });
});
