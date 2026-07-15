import { ChangeDetectorRef, Component, HostListener, Inject, OnInit, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ThemeService } from '../../core/theme/theme.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { EditInfoModal } from './edit-info-modal/edit-info-modal';
import { EditPasswordModal } from './edit-password-modal/edit-password-modal';
import { PopUp } from '../../shared/ui/pop-up/pop-up';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { ProjectApiService } from '../../core/api/project-api.service';
import { getAvatarInitial } from '../../core/utils/avatar.util';
import { UserProfileInfo } from './edit-info-modal/edit-info-modal';

interface Transaction {
  description: string;
  date: string;
  amount: string;
  status: string;
}

@Component({
  selector: 'app-information-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, EditInfoModal, EditPasswordModal, PopUp, RouterLink],
  templateUrl: './information-page.html',
  styleUrl: './information-page.scss',
})
export class InformationPage implements OnInit {
  // Toggle for Edit Modal
  showEditModal = false;

  // Toggle for Password Modal
  showPasswordModal = false;

  // Toggle for custom language dropdown
  showLangDropdown = false;

  // Shared PopUp component states
  showPopUp = false;
  popUpType: 'danger' | 'primary' | 'warning' = 'primary';
  popUpTitle = '';
  popUpMessage = '';
  popUpConfirmLabel = 'OK';
  popUpCancelLabel = 'Cancel';
  popUpAction: () => void = () => { };

  // User Profile details — điền từ /api/users/me khi profile load xong (xem constructor)
  user = {
    name: '',
    handle: '',
    joinDate: '',
    email: '',
    avatar: '',
  };

  // Subscription Details
  sub = {
    plan: 'PROFILE.SUB_PLAN',
    renewDate: 'April 12, 2026',
    tokensUsed: 650,
    tokensTotal: 1200,
    percentUsed: 54
  };

  // Stats Details — điền từ /api/projects (số project thật của user, xem ngOnInit)
  stats = {
    projects: 0,
  };

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
    private router: Router,
    private currentUserService: CurrentUserService,
    private projectApi: ProjectApiService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    // effect() cần injection context — đặt trong constructor thay vì ngOnInit
    effect(() => {
      const profile = this.currentUserService.profile();
      if (!profile) return;
      this.user = {
        name: profile.fullName || profile.username || profile.email,
        handle: profile.username ? `@${profile.username}` : '',
        joinDate: this.formatJoinDate(profile.created_at),
        email: profile.email,
        avatar: profile.avatarUrl || '',
      };
      // App chạy zoneless — mutate this.user (plain object, không phải signal) bên
      // trong effect() không tự khiến template vẽ lại, phải báo cho scheduler.
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  ngOnInit() {
    // Chặn gọi API lúc SSR/prerender — URL tương đối không có origin trên server
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentUserService.load();

    this.projectApi.getMyProjects().subscribe({
      next: (projects) => {
        this.stats.projects = projects.length;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  // "March 2024" / "Tháng 3 2024" tùy ngôn ngữ hiện tại
  private formatJoinDate(iso: string): string {
    const locale = this.i18nService.lang === 'vi' ? 'vi-VN' : 'en-US';
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(iso));
  }

  get avatarInitial(): string {
    return getAvatarInitial(this.user.name);
  }

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
  updatePassword(newPassword: string) {
    const successMsg = this.i18nService.translate('PROFILE.PASSWORD_UPDATED_SUCCESS');

    // Open password update success popup
    this.openPopUp(
      'primary',
      this.i18nService.translate('PROFILE.SECURITY'),
      successMsg,
      'OK',
      '',
      () => {
        this.showPopUp = false;
        this.showPasswordModal = false;
      }
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

  // Update profile information from modal save — lưu thật lên BE (PATCH /users/me),
  // this.user sẽ tự cập nhật qua effect() khi currentUserService.profile() đổi
  saveProfile(updatedInfo: UserProfileInfo) {
    const profileTitle = this.i18nService.translate('PROFILE.EDIT_MODAL.TITLE');

    this.currentUserService
      .updateProfile({
        fullName: updatedInfo.name,
        username: updatedInfo.handle.replace(/^@/, '') || undefined,
        avatarUrl: updatedInfo.avatar || undefined,
      })
      .subscribe({
        next: () => {
          this.showEditModal = false;
          const successMsg = this.i18nService.lang === 'vi'
            ? 'Cập nhật trang cá nhân thành công.'
            : 'Profile updated successfully.';
          this.openPopUp('primary', profileTitle, successMsg, 'OK', '', () => (this.showPopUp = false));
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: () => {
          const errorMsg = this.i18nService.lang === 'vi'
            ? 'Cập nhật thất bại, vui lòng thử lại.'
            : 'Update failed, please try again.';
          this.openPopUp('danger', profileTitle, errorMsg, 'OK', '', () => (this.showPopUp = false));
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
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

