import { Injectable, signal } from '@angular/core';
import { IStatus } from '../model/status.model';

@Injectable({
  providedIn: 'root'
})
export class StatusService {
  private readonly STORAGE_KEY = 'enquiryApp_statuses';
  private statusesData = signal<IStatus[]>([]);
  private readonly defaultStatuses: Omit<IStatus, 'createdDate'>[] = [
    { statusId: 1, statusName: 'New', statusCode: 'NEW', isActive: true, displayOrder: 1, isSystemDefault: true, badgeClass: 'status-new' },
    { statusId: 2, statusName: 'In Progress', statusCode: 'IN_PROGRESS', isActive: true, displayOrder: 2, isSystemDefault: true, badgeClass: 'status-in-progress' },
    { statusId: 5, statusName: 'Pending', statusCode: 'PENDING', isActive: true, displayOrder: 3, isSystemDefault: true, badgeClass: 'status-pending' },
    { statusId: 6, statusName: 'On Hold', statusCode: 'ON_HOLD', isActive: true, displayOrder: 4, isSystemDefault: true, badgeClass: 'status-on-hold' },
    { statusId: 3, statusName: 'Resolved', statusCode: 'RESOLVED', isActive: true, displayOrder: 5, isSystemDefault: true, badgeClass: 'status-resolved' },
    { statusId: 4, statusName: 'Closed', statusCode: 'CLOSED', isActive: true, displayOrder: 6, isSystemDefault: true, badgeClass: 'status-closed' },
    { statusId: 7, statusName: 'Rejected', statusCode: 'REJECTED', isActive: true, displayOrder: 7, isSystemDefault: true, badgeClass: 'status-rejected' },
  ];

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultStatuses();
  }

  getStatuses = this.statusesData.asReadonly();

  getActiveStatuses() {
    return this.statusesData()
      .filter(status => status.isActive)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  getStatusById(id: number): IStatus | undefined {
    return this.statusesData().find(status => status.statusId === id);
  }

  getBadgeClass(id: number): string {
    const status = this.getStatusById(id);
    const normalizedCode = (status?.statusCode || status?.statusName || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const classes: Record<string, string> = {
      NEW: 'status-new',
      IN_PROGRESS: 'status-in-progress',
      PENDING: 'status-pending',
      PENDING_WAITING_ON_CUSTOMER: 'status-pending',
      WAITING_ON_CUSTOMER: 'status-pending',
      ON_HOLD: 'status-on-hold',
      RESOLVED: 'status-resolved',
      CLOSED: 'status-closed',
      REJECTED: 'status-rejected',
    };

    return classes[normalizedCode] ?? 'status-custom';
  }

  addStatus(status: Omit<IStatus, 'statusId' | 'createdDate'>): IStatus {
    const statuses = this.statusesData();
    const nextId = statuses.length
      ? Math.max(...statuses.map(s => s.statusId)) + 1
      : 1;

    const newStatus: IStatus = {
      ...status,
      statusId: nextId,
      createdDate: new Date().toISOString()
    };

    this.statusesData.set([...statuses, newStatus]);
    this.saveToStorage();
    return newStatus;
  }

  updateStatus(status: IStatus): void {
    const statuses = this.statusesData().map(s =>
      s.statusId === status.statusId
        ? {
            ...status,
            ...(s.isSystemDefault ? { statusName: s.statusName, statusCode: s.statusCode } : {}),
          }
        : s
    );
    this.statusesData.set(statuses);
    this.saveToStorage();
  }

  deleteStatus(statusId: number): boolean {
    const statusToDelete = this.getStatusById(statusId);

    // Prevent deletion of system default statuses
    if (statusToDelete?.isSystemDefault) {
      return false;
    }

    const statuses = this.statusesData().filter(s => s.statusId !== statusId);
    this.statusesData.set(statuses);
    this.saveToStorage();
    return true;
  }

  private initializeDefaultStatuses(): void {
    if (this.statusesData().length === 0) {
      const now = new Date().toISOString();
      this.statusesData.set(this.defaultStatuses.map(status => ({ ...status, createdDate: now })));
      this.saveToStorage();
      return;
    }

    let nextId = Math.max(...this.statusesData().map(status => status.statusId)) + 1;
    let changed = false;
    const migratedStatuses = [...this.statusesData()];

    for (const defaultStatus of this.defaultStatuses) {
      const existingIndex = migratedStatuses.findIndex(status =>
        status.statusCode === defaultStatus.statusCode
        && status.isSystemDefault
      );

      if (existingIndex === -1) {
        migratedStatuses.push({
          ...defaultStatus,
          statusId: nextId++,
          createdDate: new Date().toISOString(),
        });
        changed = true;
        continue;
      }

      const existing = migratedStatuses[existingIndex];
      if (
        existing.statusName !== defaultStatus.statusName
        || existing.displayOrder !== defaultStatus.displayOrder
        || existing.badgeClass !== defaultStatus.badgeClass
      ) {
        migratedStatuses[existingIndex] = {
          ...existing,
          statusName: defaultStatus.statusName,
          statusCode: defaultStatus.statusCode,
          displayOrder: defaultStatus.displayOrder,
          badgeClass: defaultStatus.badgeClass,
        };
        changed = true;
      }
    }

    const customStatuses = migratedStatuses
      .filter(status => !status.isSystemDefault)
      .sort((first, second) =>
        (first.displayOrder ?? Number.MAX_SAFE_INTEGER) - (second.displayOrder ?? Number.MAX_SAFE_INTEGER)
        || first.statusId - second.statusId
      );

    customStatuses.forEach((status, index) => {
      const displayOrder = this.defaultStatuses.length + index + 1;
      if (status.displayOrder !== displayOrder) {
        const statusIndex = migratedStatuses.findIndex(item => item.statusId === status.statusId);
        migratedStatuses[statusIndex] = { ...status, displayOrder };
        changed = true;
      }
    });

    if (changed) {
      this.statusesData.set(migratedStatuses);
      this.saveToStorage();
    }
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const statuses: IStatus[] = JSON.parse(stored);
        this.statusesData.set(statuses);
      } catch {
        this.statusesData.set([]);
      }
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.statusesData()));
  }
}
