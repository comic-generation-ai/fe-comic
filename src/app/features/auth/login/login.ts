import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

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

  constructor(
    private fb: FormBuilder,
    public i18n: I18nService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, this.emailOrAdminValidator]],
      password: ['', [Validators.required, this.passwordOrAdminValidator]],
      rememberMe: [false],
    });
  }

  emailOrAdminValidator(control: AbstractControl): ValidationErrors | null {
    const val = control.value;
    if (!val) return null;
    if (val === 'admin') return null;
    return Validators.email(control);
  }

  passwordOrAdminValidator(control: AbstractControl): ValidationErrors | null {
    const val = control.value;
    if (!val) return null;
    if (val === '123') return null;
    if (val.length >= 6) return null;
    return { minlength: { requiredLength: 6, actualLength: val.length } };
  }

  onSubmit() {
    const emailVal = this.emailControl?.value;
    const passwordVal = this.passwordControl?.value;

    if (emailVal === 'admin' && passwordVal === '123') {
      console.log('Temporary Admin Login bypass activated. Redirecting to app...');
      this.router.navigate(['/app']);
      return;
    }

    if (this.loginForm.valid) {
      console.log('Login submitted:', this.loginForm.value);
      this.router.navigate(['/app']);
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }
}
