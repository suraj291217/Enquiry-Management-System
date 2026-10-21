import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Common } from '../../services/common';
import { AuthService } from '../../services/auth.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-customer-access',
  styleUrl: './customer-access.css',
  templateUrl: './customer-access.html',
})
export class CustomerAccess implements OnInit, OnDestroy {
  readonly mode = signal<'login' | 'register'>('login');
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly registrationSuccess = signal(false);
  readonly registeredEmail = signal('');
  showLoginPassword = false;
  showRegistrationPassword = false;

  loginForm = { email: '', password: '' };
  registrationForm = { name: '', email: '', phone: '', password: '' };

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly common = inject(Common);
  private readonly subscriptions = new Subscription();

  ngOnInit(): void {
    this.subscriptions.add(this.route.data.subscribe(data => {
      this.mode.set(data['mode'] === 'register' ? 'register' : 'login');
      this.error.set('');
    }));
    this.subscriptions.add(this.authService.restoreSession().subscribe(user => {
      if (user) this.router.navigate([user.role === 'admin' ? '/admin/enquiries' : '/customer/portal']);
    }, () => {
      this.error.set('Unable to verify your session. Please refresh and try again.');
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleLoginPasswordVisibility(): void {
    this.showLoginPassword = !this.showLoginPassword;
  }

  toggleRegistrationPasswordVisibility(): void {
    this.showRegistrationPassword = !this.showRegistrationPassword;
  }

  goToSignIn(): void {
    this.router.navigate(['/customer/login']);
  }

  signIn(): void {
    this.error.set('');
    const email = this.loginForm.email.trim();
    if (!email || !this.loginForm.password) {
      this.error.set('Enter your email and password to continue.');
      return;
    }

    this.submitting.set(true);
    this.authService.login(email, this.loginForm.password).subscribe({
      next: user => {
        this.submitting.set(false);
        this.common.$onLogin.next();
        this.router.navigate([user.role === 'admin' ? '/admin/enquiries' : '/customer/portal']);
      },
      error: error => {
        this.submitting.set(false);
        this.error.set(this.getErrorMessage(error, 'We could not sign you in. Please try again.'));
      },
    });
  }

  register(): void {
    this.error.set('');
    const details = {
      name: this.registrationForm.name.trim(),
      email: this.registrationForm.email.trim().toLowerCase(),
      phone: this.registrationForm.phone.trim(),
      password: this.registrationForm.password,
    };
    if (!details.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)
      || !/^\+?[0-9().\s-]{7,32}$/.test(details.phone)
      || details.phone.replace(/\D/g, '').length < 7
      || details.phone.replace(/\D/g, '').length > 15
      || details.password.length < 8 || details.password.length > 128) {
      this.error.set('Enter a valid name, email, phone number, and a password of at least 8 characters.');
      return;
    }

    this.submitting.set(true);
    this.authService.register(details).subscribe({
      next: () => {
        this.submitting.set(false);
        this.registrationSuccess.set(true);
        this.registeredEmail.set(details.email);
        this.registrationForm.password = '';
      },
      error: error => {
        this.submitting.set(false);
        this.error.set(this.getErrorMessage(error, 'We could not create your account. Please try again.'));
      },
    });
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
      ? error.error.message
      : fallback;
  }
}
