import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('fe-comic');
  
  // Tiêm ThemeService để kích hoạt khởi tạo theme ngay từ đầu
  private readonly themeService = inject(ThemeService);
}

