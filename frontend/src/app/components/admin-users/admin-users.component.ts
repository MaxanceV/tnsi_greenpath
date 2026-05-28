import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ROLE_LABELS, User, UserRole } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

/**
 * Page d'administration des utilisateurs. Accessible uniquement aux
 * comptes `admin` (cf. `adminGuard` sur la route).
 *
 * Liste tous les comptes (admin et entreprise) avec leurs métadonnées,
 * et expose une modale unifiée pour la création et l'édition. La
 * suppression et le changement de rôle respectent les garde-fous métier
 * du backend (impossible de se supprimer / se rétrograder soi-même).
 */
@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <header class="page-header">
        <div>
          <h1>Gestion des utilisateurs</h1>
          <p class="subtitle">Créer, modifier et supprimer les comptes administrateurs, entreprises et consommateurs.</p>
        </div>
        <button type="button" class="btn btn-primary" (click)="openCreate()">+ Nouvel utilisateur</button>
      </header>

      <p *ngIf="loading()" class="muted">Chargement...</p>

      <table *ngIf="!loading()" class="users-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Nom / Entreprise</th>
            <th>Rôle</th>
            <th>Produits</th>
            <th>Créé le</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of users()">
            <td class="email">{{ u.email }}</td>
            <td>{{ u.company_name }}</td>
            <td>
              <span class="role-badge" [class.role-admin]="u.role === 'admin'">
                {{ roleLabel(u.role) }}
              </span>
            </td>
            <td class="numeric">{{ u.product_count }}</td>
            <td class="date">{{ u.created_at | date:'dd/MM/yyyy' }}</td>
            <td class="actions">
              <button type="button" class="btn btn-secondary btn-sm" (click)="openEdit(u)">Modifier</button>
              <button type="button" class="btn btn-danger btn-sm" (click)="remove(u)" [disabled]="u.id === currentUserId">Supprimer</button>
            </td>
          </tr>
          <tr *ngIf="users().length === 0">
            <td colspan="6" class="muted center">Aucun utilisateur.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div *ngIf="formMode() !== null" class="modal-backdrop" (click)="closeForm()">
      <form class="modal" [formGroup]="form" (ngSubmit)="submit()" (click)="$event.stopPropagation()" novalidate>
        <header class="modal-header">
          <h2>{{ formMode() === 'create' ? 'Nouvel utilisateur' : 'Modifier ' + editingUser?.email }}</h2>
          <button type="button" class="btn-close" (click)="closeForm()" aria-label="Fermer">✕</button>
        </header>

        <div class="modal-body">
          <label class="field" *ngIf="formMode() === 'create'">
            <span>Email *</span>
            <input type="email" formControlName="email" autocomplete="off" />
          </label>

          <label class="field">
            <span>{{ nameLabel() }} *</span>
            <input type="text" formControlName="company_name" />
          </label>

          <label class="field">
            <span>Rôle *</span>
            <select formControlName="role">
              <option value="entreprise">Entreprise</option>
              <option value="consommateur">Consommateur</option>
              <option value="admin">Super Admin</option>
            </select>
          </label>

          <label class="field">
            <span>{{ formMode() === 'create' ? 'Mot de passe *' : 'Nouveau mot de passe (laisser vide pour ne pas changer)' }}</span>
            <input type="password" formControlName="password" autocomplete="new-password" />
          </label>

          <div *ngIf="formError" class="error">{{ formError }}</div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="closeForm()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="submitting">
            {{ submitting ? 'Enregistrement...' : (formMode() === 'create' ? 'Créer' : 'Enregistrer') }}
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: [
    `
      .container { max-width: 1080px; margin: 0 auto; padding: 24px; font-family: system-ui, -apple-system, sans-serif; color: #1f2937; }
      .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; }
      .page-header h1 { margin: 0; color: #0f5132; font-size: 1.8rem; }
      .subtitle { margin: 4px 0 0; color: #6b7280; font-size: 0.95rem; }
      .muted { color: #6b7280; }
      .center { text-align: center; }

      .users-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
      }
      .users-table th {
        background: #f9fafb;
        padding: 11px 14px;
        text-align: left;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #6b7280;
        font-weight: 600;
        border-bottom: 1px solid #e5e7eb;
      }
      .users-table td {
        padding: 12px 14px;
        font-size: 0.9rem;
        border-bottom: 1px solid #f3f4f6;
      }
      .users-table tr:last-child td { border-bottom: none; }
      .email { font-weight: 500; }
      .numeric { font-variant-numeric: tabular-nums; }
      .date { color: #6b7280; }
      .actions { text-align: right; white-space: nowrap; }
      .role-badge {
        background: #dbeafe; color: #1e40af;
        padding: 2px 10px; border-radius: 999px;
        font-size: 0.78rem; font-weight: 600;
      }
      .role-badge.role-admin {
        background: #fef3c7; color: #92400e;
      }

      .btn { padding: 7px 12px; border-radius: 6px; border: none; cursor: pointer; font-size: 0.88rem; font-weight: 500; font-family: inherit; }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn-sm { padding: 5px 10px; font-size: 0.82rem; }
      .btn-primary { background: #10b981; color: white; }
      .btn-primary:hover:not(:disabled) { background: #059669; }
      .btn-secondary { background: #e5e7eb; color: #1f2937; }
      .btn-secondary:hover:not(:disabled) { background: #d1d5db; }
      .btn-danger { background: #fee2e2; color: #991b1b; }
      .btn-danger:hover:not(:disabled) { background: #fecaca; }

      .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
      .modal { background: white; border-radius: 10px; max-width: 480px; width: 100%; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25); }
      .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid #e5e7eb; }
      .modal-header h2 { margin: 0; color: #0f5132; font-size: 1.15rem; }
      .btn-close { background: transparent; border: none; cursor: pointer; font-size: 1.1rem; color: #6b7280; width: 32px; height: 32px; border-radius: 6px; }
      .btn-close:hover { background: #f3f4f6; color: #1f2937; }
      .modal-body { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
      .field { display: flex; flex-direction: column; gap: 5px; }
      .field > span { font-size: 0.85rem; font-weight: 500; color: #374151; }
      .field input, .field select {
        padding: 8px 10px; border: 1px solid #d1d5db;
        border-radius: 6px; font-size: 0.9rem;
        font-family: inherit; background: white;
      }
      .field input:focus, .field select:focus { outline: 2px solid #10b981; outline-offset: -1px; border-color: #10b981; }
      .error { background: #fee2e2; color: #991b1b; padding: 10px 12px; border-radius: 6px; font-size: 0.85rem; }
      .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid #e5e7eb; }
    `,
  ],
})
export class AdminUsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly users = signal<User[]>([]);
  readonly loading = signal<boolean>(false);
  readonly formMode = signal<'create' | 'edit' | null>(null);

  editingUser: User | null = null;
  submitting = false;
  formError: string | null = null;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    company_name: ['', [Validators.required, Validators.maxLength(120)]],
    role: ['entreprise' as UserRole, [Validators.required]],
    password: ['', [Validators.minLength(6)]],
  });

  get currentUserId(): number | undefined {
    return this.auth.currentUser()?.id;
  }

  ngOnInit(): void {
    this.fetch();
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role as UserRole] ?? role;
  }

  /** Libellé du champ "nom" qui s'adapte au rôle sélectionné dans le form. */
  nameLabel(): string {
    const role = this.form.get('role')?.value;
    return role === 'consommateur' ? 'Nom complet' : "Nom de l'entreprise";
  }

  private fetch(): void {
    this.loading.set(true);
    this.userService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingUser = null;
    this.formError = null;
    this.form.reset({ email: '', company_name: '', role: 'entreprise', password: '' });
    this.form.get('email')?.enable();
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.formMode.set('create');
  }

  openEdit(user: User): void {
    this.editingUser = user;
    this.formError = null;
    this.form.reset({
      email: user.email,
      company_name: user.company_name,
      role: user.role,
      password: '',
    });
    this.form.get('email')?.disable();
    this.form.get('password')?.setValidators([Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.formMode.set('edit');
  }

  closeForm(): void {
    this.formMode.set(null);
    this.editingUser = null;
  }

  submit(): void {
    this.formError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const raw = this.form.getRawValue();

    if (this.formMode() === 'create') {
      this.userService
        .create({
          email: raw.email!,
          company_name: raw.company_name!,
          role: raw.role as UserRole,
          password: raw.password!,
        })
        .subscribe({
          next: () => {
            this.submitting = false;
            this.closeForm();
            this.fetch();
          },
          error: (err) => this.handleError(err),
        });
    } else if (this.editingUser) {
      const payload: any = {
        company_name: raw.company_name,
        role: raw.role,
      };
      if (raw.password) payload.password = raw.password;
      this.userService.update(this.editingUser.id, payload).subscribe({
        next: () => {
          this.submitting = false;
          this.closeForm();
          this.fetch();
        },
        error: (err) => this.handleError(err),
      });
    }
  }

  private handleError(err: any): void {
    this.submitting = false;
    const detail = err?.error?.detail;
    if (Array.isArray(detail)) {
      this.formError = detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(' | ');
    } else if (typeof detail === 'string') {
      this.formError = detail;
    } else {
      this.formError = 'Erreur';
    }
  }

  remove(user: User): void {
    if (user.id === this.currentUserId) return;
    if (!confirm(`Supprimer "${user.email}" ?`)) return;
    this.userService.delete(user.id).subscribe({
      next: () => this.fetch(),
    });
  }
}
