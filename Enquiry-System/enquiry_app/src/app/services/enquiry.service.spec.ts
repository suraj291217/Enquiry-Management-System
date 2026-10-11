import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EnquiryService } from './enquiry.service';

describe('EnquiryService', () => {
  let service: EnquiryService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('enquiryApp_enquiries');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EnquiryService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('submits an enquiry and updates the cached list after the request succeeds', () => {
    const enquiry = {
      customerName: 'Ada Lovelace',
      customerEmail: 'ada@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: 1,
      enquiryType: 'General',
      enquiryDetails: 'Question about a service',
    };

    service.submitEnquiry(enquiry).subscribe();
    const request = httpTesting.expectOne('/api/enquiries');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(enquiry);

    request.flush({
      ...enquiry,
      enquiryId: 42,
      createdDate: '2026-01-01T00:00:00.000Z',
    });

    expect(service.getEnquiries()).toHaveLength(1);
    expect(service.getEnquiryById(42)?.customerEmail).toBe('ada@example.com');
    expect(JSON.parse(localStorage.getItem('enquiryApp_enquiries')!)).toHaveLength(1);
  });

  it('looks up a customer enquiry using the supplied code and email', () => {
    service.lookupCustomerEnquiryStatus('ENQ-0042', 'ada@example.com').subscribe();

    const request = httpTesting.expectOne(
      request => request.url === '/api/enquiries'
        && request.params.get('code') === 'ENQ-0042'
        && request.params.get('email') === 'ada@example.com',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      enquiryId: 42,
      categoryId: 1,
      statusId: 2,
      enquiryType: 'General',
      createdDate: '2026-01-01T00:00:00.000Z',
    });
  });

  it('adds, looks up, trashes, and restores an enquiry by its customer code', () => {
    const enquiry = service.addEnquiry({
      customerName: 'Ada Lovelace',
      customerEmail: 'ada@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: 2,
      enquiryType: 'General',
      enquiryDetails: 'Question about a service',
    });
    const code = `ENQ-${String(enquiry.enquiryId).padStart(4, '0')}`;

    expect(service.getCustomerEnquiryStatus(code, ' ADA@example.com ')).toMatchObject({
      enquiryId: enquiry.enquiryId,
      statusId: 2,
      enquiryType: 'General',
    });
    expect(service.getCustomerEnquiryStatus('invalid-code', 'ada@example.com')).toBeNull();

    expect(service.moveToTrash(enquiry.enquiryId)).toBe(true);
    expect(service.getCustomerEnquiryStatus(code, 'ada@example.com')).toBeNull();
    expect(service.restoreFromTrash(enquiry.enquiryId)).toBe(true);
    expect(service.getCustomerEnquiryStatus(code, 'ada@example.com')).not.toBeNull();
    expect(service.moveToTrash(999)).toBe(false);
  });
});
