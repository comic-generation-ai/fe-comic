import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: FormGroup;
  showPassword = false;
  // Signal thay vì property thường: app dùng provideZonelessChangeDetection(),
  // set property trong callback subscribe() (ngoài event Angular theo dõi) sẽ
  // không tự vẽ lại view — phải dùng signal để Angular biết mà re-render.
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(
    private fb: FormBuilder,
    public i18n: I18nService,
    private router: Router,
    private route: ActivatedRoute,
    private authApi: AuthApiService,
    private authSession: AuthSessionService,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });

    // Vừa đăng ký xong ở /auth/register thì hiển thị banner báo thành công.
    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.successMessage.set(this.i18n.translate('AUTH.LOGIN.REGISTER_SUCCESS_BANNER'));
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isSubmitting.set(true);

    const { email, password } = this.loginForm.value;

    this.authApi.login({ email, password }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success && res.data) {
          this.authSession.setSession(res.data.token, res.data.email);
          this.router.navigate(['/app']);
        } else {
          this.errorMessage.set(this.mapErrorMessage(res.message));
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.mapErrorMessage(err?.error?.message));
      },
    });
  }

  private mapErrorMessage(code?: string): string {
    switch (code) {
      case 'ACCOUNT_DOES_NOT_EXIST':
        return this.i18n.translate('AUTH.LOGIN.ERROR_ACCOUNT_NOT_FOUND');
      case 'WRONG_PASSWORD':
        return this.i18n.translate('AUTH.LOGIN.ERROR_WRONG_PASSWORD');
      default:
        return this.i18n.translate('AUTH.LOGIN.ERROR_GENERIC');
    }
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }
}
