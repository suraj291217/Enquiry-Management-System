import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.restoreSession().pipe(
    map(user => user?.role === 'admin'
      ? true
      : router.parseUrl(user ? '/customer/portal' : '/admin/login')),
    catchError(() => of(router.parseUrl('/admin/login'))),
  );
};

export const customerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.restoreSession().pipe(
    map(user => user?.role === 'user'
      ? true
      : router.parseUrl(user ? '/admin/enquiries' : '/customer/login')),
    catchError(() => of(router.parseUrl('/customer/login'))),
  );
};
