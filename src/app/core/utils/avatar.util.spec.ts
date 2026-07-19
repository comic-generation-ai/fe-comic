import { getAvatarInitial } from './avatar.util';

describe('getAvatarInitial', () => {
  it('trả về chữ cái đầu viết hoa khi có tên', () => {
    expect(getAvatarInitial('nhan')).toBe('N');
  });

  it('bỏ khoảng trắng đầu/cuối trước khi lấy chữ cái đầu', () => {
    expect(getAvatarInitial('  thanh  ')).toBe('T');
  });

  it('trả về "?" khi tên là null/undefined', () => {
    expect(getAvatarInitial(null)).toBe('?');
    expect(getAvatarInitial(undefined)).toBe('?');
  });

  it('trả về "?" khi tên rỗng hoặc toàn khoảng trắng', () => {
    expect(getAvatarInitial('')).toBe('?');
    expect(getAvatarInitial('   ')).toBe('?');
  });
});
