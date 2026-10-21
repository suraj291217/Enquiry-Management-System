import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroupDirective, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { CommonModule } from '@angular/common';
import { CategoryService } from '../../services/category.service';
import { EnquiryService } from '../../services/enquiry.service';
import { AuthService } from '../../services/auth.service';
import { StatusService } from '../../services/status.service';
import { ICustomerEnquiryStatus } from '../../model/enquiry.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  imports: [FormsModule, ReactiveFormsModule, CommonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatStepperModule, MatSnackBarModule],
  selector: 'app-new-enquiry',
  styleUrl: './new-enquiry.css',
  templateUrl: './new-enquiry.html',
})
export class NewEnquiry implements OnInit {
  private readonly ENQUIRY_DRAFT_KEY = 'enquiryApp_enquiryDraft';
  private readonly TRACKING_DRAFT_KEY = 'enquiryApp_trackingDraft';
  private hasMarkedFormTouchedAfterSubmit = false;

  toastService = inject(ToastService);
  categoryService = inject(CategoryService);
  enquiryService = inject(EnquiryService);
  statusService = inject(StatusService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  @ViewChild('enquiryFormDirective') private enquiryFormDirective?: FormGroupDirective;
  @ViewChild('stepper') private stepper?: MatStepper;

  showSuccessModal = false;
  submittedEnquiryId: string = '';
  submittedCustomerName = '';
  activePortalTab = signal<'submit' | 'track'>('submit');
  trackingForm = { enquiryId: '' };
  trackingResult = signal<ICustomerEnquiryStatus | null>(null);
  trackingError = signal('');
  submitting = signal(false);
  tracking = signal(false);
  apiError = signal('');

  activeCategories = this.categoryService.getActiveCategories();

  ngOnInit(): void {
    this.restoreSessionDrafts();
    this.setCustomerDetails();
    const fragment = this.router.parseUrl(this.router.url).fragment ?? window.location.hash.slice(1);
    this.activateTabFromFragment(fragment, true);
    if (fragment === 'track-enquiry' && this.trackingForm.enquiryId) {
      this.lookupEnquiry(new Event('submit'));
    }
  }

  enquiryForm = this.formBuilder.nonNullable.group({
    customerName: ['', Validators.required],
    customerPhone: ['', [
      Validators.required,
      Validators.pattern(/^\+?[0-9]{1,3}?[-.\s]?([0-9]{2,4})?[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}$|^[0-9]{7,15}$/)
    ]],
    customerEmail: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
    categoryId: ['', Validators.required],
    enquiryType: ['', Validators.required],
    message: ['', Validators.required],
  });

  saveEnquiryDraft(): void {
    if (this.hasMarkedFormTouchedAfterSubmit) {
      this.enquiryForm.markAsUntouched();
      this.hasMarkedFormTouchedAfterSubmit = false;
    }
    sessionStorage.setItem(this.ENQUIRY_DRAFT_KEY, JSON.stringify(this.enquiryForm.getRawValue()));
  }

  saveTrackingDraft(): void {
    sessionStorage.setItem(this.TRACKING_DRAFT_KEY, JSON.stringify(this.trackingForm));
  }

  isContactInformationComplete(): boolean {
    const { customerName, customerPhone } = this.enquiryForm.controls;
    const phoneDigits = customerPhone.value.replace(/\D/g, '');
    return !!customerName.value.trim()
      && customerPhone.valid
      && phoneDigits.length >= 7
      && phoneDigits.length <= 15
      && this.isCustomerEmailValid();
  }

  continueToRequestDetails(stepper: MatStepper): void {
    if (!this.isContactInformationComplete()) {
      this.markContactInformationTouched();
      return;
    }

    stepper.next();
  }

  onStepSelectionChange(event: StepperSelectionEvent, stepper: MatStepper): void {
    if (event.selectedIndex > event.previouslySelectedIndex && !this.isContactInformationComplete()) {
      this.markContactInformationTouched();
      queueMicrotask(() => {
        if (stepper.selectedIndex === event.selectedIndex) {
          stepper.selectedIndex = event.previouslySelectedIndex;
        }
      });
    }
  }

  private markContactInformationTouched(): void {
    this.enquiryForm.controls.customerName.markAsTouched();
    this.enquiryForm.controls.customerPhone.markAsTouched();
    this.enquiryForm.controls.customerEmail.markAsTouched();
  }

  private restoreSessionDrafts(): void {
    const enquiryDraft = sessionStorage.getItem(this.ENQUIRY_DRAFT_KEY);
    if (enquiryDraft) {
      try {
        const draft = JSON.parse(enquiryDraft) as Partial<typeof this.enquiryForm.value>;
        this.enquiryForm.patchValue({
          customerName: typeof draft.customerName === 'string' ? draft.customerName : '',
          customerPhone: typeof draft.customerPhone === 'string' ? draft.customerPhone : '',
          customerEmail: typeof draft.customerEmail === 'string' ? draft.customerEmail : '',
          categoryId: typeof draft.categoryId === 'string' ? draft.categoryId : '',
          enquiryType: typeof draft.enquiryType === 'string' ? draft.enquiryType : '',
          message: typeof draft.message === 'string' ? draft.message : '',
        });
      } catch {
        sessionStorage.removeItem(this.ENQUIRY_DRAFT_KEY);
      }
    }

    const trackingDraft = sessionStorage.getItem(this.TRACKING_DRAFT_KEY);
    if (trackingDraft) {
      try {
        const draft = JSON.parse(trackingDraft) as Partial<typeof this.trackingForm>;
        this.trackingForm = {
          enquiryId: typeof draft.enquiryId === 'string' ? draft.enquiryId : '',
        };
      } catch {
        sessionStorage.removeItem(this.TRACKING_DRAFT_KEY);
      }
    }
  }

  async onSubmit(): Promise<void> {
    if (this.submitting()) return;
    this.apiError.set('');
    const formValue = this.enquiryForm.getRawValue();
    const customerName = formValue.customerName.trim();
    const customerPhone = formValue.customerPhone.trim();
    const customerEmail = formValue.customerEmail.trim();
    const message = formValue.message.trim();

    if (!customerName || !customerPhone || !customerEmail || !message || !formValue.categoryId || !formValue.enquiryType) {
      this.markFormAllAsTouchedAfterSubmit();
      this.toastService.error('Please fill all required fields');
      return;
    }

    if (this.enquiryForm.invalid) this.markFormAllAsTouchedAfterSubmit();

    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (!this.enquiryForm.controls.customerPhone.valid || phoneDigits.length < 7 || phoneDigits.length > 15) {
      this.toastService.error('Please enter a valid phone number');
      return;
    }

    if (!this.isCustomerEmailValid()) {
      this.toastService.error('Please enter a valid email address');
      return;
    }

    const categoryId = Number(formValue.categoryId);
    if (!this.categoryService.getActiveCategories().some(category => category.categoryId === categoryId)) {
      this.toastService.error('Please select an active category');
      return;
    }

    if (!['General', 'Sales', 'Technical'].includes(formValue.enquiryType)) {
      this.toastService.error('Please select a valid enquiry type');
      return;
    }

    this.submitting.set(true);
    const confirmed = await this.confirmationService.confirm({
      title: 'Submit enquiry?',
      message: 'Your request will be sent to our customer support team.',
      confirmLabel: 'Submit enquiry',
      cancelLabel: 'Review request',
    });
    if (!confirmed) {
      this.submitting.set(false);
      return;
    }

    this.enquiryService.submitEnquiry({
      customerName,
      customerEmail,
      customerPhone,
      categoryId,
      statusId: 1,
      enquiryType: formValue.enquiryType,
      enquiryDetails: message
    }).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: newEnquiry => {
        this.submittedEnquiryId = `ENQ-${newEnquiry.enquiryId.toString().padStart(4, '0')}`;
        this.submittedCustomerName = customerName;
        this.toastService.success(`Enquiry ${this.submittedEnquiryId} submitted successfully.`);
        this.showSuccessModal = true;
        this.resetForm();
      },
      error: error => {
        this.apiError.set(this.getApiErrorMessage(error, 'We could not submit your enquiry. Please try again.'));
      },
    });
  }

  lookupEnquiry(event: Event): void {
    event.preventDefault();
    this.saveTrackingDraft();
    this.trackingError.set('');
    this.trackingResult.set(null);
    if (this.tracking()) return;

    const enquiryId = this.trackingForm.enquiryId.trim();
    if (!enquiryId) {
      this.trackingError.set('Enter your enquiry ID.');
      return;
    }

    this.tracking.set(true);
    this.enquiryService.lookupCustomerEnquiryStatus(enquiryId)
      .pipe(finalize(() => this.tracking.set(false)))
      .subscribe({
        next: result => this.trackingResult.set(result),
        error: error => {
          this.trackingError.set(this.getApiErrorMessage(
            error,
            'We could not look up your enquiry. Please try again.',
          ));
        },
      });
  }

  private getApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return fallback;
  }

  selectPortalTab(tab: 'submit' | 'track'): void {
    const fragment = tab === 'track' ? 'track-enquiry' : 'new-enquiry';
    this.activateTabFromFragment(fragment, true);
    this.router.navigate(['/customer/portal'], { fragment });
  }

  private activateTabFromFragment(fragment: string, scroll: boolean): void {
    if (fragment === 'track-enquiry') {
      this.activePortalTab.set('track');
    } else if (fragment === 'new-enquiry' || !fragment) {
      this.activePortalTab.set('submit');
    } else {
      return;
    }

    if (scroll && fragment) {
      setTimeout(() => document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
  }

  trackSubmittedEnquiry(): void {
    this.trackingForm = {
      enquiryId: this.submittedEnquiryId,
    };
    this.saveTrackingDraft();
    this.showSuccessModal = false;
    this.selectPortalTab('track');
    this.lookupEnquiry(new Event('submit'));
  }

  async copySubmittedEnquiryId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.submittedEnquiryId);
      this.toastService.success('Enquiry ID copied to clipboard.');
    } catch {
      this.toastService.error('Could not copy the enquiry ID.');
    }
  }

  getTrackingStatusName(statusId: number): string {
    return this.statusService.getStatusById(statusId)?.statusName ?? 'Status unavailable';
  }

  getTrackingStatusClass(statusId: number): string {
    return this.statusService.getBadgeClass(statusId);
  }

  getTrackingCategoryName(categoryId: number): string {
    return this.categoryService.getCategoryById(categoryId)?.categoryName ?? 'Category unavailable';
  }

  getTrackingLastUpdated(result: ICustomerEnquiryStatus): string {
    const updatedAt = new Date(result.updatedDate ?? result.createdDate);
    if (Number.isNaN(updatedAt.getTime())) return 'Date unavailable';

    const today = new Date();
    if (updatedAt.toDateString() === today.toDateString()) return 'Today';

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (updatedAt.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(updatedAt);
  }

  resetForm(): void {
    if (this.enquiryFormDirective) {
      this.enquiryFormDirective.resetForm();
    } else {
      this.enquiryForm.reset();
    }
    this.setCustomerDetails();
    this.enquiryForm.markAsPristine();
    this.enquiryForm.markAsUntouched();
    if (this.stepper) this.stepper.selectedIndex = 0;
    this.hasMarkedFormTouchedAfterSubmit = false;
    sessionStorage.removeItem(this.ENQUIRY_DRAFT_KEY);
  }

  closeModal(): void {
    this.showSuccessModal = false;
    this.activePortalTab.set('submit');
    this.resetForm();
    void this.router.navigate(['/customer/portal']).then(() => window.scrollTo(0, 0));
  }

  private setCustomerDetails(): void {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'user') return;
    this.enquiryForm.patchValue({
      customerName: user.name,
      customerPhone: user.phone,
      customerEmail: user.email,
    });
    this.enquiryForm.controls.customerEmail.disable({ emitEvent: false });
  }

  private isCustomerEmailValid(): boolean {
    const customerEmail = this.enquiryForm.controls.customerEmail;
    return customerEmail.enabled
      ? customerEmail.valid
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.value.trim());
  }

  private markFormAllAsTouchedAfterSubmit(): void {
    this.enquiryForm.markAllAsTouched();
    this.hasMarkedFormTouchedAfterSubmit = true;
  }
}