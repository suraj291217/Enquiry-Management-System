import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './services/auth.service';
import { ConfirmationService } from './services/confirmation.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-link')?.textContent).toContain('Enquiry');
    expect(compiled.querySelector('.brand-link')?.textContent).toContain('DESK');
  });

  it('toggles and closes the responsive navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.nav-toggle') as HTMLButtonElement;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('creates initials from the first and last parts of a profile name', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance.getProfileInitials('Siva Sai Kumar')).toBe('SK');
    expect(fixture.componentInstance.getProfileInitials('Siva')).toBe('SI');
    expect(fixture.componentInstance.getProfileInitials('')).toBe('U');
  });

  it('asks for confirmation before customer sign-out', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const confirmationService = TestBed.inject(ConfirmationService);
    const authService = TestBed.inject(AuthService);
    const confirm = vi.spyOn(confirmationService, 'confirm').mockResolvedValue(false);
    const logout = vi.spyOn(authService, 'logout');

    await app.onLogout();

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Sign out?',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay signed in',
      destructive: true,
    }));
    expect(logout).not.toHaveBeenCalled();
  });
});
