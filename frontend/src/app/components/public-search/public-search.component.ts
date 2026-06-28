import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';

import { Product, STEP_TYPE_LABELS } from '../../models/product.model';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-public-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="search-page">
      <div class="hero">
        <div class="hero-inner">
          <div class="logo-row">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill="#10b981"/>
              <path d="M20 10 C14 14,11 20,14 27C17 34,26 34,29 27C32 20,29 13,23 11"
                    stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <circle cx="20" cy="20" r="4" fill="white"/>
            </svg>
            <a routerLink="/" class="logo-name">GreenPath</a>
          </div>
          <h1>Traçabilité des produits</h1>
          <p class="hero-sub">Recherchez par nom, GTIN, fournisseur ou lieu d'origine</p>
          <div class="search-bar">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="search" [(ngModel)]="query" (ngModelChange)="onQueryChange($event)"
                   placeholder="Ex: chocolat, 36145120000185, Ghana..."
                   class="search-input" autofocus/>
            <span class="search-clear" *ngIf="query" (click)="clear()">x</span>
          </div>
        </div>
      </div>
      <div class="results-wrap">
        <p class="status-msg" *ngIf="query.length > 0 && query.length < 2">Continuez a taper...</p>
        <p class="status-msg" *ngIf="loading">Recherche en cours...</p>
        <p class="status-msg empty" *ngIf="!loading && searched && results.length === 0">
          Aucun produit trouve pour <strong>{{ query }}</strong>.
        </p>
        <p class="results-count" *ngIf="!loading && results.length > 0">
          {{ results.length }} resultat{{ results.length > 1 ? 's' : '' }} pour <strong>{{ query }}</strong>
        </p>
        <div class="results-grid">
          <a *ngFor="let p of results" [routerLink]="['/p', p.id]" class="result-card">
            <div class="card-top">
              <span class="product-name">{{ p.name }}</span>
              <span *ngIf="p.gtin" class="gtin-badge">GTIN {{ p.gtin }}</span>
            </div>
            <p class="product-desc" *ngIf="p.description">{{ p.description }}</p>
            <div class="card-meta">
              <span class="owner-tag" *ngIf="p.owner">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                {{ p.owner.company_name }}
              </span>
              <span class="steps-tag">{{ p.steps.length }} etape{{ p.steps.length > 1 ? 's' : '' }}</span>
              <span class="co2-tag" *ngIf="p.total_co2_kg && p.total_co2_kg > 0">
                {{ p.total_co2_kg | number:'1.0-2' }} kg CO2
              </span>
            </div>
            <div class="step-pills" *ngIf="p.steps.length">
              <span *ngFor="let s of p.steps.slice(0, 4)" class="step-pill" [class]="'type-' + s.step_type">
                {{ stepTypeLabels[s.step_type] }}
              </span>
              <span class="step-pill more" *ngIf="p.steps.length > 4">+{{ p.steps.length - 4 }}</span>
            </div>
            <div class="card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
          </a>
        </div>
        <div class="empty-state" *ngIf="!searched && !loading">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d1fae5" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>Tapez au moins 2 caracteres pour lancer la recherche</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-page { min-height: 100vh; background: #f9fafb; font-family: system-ui,-apple-system,sans-serif; }
    .hero { background: linear-gradient(135deg,#064e3b 0%,#065f46 60%,#0f5132 100%); padding: 48px 24px 56px; }
    .hero-inner { max-width: 680px; margin: 0 auto; }
    .logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .logo-name { color: white; font-size: 1.1rem; font-weight: 700; letter-spacing:-0.01em; text-decoration:none; }
    .hero h1 { color: white; font-size: 2rem; font-weight: 800; margin: 0 0 8px; }
    .hero-sub { color: #a7f3d0; font-size: 1rem; margin: 0 0 28px; }
    .search-bar { position:relative; display:flex; align-items:center; background:white; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.18); }
    .search-icon { position:absolute; left:14px; color:#9ca3af; }
    .search-input { width:100%; border:none; outline:none; background:transparent; padding:16px 40px 16px 44px; font-size:1rem; border-radius:12px; font-family:inherit; color:#1f2937; }
    .search-clear { position:absolute; right:14px; color:#9ca3af; cursor:pointer; font-size:0.85rem; }
    .search-clear:hover { color:#374151; }
    .results-wrap { max-width:680px; margin:0 auto; padding:28px 24px 48px; }
    .status-msg { color:#6b7280; font-size:0.9rem; text-align:center; margin:0 0 16px; }
    .status-msg.empty { padding:32px 0; }
    .results-count { font-size:0.85rem; color:#6b7280; margin:0 0 16px; }
    .results-count strong { color:#1f2937; }
    .results-grid { display:flex; flex-direction:column; gap:12px; }
    .result-card { display:block; background:white; border:1px solid #e5e7eb; border-radius:12px; padding:16px 18px; text-decoration:none; color:inherit; transition:box-shadow 0.15s,border-color 0.15s; position:relative; }
    .result-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.1); border-color:#10b981; }
    .card-top { display:flex; align-items:flex-start; gap:10px; margin-bottom:6px; flex-wrap:wrap; }
    .product-name { font-weight:700; font-size:1rem; color:#1f2937; flex:1; }
    .gtin-badge { font-size:0.7rem; font-weight:600; background:#f0fdf4; color:#065f46; border:1px solid #bbf7d0; border-radius:6px; padding:2px 8px; white-space:nowrap; }
    .product-desc { font-size:0.85rem; color:#6b7280; margin:0 0 10px; line-height:1.4; }
    .card-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
    .owner-tag,.steps-tag,.co2-tag { display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; color:#6b7280; }
    .co2-tag { color:#047857; font-weight:600; }
    .step-pills { display:flex; flex-wrap:wrap; gap:5px; }
    .step-pill { padding:2px 8px; border-radius:999px; font-size:0.68rem; font-weight:600; }
    .type-matiere_premiere { background:#d1fae5; color:#065f46; }
    .type-fabrication { background:#dbeafe; color:#1e40af; }
    .type-transport { background:#fef3c7; color:#92400e; }
    .type-distribution { background:#fce7f3; color:#9d174d; }
    .step-pill.more { background:#f3f4f6; color:#6b7280; }
    .card-arrow { position:absolute; right:18px; top:50%; transform:translateY(-50%); color:#d1d5db; transition:color 0.15s; }
    .result-card:hover .card-arrow { color:#10b981; }
    .empty-state { text-align:center; padding:48px 0; color:#9ca3af; }
    .empty-state p { margin:12px 0 0; font-size:0.9rem; }
  `],
})
export class PublicSearchComponent {
  private readonly productService = inject(ProductService);
  query = '';
  results: Product[] = [];
  loading = false;
  searched = false;
  readonly stepTypeLabels = STEP_TYPE_LABELS;
  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        if (q.length < 2) { this.results = []; this.searched = false; return of([]); }
        this.loading = true;
        return this.productService.searchPublic(q);
      }),
    ).subscribe({
      next: (res) => { this.results = res; this.loading = false; this.searched = true; },
      error: () => { this.loading = false; this.searched = true; },
    });
  }

  onQueryChange(q: string): void { this.search$.next(q); }
  clear(): void { this.query = ''; this.results = []; this.searched = false; }
}
