import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { IEnquiry } from '../../model/enquiry.model';
import { CategoryService } from '../../services/category.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { EnquiryService } from '../../services/enquiry.service';
import { StatusService } from '../../services/status.service';
import { ToastService } from '../../services/toast.service';

@Component({
  imports: [CommonModule, FormsModule, RouterLink, MatFormFieldModule, MatSelectModule, MatSnackBarModule],
  selector: 'app-enquiry-detail',
  styleUrl: './enquiry-detail.css',
  templateUrl: './enquiry-detail.html',
})
export class EnquiryDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly enquiryService = inject(EnquiryService);
  private readonly categoryService = inject(CategoryService);
  private readonly statusService = inject(StatusService);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly enquiry = signal<IEnquiry | null>(null);
  readonly activeStatuses = computed(() => this.statusService.getStatuses()
    .filter(status => status.isActive)
    .sort((first, second) => (first.displayOrder ?? 0) - (second.displayOrder ?? 0)));

  editStatusId = '';
  editResolutionNotes = '';

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const id = Number(params.get('id'));
      const enquiry = Number.isSafeInteger(id) && id > 0
        ? this.enquiryService.getEnquiryById(id)
        : undefined;

      this.enquiry.set(enquiry ?? null);
      this.editStatusId = enquiry?.statusId.toString() ?? '';
      this.editResolutionNotes = enquiry?.resolutionNotes ?? '';
    });
  }

  getEnquiryCode(enquiry: IEnquiry): string {
    return `ENQ-${enquiry.enquiryId.toString().padStart(4, '0')}`;
  }

  getCategoryName(categoryId: number): string {
    return this.categoryService.getCategoryById(categoryId)?.categoryName ?? 'Unknown category';
  }

  getStatusName(statusId: number): string {
    return this.statusService.getStatusById(statusId)?.statusName ?? 'Unknown status';
  }

  async saveDetails(): Promise<void> {
    const enquiry = this.enquiry();
    const statusId = Number(this.editStatusId);
    if (!enquiry || !this.activeStatuses().some(status => status.statusId === statusId)) {
      this.toastService.error('Choose an active status before saving.');
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Save enquiry updates?',
      message: `Save the status and admin response for ${this.getEnquiryCode(enquiry)}?`,
      confirmLabel: 'Save updates',
      cancelLabel: 'Keep editing',
    });
    if (!confirmed) return;

    const updatedEnquiry = {
      ...enquiry,
      statusId,
      resolutionNotes: this.editResolutionNotes.trim(),
    };
    this.enquiryService.updateEnquiry(updatedEnquiry).subscribe({
      next: savedEnquiry => {
        this.enquiry.set(savedEnquiry);
        this.toastService.success(`${this.getEnquiryCode(savedEnquiry)} updated.`);
      },
      error: () => this.toastService.error('We could not update this enquiry. Please try again.'),
    });
  }

  async moveToTrash(): Promise<void> {
    const enquiry = this.enquiry();
    if (!enquiry) return;

    const confirmed = await this.confirmationService.confirm({
      title: 'Move enquiry to trash?',
      message: `${this.getEnquiryCode(enquiry)} will be hidden from active enquiries. You can restore it from Trash later.`,
      confirmLabel: 'Move to trash',
      destructive: true,
    });
    if (!confirmed) return;

    this.enquiryService.updateEnquiry({ ...enquiry, isDeleted: true }).subscribe({
      next: () => {
        this.toastService.success(`${this.getEnquiryCode(enquiry)} moved to trash.`);
        void this.router.navigate(['/admin/enquiries']);
      },
      error: () => this.toastService.error('We could not move this enquiry to trash. Please try again.'),
    });
  }

  restoreEnquiry(): void {
    const enquiry = this.enquiry();
    if (!enquiry) return;

    this.enquiryService.updateEnquiry({ ...enquiry, isDeleted: false }).subscribe({
      next: () => {
        this.toastService.success(`${this.getEnquiryCode(enquiry)} restored.`);
        void this.router.navigate(['/admin/enquiries']);
      },
      error: () => this.toastService.error('We could not restore this enquiry. Please try again.'),
    });
  }
}