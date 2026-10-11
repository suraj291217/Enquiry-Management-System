import { Injectable, signal } from '@angular/core';
import { IStatus } from '../model/status.model';

@Injectable({
  providedIn: 'root'
})
export class StatusService {
  private readonly STORAGE_KEY = 'enquiryApp_statuses';
  private statusesData = signal<IStatus[]>([]);

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
      const defaultStatuses: IStatus[] = [
        { statusId: 1, statusName: 'New', statusCode: 'NEW', isActive: true, displayOrder: 1, isSystemDefault: true, badgeClass: 'badge-new', createdDate: new Date().toISOString() },
        { statusId: 2, statusName: 'In Progress', statusCode: 'IN_PROGRESS', isActive: true, displayOrder: 2, isSystemDefault: true, badgeClass: 'badge-progress', createdDate: new Date().toISOString() },
        { statusId: 3, statusName: 'Resolved', statusCode: 'RESOLVED', isActive: true, displayOrder: 3, isSystemDefault: true, badgeClass: 'badge-resolved', createdDate: new Date().toISOString() },
        { statusId: 4, statusName: 'Closed', statusCode: 'CLOSED', isActive: true, displayOrder: 4, isSystemDefault: true, badgeClass: 'badge-closed', createdDate: new Date().toISOString() }
      ];
      this.statusesData.set(defaultStatuses);
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
