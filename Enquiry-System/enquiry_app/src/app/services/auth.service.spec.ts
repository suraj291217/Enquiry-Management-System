import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.removeItem('enquiryApp');
    localStorage.removeItem('enquiryAppUserData');
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('logs in valid admin credentials and persists the user session', () => {
    expect(service.login('ADMIN@gmail.com')).toBe(true);

    expect(service.isLoggedIn()).toBe(true);
    expect(service.getUserEmail()).toBe('ADMIN@gmail.com');
    expect(service.getCurrentUser()).toMatchObject({
      email: 'ADMIN@gmail.com',
      role: 'admin',
    });
    expect(localStorage.getItem('enquiryApp')).toBe('ADMIN@gmail.com');
    expect(JSON.parse(localStorage.getItem('enquiryAppUserData')!)).toMatchObject({
      email: 'ADMIN@gmail.com',
      role: 'admin',
    });
  });

  it('rejects invalid credentials without creating a session', () => {
    expect(service.login('user@example.com')).toBe(false);

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getUserEmail()).toBe('');
    expect(localStorage.getItem('enquiryApp')).toBeNull();
    expect(localStorage.getItem('enquiryAppUserData')).toBeNull();
  });

  it('restores a saved session and clears it on logout', () => {
    service.login('admin');
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
    expect(service.isLoggedIn()).toBe(true);

    service.logout();

    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('enquiryApp')).toBeNull();
    expect(localStorage.getItem('enquiryAppUserData')).toBeNull();
  });
});
