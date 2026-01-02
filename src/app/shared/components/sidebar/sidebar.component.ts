import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { filter, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';

export interface MenuItem {
  labelKey: string;
  route: string;
  icon: string; // SVG path
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private destroy$ = new Subject<void>();
  currentRoute = signal<string>('');

  menuItems: MenuItem[] = [
    {
      labelKey: 'sidebar.dashboard',
      route: '/dashboard',
      icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
    },
    {
      labelKey: 'sidebar.unit',
      route: '/unit',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  ];

  ngOnInit(): void {
    // Set initial route
    this.currentRoute.set(this.router.url);

    // Listen to route changes
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        this.currentRoute.set(event.url);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isActive(route: string): boolean {
    const current = this.currentRoute();
    if (route === '/dashboard') {
      return current === '/dashboard' || current === '/';
    }
    return current.startsWith(route);
  }

  getRouterLinkActiveOptions(route: string): { exact: boolean } {
    // For dashboard, use exact match
    // For other routes, allow prefix match (e.g., /unit matches /unit/1, /unit/1/edit)
    return { exact: route === '/dashboard' };
  }
}

