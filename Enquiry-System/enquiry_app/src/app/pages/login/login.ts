import { Component, computed, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Common } from '../../services/common';
import { AuthService } from '../../services/auth.service';
import { EnquiryService } from '../../services/enquiry.service';
import { StatusService } from '../../services/status.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { Subscription } from 'rxjs';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit, OnDestroy {
  userLogin = {
    userName: '',
    password: '',
  };

  emailError = '';
  loginError = '';

  private subscription = new Subscription();

  router = inject(Router);
  commonSr = inject(Common);
  authService = inject(AuthService);
  private readonly enquiryService = inject(EnquiryService);
  private readonly statusService = inject(StatusService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly activityStats = computed(() => {
    const enquiries = this.enquiryService.getEnquiries().filter(enquiry => !enquiry.isDeleted);
    const statuses = this.statusService.getStatuses();
    const today = new Date().toDateString();
    const statusCode = (statusId: number): string => {
      const status = statuses.find(item => item.statusId === statusId);
      return `${status?.statusCode ?? ''} ${status?.statusName ?? ''}`.toLowerCase();
    };

    return [
      {
        label: 'Pending enquiries',
        detail: 'New',
        count: enquiries.filter(enquiry => statusCode(enquiry.statusId).includes('new')).length,
      },
      {
        label: 'In progress',
        detail: 'Active',
        count: enquiries.filter(enquiry => statusCode(enquiry.statusId).includes('progress')).length,
      },
      {
        label: "Today's activity",
        detail: 'Resolved',
        count: enquiries.filter(enquiry => {
          const resolved = statusCode(enquiry.statusId).includes('resolved');
          const updatedAt = new Date(enquiry.updatedDate ?? enquiry.createdDate);
          return resolved && !Number.isNaN(updatedAt.getTime()) && updatedAt.toDateString() === today;
        }).length,
      },
    ];
  });

  ngOnInit(): void {
    // Subscribe to auth changes
    this.subscription.add(
      this.commonSr.$onLogin.subscribe(() => {
        // Force UI update on login/logout
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get currentLoggedUser(): string {
    return this.authService.getUserEmail();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get sessionStartedLabel(): string {
    const startedAt = new Date(String(this.authService.getCurrentUser()?.loginTime ?? ''));
    if (Number.isNaN(startedAt.getTime())) return 'Time unavailable';

    const date = startedAt.toDateString() === new Date().toDateString()
      ? 'Today'
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(startedAt);
    const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(startedAt);
    return `${date} at ${time} (Active)`;
  }

  onEmailChange(): void {
    this.emailError = '';
    this.loginError = '';
  }

  onPasswordChange(): void {
    this.loginError = '';
  }

  onLogin(): void {
    this.emailError = '';
    this.loginError = '';

    const email = (this.userLogin.userName || '').trim();
    const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

    const isAdminUsername = email.toLowerCase() === 'admin';
    if (!email || (!isAdminUsername && !gmailPattern.test(email))) {
      this.emailError = 'Enter a valid email address';
      return;
    }

    if (!this.userLogin.password || !this.userLogin.password.trim()) {
      this.loginError = 'Please enter your password';
      return;
    }

    if (
      (email.toLowerCase() === 'admin@gmail.com' || email.toLowerCase() === 'admin') &&
      this.userLogin.password === 'password'
    ) {
      const loginSuccess = this.authService.login(email);
      if (loginSuccess) {
        this.commonSr.$onLogin.next();
        this.router.navigate(['/admin/enquiries']);
      }
    } else {
      this.loginError = 'Invalid credentials';
    }
  }

  async onLogout(): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Sign out?',
      message: 'You will be signed out and returned to the public enquiry page.',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay signed in',
      destructive: true,
    });
    if (!confirmed) return;

    this.authService.logout();
    this.userLogin.userName = '';
    this.userLogin.password = '';
    this.emailError = '';
    this.loginError = '';
    this.commonSr.$onLogin.next();
    this.router.navigate(['/enquiry']);
  }

  goToDashboard(): void {
    this.router.navigate(['/admin/enquiries']);
  }
}
