import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  user = computed(() => this.auth.user());
  isDark = computed(() => this.themeService.isDark());

  logout(): void {
    this.auth.logout();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}

