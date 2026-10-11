import { Injectable, signal } from '@angular/core';
import { ICategory } from '../model/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly STORAGE_KEY = 'enquiryApp_categories';
  private categoriesData = signal<ICategory[]>([]);

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultCategories();
  }

  getCategories = this.categoriesData.asReadonly();

  getActiveCategories() {
    return this.categoriesData().filter(cat => cat.isActive);
  }

  getCategoryById(id: number): ICategory | undefined {
    return this.categoriesData().find(cat => cat.categoryId === id);
  }

  addCategory(category: Omit<ICategory, 'categoryId' | 'createdDate'>): ICategory {
    const categories = this.categoriesData();
    const nextId = categories.length
      ? Math.max(...categories.map(c => c.categoryId)) + 1
      : 1;

    const newCategory: ICategory = {
      ...category,
      categoryId: nextId,
      createdDate: new Date().toISOString()
    };

    this.categoriesData.set([...categories, newCategory]);
    this.saveToStorage();
    return newCategory;
  }

  updateCategory(category: ICategory): void {
    const categories = this.categoriesData().map(c =>
      c.categoryId === category.categoryId ? { ...category } : c
    );
    this.categoriesData.set(categories);
    this.saveToStorage();
  }

  deleteCategory(categoryId: number): boolean {
    const categories = this.categoriesData().filter(c => c.categoryId !== categoryId);
    this.categoriesData.set(categories);
    this.saveToStorage();
    return true;
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const categories: ICategory[] = JSON.parse(stored);
        this.categoriesData.set(categories);
      } catch {
        this.categoriesData.set([]);
      }
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.categoriesData()));
  }

  private initializeDefaultCategories(): void {
    if (this.categoriesData().length === 0) {
      const defaultCategories: ICategory[] = [
        { categoryId: 1, categoryName: 'General Enquiry', categoryCode: 'GENERAL', description: 'General questions and information', isActive: true, createdDate: new Date().toISOString() },
        { categoryId: 2, categoryName: 'Product Support', categoryCode: 'PRODUCT', description: 'Product-related assistance', isActive: true, createdDate: new Date().toISOString() },
        { categoryId: 3, categoryName: 'Billing & Sales', categoryCode: 'BILLING', description: 'Billing inquiries and sales questions', isActive: true, createdDate: new Date().toISOString() }
      ];
      this.categoriesData.set(defaultCategories);
      this.saveToStorage();
    }
  }
}
