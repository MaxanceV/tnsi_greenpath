import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

/**
 * Page de connexion. Protégée par `guestGuard` : redirige automatiquement
 * vers `/products` si l'utilisateur est déjà authentifié.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <img src="/assets/logo.jpeg" alt="GreenPath" class="logo" />
        <p class="subtitle">Connectez-vous à votre espace</p>

        <label class="field">
          <span>Email</span>
          <input
            type="email"
            formControlName="email"
            autocomplete="email"
            placeholder="vous@entreprise.com"
            [class.invalid]="showError(form.get('email'))"
          />
          <small class="field-error" *ngIf="showError(form.get('email')) && form.get('email')?.hasError('required')">
            L'email est requis.
          </small>
          <small class="field-error" *ngIf="showError(form.get('email')) && form.get('email')?.hasError('email')">
            Format d'email invalide.
          </small>
        </label>

        <label class="field">
          <span>Mot de passe</span>
          <input
            type="password"
            formControlName="password"
            autocomplete="current-password"
            placeholder="••••••••"
            [class.invalid]="showError(form.get('password'))"
          />
          <small class="field-error" *ngIf="showError(form.get('password')) && form.get('password')?.hasError('required')">
            Le mot de passe est requis.
          </small>
        </label>

        <div *ngIf="error" class="error" role="alert">{{ error }}</div>

        <button type="submit" class="btn-submit" [disabled]="submitting">
          {{ submitting ? 'Connexion...' : 'Se connecter' }}
        </button>

        <p class="hint">
          Pas encore de compte ?
          <a [routerLink]="['/signup']" [queryParams]="redirectTo ? { redirectTo } : null">Créer un compte consommateur</a>
        </p>
        <p class="hint-mini">
          Compte admin démo : <code>admin&#64;greenpath.com</code> / <code>admin123</code>
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
      .field input.invalid {
        border-color: #dc2626;
        background: #fef2f2;
      }
      .field input.invalid:focus { outline-color: #dc2626; border-color: #dc2626; }
      .field-error {
        color: #b91c1c;
        font-size: 0.78rem;
        margin-top: 2px;
      }
      .error {
        background: #fee2e2; color: #991b1b;
        padding: 10px 12px; border-radius: 6px;
        font-size: 0.85rem;
        border: 1px solid #fecaca;
        font-weight: 500;
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
        margin: 8px 0 0;
        font-size: 0.88rem; color: #4b5563; text-align: center;
      }
      .hint a { color: #065f46; font-weight: 600; text-decoration: none; }
      .hint a:hover { text-decoration: underline; }
      .hint-mini {
        margin: 4px 0 0;
        font-size: 0.75rem; color: #9ca3af; text-align: center;
      }
      .hint-mini code {
        background: #f3f4f6;
        padding: 1px 5px; border-radius: 3px;
        font-size: 0.72rem;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  submitting = false;
  error: string | null = null;
  redirectTo: string | null = null;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    this.redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
  }

  /** Renvoie true si on doit afficher l'erreur du champ (touché ou soumis). */
  showError(ctrl: AbstractControl | null): boolean {
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  submit(): void {
    this.error = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Veuillez corriger les champs avant de continuer.';
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.submitting = true;
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigateByUrl(this.redirectTo || this.auth.defaultRoute());
      },
      error: (err) => {
        this.submitting = false;
        this.error = this.parseError(err);
      },
    });
  }

  /**
   * Convertit n'importe quelle erreur HTTP en message lisible. Priorité :
   * 1. status 401 → "Email ou mot de passe incorrect" (override pour clarté)
   * 2. status 0   → "Serveur injoignable" (back éteint, CORS, etc.)
   * 3. err.error.detail (string) renvoyé par FastAPI
   * 4. message générique de secours
   */
  private parseError(err: any): string {
    if (err?.status === 401) {
      return 'Email ou mot de passe incorrect.';
    }
    if (err?.status === 0) {
      return "Impossible de joindre le serveur. Vérifiez qu'il est démarré.";
    }
    const detail = err?.error?.detail;
    if (typeof detail === 'string' && detail.length > 0) {
      return detail;
    }
    return 'Erreur lors de la connexion. Réessayez.';
  }
}
