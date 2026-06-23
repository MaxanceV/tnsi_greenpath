import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  Product,
  STEP_TYPE_LABELS,
  StepType,
  TRANSPORT_MODE_LABELS,
  TransportMode,
} from '../../models/product.model';
import { AuthService } from '../../services/auth.service';
import { ConsumptionService } from '../../services/consumption.service';
import { ProductService } from '../../services/product.service';
import { ProductTimelineComponent } from '../product-timeline/product-timeline.component';

/**
 * Page publique d'un produit — destinée au consommateur final qui scanne
 * un QR code GreenPath.
 *
 * Spécificités :
 * - Aucune authentification requise (route hors `authGuard`).
 * - L'`AppComponent` masque la navbar quand l'URL commence par `/p/`.
 * - Design mobile-first et narratif (hero, timeline) volontairement
 *   distinct du dashboard interne.
 * - État d'erreur dédié (produit inexistant ou supprimé) pour les QR
 *   codes périmés, avec affichage de la référence demandée.
 */
@Component({
  selector: 'app-public-product',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductTimelineComponent],
  template: `
    <div class="public-page">
      <header class="public-header">
        <div class="header-inner">
          <img src="/assets/logo.jpeg" alt="GreenPath" class="logo" />
        </div>
      </header>

      <main>
        <p *ngIf="loading()" class="state-msg">Chargement...</p>

        <section *ngIf="error() && !loading()" class="not-found">
          <div class="not-found-card">
            <div class="nf-icon" aria-hidden="true">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h1 class="nf-title">Produit introuvable</h1>
            <p class="nf-text">
              Ce QR code pointe vers un produit qui n'existe plus, ou qui n'a jamais été enregistré sur GreenPath.
            </p>
            <p class="nf-help">
              Si vous pensez qu'il s'agit d'une erreur, contactez l'entreprise qui vous a fourni ce produit.
            </p>
            <div class="nf-meta">
              <span class="nf-meta-key">Référence</span>
              <code class="nf-meta-val">{{ requestedId() ?? '—' }}</code>
            </div>
          </div>
          <p class="nf-footer-text">Traçabilité assurée par <strong>GreenPath</strong></p>
        </section>

        <ng-container *ngIf="product() as p">
          <section class="hero">
            <div class="hero-inner">
              <p class="brand-line" *ngIf="p.owner">Proposé par <strong>{{ p.owner.company_name }}</strong></p>
              <h1 class="product-name">{{ p.name }}</h1>
              <p class="product-desc" *ngIf="p.description">{{ p.description }}</p>
            </div>
          </section>

          <section class="action-section" *ngIf="canTrack() || !auth.isAuthenticated()">
            <div class="container">
              <div class="action-card" *ngIf="canTrack()">
                <div class="action-info">
                  <strong>Suivre ce produit dans votre bilan carbone</strong>
                  <span>Ajoutez-le à votre liste personnelle pour comparer avant d'acheter.</span>
                </div>
                <button type="button" class="btn-action" (click)="addToConsumption(p)" [disabled]="adding() || added()">
                  <span *ngIf="!added()">{{ adding() ? 'Ajout...' : '+ Ajouter à ma consommation' }}</span>
                  <span *ngIf="added()">✓ Ajouté à votre suivi</span>
                </button>
              </div>

              <div class="action-card guest-card" *ngIf="!auth.isAuthenticated()">
                <div class="action-info">
                  <strong>Suivez votre empreinte carbone</strong>
                  <span>Créez un compte gratuit pour ajouter ce produit à votre bilan personnel.</span>
                </div>
                <div class="action-buttons">
                  <a [routerLink]="['/login']" [queryParams]="{ redirectTo: currentPath }" class="btn-action btn-action-secondary">Se connecter</a>
                  <a [routerLink]="['/signup']" [queryParams]="{ redirectTo: currentPath }" class="btn-action">Créer un compte</a>
                </div>
              </div>
            </div>
          </section>

          <section class="co2-section">
            <div class="container">
              <div class="co2-card">
                <div class="co2-label">Empreinte carbone totale</div>
                <div class="co2-value">{{ p.total_co2_kg | number:'1.0-2' }}<span class="co2-unit">kg CO₂</span></div>
                <div class="co2-sub">calculée sur {{ p.steps.length }} étape(s) de la chaîne d'approvisionnement</div>
              </div>

              <div class="trust-row">
                <div class="trust-badge" [class.trust-badge-bad]="!p.chain_valid">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 12l2 2 4-4"></path>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  {{ p.chain_valid ? 'Traçabilité vérifiée' : 'Chaîne altérée' }}
                </div>
                <div class="trust-badge" *ngIf="p.owner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                  Producteur identifié
                </div>
              </div>
            </div>
          </section>

          <section class="journey">
            <div class="container">
              <h2>Le parcours de votre produit</h2>
              <p class="section-intro">Suivez chaque étape de fabrication, de la matière première jusqu'à la distribution.</p>

              <!-- Timeline avec support des étapes parallèles -->
              <app-product-timeline
                [steps]="p.steps"
                [totalCo2]="p.total_co2_kg ?? 0"
              ></app-product-timeline>

              <section class="chain-section">
                <h3>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -3px; margin-right: 6px;">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  Chaîne d'ancrage cryptographique
                </h3>
                <p class="chain-intro">
                  Chaque étape de ce produit est <strong>ancrée</strong> par un hash <code>SHA-256</code>
                  qui inclut le hash de l'étape précédente. Toute modification d'une seule étape briserait
                  tous les hashes suivants — c'est ce qui garantit l'intégrité de la traçabilité.
                </p>

                <ol class="chain-list">
                  <li *ngFor="let s of p.steps; let i = index" class="chain-item">
                    <span class="chain-num" [style.background]="colorFor(i)">{{ s.position }}</span>
                    <div class="chain-text">
                      <div class="chain-step-name">{{ s.name }}</div>
                      <code class="chain-hash">{{ s.hash }}</code>
                    </div>
                  </li>
                </ol>
              </section>
            </div>
          </section>

          <footer class="public-footer">
            <p>Traçabilité assurée par <strong>GreenPath</strong></p>
            <p class="small">Page consultée le {{ today | date:'dd/MM/yyyy à HH:mm' }}</p>
          </footer>
        </ng-container>
      </main>
    </div>
  `,
  styles: [
    `
      :host { display: block; background: #fafaf9; min-height: 100vh; }
      .public-page { font-family: system-ui, -apple-system, sans-serif; color: #1f2937; }

      .public-header {
        background: white;
        border-bottom: 1px solid #e5e7eb;
        padding: 14px 0;
      }
      .header-inner {
        max-width: 1080px; margin: 0 auto;
        padding: 0 20px;
        display: flex; align-items: center; justify-content: center;
      }
      .logo {
        height: 52px; width: auto;
        mix-blend-mode: multiply;
        filter: brightness(1.08) contrast(1.05);
      }

      .state-msg {
        text-align: center; padding: 60px 20px;
        color: #6b7280; font-size: 1.05rem;
      }

      .not-found {
        max-width: 520px;
        margin: 60px auto 0;
        padding: 0 20px;
        text-align: center;
      }
      .not-found-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        padding: 36px 28px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.05);
      }
      .nf-icon {
        width: 80px; height: 80px;
        margin: 0 auto 16px;
        border-radius: 50%;
        background: #fef3c7;
        color: #b45309;
        display: flex; align-items: center; justify-content: center;
      }
      .nf-title { margin: 0 0 12px; font-size: 1.5rem; color: #0f5132; }
      .nf-text { margin: 0 0 14px; color: #374151; font-size: 1rem; line-height: 1.55; }
      .nf-help { margin: 0; color: #6b7280; font-size: 0.9rem; line-height: 1.55; }
      .nf-meta {
        margin-top: 22px;
        padding-top: 18px;
        border-top: 1px dashed #e5e7eb;
        display: flex; justify-content: center; align-items: center; gap: 8px;
        font-size: 0.85rem;
      }
      .nf-meta-key { color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.72rem; font-weight: 600; }
      .nf-meta-val {
        background: #f3f4f6; padding: 3px 10px; border-radius: 6px;
        color: #1f2937; font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 0.85rem;
      }
      .nf-footer-text { margin: 22px 0 0; color: #6b7280; font-size: 0.85rem; }
      .nf-footer-text strong { color: #065f46; }

      .container { max-width: 1080px; margin: 0 auto; padding: 0 20px; }

      /* ---------- Hero ---------- */
      .hero {
        background: linear-gradient(135deg, #065f46 0%, #10b981 100%);
        color: white;
        padding: 44px 0 60px;
      }
      .hero-inner { max-width: 1080px; margin: 0 auto; padding: 0 20px; text-align: center; }
      .brand-line { margin: 0 0 8px; opacity: 0.85; font-size: 0.92rem; letter-spacing: 0.02em; }
      .brand-line strong { font-weight: 600; }
      .product-name { margin: 0; font-size: 2rem; font-weight: 700; line-height: 1.2; }
      .product-desc { margin: 12px auto 0; max-width: 620px; opacity: 0.95; font-size: 1rem; line-height: 1.5; }

      /* ---------- Carte CO2 ---------- */
      /* ---------- Bandeau d'action (consommateur) ---------- */
      .action-section {
        background: white;
        border-bottom: 1px solid #e5e7eb;
        padding: 18px 0;
      }
      .action-card {
        max-width: 820px;
        margin: 0 auto;
        background: linear-gradient(135deg, #ecfdf5, #d1fae5);
        border: 1px solid #a7f3d0;
        border-radius: 12px;
        padding: 16px 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }
      .guest-card {
        background: linear-gradient(135deg, #f0fdfa, #dbeafe);
        border-color: #bfdbfe;
      }
      .action-info { flex: 1; min-width: 220px; }
      .action-info strong {
        display: block; color: #065f46;
        font-size: 1rem; margin-bottom: 2px;
      }
      .guest-card .action-info strong { color: #1e40af; }
      .action-info span { color: #4b5563; font-size: 0.88rem; }
      .action-buttons { display: flex; gap: 8px; }
      .btn-action {
        background: #10b981; color: white;
        border: none; padding: 11px 18px;
        border-radius: 8px;
        font-size: 0.92rem; font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        text-decoration: none;
        white-space: nowrap;
        transition: background 0.15s;
      }
      .btn-action:hover:not(:disabled) { background: #059669; }
      .btn-action:disabled { background: #6ee7b7; cursor: default; }
      .btn-action-secondary {
        background: white; color: #1e40af;
        border: 1px solid #bfdbfe;
      }
      .btn-action-secondary:hover { background: #eff6ff; }

      .co2-section { padding: 28px 0; }
      .co2-card {
        background: white;
        border: 1px solid #d1fae5;
        border-radius: 14px;
        padding: 26px;
        text-align: center;
        box-shadow: 0 6px 24px rgba(16, 185, 129, 0.12);
        margin-top: -50px;
        position: relative;
        max-width: 720px;
        margin-left: auto;
        margin-right: auto;
      }
      .co2-label {
        font-size: 0.78rem; color: #047857;
        text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;
      }
      .co2-value {
        font-size: 3rem; font-weight: 800; color: #064e3b;
        margin: 8px 0 4px; line-height: 1;
      }
      .co2-unit { font-size: 1rem; font-weight: 600; margin-left: 6px; opacity: 0.75; }
      .co2-sub { color: #6b7280; font-size: 0.9rem; }

      .trust-row {
        display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
        margin-top: 18px;
      }
      .trust-badge {
        display: inline-flex; align-items: center; gap: 6px;
        background: #ecfdf5; color: #065f46;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 0.8rem; font-weight: 600;
        border: 1px solid #a7f3d0;
      }
      .trust-badge-bad {
        background: #fef3c7; color: #92400e; border-color: #fde68a;
      }

      /* ---------- Section parcours ---------- */
      .journey { padding: 16px 0 40px; }
      .journey h2 { margin: 0 0 6px; font-size: 1.5rem; color: #0f5132; }
      .section-intro { margin: 0 0 24px; color: #6b7280; max-width: 720px; }

      .timeline {
        list-style: none; padding: 0; margin: 0;
        position: relative;
      }
      .timeline::before {
        content: '';
        position: absolute;
        left: 19px; top: 12px; bottom: 12px;
        width: 2px;
        background: linear-gradient(to bottom, #d1fae5, #a7f3d0, #d1fae5);
      }
      .step {
        position: relative;
        padding-left: 56px;
        padding-bottom: 24px;
      }
      .step:last-child { padding-bottom: 0; }
      .step-bullet {
        position: absolute; left: 0; top: 0;
        width: 40px; height: 40px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: 700;
        font-size: 1.05rem;
        box-shadow: 0 0 0 4px white, 0 2px 6px rgba(0,0,0,0.08);
      }
      .step-content {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px 18px;
      }
      .step-top {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .step-top h3 { margin: 0; font-size: 1.05rem; color: #1f2937; }
      .step-type-tag {
        background: #d1fae5; color: #065f46;
        padding: 2px 10px; border-radius: 999px;
        font-size: 0.72rem; font-weight: 600;
      }
      .step-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 10px;
        margin-bottom: 14px;
      }
      .step-info {
        background: #f9fafb;
        padding: 8px 10px;
        border-radius: 6px;
      }
      .info-key {
        font-size: 0.7rem; color: #6b7280;
        text-transform: uppercase; letter-spacing: 0.04em;
        margin-bottom: 2px;
      }
      .info-val { font-size: 0.9rem; font-weight: 500; color: #1f2937; }
      .step-co2 {
        display: flex; justify-content: space-between; align-items: center;
        padding-top: 12px;
        border-top: 1px dashed #e5e7eb;
      }
      .step-co2-value {
        font-weight: 700; color: #0f5132; font-size: 0.95rem;
      }
      .step-co2-pct {
        color: #6b7280; font-size: 0.82rem;
      }

      .step-hash {
        margin-top: 10px;
        padding: 6px 10px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.74rem;
      }
      .hash-tag {
        background: #16a34a; color: white;
        padding: 2px 7px; border-radius: 4px;
        font-weight: 600; font-size: 0.66rem;
        letter-spacing: 0.04em;
      }
      .hash-mono {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        color: #065f46;
        word-break: break-all;
      }

      .chain-section {
        margin-top: 36px;
        padding: 24px 26px;
        background: white;
        border: 1px solid #e5e7eb;
        border-left: 4px solid #10b981;
        border-radius: 12px;
      }
      .chain-section h3 {
        margin: 0 0 12px;
        font-size: 1.15rem;
        color: #065f46;
        display: flex; align-items: center;
      }
      .chain-intro {
        margin: 0 0 18px;
        color: #374151;
        font-size: 0.95rem;
        line-height: 1.55;
      }
      .chain-intro code {
        background: #d1fae5;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 0.85rem;
        color: #065f46;
      }
      .chain-list {
        list-style: none;
        padding: 0; margin: 0;
        display: flex; flex-direction: column;
        gap: 10px;
      }
      .chain-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 10px 12px;
        background: #f9fafb;
        border-radius: 8px;
      }
      .chain-num {
        flex-shrink: 0;
        width: 26px; height: 26px;
        border-radius: 50%;
        color: white; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.82rem;
      }
      .chain-text {
        flex: 1; min-width: 0;
      }
      .chain-step-name {
        font-weight: 600;
        color: #1f2937;
        font-size: 0.92rem;
        margin-bottom: 4px;
      }
      .chain-hash {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 0.75rem;
        color: #065f46;
        word-break: break-all;
        display: block;
      }

      .public-footer {
        text-align: center;
        padding: 30px 20px 40px;
        color: #6b7280;
        font-size: 0.88rem;
        border-top: 1px solid #e5e7eb;
        background: white;
      }
      .public-footer p { margin: 4px 0; }
      .public-footer .small { font-size: 0.78rem; opacity: 0.75; }

      /* ============ Responsive ============ */

      /* Très petits téléphones */
      @media (max-width: 480px) {
        .product-name { font-size: 1.5rem; }
        .co2-value { font-size: 2.4rem; }
        .logo { height: 44px; }
      }

      /* Tablette : un peu plus d'espace */
      @media (min-width: 720px) {
        .hero { padding: 60px 0 78px; }
        .product-name { font-size: 2.6rem; }
        .product-desc { font-size: 1.1rem; }
        .co2-value { font-size: 3.6rem; }
        .co2-card { padding: 32px; }
        .journey h2 { font-size: 1.7rem; }
        .section-intro { font-size: 1.05rem; }
      }

      /* Desktop : timeline en 2 colonnes, logo plus grand */
      @media (min-width: 960px) {
        .logo { height: 64px; }
        .hero { padding: 80px 0 96px; }
        .product-name { font-size: 3.1rem; }
        .co2-card {
          padding: 38px 44px;
          max-width: 820px;
        }
        .co2-value { font-size: 4rem; }
        .co2-sub { font-size: 1rem; }
        .trust-badge { font-size: 0.9rem; padding: 8px 16px; }
        .journey { padding: 32px 0 56px; }
        .timeline {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 18px;
          row-gap: 18px;
          /* Empêche les cartes de s'étirer à la hauteur de la plus grande */
          align-items: start;
        }
        /* Le rail vertical n'a plus de sens en grille — on le masque */
        .timeline::before { display: none; }
        .step { padding-bottom: 0; }
      }

      /* Grand desktop */
      @media (min-width: 1280px) {
        .hero { padding: 96px 0 110px; }
        .product-name { font-size: 3.4rem; }
        .product-desc { font-size: 1.15rem; max-width: 720px; }
      }
    `,
  ],
})
export class PublicProductComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly consumptionService = inject(ConsumptionService);
  readonly auth = inject(AuthService);

  readonly stepTypeLabels = STEP_TYPE_LABELS;
  readonly transportModeLabels = TRANSPORT_MODE_LABELS;
  readonly today = new Date();
  private readonly palette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  readonly product = signal<Product | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly requestedId = signal<string | null>(null);
  readonly adding = signal<boolean>(false);
  readonly added = signal<boolean>(false);

  /** True si le user connecté est un consommateur (seul rôle qui ajoute
   *  à son bilan personnel — admin et entreprise n'ont pas vocation à
   *  tracker leur propre consommation). */
  canTrack(): boolean {
    return this.auth.currentUser()?.role === 'consommateur';
  }

  /** Chemin courant (utilisé pour rediriger après login/signup). */
  get currentPath(): string {
    return this.router.url;
  }

  addToConsumption(product: Product): void {
    if (!product) return;
    this.adding.set(true);
    this.consumptionService.add({ product_id: product.id, quantity: 1 }).subscribe({
      next: () => {
        this.adding.set(false);
        this.added.set(true);
        setTimeout(() => this.added.set(false), 4000);
      },
      error: () => {
        this.adding.set(false);
      },
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.requestedId.set(idParam);
    if (!idParam || isNaN(Number(idParam))) {
      this.error.set('Produit introuvable');
      this.loading.set(false);
      return;
    }
    this.productService.getPublic(Number(idParam)).subscribe({
      next: (p) => {
        this.product.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Ce produit n'existe pas ou n'est plus disponible.");
        this.loading.set(false);
      },
    });
  }

  percent(value: number, total: number): number {
    if (!total) return 0;
    return (value / total) * 100;
  }

  colorFor(index: number): string {
    return this.palette[index % this.palette.length];
  }
}
