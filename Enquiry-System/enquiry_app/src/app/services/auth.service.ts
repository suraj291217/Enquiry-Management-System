import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { IUser } from '../model/user.model';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';

export interface CustomerRegistration {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export type RegisteredCustomer = Pick<IUser, 'userId' | 'name' | 'email' | 'phone' | 'role'>;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<IUser | null>(null);
  private readonly http = inject(HttpClient);
  private sessionResolved = false;

  getCurrentUser = this.currentUser.asReadonly();

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  hasRole(role: IUser['role']): boolean {
    return this.currentUser()?.role === role;
  }

  login(email: string, password: string): Observable<IUser> {
    return this.http.post<IUser>('/api/auth/login', { email, password }).pipe(
      tap(user => this.setCurrentUser(user)),
    );
  }

  register(details: CustomerRegistration): Observable<RegisteredCustomer> {
    return this.http.post<RegisteredCustomer>('/api/auth/register', details);
  }

  restoreSession(): Observable<IUser | null> {
    if (this.sessionResolved) return of(this.currentUser());

    return this.http.get<IUser>('/api/auth/me').pipe(
      tap(user => this.setCurrentUser(user)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.currentUser.set(null);
          this.sessionResolved = true;
          return of(null);
        }
        return throwError(() => error);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post('/api/auth/logout', {}).pipe(
      tap(() => {
        this.currentUser.set(null);
        this.sessionResolved = true;
        sessionStorage.removeItem('enquiryApp_enquiryDraft');
        sessionStorage.removeItem('enquiryApp_trackingDraft');
      }),
      map(() => undefined),
    );
  }

  clearSession(): void {
    this.currentUser.set(null);
    this.sessionResolved = true;
  }

  private setCurrentUser(user: IUser): void {
    this.currentUser.set(user);
    this.sessionResolved = true;
  }

  getUserEmail(): string {
    return this.currentUser()?.email || '';
  }
}
