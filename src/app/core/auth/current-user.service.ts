import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserApiService, UserProfile } from '../api/user-api.service';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly userApi = inject(UserApiService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly profile = signal<UserProfile | null>(null);
  private loaded = false;

  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.loaded) return;
    this.loaded = true;
    this.userApi.getMe().subscribe({
      next: (profile) => this.profile.set(profile),
      error: () => {
        this.loaded = false;
      },
    });
  }

  clear(): void {
    this.profile.set(null);
    this.loaded = false;
  }
}
