import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

export interface ModalData {
  iconUrl?: string;
  materialIcon?: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  type: 'danger' | 'primary' | 'warning';
}

@Component({
  selector: 'app-pop-up',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './pop-up.html',
  styleUrl: './pop-up.scss'
})
export class PopUp {
  // Trạng thái đóng/mở của PopUp
  @Input() isOpen: boolean = false;

  // Dữ liệu hiển thị của PopUp
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() confirmLabel: string = 'Xác nhận';
  @Input() cancelLabel: string = 'Hủy';
  
  // Tùy chọn ảnh minh họa hoặc biểu tượng Material Symbols
  @Input() iconUrl?: string;
  @Input() materialIcon?: string;
  
  // Phân loại kiểu hiển thị: 'danger' (Đỏ), 'primary' (Tím), 'warning' (Vàng)
  @Input() type: 'danger' | 'primary' | 'warning' = 'primary';

  // Sự kiện gửi về component cha
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  /**
   * Phát sự kiện xác nhận về component cha
   */
  onConfirm() {
    this.confirm.emit();
  }

  /**
   * Phát sự kiện hủy về component cha
   */
  onCancel() {
    this.cancel.emit();
  }

  /**
   * Đóng popup khi click vào vùng nền mờ phía ngoài
   */
  onBackdropClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }

  /**
   * Lấy icon mặc định tương ứng với từng kiểu popup
   */
  getDefaultIcon(type: 'danger' | 'primary' | 'warning'): string {
    switch (type) {
      case 'danger': return 'delete';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
}
