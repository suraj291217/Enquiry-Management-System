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
      'PENDING',
      'ON_HOLD',
      'RESOLVED',
      'CLOSED',
      'REJECTED',
    ]);
  });

  it('migrates existing statuses without changing their IDs', () => {
    const legacyStatuses = [
      { statusId: 1, statusName: 'New', statusCode: 'NEW', isActive: true, displayOrder: 1, isSystemDefault: true },
      { statusId: 2, statusName: 'In Progress', statusCode: 'IN_PROGRESS', isActive: true, displayOrder: 2, isSystemDefault: true },
      { statusId: 3, statusName: 'Resolved', statusCode: 'RESOLVED', isActive: true, displayOrder: 3, isSystemDefault: true },
      { statusId: 4, statusName: 'Closed', statusCode: 'CLOSED', isActive: true, displayOrder: 4, isSystemDefault: true },
      { statusId: 5, statusName: 'Awaiting documents', isActive: true, displayOrder: 5 },
    ];
    localStorage.setItem('enquiryApp_statuses', JSON.stringify(legacyStatuses));

    const migratedService = new StatusService();

    expect(migratedService.getStatusById(1)?.statusCode).toBe('NEW');
    expect(migratedService.getStatusById(2)?.statusCode).toBe('IN_PROGRESS');
    expect(migratedService.getStatusById(3)?.statusCode).toBe('RESOLVED');
    expect(migratedService.getStatusById(4)?.statusCode).toBe('CLOSED');
    expect(migratedService.getStatusById(5)?.statusName).toBe('Awaiting documents');
    expect(migratedService.getStatuses().filter(status => status.isSystemDefault)).toHaveLength(7);
    expect(migratedService.getActiveStatuses()
      .filter(status => status.isSystemDefault)
      .map(status => status.statusCode)).toEqual([
      'NEW',
      'IN_PROGRESS',
      'PENDING',
      'ON_HOLD',
      'RESOLVED',
      'CLOSED',
      'REJECTED',
    ]);
    expect(migratedService.getStatusById(5)?.displayOrder).toBe(8);
  });

  it('maps default statuses to their badge classes', () => {
    expect(service.getActiveStatuses().map(status => service.getBadgeClass(status.statusId))).toEqual([
      'status-new',
      'status-in-progress',
      'status-pending',
      'status-on-hold',
      'status-resolved',
      'status-closed',
      'status-rejected',
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

    expect(status.statusId).toBe(8);
    expect(service.getActiveStatuses()[0].statusId).toBe(status.statusId);

    service.updateStatus({ ...status, statusName: 'Waiting for Customer' });
    expect(service.getStatusById(status.statusId)?.statusName).toBe('Waiting for Customer');
    expect(service.deleteStatus(status.statusId)).toBe(true);
    expect(service.getStatusById(status.statusId)).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('enquiryApp_statuses')!)).toHaveLength(7);
  });
});
