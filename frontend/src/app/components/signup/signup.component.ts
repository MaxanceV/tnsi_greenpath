import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

/**
 * Auto-inscription d'un consommateur. Le rôle `consommateur` est imposé
 * côté backend pour éviter qu'on s'inscrive comme admin via le formulaire.
 *
 * Après inscription réussie, l'utilisateur est connecté automatiquement
 * (le backend renvoie un token) et redirigé vers `redirectTo` (query param)
 * ou son dashboard `/my-consumption`.
 */
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <a routerLink="/" class="back-home">← Retour au site</a>
      <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <img src="/assets/logo.jpeg" alt="GreenPath" class="logo" />
        <h2 class="title">Créer un compte consommateur</h2>
        <p class="subtitle">Suivez l'empreinte carbone des produits que vous scannez.</p>

        <label class="field">
          <span>Votre nom</span>
          <input type="text" formControlName="company_name" autocomplete="name" placeholder="Léa Dupont" [class.invalid]="showError(form.get('company_name'))" />
          <small class="field-error" *ngIf="showError(form.get('company_name'))">Indiquez votre nom.</small>
        </label>

        <label class="field">
          <span>Email</span>
          <input type="email" formControlName="email" autocomplete="email" placeholder="vous@exemple.com" [class.invalid]="showError(form.get('email'))" />
          <small class="field-error" *ngIf="showError(form.get('email')) && form.get('email')?.hasError('required')">L'email est requis.</small>
          <small class="field-error" *ngIf="showError(form.get('email')) && form.get('email')?.hasError('email')">Format invalide.</small>
        </label>

        <label class="field">
          <span>Mot de passe (6 caractères min.)</span>
          <input type="password" formControlName="password" autocomplete="new-password" placeholder="••••••••" [class.invalid]="showError(form.get('password'))" />
          <small class="field-error" *ngIf="showError(form.get('password')) && form.get('password')?.hasError('required')">Requis.</small>
          <small class="field-error" *ngIf="showError(form.get('password')) && form.get('password')?.hasError('minlength')">Minimum 6 caractères.</small>
        </label>

        <div *ngIf="error" class="error" role="alert">{{ error }}</div>

        <button type="submit" class="btn-submit" [disabled]="submitting">
          {{ submitting ? 'Création...' : 'Créer mon compte' }}
        </button>

        <p class="hint">
          Déjà inscrit ? <a [routerLink]="['/login']" [queryParams]="redirectTo ? { redirectTo } : null">Se connecter</a>
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
        position: relative;
      }
      .back-home {
        position: absolute;
        top: 20px; left: 20px;
        display: inline-flex; align-items: center;
        background: white; color: #065f46;
        border: 1px solid #a7f3d0;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 0.85rem; font-weight: 600;
        text-decoration: none;
        box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        transition: background 0.15s;
      }
      .back-home:hover { background: #ecfdf5; }
      .card {
        background: white;
        padding: 32px 28px;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        width: 100%; max-width: 400px;
        display: flex; flex-direction: column; gap: 12px;
      }
      .logo { display: block; height: 90px; margin: 0 auto; mix-blend-mode: multiply; filter: brightness(1.08) contrast(1.05); }
      .title { margin: 0; text-align: center; color: #0f5132; font-size: 1.25rem; }
      .subtitle { margin: -4px 0 8px; color: #6b7280; text-align: center; font-size: 0.88rem; }
      .field { display: flex; flex-direction: column; gap: 4px; }
      .field > span { font-size: 0.85rem; font-weight: 500; color: #374151; }
      .field input {
        padding: 9px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        font-family: inherit;
      }
      .field input:focus { outline: 2px solid #10b981; outline-offset: -1px; border-color: #10b981; }
      .field input.invalid { border-color: #dc2626; background: #fef2f2; }
      .field-error { color: #b91c1c; font-size: 0.76rem; }
      .error {
        background: #fee2e2; color: #991b1b;
        padding: 9px 12px; border-radius: 6px;
        font-size: 0.85rem;
        border: 1px solid #fecaca;
        font-weight: 500;
      }
      .btn-submit {
        background: #10b981; color: white; border: none;
        padding: 11px 16px; border-radius: 8px;
        font-size: 0.95rem; font-weight: 600;
        cursor: pointer; font-family: inherit;
        margin-top: 4px;
      }
      .btn-submit:hover:not(:disabled) { background: #059669; }
      .btn-submit:disabled { background: #9ca3af; cursor: not-allowed; }
      .hint { margin: 4px 0 0; font-size: 0.85rem; color: #6b7280; text-align: center; }
      .hint a { color: #065f46; font-weight: 600; text-decoration: none; }
      .hint a:hover { text-decoration: underline; }
    `,
  ],
})
export class SignupComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  submitting = false;
  error: string | null = null;
  redirectTo: string | null = null;

  readonly form = this.fb.group({
    company_name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    this.redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
  }

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
    const raw = this.form.getRawValue();
    this.submitting = true;
    this.auth
      .register({
        email: raw.email!,
        password: raw.password!,
        company_name: raw.company_name!,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigateByUrl(this.redirectTo || '/my-consumption');
        },
        error: (err) => {
          this.submitting = false;
          if (err?.status === 409) {
            this.error = 'Cet email est déjà utilisé.';
          } else if (err?.status === 0) {
            this.error = "Impossible de joindre le serveur.";
          } else {
            this.error = err?.error?.detail || "Erreur lors de l'inscription.";
          }
        },
      });
  }
}
