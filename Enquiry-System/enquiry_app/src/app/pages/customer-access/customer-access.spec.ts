import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CustomerAccess } from './customer-access';

describe('CustomerAccess', () => {
  let component: CustomerAccess;
  let fixture: ComponentFixture<CustomerAccess>;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerAccess],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(CustomerAccess);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpTesting.expectOne('/api/auth/me').flush(
      { message: 'Sign in to continue.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('renders customer sign-in and registration without an admin redirect in the card', () => {
    expect(fixture.nativeElement.querySelector('#customerEmail')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/customer/register"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.customer-access-form a[href="/admin/login"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.forgot-password-link')?.textContent.trim()).toBe('Forgot password?');
  });

  it('toggles login password visibility without submitting the form', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#customerPassword') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-visibility-toggle') as HTMLButtonElement;
    const submitSpy = vi.spyOn(component, 'signIn');

    expect(input.type).toBe('password');
    expect(toggle.type).toBe('button');
    expect(getComputedStyle(toggle).position).toBe('absolute');
    expect(getComputedStyle(toggle).margin).toBe('0px');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('toggles registration password visibility without submitting the form', () => {
    component.mode.set('register');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.forgot-password-link')).toBeNull();
    const input = fixture.nativeElement.querySelector('#registrationPassword') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-visibility-toggle') as HTMLButtonElement;
    const submitSpy = vi.spyOn(component, 'register');

    expect(input.type).toBe('password');
    expect(getComputedStyle(toggle).position).toBe('absolute');
    expect(getComputedStyle(toggle).margin).toBe('0px');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('confirms account creation and offers a direct link to customer sign in', () => {
    component.mode.set('register');
    component.registrationForm = {
      name: 'Avery Chen',
      email: 'avery@example.com',
      phone: '5550100',
      password: 'secure-pass-123',
    };

    component.register();
    const request = httpTesting.expectOne('/api/auth/register');
    expect(request.request.body).toEqual({
      name: 'Avery Chen',
      email: 'avery@example.com',
      phone: '5550100',
      password: 'secure-pass-123',
    });
    request.flush({
      userId: 2,
      name: 'Avery Chen',
      email: 'avery@example.com',
      phone: '5550100',
      role: 'user',
    });

    fixture.detectChanges();
    expect(component.registrationSuccess()).toBe(true);
    expect(component.registeredEmail()).toBe('avery@example.com');
    expect(fixture.nativeElement.querySelector('#registration-success-title')?.textContent.trim()).toBe('Account created');
    expect(fixture.nativeElement.querySelector('.registration-success')?.textContent).toContain('avery@example.com');
    expect(router.navigate).not.toHaveBeenCalled();

    (fixture.nativeElement.querySelector('.success-signin-button') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['/customer/login']);
  });

  it('shows API authentication errors without navigating', () => {
    component.loginForm = { email: 'avery@example.com', password: 'wrong-password' };
    component.signIn();
    httpTesting.expectOne('/api/auth/login').flush(
      { message: 'Invalid email or password.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(component.error()).toBe('Invalid email or password.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
