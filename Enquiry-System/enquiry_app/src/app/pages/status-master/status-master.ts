import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IStatus } from '../../model/status.model';
import { StatusService } from '../../services/status.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  imports: [FormsModule, StatusBadgeComponent, MatSlideToggleModule, MatSnackBarModule],
  selector: 'app-status-master',
  styleUrl: './status-master.css',
  templateUrl: './status-master.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusMaster implements OnInit {
  statusService = inject(StatusService);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmationService);

  statusList = this.statusService.getStatuses;
  isEditMode = signal(false);

  newStatusObj: IStatus = {
    statusId: 0,
    statusName: '',
    isActive: true,
    displayOrder: 1,
  };

  ngOnInit(): void {
    // Initialized from centralized StatusService
  }

  onSaveStatus(): void {
    const trimmedName = this.newStatusObj.statusName.trim();

    if (!trimmedName) {
      this.toastService.error('Status name is required.');
      return;
    }

    if (this.isEditMode()) {
      this.statusService.updateStatus({
        ...this.newStatusObj,
        statusName: trimmedName,
      });
      this.toastService.success('Status updated.');
    } else {
      this.statusService.addStatus({
        statusName: trimmedName,
        isActive: this.newStatusObj.isActive,
        displayOrder: Math.max(0, ...this.statusList().map(status => status.displayOrder ?? 0)) + 1,
      });
      this.toastService.success('Status created.');
    }

    this.resetForm();
  }

  onEditStatus(status: IStatus): void {
    this.newStatusObj = { ...status };
    this.isEditMode.set(true);
  }

  async onDeleteStatus(statusId: number): Promise<void> {
    const status = this.statusService.getStatusById(statusId);

    if (status?.isSystemDefault) {
      this.toastService.error('System default statuses cannot be deleted.');
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Delete status?',
      message: 'This status will be removed from the status directory.',
      confirmLabel: 'Delete status',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    this.statusService.deleteStatus(statusId);
    this.toastService.success('Status deleted.');
    this.resetForm();
  }

  resetForm(): void {
    this.newStatusObj = {
      statusId: 0,
      statusName: '',
      isActive: true,
      displayOrder: Math.max(0, ...this.statusList().map(status => status.displayOrder ?? 0)) + 1,
    };
    this.isEditMode.set(false);
  }

  onStatusBadgeClick(status: IStatus): void {
    // Toggle the status when badge is clicked
    this.statusService.updateStatus({
      ...status,
      isActive: !status.isActive,
    });
    this.toastService.info(`Status changed to ${!status.isActive ? 'Active' : 'Inactive'}.`);
  }
}
