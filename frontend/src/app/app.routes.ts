import { Routes } from '@angular/router';

import { AdminUsersComponent } from './components/admin-users/admin-users.component';
import { LoginComponent } from './components/login/login.component';
import { MyConsumptionComponent } from './components/my-consumption/my-consumption.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { PublicProductComponent } from './components/public-product/public-product.component';
import { SignupComponent } from './components/signup/signup.component';
import {
  adminGuard,
  authGuard,
  consumerGuard,
  guestGuard,
  staffGuard,
} from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },

  // Pages publiques (sans auth — accessibles via QR code)
  { path: 'p/:id', component: PublicProductComponent },

  // Auth
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [guestGuard] },

  // Pages staff (admin + entreprise)
  { path: 'products', component: ProductListComponent, canActivate: [authGuard, staffGuard] },
  { path: 'products/new', component: ProductFormComponent, canActivate: [authGuard, staffGuard] },
  { path: 'products/:id/edit', component: ProductFormComponent, canActivate: [authGuard, staffGuard] },
  { path: 'admin/users', component: AdminUsersComponent, canActivate: [authGuard, adminGuard] },

  // Pages consommateur
  { path: 'my-consumption', component: MyConsumptionComponent, canActivate: [authGuard, consumerGuard] },

  { path: '**', redirectTo: 'products' },
];
