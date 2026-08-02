import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthSessionService } from '../auth/auth-session.service';
import { CurrentUserService } from '../auth/current-user.service';

export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const authSession = inject(AuthSessionService);
  const currentUser = inject(CurrentUserService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authSession.clearSession();
        currentUser.clear();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    }),
  );
};
