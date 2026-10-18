import { Injectable, signal } from '@angular/core';
import { IUser } from '../model/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<IUser | null>(null);
  private readonly  STORAGE_KEY = 'enquiryApp';
  private readonly USER_DATA_KEY = 'enquiryAppUserData';

  constructor() {
    this.loadUserFromStorage();
  }

  getCurrentUser = this.currentUser.asReadonly();

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  login(email: string): boolean {
    const validCredentials = [
      { email: 'admin@gmail.com', role: 'admin' as const },
      { email: 'admin', role: 'admin' as const }
    ];

    const credential = validCredentials.find(c => c.email.toLowerCase() === email.toLowerCase());

    if (credential) {
      const user: IUser = {
        userId: 1,
        email: email,
        role: credential.role,
        loginTime: new Date()
      };

      this.currentUser.set(user);
      localStorage.setItem(this.STORAGE_KEY, email);
      localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(user));
      return true;
    }

    return false;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
  }

  private loadUserFromStorage(): void {
    const email = localStorage.getItem(this.STORAGE_KEY);
    const userData = localStorage.getItem(this.USER_DATA_KEY);

    if (email && userData) {
      try {
        const user: IUser = JSON.parse(userData);
        this.currentUser.set(user);
      } catch {
        this.logout();
      }
    }
  }

  getUserEmail(): string {
    return this.currentUser()?.email || '';
  }
}
