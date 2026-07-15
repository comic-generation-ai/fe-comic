// Chữ cái đầu hiển thị khi user chưa có ảnh avatar — dùng chung ở header,
// information-page, edit-info-modal để tránh lặp logic 3 nơi.
export function getAvatarInitial(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}
