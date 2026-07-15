import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-modal',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  @Input() isOpen = false;
  @Input() notifications: any[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() markAllAsRead = new EventEmitter<void>();
  @Output() markAsRead = new EventEmitter<number>();

  getIconName(type: string): string {
    switch (type) {
      case 'feature':
        return 'bolt';
      case 'billing':
        return 'credit_card';
      case 'update':
        return 'campaign';
      default:
        return 'notifications';
    }
  }

  onMarkAllAsRead(event: MouseEvent) {
    event.stopPropagation();
    this.markAllAsRead.emit();
  }

  onMarkAsRead(id: number, event: MouseEvent) {
    event.stopPropagation();
    this.markAsRead.emit(id);
  }

  onClose(event: MouseEvent) {
    event.stopPropagation();
    this.close.emit();
  }
}
