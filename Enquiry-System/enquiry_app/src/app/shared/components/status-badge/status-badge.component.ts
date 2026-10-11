import { Component, ChangeDetectionStrategy, input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    <span
      [ngClass]="isActive() ? 'status-active' : 'status-inactive'"
      class="status-badge"
      [class.clickable]="badgeClick.observed"
      (click)="onBadgeClick()"
    >
      {{ label() || (isActive() ? activeText() : inactiveText()) }}
    </span>
  `,
  styles: [`
    .status-badge {
      border-radius: 20px;
      display: inline-block;
      font-size: 0.63rem;
      font-weight: 700;
      padding: 5px 10px;
      transition: opacity 160ms ease, transform 160ms ease;
    }
    .status-badge.clickable {
      cursor: pointer;
    }
    .status-badge.clickable:hover {
      opacity: 0.8;
      transform: scale(1.05);
    }
    .status-badge.clickable:active {
      transform: scale(0.98);
    }
    .status-active {
      background: #e0f3e9;
      color: #28754f;
    }
    .status-inactive {
      background: #f1eeee;
      color: #977a7a;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  // Inputs (Signal-based)
  isActive = input.required<boolean>();
  label = input<string>('');
  activeText = input<string>('Active');
  inactiveText = input<string>('Inactive');

  // Output (Event emitter)
  @Output() badgeClick = new EventEmitter<boolean>();

  onBadgeClick(): void {
    this.badgeClick.emit(this.isActive());
  }
}
