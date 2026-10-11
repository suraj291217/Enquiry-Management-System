import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { ICategory } from '../../model/category.model';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  imports: [FormsModule, StatusBadgeComponent, MatSlideToggleModule, MatSnackBarModule],
  selector: 'app-category-master',
  styleUrl: './category-master.css',
  templateUrl: './category-master.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryMaster implements OnInit {
  categoryService = inject(CategoryService);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);

  categoryList = this.categoryService.getCategories;
  isEditMode = signal(false);

  newCategoryObj: ICategory = {
    categoryId: 0,
    categoryName: '',
    isActive: true,
  };

  ngOnInit(): void {
    // Initialized from centralized CategoryService
  }

  onSaveCategory(): void {
    const trimmedName = this.newCategoryObj.categoryName.trim();

    if (!trimmedName) {
      this.toastService.error('Category name is required.');
      return;
    }

    if (this.isEditMode()) {
      this.categoryService.updateCategory({
        ...this.newCategoryObj,
        categoryName: trimmedName,
      });
      this.toastService.success('Category updated.');
    } else {
      this.categoryService.addCategory({
        categoryName: trimmedName,
        isActive: this.newCategoryObj.isActive,
      });
      this.toastService.success('Category created.');
    }

    this.resetForm();
  }

  onEditCategory(category: ICategory): void {
    this.newCategoryObj = { ...category };
    this.isEditMode.set(true);
  }

  async onDeleteCategory(categoryId: number): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete category?',
      message: 'This category will be removed from the category directory.',
      confirmLabel: 'Delete category',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    this.categoryService.deleteCategory(categoryId);
    this.toastService.success('Category deleted.');
    this.resetForm();
  }

  resetForm(): void {
    this.newCategoryObj = {
      categoryId: 0,
      categoryName: '',
      isActive: true,
    };
    this.isEditMode.set(false);
  }

  onStatusBadgeClick(category: ICategory): void {
    // Toggle the status when badge is clicked
    this.categoryService.updateCategory({
      ...category,
      isActive: !category.isActive,
    });
    this.toastService.info(`Category changed to ${!category.isActive ? 'Active' : 'Inactive'}.`);
  }
}
