import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnquiryList } from './enquiry-list';
import { EnquiryService } from '../../services/enquiry.service';
import { StatusService } from '../../services/status.service';

describe('EnquiryList', () => {
  let component: EnquiryList;
  let fixture: ComponentFixture<EnquiryList>;
  let enquiryService: EnquiryService;
  let statusService: StatusService;

  beforeEach(async () => {
    localStorage.removeItem('enquiryApp_enquiries');
    localStorage.removeItem('enquiryApp_categories');
    localStorage.removeItem('enquiryApp_statuses');
    await TestBed.configureTestingModule({
      imports: [EnquiryList],
    }).compileComponents();

    enquiryService = TestBed.inject(EnquiryService);
    statusService = TestBed.inject(StatusService);
    fixture = TestBed.createComponent(EnquiryList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters enquiries by customer name and generated ID', () => {
    enquiryService.addEnquiry({
      customerName: 'Avery Chen',
      customerEmail: 'avery@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: 1,
      enquiryType: 'General',
      enquiryDetails: 'Need help with an order',
    });

    component.searchTerm = 'avery';
    expect(component.filteredEnquiries).toHaveLength(1);
    component.searchTerm = 'ENQ-0001';
    expect(component.filteredEnquiries).toHaveLength(1);
    component.searchTerm = 'missing';
    expect(component.filteredEnquiries).toHaveLength(0);
  });

  it('hides closed enquiries by default and supports trash and restore', () => {
    const enquiry = enquiryService.addEnquiry({
      customerName: 'Avery Chen',
      customerEmail: 'avery@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: 4,
      enquiryType: 'General',
      enquiryDetails: 'Duplicate request',
    });

    expect(component.filteredEnquiries).toHaveLength(0);
    component.recordView = 'all';
    expect(component.filteredEnquiries).toHaveLength(1);

    expect(enquiryService.moveToTrash(enquiry.enquiryId)).toBe(true);
    expect(enquiryService.getEnquiryById(enquiry.enquiryId)?.isDeleted).toBe(true);
    component.recordView = 'trash';
    expect(component.filteredEnquiries).toHaveLength(1);

    expect(enquiryService.restoreFromTrash(enquiry.enquiryId)).toBe(true);
    expect(enquiryService.getEnquiryById(enquiry.enquiryId)?.isDeleted).toBe(false);
    component.recordView = 'open';
    expect(component.filteredEnquiries).toHaveLength(0);
  });

  it('paginates the Material table data source and resets to the first page when filters change', async () => {
    for (let index = 0; index < 12; index++) {
      enquiryService.addEnquiry({
        customerName: `Customer ${index + 1}`,
        customerEmail: `customer${index + 1}@example.com`,
        customerPhone: '5550100',
        categoryId: 1,
        statusId: 1,
        enquiryType: 'General',
        enquiryDetails: 'Need help',
      });
    }

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.dataSource.data).toHaveLength(12);
    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row')).toHaveLength(10);
    const paginator = component.dataSource.paginator;
    if (!paginator) throw new Error('Expected the enquiry table paginator to be connected');
    paginator.nextPage();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row')).toHaveLength(2);
    expect(component.pageIndex).toBe(1);
    component.searchTerm = 'Customer 1';
    component.resetPagination();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.pageIndex).toBe(0);
    expect(component.dataSource.paginator?.pageIndex).toBe(0);
    const visibleCustomers = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.customer-name'))
      .map(element => element.textContent ?? '');
    expect(visibleCustomers.length).toBeGreaterThan(0);
    expect(visibleCustomers.every((customer: string) => customer.includes('Customer 1'))).toBe(true);
  });

  it('applies a visible palette to statuses created in status master', () => {
    const customStatus = statusService.addStatus({
      statusName: 'Awaiting documents',
      isActive: true,
      displayOrder: 5,
    });
    const enquiry = enquiryService.addEnquiry({
      customerName: 'Avery Chen',
      customerEmail: 'avery@example.com',
      customerPhone: '5550100',
      categoryId: 1,
      statusId: customStatus.statusId,
      enquiryType: 'General',
      enquiryDetails: 'Need help with an order',
    });

    expect(component.getStatusClass(enquiry.statusId)).toBe('status-custom');
    expect(component.getStatusStyle(enquiry.statusId)).toEqual({
      backgroundColor: '#e2f1ec',
      color: '#287c79',
    });
  });
});
