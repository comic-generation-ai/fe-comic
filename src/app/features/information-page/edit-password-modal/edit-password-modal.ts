import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-edit-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './edit-password-modal.html',
  styleUrl: './edit-password-modal.scss',
})
export class EditPasswordModal {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<string>();

  newPassword = '';
  confirmPassword = '';
  feedbackMessage = '';
  feedbackType: 'success' | 'error' | '' = '';

  constructor(private i18nService: I18nService) {}

  cancel() {
    this.onClose.emit();
  }

  save() {
    if (!this.newPassword || !this.confirmPassword) {
      this.showFeedback(
        this.i18nService.lang === 'vi' 
          ? 'Vui lòng điền đầy đủ các trường mật khẩu.' 
          : 'Please fill out all password fields.',
        'error'
      );
      return;
    }

    if (this.newPassword.length < 6) {
      this.showFeedback(
        this.i18nService.lang === 'vi' 
          ? 'Mật khẩu phải có ít nhất 6 ký tự.' 
          : 'Password must be at least 6 characters.',
        'error'
      );
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      const errorMsg = this.i18nService.translate('PROFILE.PASSWORD_MISMATCH');
      this.showFeedback(errorMsg, 'error');
      return;
    }

    this.onSave.emit(this.newPassword);
  }

  private showFeedback(message: string, type: 'success' | 'error') {
    this.feedbackMessage = message;
    this.feedbackType = type;
    setTimeout(() => {
      this.feedbackMessage = '';
      this.feedbackType = '';
    }, 4000);
  }
}
