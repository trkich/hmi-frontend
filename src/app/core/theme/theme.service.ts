import { Injectable, inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'tke_theme';
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Signal for current theme
  currentTheme = signal<Theme>(this.getInitialTheme());

  constructor() {
    // Apply theme on initialization
    this.applyTheme(this.currentTheme());

    // Watch for theme changes and apply them
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
      // Only save to localStorage in browser
      if (this.isBrowser && typeof localStorage !== 'undefined') {
        localStorage.setItem(this.THEME_KEY, theme);
      }
    });
  }

  private getInitialTheme(): Theme {
    // Only access localStorage in browser
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
    }

    // Check system preference (only in browser)
    if (this.isBrowser && typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }

    // Default to dark
    return 'dark';
  }

  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    
    // Apply data-theme for DaisyUI (DaisyUI handles theming via data-theme attribute)
    html.setAttribute('data-theme', theme);
  }

  toggleTheme(): void {
    const newTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.currentTheme.set(newTheme);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }

  isDark(): boolean {
    return this.currentTheme() === 'dark';
  }
}

