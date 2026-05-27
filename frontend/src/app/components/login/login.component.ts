import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

/**
 * Page de connexion. Protégée par `guestGuard` : redirige automatiquement
 * vers `/products` si l'utilisateur est déjà authentifié.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <img src="/assets/logo.jpeg" alt="GreenPath" class="logo" />
        <p class="subtitle">Connectez-vous à votre espace</p>

        <label class="field">
          <span>Email</span>
          <input type="email" formControlName="email" autocomplete="email" placeholder="vous@entreprise.com" />
        </label>

        <label class="field">
          <span>Mot de passe</span>
          <input type="password" formControlName="password" autocomplete="current-password" placeholder="••••••••" />
        </label>

        <div *ngIf="error" class="error">{{ error }}</div>

        <button type="submit" class="btn-submit" [disabled]="submitting">
          {{ submitting ? 'Connexion...' : 'Se connecter' }}
        </button>

        <p class="hint">
          Compte admin par défaut : <code>admin&#64;greenpath.com</code> / <code>admin123</code>
        </p>
      </form>
    </div>
  `,
  styles: [
    `
      .page {
        min-height: 100vh;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #ecfdf5, #d1fae5);
        font-family: system-ui, -apple-system, sans-serif;
        padding: 20px;
      }
      .card {
        background: white;
        padding: 36px 32px;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        width: 100%; max-width: 380px;
        display: flex; flex-direction: column; gap: 14px;
      }
      .logo {
        display: block;
        height: 110px;
        width: auto;
        max-width: 100%;
        object-fit: contain;
        margin: -10px auto 0;
        mix-blend-mode: multiply;
        filter: brightness(1.08) contrast(1.05);
      }
      .subtitle { margin: -4px 0 14px; color: #6b7280; text-align: center; font-size: 0.95rem; }
      .field { display: flex; flex-direction: column; gap: 5px; }
      .field > span { font-size: 0.85rem; font-weight: 500; color: #374151; }
      .field input {
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        font-family: inherit;
      }
      .field input:focus { outline: 2px solid #10b981; outline-offset: -1px; border-color: #10b981; }
      .error {
        background: #fee2e2; color: #991b1b;
        padding: 10px 12px; border-radius: 6px;
        font-size: 0.85rem;
      }
      .btn-submit {
        background: #10b981; color: white; border: none;
        padding: 11px 16px; border-radius: 8px;
        font-size: 0.95rem; font-weight: 600;
        cursor: pointer; font-family: inherit;
        margin-top: 6px;
      }
      .btn-submit:hover:not(:disabled) { background: #059669; }
      .btn-submit:disabled { background: #9ca3af; cursor: not-allowed; }
      .hint {
        margin: 6px 0 0;
        font-size: 0.8rem; color: #6b7280; text-align: center;
      }
      .hint code {
        background: #f3f4f6;
        padding: 1px 5px; border-radius: 3px;
        font-size: 0.78rem;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  submitting = false;
  error: string | null = null;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    this.error = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.submitting = true;
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.detail || 'Erreur de connexion';
      },
    });
  }
}
