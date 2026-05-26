import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export interface ComicProject {
  title: string;
  coverImage: string;
  createdAt: Date;
  style: string;
  pages: number;
  isDraft?: boolean;
}

@Component({
  selector: 'app-story-board-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './story-board-page.html',
  styleUrl: './story-board-page.scss',
})
export class StoryBoardPage {
  comics: ComicProject[] = [
    {
      title: 'Neon Genesis',
      coverImage: '/assets/images/covers/neon-genesis.png',
      createdAt: new Date(), // Hôm nay (Today)
      style: 'Sci-Fi',
      pages: 24
    },
    {
      title: 'Whispers of the Void',
      coverImage: '/assets/images/covers/whispers-void.png',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 ngày trước (Tuần này - This Week)
      style: 'Fantasy',
      pages: 12
    },
    {
      title: 'Chrome Hearts',
      coverImage: '/assets/images/covers/chrome-hearts.png',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 ngày trước (Tháng này - All Dates)
      style: 'Sci-Fi',
      pages: 8
    },
    {
      title: 'Midnight Ramen',
      coverImage: '/assets/images/covers/midnight-ramen.png',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 ngày trước
      style: 'Drama',
      pages: 3,
      isDraft: true
    }
  ];

  selectedDateFilter = 'All Dates';
  selectedGenreFilter = 'All Genres';

  showDateDropdown = false;
  showGenreDropdown = false;

  // Lọc danh sách truyện theo Ngày và Phong cách (Genre)
  get filteredComics(): ComicProject[] {
    return this.comics.filter(comic => {
      // 1. Lọc theo thể loại/phong cách
      if (this.selectedGenreFilter !== 'All Genres' && comic.style !== this.selectedGenreFilter) {
        return false;
      }

      // 2. Lọc theo thời gian tạo
      if (this.selectedDateFilter !== 'All Dates') {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - comic.createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (this.selectedDateFilter === 'Today') {
          const isToday = comic.createdAt.getDate() === now.getDate() &&
            comic.createdAt.getMonth() === now.getMonth() &&
            comic.createdAt.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (this.selectedDateFilter === 'This Week') {
          if (diffDays > 7) return false;
        }
      }

      return true;
    });
  }

  toggleDateDropdown(event: Event) {
    event.stopPropagation();
    this.showDateDropdown = !this.showDateDropdown;
    this.showGenreDropdown = false;
  }

  toggleGenreDropdown(event: Event) {
    event.stopPropagation();
    this.showGenreDropdown = !this.showGenreDropdown;
    this.showDateDropdown = false;
  }

  setDateFilter(value: string) {
    this.selectedDateFilter = value;
    this.showDateDropdown = false;
  }

  setGenreFilter(value: string) {
    this.selectedGenreFilter = value;
    this.showGenreDropdown = false;
  }

  @HostListener('document:click')
  closeDropdowns() {
    this.showDateDropdown = false;
    this.showGenreDropdown = false;
  }
}
