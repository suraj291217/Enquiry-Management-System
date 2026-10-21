import { Component, inject, signal, effect, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Common } from './services/common';
import { AuthService } from './services/auth.service';
import { ConfirmationDialogComponent } from './shared/confirmation-dialog/confirmation-dialog';
import { ConfirmationService } from './services/confirmation.service';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ConfirmationDialogComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  loggedUserName = signal<string>('');
  logoutError = signal('');
  mobileMenuOpen = signal(false);
  commonSrv = inject(Common);
  authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  router = inject(Router);

  isLoggedIn = computed(() => this.authService.isLoggedIn());
  isAdmin = computed(() => this.authService.hasRole('admin'));
  isCustomer = computed(() => this.authService.hasRole('user'));

  constructor() {
    this.readLoggedUserData();

    // Subscribe to login events
    this.commonSrv.$onLogin.subscribe(() => {
      this.readLoggedUserData();
    });

    // Effect to react to auth changes
    effect(() => {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.loggedUserName.set(user.name || user.email);
      } else {
        this.loggedUserName.set('');
      }
    });
  }

  readLoggedUserData(): void {
    const user = this.authService.getCurrentUser();
    this.loggedUserName.set(user?.name || user?.email || '');
  }

  getProfileInitials(name = this.loggedUserName()): string {
    const nameParts = name.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return (nameParts[0]?.slice(0, 2) || 'U').toUpperCase();
  }

  async onLogout(): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Sign out?',
      message: 'You will be signed out of your customer account.',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay signed in',
      destructive: true,
    });
    if (!confirmed) return;

    this.logoutError.set('');
    this.authService.logout().subscribe({
      next: () => {
        this.readLoggedUserData();
        this.commonSrv.$onLogin.next();
        this.router.navigate(['/customer/login']);
      },
      error: () => this.logoutError.set('We could not sign you out. Please try again.'),
    });
  }

  toggleMobileNavigation(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileNavigation(): void {
    this.mobileMenuOpen.set(false);
  }
}
