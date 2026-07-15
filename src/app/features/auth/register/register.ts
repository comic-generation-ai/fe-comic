import { Component, HostListener, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthApiService } from '../../../core/api/auth-api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  scrollY = 0;
  // Signal thay vì property thường: app dùng provideZonelessChangeDetection(),
  // set property trong callback subscribe() (ngoài event Angular theo dõi) sẽ
  // không tự vẽ lại view — phải dùng signal để Angular biết mà re-render.
  isSubmitting = signal(false);
  errorMessage = signal('');

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.scrollY = window.scrollY || document.documentElement.scrollTop;
  }

  constructor(
    private fb: FormBuilder,
    public i18n: I18nService,
    private router: Router,
    private authApi: AuthApiService,
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    const { name, email, password, confirmPassword } = this.registerForm.value;

    this.authApi.register({ email, password, confirmPassword, fullName: name }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.success) {
          // Đăng ký xong quay về tab đăng nhập để user tự nhập lại email/mật khẩu vừa tạo.
          this.router.navigate(['/auth/login'], { queryParams: { registered: '1' } });
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
      case 'EMAIL_ALREADY_EXISTS':
        return this.i18n.translate('AUTH.REGISTER.ERROR_EMAIL_EXISTS');
      case 'PASSWORD_NOT_MATCH':
        return this.i18n.translate('AUTH.REGISTER.PASSWORDS_MUST_MATCH');
      default:
        return this.i18n.translate('AUTH.REGISTER.ERROR_GENERIC');
    }
  }

  get nameControl() {
    return this.registerForm.get('name');
  }

  get emailControl() {
    return this.registerForm.get('email');
  }

  get passwordControl() {
    return this.registerForm.get('password');
  }

  get confirmPasswordControl() {
    return this.registerForm.get('confirmPassword');
  }
}
