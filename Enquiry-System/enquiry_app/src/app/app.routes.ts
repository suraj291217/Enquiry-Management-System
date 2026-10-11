import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'enquiry',
    pathMatch: 'full',
  },
  {
    path: 'home',
    redirectTo: 'enquiry',
  },
  {
    path: 'enquiry',
    loadComponent: () => import('./pages/new-enquiry/new-enquiry').then(module => module.NewEnquiry),
  },
  {
    path: 'admin',
    redirectTo: 'admin/login',
    pathMatch: 'full',
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./pages/login/login').then(module => module.Login),
  },
  {
    path: 'admin/enquiries',
    loadComponent: () => import('./pages/enquiry-list/enquiry-list').then(module => module.EnquiryList),
    canActivate: [authGuard],
  },
  {
    path: 'admin/enquiries/:id',
    loadComponent: () => import('./pages/enquiry-detail/enquiry-detail').then(module => module.EnquiryDetail),
    canActivate: [authGuard],
  },
  {
    path: 'admin/categories',
    loadComponent: () => import('./pages/category-master/category-master').then(module => module.CategoryMaster),
    canActivate: [authGuard],
  },
  {
    path: 'admin/statuses',
    loadComponent: () => import('./pages/status-master/status-master').then(module => module.StatusMaster),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    redirectTo: 'admin/login',
  },
  {
    path: 'status',
    loadComponent: () => import('./pages/status-master/status-master').then(module => module.StatusMaster),
    canActivate: [authGuard],
  },
  {
    path: 'category',
    loadComponent: () => import('./pages/category-master/category-master').then(module => module.CategoryMaster),
    canActivate: [authGuard],
  },
  {
    path: 'enquiry-list',
    loadComponent: () => import('./pages/enquiry-list/enquiry-list').then(module => module.EnquiryList),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'enquiry',
  },
];
