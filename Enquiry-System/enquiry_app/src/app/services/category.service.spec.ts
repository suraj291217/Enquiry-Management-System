import { TestBed } from '@angular/core/testing';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(() => {
    localStorage.removeItem('enquiryApp_categories');
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoryService);
  });

  it('initializes the default categories when storage is empty', () => {
    expect(service.getCategories().map(category => category.categoryCode)).toEqual([
      'GENERAL',
      'PRODUCT',
      'BILLING',
    ]);
  });

  it('creates, updates, filters, and deletes a category', () => {
    const category = service.addCategory({
      categoryName: 'Account Help',
      categoryCode: 'ACCOUNT',
      description: 'Account assistance',
      isActive: true,
    });

    expect(category.categoryId).toBe(4);
    expect(service.getCategoryById(category.categoryId)).toEqual(category);

    service.updateCategory({ ...category, isActive: false });
    expect(service.getActiveCategories().some(item => item.categoryId === category.categoryId)).toBe(false);

    expect(service.deleteCategory(category.categoryId)).toBe(true);
    expect(service.getCategoryById(category.categoryId)).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('enquiryApp_categories')!)).toHaveLength(3);
  });
});
