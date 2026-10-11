import { TestBed } from '@angular/core/testing';
import { StatusService } from './status.service';

describe('StatusService', () => {
  let service: StatusService;

  beforeEach(() => {
    localStorage.removeItem('enquiryApp_statuses');
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatusService);
  });

  it('initializes default statuses in display order', () => {
    expect(service.getActiveStatuses().map(status => status.statusCode)).toEqual([
      'NEW',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
    ]);
  });

  it('protects default status names and prevents deleting default statuses', () => {
    const defaultStatus = service.getStatusById(1)!;
    service.updateStatus({ ...defaultStatus, statusName: 'Renamed', statusCode: 'RENAMED', isActive: false });

    expect(service.getStatusById(1)).toMatchObject({
      statusName: 'New',
      statusCode: 'NEW',
      isActive: false,
    });
    expect(service.deleteStatus(1)).toBe(false);
    expect(service.getStatusById(1)).toBeDefined();
  });

  it('creates, updates, sorts, and deletes a custom status', () => {
    const status = service.addStatus({
      statusName: 'Awaiting Customer',
      statusCode: 'AWAITING_CUSTOMER',
      isActive: true,
      displayOrder: 0,
      isSystemDefault: false,
    });

    expect(status.statusId).toBe(5);
    expect(service.getActiveStatuses()[0].statusId).toBe(status.statusId);

    service.updateStatus({ ...status, statusName: 'Waiting for Customer' });
    expect(service.getStatusById(status.statusId)?.statusName).toBe('Waiting for Customer');
    expect(service.deleteStatus(status.statusId)).toBe(true);
    expect(service.getStatusById(status.statusId)).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('enquiryApp_statuses')!)).toHaveLength(4);
  });
});
