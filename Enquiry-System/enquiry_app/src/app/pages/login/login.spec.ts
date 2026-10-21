import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Login } from './login';
import { EnquiryService } from '../../services/enquiry.service';
import { ConfirmationService } from '../../services/confirmation.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let enquiryService: EnquiryService;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    localStorage.removeItem('enquiryApp');
    localStorage.removeItem('enquiryAppUserData');
    localStorage.removeItem('enquiryApp_enquiries');
    localStorage.removeItem('enquiryApp_categories');
    localStorage.removeItem('enquiryApp_statuses');
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    enquiryService = TestBed.inject(EnquiryService);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Login);
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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows and hides the entered password without submitting the form', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-visibility-toggle') as HTMLButtonElement;
    const submitSpy = vi.spyOn(component, 'onLogin');
    input.value = 'secret123';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(input.type).toBe('password');
    expect(input.value).toBe('secret123');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
    expect(input.value).toBe('secret123');
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('shows live new, active, and today-resolved counts', () => {
    enquiryService.addEnquiry({
      customerName: 'New customer',
      customerEmail: 'new@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: 1,
      enquiryType: 'General',
      enquiryDetails: 'New request',
    });
    enquiryService.addEnquiry({
      customerName: 'Active customer',
      customerEmail: 'active@example.com',
      customerPhone: '5550101',
      categoryId: 1,
      statusId: 2,
      enquiryType: 'Technical',
      enquiryDetails: 'Active request',
    });
    enquiryService.addEnquiry({
      customerName: 'Resolved customer',
      customerEmail: 'resolved@example.com',
      customerPhone: '5550102',
      categoryId: 1,
      statusId: 3,
      enquiryType: 'Sales',
      enquiryDetails: 'Resolved request',
    });

    expect(component.activityStats().map(stat => stat.count)).toEqual([1, 1, 1]);
  });

  it('shows the current session start time', () => {
    component.authService.login('admin@gmail.com', 'password').subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      userId: 1,
      email: 'admin@gmail.com',
      name: 'Admin',
      phone: '',
      role: 'admin',
      loginTime: new Date().toISOString(),
    });

    expect(component.sessionStartedLabel).toContain('Today at');
    expect(component.sessionStartedLabel).toContain('(Active)');
  });

  it('submits the admin login form with Enter and navigates to enquiries', () => {
    const navigateSpy = vi.spyOn(component.router, 'navigate');
    const form = fixture.nativeElement.querySelector('.login-form') as HTMLFormElement;
    component.userLogin.userName = 'admin';
    component.userLogin.password = 'password';

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    httpTesting.expectOne('/api/auth/login').flush({
      userId: 1,
      email: 'admin',
      name: 'Admin',
      phone: '',
      role: 'admin',
      loginTime: new Date().toISOString(),
    });

    expect(component.authService.isLoggedIn()).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/enquiries']);
  });

  it('keeps the admin signed in when sign-out confirmation is cancelled', async () => {
    component.authService.login('admin@gmail.com', 'password').subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      userId: 1,
      email: 'admin@gmail.com',
      name: 'Admin',
      phone: '',
      role: 'admin',
      loginTime: new Date().toISOString(),
    });

    const signOut = component.onLogout();
    const confirmationService = TestBed.inject(ConfirmationService);
    expect(confirmationService.activeConfirmation()).toMatchObject({
      title: 'Sign out?',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay signed in',
      destructive: true,
    });

    confirmationService.resolve(false);
    await signOut;

    expect(component.authService.isLoggedIn()).toBe(true);
  });
});
