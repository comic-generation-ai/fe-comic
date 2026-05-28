import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ThemeService } from '../../core/theme/theme.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { EditInfoModal } from './edit-info-modal/edit-info-modal';
import { PopUp } from '../../shared/ui/pop-up/pop-up';

interface Transaction {
  description: string;
  date: string;
  amount: string;
  status: string;
}

@Component({
  selector: 'app-information-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, EditInfoModal, PopUp, RouterLink],
  templateUrl: './information-page.html',
  styleUrl: './information-page.scss',
})
export class InformationPage {
  // Toggle for Edit Modal
  showEditModal = false;

  // Toggle for custom language dropdown
  showLangDropdown = false;

  // Shared PopUp component states
  showPopUp = false;
  popUpType: 'danger' | 'primary' | 'warning' = 'primary';
  popUpTitle = '';
  popUpMessage = '';
  popUpConfirmLabel = 'OK';
  popUpCancelLabel = 'Cancel';
  popUpAction: () => void = () => {};

  // User Profile details
  user = {
    name: 'Felix Vane',
    handle: '@felix_creations',
    joinDate: 'March 2024',
    email: 'felix.vane@comical.studio',
    avatar: 'assets/images/avatar.png',
    bio: 'Passionate storyteller and digital artist exploring the boundaries of AI-powered comics.'
  };

  // Subscription Details
  sub = {
    plan: 'PROFILE.SUB_PLAN',
    renewDate: 'April 12, 2026',
    tokensUsed: 650,
    tokensTotal: 1200,
    percentUsed: 54
  };

  // Stats Details
  stats = {
    projects: 24,
    pages: 148,
    characters: 86
  };

  // Mock Transactions
  transactions: Transaction[] = [
    {
      description: 'Creator Pro - Monthly Renewal',
      date: 'Mar 12, 2026',
      amount: '$29.00',
      status: 'success'
    },
    {
      description: '500 Credits Top-up',
      date: 'Feb 28, 2026',
      amount: '$15.00',
      status: 'success'
    },
    {
      description: 'Creator Pro - Monthly Renewal',
      date: 'Feb 12, 2026',
      amount: '$29.00',
      status: 'success'
    }
  ];

  // Preferences bindings
  notificationsEnabled = true;

  // Security Form bindings
  newPassword = '';
  confirmPassword = '';
  feedbackMessage = '';
  feedbackType: 'success' | 'error' | '' = '';

  constructor(
    private themeService: ThemeService,
    private i18nService: I18nService,
    private router: Router
  ) {}

  // Getter for dark mode setting
  get isDarkTheme(): boolean {
    return this.themeService.isDark;
  }

  // Toggle Dark Mode
  toggleDarkMode() {
    this.themeService.toggleTheme();
  }

  // Getter for current language
  get currentLanguage(): 'en' | 'vi' {
    return this.i18nService.lang;
  }

  // Set Language
  changeLanguage(lang: 'en' | 'vi') {
    this.i18nService.setLang(lang);
  }

  // Trigger password update
  updatePassword() {
    if (!this.newPassword || !this.confirmPassword) {
      this.showFeedback('Please fill out all password fields.', 'error');
      return;
    }

    if (this.newPassword.length < 6) {
      this.showFeedback('Password must be at least 6 characters.', 'error');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      const errorMsg = this.i18nService.translate('PROFILE.PASSWORD_MISMATCH');
      this.showFeedback(errorMsg, 'error');
      return;
    }

    const successMsg = this.i18nService.translate('PROFILE.PASSWORD_UPDATED_SUCCESS');
    this.newPassword = '';
    this.confirmPassword = '';
    
    // Open password update success popup
    this.openPopUp(
      'primary',
      this.i18nService.translate('PROFILE.SECURITY'),
      successMsg,
      'OK',
      '',
      () => this.showPopUp = false
    );
  }

  // Helper to show feedback messages
  private showFeedback(message: string, type: 'success' | 'error') {
    this.feedbackMessage = message;
    this.feedbackType = type;
    setTimeout(() => {
      this.feedbackMessage = '';
      this.feedbackType = '';
    }, 4000);
  }

  // Helper to open the shared pop-up
  openPopUp(
    type: 'danger' | 'primary' | 'warning',
    title: string,
    message: string,
    confirmLabel: string,
    cancelLabel: string,
    action: () => void
  ) {
    this.popUpType = type;
    this.popUpTitle = title;
    this.popUpMessage = message;
    this.popUpConfirmLabel = confirmLabel;
    this.popUpCancelLabel = cancelLabel;
    this.popUpAction = action;
    this.showPopUp = true;
  }

  // Trigger account deletion warning using shared popup
  deleteAccount() {
    const confirmationText = this.i18nService.translate('PROFILE.DELETE_CONFIRM');
    const deleteTitle = this.i18nService.translate('PROFILE.DANGER_ZONE');
    const deleteLabel = this.i18nService.translate('PROFILE.DELETE_ACCOUNT');
    const cancelLabel = this.i18nService.translate('PROFILE.EDIT_MODAL.CANCEL');

    this.openPopUp(
      'danger',
      deleteTitle,
      confirmationText,
      deleteLabel,
      cancelLabel,
      () => {
        this.showPopUp = false;
        this.router.navigate(['/auth/login']);
      }
    );
  }

  // simulated download trigger
  downloadTransactions() {
    alert('Simulating download of all transactions in CSV format...');
  }

  // Update profile information from modal save
  saveProfile(updatedInfo: any) {
    this.user = {
      ...this.user,
      ...updatedInfo
    };
    this.showEditModal = false;

    // Trigger success notification popup instantly
    const profileTitle = this.i18nService.translate('PROFILE.EDIT_MODAL.TITLE');
    const profileSuccessMsg = this.i18nService.lang === 'vi' 
      ? 'Cập nhật trang cá nhân thành công.' 
      : 'Profile updated successfully.';

    this.openPopUp(
      'primary',
      profileTitle,
      profileSuccessMsg,
      'OK',
      '',
      () => this.showPopUp = false
    );
  }

  // Toggle custom language dropdown list
  toggleLangDropdown(event: Event) {
    event.stopPropagation();
    this.showLangDropdown = !this.showLangDropdown;
  }

  // Close dropdown on clicking outside
  @HostListener('document:click')
  closeLangDropdown() {
    this.showLangDropdown = false;
  }
}

