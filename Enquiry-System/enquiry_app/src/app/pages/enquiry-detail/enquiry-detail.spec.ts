import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EnquiryService } from '../../services/enquiry.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { EnquiryDetail } from './enquiry-detail';

describe('EnquiryDetail', () => {
  let fixture: ComponentFixture<EnquiryDetail>;
  let routeParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let enquiryService: EnquiryService;

  beforeEach(async () => {
    localStorage.removeItem('enquiryApp_enquiries');
    localStorage.removeItem('enquiryApp_categories');
    localStorage.removeItem('enquiryApp_statuses');
    routeParams = new BehaviorSubject(convertToParamMap({ id: '1' }));

    await TestBed.configureTestingModule({
      imports: [EnquiryDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: routeParams.asObservable() },
        },
      ],
    }).compileComponents();

    enquiryService = TestBed.inject(EnquiryService);
    enquiryService.addEnquiry({
      customerName: 'Avery Chen',
      customerEmail: 'avery@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: 1,
      enquiryType: 'General',
      enquiryDetails: 'Need help with an order',
    });

    fixture = TestBed.createComponent(EnquiryDetail);
    fixture.detectChanges();
  });

  it('loads and displays the enquiry selected by the route ID', () => {
    expect(fixture.componentInstance.enquiry()?.customerName).toBe('Avery Chen');
    expect(fixture.nativeElement.textContent).toContain('avery@example.com');
    expect(fixture.nativeElement.textContent).toContain('Need help with an order');
    expect(fixture.nativeElement.querySelector('.detail-heading .status-pill')?.classList.contains('status-new')).toBe(true);
  });

  it('confirms before saving the selected status and admin notes', async () => {
    const httpTesting = TestBed.inject(HttpTestingController);
    const confirmationService = TestBed.inject(ConfirmationService);
    const enquiry = fixture.componentInstance.enquiry();
    fixture.componentInstance.editStatusId = '2';
    fixture.componentInstance.editResolutionNotes = 'Sent troubleshooting steps';
    const save = fixture.componentInstance.saveDetails();

    expect(confirmationService.activeConfirmation()).toMatchObject({
      title: 'Save enquiry updates?',
      confirmLabel: 'Save updates',
      cancelLabel: 'Keep editing',
    });
    confirmationService.resolve(true);
    await save;
    const request = httpTesting.expectOne(`/api/enquiries/${enquiry!.enquiryId}`);
    expect(request.request.method).toBe('PUT');
    request.flush({
      ...enquiry,
      statusId: 2,
      resolutionNotes: 'Sent troubleshooting steps',
      updatedDate: '2026-10-04T00:00:00.000Z',
    });

    expect(enquiryService.getEnquiryById(enquiry!.enquiryId)).toMatchObject({
      statusId: 2,
      resolutionNotes: 'Sent troubleshooting steps',
    });
  });

  it('does not save when the admin cancels confirmation', async () => {
    const httpTesting = TestBed.inject(HttpTestingController);
    const confirmationService = TestBed.inject(ConfirmationService);
    const save = fixture.componentInstance.saveDetails();

    confirmationService.resolve(false);
    await save;

    httpTesting.expectNone(request => request.method === 'PUT');
  });

  it('shows a not-found state when the route ID has no matching enquiry', () => {
    routeParams.next(convertToParamMap({ id: '999' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Enquiry not found');
  });
});