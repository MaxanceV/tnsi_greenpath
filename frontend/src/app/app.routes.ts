import { Routes } from '@angular/router';

import { AdminUsersComponent } from './components/admin-users/admin-users.component';
import { LoginComponent } from './components/login/login.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { PublicProductComponent } from './components/public-product/public-product.component';
import { adminGuard, authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },

  // Pages publiques (sans auth — accessibles via QR code)
  { path: 'p/:id', component: PublicProductComponent },

  // Pages authentifiées
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'products', component: ProductListComponent, canActivate: [authGuard] },
  { path: 'products/new', component: ProductFormComponent, canActivate: [authGuard] },
  { path: 'products/:id/edit', component: ProductFormComponent, canActivate: [authGuard] },
  { path: 'admin/users', component: AdminUsersComponent, canActivate: [authGuard, adminGuard] },

  { path: '**', redirectTo: 'products' },
];
