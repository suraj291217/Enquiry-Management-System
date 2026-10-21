import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('logs in through the API and stores the returned role in memory', () => {
    let loggedInUser;
    service.login('admin@gmail.com', 'password').subscribe(user => loggedInUser = user);
    const request = httpTesting.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'admin@gmail.com', password: 'password' });
    request.flush({
      userId: 1,
      email: 'admin@gmail.com',
      name: 'Admin',
      phone: '',
      role: 'admin',
      loginTime: '2026-10-21T00:00:00.000Z',
    });

    expect(loggedInUser).toMatchObject({ email: 'admin@gmail.com', role: 'admin' });
    expect(service.isLoggedIn()).toBe(true);
    expect(service.hasRole('admin')).toBe(true);
    expect(service.getUserEmail()).toBe('admin@gmail.com');
  });

  it('registers a customer account without signing the customer in automatically', () => {
    service.register({
      name: 'Avery Chen',
      email: 'avery@example.com',
      phone: '5550100',
      password: 'secure-pass',
    }).subscribe();

    const request = httpTesting.expectOne('/api/auth/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.email).toBe('avery@example.com');
    request.flush({
      userId: 2,
      name: 'Avery Chen',
      email: 'avery@example.com',
      phone: '5550100',
      role: 'user',
    });

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getCurrentUser()).toBeNull();
  });

  it('restores the server session and clears it after a successful logout', () => {
    service.restoreSession().subscribe();
    httpTesting.expectOne('/api/auth/me').flush({
      userId: 2,
      name: 'Avery Chen',
      email: 'avery@example.com',
      phone: '5550100',
      role: 'user',
      loginTime: '2026-10-21T00:00:00.000Z',
    });
    expect(service.hasRole('user')).toBe(true);

    service.logout().subscribe();
    const request = httpTesting.expectOne('/api/auth/logout');
    expect(request.request.method).toBe('POST');
    request.flush({ success: true });

    expect(service.isLoggedIn()).toBe(false);
  });

  it('treats an expired session as signed out', () => {
    let restoredUser;
    service.restoreSession().subscribe(user => restoredUser = user);
    httpTesting.expectOne('/api/auth/me').flush(
      { message: 'Sign in to continue.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(restoredUser).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });
});
