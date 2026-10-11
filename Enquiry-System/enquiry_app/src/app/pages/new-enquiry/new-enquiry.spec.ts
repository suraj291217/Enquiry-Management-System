import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NewEnquiry } from './new-enquiry';
import { EnquiryService } from '../../services/enquiry.service';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { apiLoadingInterceptor } from '../../services/api-loading.interceptor';
import { ApiLoadingService } from '../../services/api-loading.service';

describe('NewEnquiry', () => {
  let component: NewEnquiry;
  let fixture: ComponentFixture<NewEnquiry>;
  let enquiryService: EnquiryService;

  beforeEach(async () => {
    localStorage.removeItem('enquiryApp_enquiries');
    localStorage.removeItem('enquiryApp_categories');
    localStorage.removeItem('enquiryApp_statuses');
    sessionStorage.removeItem('enquiryApp_enquiryDraft');
    sessionStorage.removeItem('enquiryApp_trackingDraft');
    await TestBed.configureTestingModule({
      imports: [NewEnquiry],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/enquiry',
            parseUrl: () => ({ fragment: null }),
            navigate: () => Promise.resolve(true),
          },
        },
        provideHttpClient(withInterceptors([apiLoadingInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    enquiryService = TestBed.inject(EnquiryService);
    fixture = TestBed.createComponent(NewEnquiry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('submits an enquiry with POST and stores the response without leaving loading active', () => {
    const loadingService = TestBed.inject(ApiLoadingService);
    const httpTesting = TestBed.inject(HttpTestingController);
    let created: { enquiryId: number } | undefined;
    enquiryService.submitEnquiry({
      customerName: 'Avery Chen',
      customerEmail: 'avery@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: 1,
      enquiryType: 'General',
      enquiryDetails: 'Question about an order',
    }).subscribe(result => created = result);

    const request = httpTesting.expectOne('/api/enquiries');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.customerEmail).toBe('avery@example.com');
    request.flush({
      enquiryId: 1,
      customerName: 'Avery Chen',
      customerEmail: 'avery@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: 1,
      enquiryType: 'General',
      enquiryDetails: 'Question about an order',
      createdDate: '2026-10-04T00:00:00.000Z',
    }, { status: 201, statusText: 'Created' });

    expect(created?.enquiryId).toBe(1);
    expect(loadingService.isLoading()).toBe(false);
    expect(enquiryService.getEnquiries()).toHaveLength(1);
  });

  it('shows a failed submission immediately and re-enables the submit button', async () => {
    const httpTesting = TestBed.inject(HttpTestingController);
    component.enquiryForm.setValue({
      customerName: 'Avery Chen',
      customerPhone: '5550100',
      customerEmail: 'avery@example.com',
      categoryId: '1',
      enquiryType: 'General',
      message: 'Question about an order',
    });

    component.onSubmit();
    expect(component.submitting()).toBe(true);

    httpTesting.expectOne('/api/enquiries').error(new ProgressEvent('error'));
    await fixture.whenStable();

    expect(component.submitting()).toBe(false);
    expect(component.apiError()).toBe('We could not submit your enquiry. Please try again.');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'We could not submit your enquiry. Please try again.',
    );
  });

  it('looks up status with GET and clears loading state on a REST 404', () => {
    const loadingService = TestBed.inject(ApiLoadingService);
    const httpTesting = TestBed.inject(HttpTestingController);
    let statusCode = 0;
    enquiryService.lookupCustomerEnquiryStatus('ENQ-0001', 'missing@example.com')
      .subscribe({ error: error => statusCode = error.status });

    const request = httpTesting.expectOne(
      request => request.url === '/api/enquiries'
        && request.params.get('code') === 'ENQ-0001'
        && request.params.get('email') === 'missing@example.com',
    );
    expect(request.request.method).toBe('GET');
    request.flush(
      { message: 'We could not find a matching enquiry. Check your ID and email and try again.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(statusCode).toBe(404);
    expect(loadingService.isLoading()).toBe(false);
  });

  it('shows the admin response for an enquiry matched by ID and email without exposing contact details', async () => {
    const enquiry = enquiryService.addEnquiry({
      customerName: 'Avery Chen',
      customerEmail: 'avery@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: 2,
      enquiryType: 'Technical',
      enquiryDetails: 'Cannot access account',
      resolutionNotes: 'Internal follow-up needed',
    });

    const httpTesting = TestBed.inject(HttpTestingController);
    component.activePortalTab.set('track');
    fixture.detectChanges();
    component.trackingForm = { enquiryId: 'ENQ-0001', email: 'AVERY@example.com' };
    component.lookupEnquiry(new Event('submit'));
    const request = httpTesting.expectOne(
      request => request.url === '/api/enquiries'
        && request.params.get('code') === 'ENQ-0001',
    );
    request.flush({
      enquiryId: enquiry.enquiryId,
      categoryId: enquiry.categoryId,
      statusId: enquiry.statusId,
      enquiryType: enquiry.enquiryType,
      createdDate: enquiry.createdDate,
      resolutionNotes: enquiry.resolutionNotes,
    });
    await fixture.whenStable();

    expect(component.trackingResult()).toMatchObject({
      enquiryId: enquiry.enquiryId,
      statusId: 2,
      categoryId: 1,
      resolutionNotes: 'Internal follow-up needed',
    });
    expect(component.trackingResult()).not.toHaveProperty('customerEmail');
    expect(fixture.nativeElement.querySelector('.tracking-response p')?.textContent).toContain('Internal follow-up needed');
  });

  it('does not return an enquiry for a mismatched email or a trashed enquiry', () => {
    const enquiry = enquiryService.addEnquiry({
      customerName: 'Avery Chen',
      customerEmail: 'avery@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: 1,
      enquiryType: 'General',
      enquiryDetails: 'Question about an order',
    });

    expect(enquiryService.getCustomerEnquiryStatus('ENQ-0001', 'wrong@example.com')).toBeNull();
    enquiryService.moveToTrash(enquiry.enquiryId);
    expect(enquiryService.getCustomerEnquiryStatus('ENQ-0001', 'avery@example.com')).toBeNull();
  });

  it('switches between request and tracking tabs', () => {
    component.selectPortalTab('track');
    expect(component.activePortalTab()).toBe('track');

    component.selectPortalTab('submit');
    expect(component.activePortalTab()).toBe('submit');
  });

  it('restores in-progress request and tracking drafts after component recreation', async () => {
    component.enquiryForm.patchValue({
      customerName: 'Avery Chen',
      customerEmail: 'avery@example.com',
    });
    component.saveEnquiryDraft();
    component.trackingForm = { enquiryId: 'ENQ-0012', email: 'avery@example.com' };
    component.saveTrackingDraft();

    fixture.destroy();
    fixture = TestBed.createComponent(NewEnquiry);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.enquiryForm.getRawValue()).toMatchObject({
      customerName: 'Avery Chen',
      customerEmail: 'avery@example.com',
    });
    expect(component.trackingForm).toEqual({ enquiryId: 'ENQ-0012', email: 'avery@example.com' });

    component.resetForm();
    expect(sessionStorage.getItem('enquiryApp_enquiryDraft')).toBeNull();
  });
});
