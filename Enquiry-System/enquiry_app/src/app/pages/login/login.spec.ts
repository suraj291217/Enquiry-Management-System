import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Login } from './login';
import { EnquiryService } from '../../services/enquiry.service';
import { ConfirmationService } from '../../services/confirmation.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let enquiryService: EnquiryService;

  beforeEach(async () => {
    localStorage.removeItem('enquiryApp');
    localStorage.removeItem('enquiryAppUserData');
    localStorage.removeItem('enquiryApp_enquiries');
    localStorage.removeItem('enquiryApp_categories');
    localStorage.removeItem('enquiryApp_statuses');
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([])],
    }).compileComponents();

    enquiryService = TestBed.inject(EnquiryService);
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
    component.authService.login('admin@gmail.com');

    expect(component.sessionStartedLabel).toContain('Today at');
    expect(component.sessionStartedLabel).toContain('(Active)');
  });

  it('submits the admin login form with Enter and navigates to enquiries', () => {
    const navigateSpy = vi.spyOn(component.router, 'navigate');
    const form = fixture.nativeElement.querySelector('.login-form') as HTMLFormElement;
    component.userLogin.userName = 'admin';
    component.userLogin.password = 'password';

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(component.authService.isLoggedIn()).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/enquiries']);
  });

  it('keeps the admin signed in when sign-out confirmation is cancelled', async () => {
    component.authService.login('admin@gmail.com');

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
