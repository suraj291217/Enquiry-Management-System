import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
  private readonly confirmationService = inject(ConfirmationService);
  readonly confirmation = this.confirmationService.activeConfirmation;

  cancel(): void {
    this.confirmationService.resolve(false);
  }

  confirm(): void {
    this.confirmationService.resolve(true);
  }
}