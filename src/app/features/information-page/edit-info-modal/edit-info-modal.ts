import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

export interface UserProfileInfo {
  name: string;
  handle: string;
  joinDate: string;
  email: string;
  avatar: string;
  bio?: string;
}

@Component({
  selector: 'app-edit-info-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './edit-info-modal.html',
  styleUrl: './edit-info-modal.scss',
})
export class EditInfoModal implements OnInit {
  @Input() userProfile!: UserProfileInfo;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<UserProfileInfo>();

  // Local cloned state to hold edits before saving
  localProfile!: UserProfileInfo;

  // Track if default silhouette is used
  hasCustomAvatar = true;

  ngOnInit() {
    // Deep copy initial profile details
    this.localProfile = {
      ...this.userProfile,
      bio: this.userProfile.bio || ''
    };
    this.hasCustomAvatar = !!this.localProfile.avatar && !this.localProfile.avatar.includes('default-avatar');
  }

  // Handle hidden input trigger
  triggerFileInput(fileInput: HTMLInputElement) {
    fileInput.click();
  }

  // Read chosen profile photo file
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = () => {
        this.localProfile.avatar = reader.result as string;
        this.hasCustomAvatar = true;
      };
      
      reader.readAsDataURL(file);
    }
  }

  // Remove photo and display default silhouette
  removePhoto() {
    this.localProfile.avatar = '';
    this.hasCustomAvatar = false;
  }

  // Save edits
  save() {
    if (!this.localProfile.name.trim()) {
      alert('Full Name cannot be empty.');
      return;
    }
    
    // Ensure handle starts with @
    let handle = this.localProfile.handle.trim();
    if (handle && !handle.startsWith('@')) {
      handle = '@' + handle;
    }
    this.localProfile.handle = handle;

    this.onSave.emit(this.localProfile);
  }

  // Cancel edit modal
  cancel() {
    this.onClose.emit();
  }
}

