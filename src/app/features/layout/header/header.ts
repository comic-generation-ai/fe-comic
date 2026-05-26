import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { Router, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Modal } from '../../../shared/ui/modal/modal';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLinkActive, TranslatePipe, Modal],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly themeService = inject(ThemeService);

  showDropdown = false;
  showMobileMenu = false;
  showNotifications = false;

  get isDark() {
    return this.themeService.isDark;
  }

  mockNotifications = [
    {
      id: 1,
      type: 'feature',
      title: 'Truyện đã sẵn sàng!',
      content: 'Bộ truyện "Vũ trụ AI" đã được render thành công.',
      timestamp: '5 phút trước',
      isRead: false
    },
    {
      id: 2,
      type: 'billing',
      title: 'Gói VIP sắp hết hạn',
      content: 'Gói Pro của bạn sẽ hết hạn vào ngày 25/05/2026.',
      timestamp: '1 giờ trước',
      isRead: false
    },
    {
      id: 3,
      type: 'update',
      title: 'Tính năng mới',
      content: 'Đã cập nhật phong cách Manga vào bộ lọc của bạn!',
      timestamp: '2 ngày trước',
      isRead: true
    }
  ];

  constructor(
    public i18n: I18nService, 
    private router: Router,
    private elementRef: ElementRef
  ) {}

  toggleTheme(event?: MouseEvent) {
    const newIsDark = !this.isDark;
    
    const applyThemeAction = () => {
      this.themeService.setTheme(newIsDark);
    };

    if (typeof document !== 'undefined' && (document as any).startViewTransition) {
      document.documentElement.classList.add('no-transitions');
      const avatarBtn = document.querySelector('.btn-avatar') || document.querySelector('.avatar-circle');
      let x = window.innerWidth;
      let y = 0;

      if (avatarBtn) {
        const rect = avatarBtn.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      } else if (event) {
        x = event.clientX;
        y = event.clientY;
      }

      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = (document as any).startViewTransition(async () => {
        applyThemeAction();
        await new Promise(resolve => setTimeout(resolve, 20));
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          [
            { clipPath: `circle(0px at ${x}px ${y}px)` },
            { clipPath: `circle(${endRadius}px at ${x}px ${y}px)` }
          ],
          {
            duration: 1000,
            easing: 'cubic-bezier(0.3, 1, 0.2, 1)',
            pseudoElement: '::view-transition-new(root)'
          }
        );
      });

      transition.finished.then(() => {
        document.documentElement.classList.remove('no-transitions');
      });
    } else {
      applyThemeAction();
    }
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.showNotifications = false;
    }
  }


  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showDropdown = false;
      this.showNotifications = false;
    }
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
    if (this.showMobileMenu) {
      this.showDropdown = false;
      this.showNotifications = false;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      this.showMobileMenu = false;
    }
  }

  toggleNotifications(event: Event, fromMobile: boolean = false) {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.showDropdown = false;
      if (!fromMobile) {
        this.showMobileMenu = false;
      }
    }
  }

  hasUnreadNotifications(): boolean {
    return this.mockNotifications.some(n => !n.isRead);
  }

  markAllNotificationsAsRead() {
    this.mockNotifications = this.mockNotifications.map(n => ({
      ...n,
      isRead: true
    }));
  }

  markNotificationAsRead(id: number) {
    this.mockNotifications = this.mockNotifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
  }

  logout() {
    console.log('Logging out user...');
    this.showDropdown = false;
    this.showMobileMenu = false;
    this.showNotifications = false;
    this.router.navigate(['/auth/login']);
  }
}

