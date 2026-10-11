import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiLoadingService {
  private readonly activeRequestCount = signal(0);
  readonly isLoading = computed(() => this.activeRequestCount() > 0);

  startRequest(): void {
    this.activeRequestCount.update(count => count + 1);
  }

  finishRequest(): void {
    this.activeRequestCount.update(count => Math.max(0, count - 1));
  }
}