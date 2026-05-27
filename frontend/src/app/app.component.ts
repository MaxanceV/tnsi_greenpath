import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { ROLE_LABELS } from './models/auth.model';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav *ngIf="auth.isAuthenticated() && !isPublicRoute()" class="navbar">
      <div class="nav-inner">
        <a routerLink="/products" class="brand" aria-label="GreenPath">
          <img src="/assets/logo.jpeg" alt="GreenPath" />
        </a>

        <div class="nav-links">
          <a routerLink="/products" routerLinkActive="active">Produits</a>
          <a *ngIf="auth.isAdmin()" routerLink="/admin/users" routerLinkActive="active">Utilisateurs</a>
        </div>

        <div class="user-block" *ngIf="auth.currentUser() as user">
          <div class="user-info">
            <div class="user-name">{{ user.company_name }}</div>
            <div class="user-role">{{ roleLabel(user.role) }}</div>
          </div>
          <button type="button" class="btn-logout" (click)="logout()">Déconnexion</button>
        </div>
      </div>
    </nav>

    <router-outlet />
  `,
  styles: [
    `
      :host { display: block; min-height: 100vh; background: #f9fafb; }
      .navbar {
        background: white;
        border-bottom: 1px solid #e5e7eb;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }
      .nav-inner {
        max-width: 1080px;
        margin: 0 auto;
        padding: 12px 24px;
        display: flex;
        align-items: center;
        gap: 28px;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .brand {
        display: flex; align-items: center;
        text-decoration: none;
        flex-shrink: 0;
      }
      .brand img {
        height: 48px;
        width: auto;
        object-fit: contain;
        display: block;
        mix-blend-mode: multiply;
        filter: brightness(1.08) contrast(1.05);
      }
      .nav-links { display: flex; gap: 18px; flex: 1; }
      .nav-links a {
        color: #4b5563;
        text-decoration: none;
        font-size: 0.92rem;
        padding: 6px 0;
        border-bottom: 2px solid transparent;
      }
      .nav-links a:hover { color: #065f46; }
      .nav-links a.active { color: #065f46; border-bottom-color: #10b981; font-weight: 500; }
      .user-block { display: flex; align-items: center; gap: 14px; }
      .user-info { text-align: right; line-height: 1.2; }
      .user-name { font-size: 0.9rem; font-weight: 600; color: #1f2937; }
      .user-role { font-size: 0.75rem; color: #6b7280; }
      .btn-logout {
        background: #fee2e2; color: #991b1b;
        border: none; padding: 7px 12px;
        border-radius: 6px; cursor: pointer;
        font-family: inherit; font-size: 0.85rem; font-weight: 500;
      }
      .btn-logout:hover { background: #fecaca; }
    `,
  ],
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly currentUrl = signal<string>(this.router.url);
  readonly isPublicRoute = () => this.currentUrl().startsWith('/p/');

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => this.currentUrl.set((e as NavigationEnd).urlAfterRedirects));
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
  }

  logout(): void {
    this.auth.logout();
  }
}
