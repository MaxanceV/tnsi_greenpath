import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { API_BASE_URL } from '../../config/api.config';
import { Batch, BatchPayload, ContributorRead } from '../../models/batch.model';
import { Product } from '../../models/product.model';
import { AuthService } from '../../services/auth.service';
import { BatchService } from '../../services/batch.service';
import { ProductService } from '../../services/product.service';
import { ProductTimelineComponent } from '../product-timeline/product-timeline.component';

type Tab = 'info' | 'steps' | 'batches' | 'contributors';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProductTimelineComponent],
  template: `
    <div *ngIf="loading()" class="page-loading">
      <div class="spinner"></div>
      <p>Chargement du produit…</p>
    </div>

    <div *ngIf="error() && !loading()" class="page-error">
      <p>{{ error() }}</p>
      <a routerLink="/products" class="btn btn-secondary">← Retour aux produits</a>
    </div>

    <div *ngIf="!loading() && !error() && product() as p" class="detail-page">

      <div class="detail-header">
        <a routerLink="/products" class="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Produits
        </a>
        <div class="header-main">
          <div>
            <h1>{{ p.name }}</h1>
            <div class="header-meta">
              <span *ngIf="p.owner" class="meta-company">{{ p.owner.company_name }}</span>
              <span class="meta-dot" *ngIf="p.owner">·</span>
              <span class="meta-co2">{{ p.total_co2_kg | number:'1.0-2' }} kg CO₂</span>
              <span class="badge-valid" *ngIf="p.chain_valid">✓ Blockchain valide</span>
              <span class="badge-invalid" *ngIf="p.chain_valid === false">⚠ Hash invalide</span>
            </div>
          </div>
          <div class="header-actions">
            <a [routerLink]="['/products', p.id, 'edit']" class="btn btn-secondary">Modifier</a>
            <a [href]="qrcodeUrl()" target="_blank" class="btn btn-outline">QR Code</a>
          </div>
        </div>
      </div>

      <div class="tab-bar">
        <button type="button" [class.active]="activeTab() === 'info'" (click)="setTab('info')">Informations</button>
        <button type="button" [class.active]="activeTab() === 'steps'" (click)="setTab('steps')">
          Étapes <span class="tab-count">{{ p.steps.length }}</span>
        </button>
        <button type="button" [class.active]="activeTab() === 'batches'" (click)="setTab('batches')">
          Lots <span class="tab-count">{{ batches().length }}</span>
        </button>
        <button *ngIf="canManageContributors()" type="button" [class.active]="activeTab() === 'contributors'" (click)="setTab('contributors')">
          Contributeurs <span class="tab-count">{{ contributors().length }}</span>
        </button>
      </div>

      <!-- Onglet : Informations -->
      <div *ngIf="activeTab() === 'info'" class="tab-content">
        <div class="info-grid">
          <div class="info-card">
            <h3>Identifiants</h3>
            <dl>
              <dt>ID interne</dt><dd>#{{ p.id }}</dd>
              <dt>GTIN-14</dt><dd class="mono">{{ p.gtin ?? '—' }}</dd>
              <dt>Créé le</dt><dd>{{ p.created_at | date:'dd/MM/yyyy' }}</dd>
              <dt *ngIf="p.owner">Entreprise</dt><dd *ngIf="p.owner">{{ p.owner.company_name }}</dd>
            </dl>
          </div>
          <div class="info-card" *ngIf="p.description">
            <h3>Description</h3>
            <p class="desc-text">{{ p.description }}</p>
          </div>
          <div class="info-card">
            <h3>Empreinte carbone</h3>
            <div class="co2-big">{{ p.total_co2_kg | number:'1.0-2' }} <span>kg CO₂</span></div>
            <div class="step-breakdown">
              <div *ngFor="let s of p.steps" class="step-co2-row">
                <span class="step-name">{{ s.name }}</span>
                <span class="step-co2-val">{{ s.co2_kg | number:'1.0-2' }} kg</span>
              </div>
            </div>
          </div>
          <div class="info-card">
            <h3>Blockchain SHA-256</h3>
            <div class="chain-status" [class.valid]="p.chain_valid" [class.invalid]="p.chain_valid === false">
              <span *ngIf="p.chain_valid">✓ Chaîne de hashes intègre</span>
              <span *ngIf="p.chain_valid === false">⚠ Hash incohérent détecté</span>
              <span *ngIf="p.chain_valid == null">— Non calculé</span>
            </div>
            <p class="chain-desc">Chaque étape est hashée en SHA-256 et enchanîée à la précédente. Toute modification est détectable.</p>
            <a [href]="qrcodeUrl()" target="_blank" class="btn btn-outline" style="margin-top:12px;display:inline-block;">
              Télécharger le QR code
            </a>
          </div>
        </div>
      </div>

      <!-- Onglet : Etapes (DAG) -->
      <div *ngIf="activeTab() === 'steps'" class="tab-content">
        <div class="tab-toolbar">
          <p class="tab-desc">Graphe acyclique dirigé (DAG) des étapes de la supply chain.</p>
          <a [routerLink]="['/products', p.id, 'edit']" class="btn btn-secondary">Modifier les étapes</a>
        </div>
        <app-product-timeline [steps]="p.steps" />
      </div>

      <!-- Onglet : Lots -->
      <div *ngIf="activeTab() === 'batches'" class="tab-content">
        <div class="tab-toolbar">
          <p class="tab-desc">Lots de production associés à ce produit (GS1 Batch / SSCC).</p>
          <button type="button" class="btn btn-primary" (click)="openBatchForm()" *ngIf="!showBatchForm">+ Nouveau lot</button>
        </div>

        <div *ngIf="showBatchForm" class="inline-form">
          <h3>Nouveau lot</h3>
          <div class="form-grid">
            <div class="field">
              <label>N° de lot *</label>
              <input type="text" [(ngModel)]="batchForm.lot_number" placeholder="ex : LOT-2024-001" />
            </div>
            <div class="field">
              <label>Quantité</label>
              <input type="number" [(ngModel)]="batchForm.quantity" placeholder="100" min="0" />
            </div>
            <div class="field">
              <label>Unité</label>
              <input type="text" [(ngModel)]="batchForm.unit" placeholder="kg, L, pièces…" />
            </div>
            <div class="field">
              <label>Date début</label>
              <input type="date" [(ngModel)]="batchForm.start_date" />
            </div>
            <div class="field">
              <label>Date fin</label>
              <input type="date" [(ngModel)]="batchForm.end_date" />
            </div>
            <div class="field full">
              <label>Notes</label>
              <input type="text" [(ngModel)]="batchForm.notes" placeholder="Informations complémentaires…" />
            </div>
          </div>
          <p *ngIf="batchError" class="form-error">{{ batchError }}</p>
          <div class="form-actions">
            <button type="button" class="btn btn-primary" (click)="saveBatch()" [disabled]="batchSaving">
              {{ batchSaving ? 'Enregistrement…' : 'Créer le lot' }}
            </button>
            <button type="button" class="btn btn-secondary" (click)="cancelBatchForm()">Annuler</button>
          </div>
        </div>

        <div *ngIf="batchesLoading()" class="loading-inline">Chargement des lots…</div>

        <div *ngIf="!batchesLoading() && batches().length === 0 && !showBatchForm" class="empty-state">
          <p>Aucun lot pour ce produit.</p>
          <button type="button" class="btn btn-primary" (click)="openBatchForm()">Créer le premier lot</button>
        </div>

        <table *ngIf="!batchesLoading() && batches().length > 0" class="data-table">
          <thead>
            <tr>
              <th>N° de lot</th>
              <th>SSCC</th>
              <th>Quantité</th>
              <th>Période</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let b of batches()">
              <td class="mono fw600">{{ b.lot_number }}</td>
              <td class="mono muted">{{ b.sscc ?? '—' }}</td>
              <td>{{ b.quantity ? (b.quantity + ' ' + (b.unit ?? '')) : '—' }}</td>
              <td>
                <ng-container *ngIf="b.start_date || b.end_date">
                  {{ b.start_date ? (b.start_date | date:'dd/MM/yy') : '?' }}
                  → {{ b.end_date ? (b.end_date | date:'dd/MM/yy') : '?' }}
                </ng-container>
                <span *ngIf="!b.start_date && !b.end_date" class="muted">—</span>
              </td>
              <td class="muted">{{ b.notes ?? '—' }}</td>
              <td>
                <button type="button" class="btn-icon btn-icon-danger" (click)="deleteBatch(b.id)" title="Supprimer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"></path><path d="M10 11v6M14 11v6"></path></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Onglet : Contributeurs -->
      <div *ngIf="activeTab() === 'contributors' && canManageContributors()" class="tab-content">
        <div class="tab-toolbar">
          <p class="tab-desc">Entreprises tierces ayant accès à ce produit pour saisir leurs étapes.</p>
          <button type="button" class="btn btn-primary" (click)="openContribForm()" *ngIf="!showContribForm">+ Inviter une entreprise</button>
        </div>

        <div *ngIf="showContribForm" class="inline-form">
          <h3>Inviter un contributeur</h3>
          <div class="form-grid">
            <div class="field full">
              <label>Email de l'entreprise *</label>
              <input type="email" [(ngModel)]="contribEmail" placeholder="entreprise&#64;exemple.com" />
            </div>
            <div class="field">
              <label>Niveau d'accès</label>
              <select [(ngModel)]="contribScope">
                <option value="write">Écriture (saisie d'étapes)</option>
                <option value="read">Lecture seule</option>
              </select>
            </div>
          </div>
          <p *ngIf="contribError" class="form-error">{{ contribError }}</p>
          <div class="form-actions">
            <button type="button" class="btn btn-primary" (click)="addContributor()" [disabled]="contribSaving">
              {{ contribSaving ? 'Envoi…' : 'Inviter' }}
            </button>
            <button type="button" class="btn btn-secondary" (click)="cancelContribForm()">Annuler</button>
          </div>
        </div>

        <div *ngIf="contributorsLoading()" class="loading-inline">Chargement…</div>

        <div *ngIf="!contributorsLoading() && contributors().length === 0 && !showContribForm" class="empty-state">
          <p>Aucun contributeur sur ce produit.</p>
          <p class="empty-sub">Invitez une entreprise partenaire pour qu'elle saisisse ses propres étapes de supply chain.</p>
        </div>

        <table *ngIf="!contributorsLoading() && contributors().length > 0" class="data-table">
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Email</th>
              <th>Accès</th>
              <th>Invité par</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of contributors()">
              <td><strong>{{ c.company_name }}</strong></td>
              <td class="muted">{{ c.email }}</td>
              <td><span class="scope-badge" [class.scope-write]="c.scope === 'write'">{{ c.scope === 'write' ? 'Écriture' : 'Lecture' }}</span></td>
              <td class="muted">{{ c.granted_by_name ?? '—' }}</td>
              <td class="muted">{{ c.granted_at | date:'dd/MM/yyyy' }}</td>
              <td>
                <button type="button" class="btn-icon btn-icon-danger" (click)="removeContributor(c.user_id)" title="Retirer l'accès">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"></path></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; font-family: system-ui, -apple-system, sans-serif; }
    .page-loading, .page-error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; color: #6b7280; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top-color: #2da844; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .detail-page { max-width: 1080px; margin: 0 auto; padding: 24px; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; color: #6b7280; text-decoration: none; font-size: 0.875rem; margin-bottom: 12px; }
    .back-link:hover { color: #2da844; }
    .header-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    h1 { font-size: 1.75rem; font-weight: 700; color: #111827; margin: 0 0 6px; }
    .header-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.9rem; }
    .meta-company { color: #374151; font-weight: 500; }
    .meta-dot { color: #d1d5db; }
    .meta-co2 { color: #2da844; font-weight: 600; }
    .badge-valid { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 99px; font-size: 0.78rem; font-weight: 600; }
    .badge-invalid { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 99px; font-size: 0.78rem; font-weight: 600; }
    .header-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .tab-bar { display: flex; border-bottom: 2px solid #e5e7eb; margin: 24px 0 0; }
    .tab-bar button { background: none; border: none; padding: 10px 20px; font-size: 0.9rem; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; display: flex; align-items: center; gap: 6px; font-family: inherit; transition: color 0.15s; }
    .tab-bar button:hover { color: #2da844; }
    .tab-bar button.active { color: #2da844; border-bottom-color: #2da844; font-weight: 600; }
    .tab-count { background: #f3f4f6; color: #6b7280; font-size: 0.75rem; padding: 1px 7px; border-radius: 99px; }
    .tab-bar button.active .tab-count { background: #d1fae5; color: #065f46; }
    .tab-content { padding: 24px 0; }
    .tab-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    .tab-desc { color: #6b7280; font-size: 0.9rem; margin: 0; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    .info-card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; }
    .info-card h3 { font-size: 0.8rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 14px; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 0; }
    dt { color: #6b7280; font-size: 0.875rem; }
    dd { color: #111827; font-size: 0.875rem; font-weight: 500; margin: 0; }
    .mono { font-family: monospace; font-size: 0.82rem; }
    .fw600 { font-weight: 600; }
    .muted { color: #9ca3af; }
    .desc-text { color: #374151; line-height: 1.6; margin: 0; }
    .co2-big { font-size: 2rem; font-weight: 700; color: #2da844; margin-bottom: 12px; }
    .co2-big span { font-size: 1rem; font-weight: 400; color: #6b7280; }
    .step-breakdown { display: flex; flex-direction: column; gap: 4px; }
    .step-co2-row { display: flex; justify-content: space-between; font-size: 0.85rem; }
    .step-name { color: #374151; }
    .step-co2-val { color: #2da844; font-weight: 600; }
    .chain-status { font-size: 0.95rem; font-weight: 600; margin-bottom: 8px; color: #6b7280; }
    .chain-status.valid { color: #065f46; }
    .chain-status.invalid { color: #991b1b; }
    .chain-desc { font-size: 0.85rem; color: #6b7280; line-height: 1.5; margin: 0; }
    .inline-form { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
    .inline-form h3 { font-size: 1rem; font-weight: 600; color: #111827; margin: 0 0 16px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 14px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field.full { grid-column: 1 / -1; }
    .field label { font-size: 0.83rem; font-weight: 500; color: #374151; }
    .field input, .field select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; font-family: inherit; color: #111827; }
    .field input:focus, .field select:focus { outline: none; border-color: #2da844; box-shadow: 0 0 0 2px rgba(45,168,68,0.1); }
    .form-error { color: #dc2626; font-size: 0.875rem; margin: 0 0 10px; }
    .form-actions { display: flex; gap: 8px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .data-table th { text-align: left; padding: 10px 14px; background: #f9fafb; color: #6b7280; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e5e7eb; }
    .data-table td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: #f9fafb; }
    .scope-badge { padding: 2px 9px; border-radius: 99px; font-size: 0.78rem; font-weight: 600; background: #f3f4f6; color: #6b7280; }
    .scope-badge.scope-write { background: #d1fae5; color: #065f46; }
    .btn-icon { background: none; border: 1px solid transparent; border-radius: 6px; padding: 5px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .btn-icon-danger { color: #9ca3af; }
    .btn-icon-danger:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }
    .loading-inline { color: #9ca3af; font-size: 0.9rem; padding: 20px 0; text-align: center; }
    .empty-state { text-align: center; padding: 40px 0; }
    .empty-state p { color: #6b7280; margin: 0 0 8px; }
    .empty-state .empty-sub { font-size: 0.875rem; color: #9ca3af; }
    .empty-state .btn { margin-top: 12px; }
    .btn { display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 7px; font-size: 0.875rem; font-weight: 500; cursor: pointer; text-decoration: none; border: none; font-family: inherit; transition: all 0.15s; }
    .btn-primary { background: #2da844; color: white; }
    .btn-primary:hover:not(:disabled) { background: #1d8a30; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: #f3f4f6; color: #374151; }
    .btn-secondary:hover { background: #e5e7eb; }
    .btn-outline { background: white; color: #374151; border: 1px solid #d1d5db; }
    .btn-outline:hover { border-color: #2da844; color: #2da844; }
  `],
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  private readonly productService = inject(ProductService);
  private readonly batchService = inject(BatchService);

  productId = 0;
  readonly product = signal<Product | null>(null);
  readonly batches = signal<Batch[]>([]);
  readonly contributors = signal<ContributorRead[]>([]);
  readonly activeTab = signal<Tab>('info');
  readonly loading = signal(true);
  readonly batchesLoading = signal(false);
  readonly contributorsLoading = signal(false);
  readonly error = signal<string | null>(null);

  showBatchForm = false;
  batchForm: BatchPayload = { lot_number: '', product_id: 0, parent_batch_ids: [] };
  batchError = '';
  batchSaving = false;

  showContribForm = false;
  contribEmail = '';
  contribScope: 'read' | 'write' = 'write';
  contribError = '';
  contribSaving = false;

  private batchesLoaded = false;
  private contributorsLoaded = false;

  qrcodeUrl(): string {
    return API_BASE_URL + '/public/products/' + this.productId + '/qrcode';
  }

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.batchForm.product_id = this.productId;
    this.loadProduct();
  }

  loadProduct(): void {
    this.loading.set(true);
    this.error.set(null);
    this.productService.get(this.productId).subscribe({
      next: (p) => { this.product.set(p); this.loading.set(false); },
      error: () => { this.error.set('Produit introuvable ou accès refusé.'); this.loading.set(false); },
    });
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'batches' && !this.batchesLoaded) this.loadBatches();
    if (tab === 'contributors' && !this.contributorsLoaded) this.loadContributors();
  }

  loadBatches(): void {
    this.batchesLoading.set(true);
    this.batchService.listBatches(this.productId).subscribe({
      next: (b) => { this.batches.set(b); this.batchesLoading.set(false); this.batchesLoaded = true; },
      error: () => this.batchesLoading.set(false),
    });
  }

  loadContributors(): void {
    this.contributorsLoading.set(true);
    this.batchService.listContributors(this.productId).subscribe({
      next: (c) => { this.contributors.set(c); this.contributorsLoading.set(false); this.contributorsLoaded = true; },
      error: () => this.contributorsLoading.set(false),
    });
  }

  canManageContributors(): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    return this.product()?.owner?.id === user.id;
  }

  openBatchForm(): void { this.showBatchForm = true; this.batchError = ''; }
  cancelBatchForm(): void { this.showBatchForm = false; this.resetBatchForm(); }
  resetBatchForm(): void { this.batchForm = { lot_number: '', product_id: this.productId, parent_batch_ids: [] }; }

  saveBatch(): void {
    if (!this.batchForm.lot_number.trim()) { this.batchError = 'Le numéro de lot est obligatoire.'; return; }
    this.batchSaving = true;
    this.batchService.createBatch(this.batchForm).subscribe({
      next: (b) => {
        this.batches.update((prev) => [b, ...prev]);
        this.showBatchForm = false;
        this.resetBatchForm();
        this.batchSaving = false;
      },
      error: (err) => {
        this.batchError = err?.error?.detail ?? 'Erreur lors de la création.';
        this.batchSaving = false;
      },
    });
  }

  deleteBatch(id: number): void {
    if (!confirm('Supprimer ce lot ? Cette action est irréversible.')) return;
    this.batchService.deleteBatch(id).subscribe({
      next: () => this.batches.update((prev) => prev.filter((b) => b.id !== id)),
    });
  }

  openContribForm(): void { this.showContribForm = true; this.contribError = ''; }
  cancelContribForm(): void { this.showContribForm = false; this.contribEmail = ''; this.contribScope = 'write'; }

  addContributor(): void {
    if (!this.contribEmail.trim()) { this.contribError = 'Email obligatoire.'; return; }
    this.contribSaving = true;
    this.batchService.addContributor(this.productId, { user_email: this.contribEmail, scope: this.contribScope }).subscribe({
      next: (c) => {
        this.contributors.update((prev) => [...prev, c]);
        this.cancelContribForm();
        this.contribSaving = false;
      },
      error: (err) => {
        this.contribError = err?.error?.detail ?? "Erreur lors de l'invitation.";
        this.contribSaving = false;
      },
    });
  }

  removeContributor(userId: number): void {
    if (!confirm("Retirer l'accès de ce contributeur ?")) return;
    this.batchService.removeContributor(this.productId, userId).subscribe({
      next: () => this.contributors.update((prev) => prev.filter((c) => c.user_id !== userId)),
    });
  }
}
