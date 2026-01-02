import { Routes } from '@angular/router';
import { EntraLoginComponent } from './features/auth/entra-login/entra-login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { UnitComponent } from './features/unit/unit.component';
import { UnitViewComponent } from './features/unit/unit-view.component';
import { UnitEditComponent } from './features/unit/unit-edit.component';
import { UnitInstanceDetailComponent } from './features/unit/unit-instance-detail.component';
import { ProfileComponent } from './features/profile/profile.component';
import { LayoutComponent } from './shared/components/layout/layout.component';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: EntraLoginComponent,
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'unit',
        component: UnitComponent,
      },
      {
        path: 'unit/:id',
        component: UnitViewComponent,
      },
      {
        path: 'unit/:id/edit',
        component: UnitEditComponent,
      },
      {
        path: 'unit/:unitId/instance/:instanceId',
        component: UnitInstanceDetailComponent,
      },
      {
        path: 'user/profile',
        component: ProfileComponent,
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];


