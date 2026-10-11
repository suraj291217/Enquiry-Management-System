import { Injectable, signal } from '@angular/core';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly confirmation = signal<ConfirmationOptions | null>(null);
  private resolveCurrent: ((confirmed: boolean) => void) | null = null;

  readonly activeConfirmation = this.confirmation.asReadonly();

  confirm(options: ConfirmationOptions): Promise<boolean> {
    this.resolveCurrent?.(false);
    this.confirmation.set(options);

    return new Promise(resolve => {
      this.resolveCurrent = resolve;
    });
  }

  resolve(confirmed: boolean): void {
    const resolveCurrent = this.resolveCurrent;
    this.resolveCurrent = null;
    this.confirmation.set(null);
    resolveCurrent?.(confirmed);
  }
}