import { ChangeDetectorRef, Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { getAvatarInitial } from '../../../core/utils/avatar.util';

export interface UserProfileInfo {
  name: string;
  handle: string;
  joinDate: string;
  email: string;
  avatar: string;
}

// Đặt sẵn avatar-1.png .. avatar-8.png (đề xuất ~256x256, nền trong suốt hoặc vuông)
// vào fe-comic/src/assets/images/avatars/ để hiện trong bộ chọn — chưa có file thì
// ô tương ứng tự ẩn (xem onPresetError trong template).
const PRESET_AVATAR_COUNT = 8;
const PRESET_AVATARS = Array.from(
  { length: PRESET_AVATAR_COUNT },
  (_, i) => `assets/images/avatars/avatar-${i + 1}.png`,
);

// Giới hạn cạnh dài nhất sau resize — giữ base64 nhỏ vì lưu thẳng vào cột DB (text)
const MAX_AVATAR_DIMENSION = 256;

@Component({
  selector: 'app-edit-info-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './edit-info-modal.html',
  styleUrl: './edit-info-modal.scss',
})
export class EditInfoModal implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() userProfile!: UserProfileInfo;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<UserProfileInfo>();

  // Local cloned state to hold edits before saving
  localProfile!: UserProfileInfo;

  readonly presetAvatars = PRESET_AVATARS;

  ngOnInit() {
    // Deep copy initial profile details
    this.localProfile = {
      ...this.userProfile,
    };
  }

  get avatarInitial(): string {
    return getAvatarInitial(this.localProfile?.name);
  }

  // Handle hidden input trigger
  triggerFileInput(fileInput: HTMLInputElement) {
    fileInput.click();
  }

  // Đọc file ảnh, resize xuống tối đa MAX_AVATAR_DIMENSION rồi nén JPEG trước khi
  // lưu base64 — tránh base64 gốc quá lớn (ảnh chụp điện thoại có thể vài MB).
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_AVATAR_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        this.localProfile.avatar = canvas.toDataURL('image/jpeg', 0.85);
        // FileReader/Image.onload chạy ngoài Angular (app zoneless) — không tự vẽ
        // lại view, phải báo scheduler thủ công để ảnh hiện ngay, không cần thao
        // tác gì khác mới thấy.
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Chọn 1 avatar mặc định thay vì upload
  selectPreset(url: string) {
    this.localProfile.avatar = url;
  }

  // Ẩn ô preset nếu file ảnh chưa tồn tại (bạn chưa đặt file vào assets/images/avatars/)
  onPresetError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.closest('.preset-avatar-btn')?.setAttribute('style', 'display:none');
  }

  // Remove photo and display chữ cái đầu tên
  removePhoto() {
    this.localProfile.avatar = '';
  }

  // Save edits
  save() {
    if (!this.localProfile.name.trim()) {
      alert('Full Name cannot be empty.');
      return;
    }
    
    // Ensure handle starts with @
    let handle = this.localProfile.handle.trim();
    if (handle && !handle.startsWith('@')) {
      handle = '@' + handle;
    }
    this.localProfile.handle = handle;

    this.onSave.emit(this.localProfile);
  }

  // Cancel edit modal
  cancel() {
    this.onClose.emit();
  }
}

