import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ICustomerEnquiryStatus, IEnquiry } from '../model/enquiry.model';

@Injectable({
  providedIn: 'root'
})
export class EnquiryService {
  private readonly STORAGE_KEY = 'enquiryApp_enquiries';
  private readonly http = inject(HttpClient);
  private enquiriesData = signal<IEnquiry[]>([]);
  constructor() {
    this.loadFromStorage();
  }

  getEnquiries = this.enquiriesData.asReadonly();

  submitEnquiry(enquiry: Omit<IEnquiry, 'enquiryId' | 'createdDate'>): Observable<IEnquiry> {
    return this.http.post<IEnquiry>('/api/enquiries', enquiry).pipe(
      tap(createdEnquiry => {
        const enquiries = this.enquiriesData();
        this.enquiriesData.set([
          ...enquiries.filter(existing => existing.enquiryId !== createdEnquiry.enquiryId),
          createdEnquiry,
        ]);
        this.saveToStorage();
      }),
    );
  }

  loadEnquiries(): Observable<IEnquiry[]> {
    return this.http.get<IEnquiry[]>('/api/enquiries').pipe(
      tap(enquiries => {
        this.enquiriesData.set(enquiries);
        this.saveToStorage();
      }),
    );
  }

  lookupCustomerEnquiryStatus(enquiryCode: string): Observable<ICustomerEnquiryStatus> {
    const params = new HttpParams().set('code', enquiryCode);
    return this.http.get<ICustomerEnquiryStatus>('/api/enquiries', { params });
  }

  getEnquiryById(id: number): IEnquiry | undefined {
    return this.enquiriesData().find(e => e.enquiryId === id);
  }

  getCustomerEnquiryStatus(enquiryCode: string, email: string): ICustomerEnquiryStatus | null {
    const match = /^ENQ-(\d{4,})$/i.exec(enquiryCode.trim());
    if (!match) return null;

    const enquiry = this.getEnquiryById(Number(match[1]));
    if (!enquiry || enquiry.isDeleted || enquiry.customerEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return null;
    }

    return {
      enquiryId: enquiry.enquiryId,
      categoryId: enquiry.categoryId,
      statusId: enquiry.statusId,
      enquiryType: enquiry.enquiryType,
      createdDate: enquiry.createdDate,
      updatedDate: enquiry.updatedDate,
      resolutionNotes: enquiry.resolutionNotes,
    };
  }

  addEnquiry(enquiry: Omit<IEnquiry, 'enquiryId' | 'createdDate'>): IEnquiry {
    const enquiries = this.enquiriesData();
    const nextId = enquiries.length
      ? Math.max(...enquiries.map(e => e.enquiryId)) + 1
      : 1;

    const newEnquiry: IEnquiry = {
      ...enquiry,
      enquiryId: nextId,
      createdDate: new Date().toISOString()
    };

    this.enquiriesData.set([...enquiries, newEnquiry]);
    this.saveToStorage();
    return newEnquiry;
  }

  updateEnquiry(enquiry: IEnquiry): Observable<IEnquiry> {
    return this.http.put<IEnquiry>(`/api/enquiries/${enquiry.enquiryId}`, enquiry).pipe(
      tap(updatedEnquiry => {
        const enquiries = this.enquiriesData();
        this.enquiriesData.set([
          ...enquiries.filter(existing => existing.enquiryId !== updatedEnquiry.enquiryId),
          updatedEnquiry,
        ]);
        this.saveToStorage();
      }),
    );
  }

  moveToTrash(enquiryId: number): boolean {
    return this.setDeleted(enquiryId, true);
  }

  restoreFromTrash(enquiryId: number): boolean {
    return this.setDeleted(enquiryId, false);
  }

  private setDeleted(enquiryId: number, isDeleted: boolean): boolean {
    const enquiries = this.enquiriesData();
    if (!enquiries.some(enquiry => enquiry.enquiryId === enquiryId)) {
      return false;
    }

    this.enquiriesData.set(enquiries.map(enquiry =>
      enquiry.enquiryId === enquiryId
        ? { ...enquiry, isDeleted, updatedDate: new Date().toISOString() }
        : enquiry
    ));
    this.saveToStorage();
    return true;
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const enquiries: IEnquiry[] = JSON.parse(stored);
        this.enquiriesData.set(enquiries);
      } catch {
        this.enquiriesData.set([]);
      }
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.enquiriesData()));
  }
}