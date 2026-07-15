import { Component, ElementRef, HostListener, inject, OnInit } from '@angular/core';
import { Router, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Modal } from '../../../shared/ui/modal/modal';
import { ThemeService } from '../../../core/theme/theme.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CurrentUserService } from '../../../core/auth/current-user.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLinkActive, TranslatePipe, Modal],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly authSession = inject(AuthSessionService);
  private readonly currentUser = inject(CurrentUserService);

  showDropdown = false;
  showMobileMenu = false;
  showNotifications = false;

  get isDark() {
    return this.themeService.isDark;
  }

  get profile() {
    return this.currentUser.profile();
  }

  get displayName(): string {
    const profile = this.profile;
    return profile?.fullName || profile?.username || profile?.email || '';
  }

  get avatarInitial(): string {
    return this.displayName ? this.displayName.charAt(0).toUpperCase() : '?';
  }

  mockNotifications = [
    
  ];

  constructor(
    public i18n: I18nService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    this.currentUser.load();
  }

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

  logout() {
    this.authSession.clearSession();
    this.currentUser.clear();
    this.showDropdown = false;
    this.showMobileMenu = false;
    this.showNotifications = false;
    this.router.navigate(['/auth/login']);
  }

  // Navigate to profile page
  navigateToProfile() {
    this.showDropdown = false;
    this.showMobileMenu = false;
    this.router.navigate(['/app/profile']);
  }
}

