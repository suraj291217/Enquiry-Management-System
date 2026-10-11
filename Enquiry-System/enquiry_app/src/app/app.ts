import { Component, inject, signal, effect, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Common } from './services/common';
import { AuthService } from './services/auth.service';
import { ConfirmationDialogComponent } from './shared/confirmation-dialog/confirmation-dialog';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ConfirmationDialogComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  loggedUserName = signal<string>('');
  commonSrv = inject(Common);
  authService = inject(AuthService);
  router = inject(Router);

  isLoggedIn = computed(() => this.authService.isLoggedIn());

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
        this.loggedUserName.set(user.email);
      } else {
        this.loggedUserName.set('');
      }
    });
  }

  readLoggedUserData(): void {
    const email = this.authService.getUserEmail();
    this.loggedUserName.set(email);
  }

  onLogout(): void {
    this.authService.logout();
    this.readLoggedUserData();
    this.commonSrv.$onLogin.next();
    this.router.navigate(['/enquiry']);
  }
}
