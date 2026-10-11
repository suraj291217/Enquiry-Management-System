import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { ApiLoadingService } from './api-loading.service';

export const apiLoadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loadingService = inject(ApiLoadingService);
  loadingService.startRequest();

  return next(request).pipe(finalize(() => loadingService.finishRequest()));
};