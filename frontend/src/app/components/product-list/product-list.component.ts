import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { API_BASE_URL } from '../../config/api.config';
import {
  Product,
  STEP_TYPE_LABELS,
  StepType,
  TRANSPORT_MODE_LABELS,
  TransportMode,
} from '../../models/product.model';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';

type SortKey = 'date_desc' | 'date_asc' | 'co2_desc' | 'co2_asc' | 'name_asc';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container">
      <header class="page-header">
        <div>
          <h1>Dashboard RSE</h1>
          <p class="subtitle">Suivi de l'empreinte carbone de vos produits</p>
        </div>
        <a routerLink="/products/new" class="btn btn-primary">+ Nouveau produit</a>
      </header>

      <section class="kpis">
        <div class="kpi">
          <div class="kpi-value">{{ filteredProducts().length }}<span class="kpi-total" *ngIf="hasActiveFilters() || searchTerm()"> / {{ products().length }}</span></div>
          <div class="kpi-label">Produits {{ (hasActiveFilters() || searchTerm()) ? 'filtrés' : '' }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">{{ totalSteps() }}</div>
          <div class="kpi-label">Étapes tracées</div>
        </div>
        <div class="kpi kpi-accent">
          <div class="kpi-value">{{ avgCo2() | number:'1.0-2' }} <span class="unit">kg CO₂</span></div>
          <div class="kpi-label">Empreinte moyenne / produit</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">{{ totalCo2() | number:'1.0-2' }} <span class="unit">kg CO₂</span></div>
          <div class="kpi-label">Total cumulé</div>
        </div>
      </section>

      <section class="toolbar">
        <div class="search">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="search"
            placeholder="Rechercher un produit, une entreprise, un fournisseur, un lieu..."
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)"
          />
        </div>

        <button type="button" class="btn-filter" (click)="openFilters()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          Filtres
          <span class="filter-badge" *ngIf="activeFiltersCount() > 0">{{ activeFiltersCount() }}</span>
        </button>
      </section>

      <div class="filter-chips" *ngIf="hasActiveFilters()">
        <span class="chip" *ngIf="stepTypeFilter()">
          Type : {{ stepTypeLabel(stepTypeFilter()) }}
          <button type="button" (click)="stepTypeFilter.set('')" aria-label="Retirer">✕</button>
        </span>
        <span class="chip" *ngIf="transportFilter()">
          Transport : {{ transportModeLabel(transportFilter()) }}
          <button type="button" (click)="transportFilter.set('')" aria-label="Retirer">✕</button>
        </span>
        <span class="chip" *ngIf="supplierFilter()">
          Fournisseur : {{ supplierFilter() }}
          <button type="button" (click)="supplierFilter.set('')" aria-label="Retirer">✕</button>
        </span>
        <span class="chip" *ngIf="locationFilter()">
          Lieu : {{ locationFilter() }}
          <button type="button" (click)="locationFilter.set('')" aria-label="Retirer">✕</button>
        </span>
        <span class="chip" *ngIf="minWeight() !== null || maxWeight() !== null">
          Poids {{ minWeight() ?? '0' }}–{{ maxWeight() ?? '∞' }} kg
          <button type="button" (click)="minWeight.set(null); maxWeight.set(null)" aria-label="Retirer">✕</button>
        </span>
        <span class="chip" *ngIf="minDistance() !== null || maxDistance() !== null">
          Distance {{ minDistance() ?? '0' }}–{{ maxDistance() ?? '∞' }} km
          <button type="button" (click)="minDistance.set(null); maxDistance.set(null)" aria-label="Retirer">✕</button>
        </span>
        <span class="chip" *ngIf="minCo2() !== null || maxCo2() !== null">
          CO₂ {{ minCo2() ?? '0' }}–{{ maxCo2() ?? '∞' }} kg
          <button type="button" (click)="minCo2.set(null); maxCo2.set(null)" aria-label="Retirer">✕</button>
        </span>
      </div>

      <p *ngIf="loading" class="muted">Chargement...</p>
      <p *ngIf="!loading && products().length === 0" class="muted">
        Aucun produit. Créez-en un avec le bouton ci-dessus.
      </p>
      <p *ngIf="!loading && products().length > 0 && filteredProducts().length === 0" class="muted empty-filter">
        Aucun produit ne correspond aux filtres.
      </p>

      <ul class="list" *ngIf="!loading && filteredProducts().length > 0">
        <li *ngFor="let p of filteredProducts()" class="row">
          <div class="info">
            <div class="name">{{ p.name }}</div>
            <div class="desc">{{ p.description || '—' }}</div>
            <div class="meta">
              {{ p.steps.length }} étape(s)
              <span *ngIf="isAdmin() && p.owner" class="owner-tag">· {{ p.owner.company_name }}</span>
            </div>
          </div>
          <div class="co2">
            <div class="co2-value">{{ p.total_co2_kg | number:'1.0-2' }}</div>
            <div class="co2-unit">kg CO₂</div>
          </div>
          <div class="actions">
            <button type="button" class="btn btn-view" (click)="view(p)">Visualiser</button>
            <button type="button" class="btn btn-qr" (click)="openQr(p)" title="QR code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
                <line x1="14" y1="14" x2="14" y2="17"></line>
                <line x1="17" y1="14" x2="21" y2="14"></line>
                <line x1="14" y1="20" x2="17" y2="20"></line>
                <line x1="20" y1="17" x2="20" y2="21"></line>
              </svg>
              QR code
            </button>
            <a [href]="publicUrl(p.id)" target="_blank" rel="noopener" class="btn btn-public" title="Ouvrir la page publique dans un nouvel onglet">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Page publique
            </a>
            <a [routerLink]="['/products', p.id, 'edit']" class="btn btn-secondary">Modifier</a>
            <button type="button" class="btn btn-danger" (click)="remove(p)">Supprimer</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Modale Filtres -->
    <div *ngIf="showFilters()" class="modal-backdrop" (click)="closeFilters()">
      <div class="modal modal-filters" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align: -3px; margin-right: 6px;">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filtres
          </h2>
          <button type="button" class="btn-close" (click)="closeFilters()" aria-label="Fermer">✕</button>
        </header>

        <div class="modal-body">
          <div class="filter-grid">
            <label class="field">
              <span>Trier par</span>
              <select [ngModel]="sortBy()" (ngModelChange)="sortBy.set($event)">
                <option value="date_desc">Plus récents</option>
                <option value="date_asc">Plus anciens</option>
                <option value="co2_desc">CO₂ décroissant</option>
                <option value="co2_asc">CO₂ croissant</option>
                <option value="name_asc">Nom A→Z</option>
              </select>
            </label>

            <label class="field">
              <span>Type d'étape</span>
              <select [ngModel]="stepTypeFilter()" (ngModelChange)="stepTypeFilter.set($event)">
                <option value="">Tous les types</option>
                <option *ngFor="let t of stepTypes" [value]="t">{{ stepTypeLabels[t] }}</option>
              </select>
            </label>

            <label class="field">
              <span>Mode de transport</span>
              <select [ngModel]="transportFilter()" (ngModelChange)="transportFilter.set($event)">
                <option value="">Tous les modes</option>
                <option *ngFor="let m of transportModes" [value]="m">{{ transportModeLabels[m] }}</option>
              </select>
            </label>

            <label class="field">
              <span>Fournisseur</span>
              <select [ngModel]="supplierFilter()" (ngModelChange)="supplierFilter.set($event)">
                <option value="">Tous les fournisseurs</option>
                <option *ngFor="let s of uniqueSuppliers()" [value]="s">{{ s }}</option>
              </select>
            </label>

            <label class="field">
              <span>Lieu</span>
              <select [ngModel]="locationFilter()" (ngModelChange)="locationFilter.set($event)">
                <option value="">Tous les lieux</option>
                <option *ngFor="let l of uniqueLocations()" [value]="l">{{ l }}</option>
              </select>
            </label>

            <div class="field">
              <span>Poids par étape (kg)</span>
              <div class="range">
                <input type="number" min="0" step="0.1" placeholder="min" [ngModel]="minWeight()" (ngModelChange)="minWeight.set($event === null || $event === '' ? null : +$event)" />
                <span class="range-sep">–</span>
                <input type="number" min="0" step="0.1" placeholder="max" [ngModel]="maxWeight()" (ngModelChange)="maxWeight.set($event === null || $event === '' ? null : +$event)" />
              </div>
            </div>

            <div class="field">
              <span>Distance par étape (km)</span>
              <div class="range">
                <input type="number" min="0" step="1" placeholder="min" [ngModel]="minDistance()" (ngModelChange)="minDistance.set($event === null || $event === '' ? null : +$event)" />
                <span class="range-sep">–</span>
                <input type="number" min="0" step="1" placeholder="max" [ngModel]="maxDistance()" (ngModelChange)="maxDistance.set($event === null || $event === '' ? null : +$event)" />
              </div>
            </div>

            <div class="field field-wide">
              <span>Empreinte CO₂ totale (kg)</span>
              <div class="range">
                <input type="number" min="0" step="0.1" placeholder="min" [ngModel]="minCo2()" (ngModelChange)="minCo2.set($event === null || $event === '' ? null : +$event)" />
                <span class="range-sep">–</span>
                <input type="number" min="0" step="0.1" placeholder="max" [ngModel]="maxCo2()" (ngModelChange)="maxCo2.set($event === null || $event === '' ? null : +$event)" />
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="resetFilters()" [disabled]="!hasActiveFilters()">
            Réinitialiser
          </button>
          <button type="button" class="btn btn-primary" (click)="closeFilters()">
            Voir {{ filteredProducts().length }} résultat(s)
          </button>
        </footer>
      </div>
    </div>

    <!-- Modale Détail produit -->
    <div *ngIf="selectedProduct" class="modal-backdrop" (click)="closeModal()">
      <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <header class="modal-header">
          <div>
            <h2>{{ selectedProduct.name }}</h2>
            <p class="modal-meta">
              Créé le {{ selectedProduct.created_at | date:'dd/MM/yyyy à HH:mm' }} · {{ selectedProduct.steps.length }} étape(s)
            </p>
            <div class="chain-badge" *ngIf="selectedProduct.chain_valid">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 12l2 2 4-4"></path>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              Traçabilité vérifiée
            </div>
          </div>
          <button type="button" class="btn-close" (click)="closeModal()" aria-label="Fermer">✕</button>
        </header>

        <div class="modal-body">
          <p *ngIf="selectedProduct.description" class="modal-desc">{{ selectedProduct.description }}</p>

          <div class="co2-card">
            <div class="co2-card-label">Empreinte carbone totale</div>
            <div class="co2-card-value">
              {{ selectedProduct.total_co2_kg | number:'1.0-2' }} <span class="unit">kg CO₂</span>
            </div>

            <div class="co2-bar" *ngIf="(selectedProduct.total_co2_kg ?? 0) > 0">
              <div
                *ngFor="let s of selectedProduct.steps; let i = index"
                class="co2-bar-seg"
                [style.width.%]="percent(s.co2_kg ?? 0, selectedProduct.total_co2_kg ?? 0)"
                [style.background]="colorFor(i)"
                [attr.title]="s.name + ' — ' + (s.co2_kg ?? 0) + ' kg CO₂'"
              ></div>
            </div>

            <div class="co2-legend" *ngIf="(selectedProduct.total_co2_kg ?? 0) > 0">
              <div *ngFor="let s of selectedProduct.steps; let i = index" class="co2-legend-item">
                <span class="dot" [style.background]="colorFor(i)"></span>
                <span class="legend-name">{{ s.name }}</span>
                <span class="legend-value">{{ percent(s.co2_kg ?? 0, selectedProduct.total_co2_kg ?? 0) | number:'1.0-0' }}%</span>
              </div>
            </div>
          </div>

          <h3 class="modal-section">Détail par étape</h3>
          <p *ngIf="selectedProduct.steps.length === 0" class="muted">Aucune étape.</p>

          <ol class="steps">
            <li *ngFor="let s of selectedProduct.steps; let i = index" class="step">
              <div class="step-head">
                <span class="badge" [style.background]="colorFor(i)">{{ s.position }}</span>
                <strong>{{ s.name }}</strong>
                <span class="type-badge">{{ stepTypeLabels[s.step_type] }}</span>
                <span class="step-co2">{{ s.co2_kg | number:'1.0-2' }} kg CO₂</span>
              </div>
              <dl class="step-grid">
                <ng-container *ngIf="s.supplier"><dt>Fournisseur</dt><dd>{{ s.supplier }}</dd></ng-container>
                <ng-container *ngIf="s.location"><dt>Lieu</dt><dd>{{ s.location }}</dd></ng-container>
                <dt>Poids</dt><dd>{{ s.weight_kg }} kg</dd>
                <ng-container *ngIf="s.transport_mode"><dt>Transport</dt><dd>{{ transportModeLabels[s.transport_mode] }}</dd></ng-container>
                <ng-container *ngIf="s.distance_km !== null && s.distance_km !== undefined"><dt>Distance</dt><dd>{{ s.distance_km }} km</dd></ng-container>
              </dl>
              <div class="step-hash" *ngIf="s.hash" (click)="copyHash(s.hash!)" [title]="'Cliquer pour copier — ' + s.hash">
                <span class="hash-label">Hash</span>
                <code class="hash-value">{{ s.hash.substring(0, 16) }}…{{ s.hash.substring(s.hash.length - 8) }}</code>
                <span class="hash-hint">{{ copiedHash() === s.hash ? '✓ copié' : 'cliquer pour copier' }}</span>
              </div>
            </li>
          </ol>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn btn-qr" (click)="openQr(selectedProduct)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
              <line x1="14" y1="14" x2="14" y2="17"></line>
              <line x1="17" y1="14" x2="21" y2="14"></line>
              <line x1="14" y1="20" x2="17" y2="20"></line>
              <line x1="20" y1="17" x2="20" y2="21"></line>
            </svg>
            QR code
          </button>
          <a [href]="publicUrl(selectedProduct.id)" target="_blank" rel="noopener" class="btn btn-public">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            Voir page publique
          </a>
          <a [routerLink]="['/products', selectedProduct.id, 'edit']" class="btn btn-secondary" (click)="closeModal()">Modifier</a>
          <button type="button" class="btn btn-primary" (click)="closeModal()">Fermer</button>
        </footer>
      </div>
    </div>

    <!-- Modale QR Code -->
    <div *ngIf="qrProduct() as qrP" class="modal-backdrop" (click)="closeQr()">
      <div class="modal modal-qr" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h2>QR code — {{ qrP.name }}</h2>
          <button type="button" class="btn-close" (click)="closeQr()" aria-label="Fermer">✕</button>
        </header>

        <div class="modal-body qr-body">
          <img [src]="qrImageUrl(qrP.id)" alt="QR code" class="qr-image" />
          <p class="qr-help">Scannez ce code pour accéder à la page produit.</p>
          <div class="qr-url-block">
            <span class="qr-url-label">URL stable</span>
            <code class="qr-url">{{ publicUrl(qrP.id) }}</code>
          </div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="copyUrl(qrP.id)">
            {{ urlCopied() ? '✓ Copié' : 'Copier l\\'URL' }}
          </button>
          <button type="button" class="btn btn-primary" (click)="downloadQr(qrP)">
            Télécharger le PNG
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
      .container { max-width: 1080px; margin: 0 auto; padding: 24px; font-family: system-ui, -apple-system, sans-serif; color: #1f2937; }
      .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; }
      .page-header h1 { margin: 0; color: #0f5132; font-size: 1.8rem; }
      .subtitle { margin: 4px 0 0; color: #6b7280; font-size: 0.95rem; }
      .muted { color: #6b7280; }
      .empty-filter { padding: 24px; text-align: center; background: #f9fafb; border-radius: 8px; border: 1px dashed #e5e7eb; }

      .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
      @media (max-width: 720px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
      .kpi { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); }
      .kpi-accent { background: linear-gradient(135deg, #10b981, #059669); color: white; border-color: transparent; }
      .kpi-accent .kpi-label { color: rgba(255, 255, 255, 0.85); }
      .kpi-value { font-size: 1.6rem; font-weight: 700; color: inherit; line-height: 1.2; }
      .kpi-value .unit { font-size: 0.85rem; font-weight: 500; opacity: 0.7; margin-left: 4px; }
      .kpi-total { font-size: 0.9rem; font-weight: 500; opacity: 0.6; }
      .kpi-label { font-size: 0.8rem; color: #6b7280; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.04em; }

      .toolbar { display: flex; gap: 10px; margin-bottom: 14px; }
      .search { flex: 1; position: relative; min-width: 0; }
      .search-icon {
        position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
        pointer-events: none; color: #9ca3af;
      }
      .search input {
        width: 100%;
        padding: 10px 12px 10px 36px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        font-family: inherit;
        background: white;
        box-sizing: border-box;
      }
      .search input:focus { outline: 2px solid #10b981; outline-offset: -1px; border-color: #10b981; }

      .btn-filter {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 10px 16px;
        background: white;
        color: #1f2937;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 500;
        font-family: inherit;
      }
      .btn-filter:hover { background: #f9fafb; border-color: #10b981; color: #065f46; }
      .filter-badge {
        background: #10b981; color: white;
        font-size: 0.7rem; font-weight: 700;
        padding: 1px 7px;
        border-radius: 999px;
        min-width: 18px;
        text-align: center;
      }

      .filter-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
      .chip {
        background: #ecfdf5; color: #065f46;
        border: 1px solid #a7f3d0;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.8rem;
        display: inline-flex; align-items: center; gap: 6px;
      }
      .chip button {
        background: transparent; border: none; cursor: pointer;
        color: #065f46; font-size: 0.9rem; padding: 0;
        line-height: 1;
      }
      .chip button:hover { color: #064e3b; }

      .list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
      .row { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; gap: 16px; }
      .info { flex: 1; min-width: 0; }
      .name { font-weight: 600; font-size: 1.05rem; }
      .desc { color: #4b5563; font-size: 0.9rem; }
      .meta { color: #6b7280; font-size: 0.8rem; margin-top: 4px; }
      .owner-tag { color: #065f46; font-weight: 500; }
      .co2 { text-align: right; min-width: 90px; }
      .co2-value { font-weight: 700; font-size: 1.2rem; color: #0f5132; }
      .co2-unit { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
      .actions { display: flex; gap: 8px; flex-shrink: 0; }
      .btn { padding: 7px 12px; border-radius: 6px; border: none; cursor: pointer; font-size: 0.85rem; font-weight: 500; text-decoration: none; display: inline-block; font-family: inherit; }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn-primary { background: #10b981; color: white; }
      .btn-primary:hover:not(:disabled) { background: #059669; }
      .btn-secondary { background: #e5e7eb; color: #1f2937; }
      .btn-secondary:hover:not(:disabled) { background: #d1d5db; }
      .btn-view { background: #dbeafe; color: #1e40af; }
      .btn-view:hover { background: #bfdbfe; }
      .btn-public { background: #d1fae5; color: #065f46; display: inline-flex; align-items: center; }
      .btn-public:hover { background: #a7f3d0; }
      .btn-qr { background: #f3f4f6; color: #1f2937; display: inline-flex; align-items: center; border: 1px solid #e5e7eb; }
      .btn-qr:hover { background: #e5e7eb; }
      .btn-danger { background: #fee2e2; color: #991b1b; }
      .btn-danger:hover { background: #fecaca; }

      .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: fade 0.15s ease-out; }
      .modal { background: white; border-radius: 10px; max-width: 760px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25); animation: pop 0.15s ease-out; }
      .modal-filters { max-width: 560px; }
      .modal-qr { max-width: 420px; }
      .qr-body { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
      .qr-image {
        width: 240px; height: 240px;
        border: 1px solid #e5e7eb;
        border-radius: 0;
        padding: 12px;
        background: white;
      }
      .qr-help { margin: 0; color: #6b7280; font-size: 0.9rem; }
      .qr-url-block {
        width: 100%;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px 12px;
        text-align: left;
      }
      .qr-url-label {
        font-size: 0.72rem; color: #6b7280;
        text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;
        display: block; margin-bottom: 4px;
      }
      .qr-url {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 0.82rem;
        color: #0f5132;
        word-break: break-all;
      }
      @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pop { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 22px; border-bottom: 1px solid #e5e7eb; gap: 16px; }
      .modal-header h2 { margin: 0; color: #0f5132; font-size: 1.25rem; }
      .modal-meta { margin: 4px 0 0; color: #6b7280; font-size: 0.85rem; }
      .btn-close { background: transparent; border: none; cursor: pointer; font-size: 1.1rem; color: #6b7280; width: 32px; height: 32px; border-radius: 6px; flex-shrink: 0; }
      .btn-close:hover { background: #f3f4f6; color: #1f2937; }
      .modal-body { padding: 22px; overflow-y: auto; }
      .modal-desc { margin: 0 0 16px; color: #374151; }
      .modal-section { margin: 24px 0 12px; font-size: 1rem; color: #0f5132; }

      .filter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      @media (max-width: 520px) { .filter-grid { grid-template-columns: 1fr; } }
      .field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
      .field-wide { grid-column: 1 / -1; }
      .field > span { font-size: 0.8rem; font-weight: 500; color: #374151; }
      .field select,
      .field input {
        padding: 7px 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 0.88rem;
        font-family: inherit;
        background: white;
        width: 100%;
        box-sizing: border-box;
        min-width: 0;
      }
      .field select:focus, .field input:focus { outline: 2px solid #10b981; outline-offset: -1px; border-color: #10b981; }
      .range { display: flex; align-items: center; gap: 6px; }
      .range input { flex: 1; min-width: 0; }
      .range-sep { color: #9ca3af; font-weight: 500; flex-shrink: 0; }

      .co2-card { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px 18px; }
      .co2-card-label { font-size: 0.8rem; color: #065f46; text-transform: uppercase; letter-spacing: 0.04em; }
      .co2-card-value { font-size: 2rem; font-weight: 700; color: #064e3b; margin-top: 4px; }
      .co2-card-value .unit { font-size: 0.9rem; font-weight: 500; opacity: 0.65; }
      .co2-bar { display: flex; height: 14px; border-radius: 7px; overflow: hidden; margin-top: 14px; background: rgba(255,255,255,0.5); }
      .co2-bar-seg { transition: width 0.3s ease; }
      .co2-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
      .co2-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #065f46; }
      .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
      .legend-name { font-weight: 500; }
      .legend-value { color: #047857; font-weight: 600; }

      .steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
      .step { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
      .step-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
      .badge { color: white; width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 600; }
      .type-badge { background: #d1fae5; color: #065f46; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
      .step-co2 { margin-left: auto; font-weight: 600; color: #0f5132; font-size: 0.9rem; }
      .step-grid { display: grid; grid-template-columns: auto 1fr; column-gap: 12px; row-gap: 4px; margin: 0; font-size: 0.9rem; }
      .step-grid dt { color: #6b7280; }
      .step-grid dd { margin: 0; color: #1f2937; }
      .step-hash {
        margin-top: 10px;
        padding: 8px 10px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.78rem;
        transition: background 0.15s;
      }
      .step-hash:hover { background: #dcfce7; }
      .hash-label {
        background: #16a34a; color: white;
        padding: 2px 8px; border-radius: 4px;
        font-weight: 600; font-size: 0.7rem;
        text-transform: uppercase; letter-spacing: 0.04em;
      }
      .hash-value {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        color: #065f46;
        flex: 1;
        word-break: break-all;
      }
      .hash-hint { color: #6b7280; font-size: 0.72rem; font-style: italic; }

      .chain-badge {
        display: inline-flex; align-items: center; gap: 5px;
        background: #d1fae5; color: #065f46;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.75rem; font-weight: 600;
        margin-top: 8px;
        border: 1px solid #a7f3d0;
      }
      .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid #e5e7eb; }
    `,
  ],
})
/**
 * Dashboard RSE — liste des produits visibles par l'utilisateur, KPIs,
 * filtres, modale de détail et génération de QR code.
 *
 * Volontairement gardé monolithique pour l'MVP : l'état est porté par des
 * signals colocalisés, ce qui évite la complexité d'un store. Les sections
 * principales sont regroupées par rôle :
 *   1. Données (signals : products, selectedProduct, qrProduct…)
 *   2. Filtres (signals : searchTerm, stepTypeFilter…, computed filtered)
 *   3. KPIs   (computed sur filteredProducts)
 *   4. Actions UI (open/close des modales, copy URL, download QR, etc.)
 *
 * Évolution future : si l'on ajoute pagination, sélection multiple, ou
 * actions en masse, il sera temps de scinder en sous-composants
 * (DashboardKpisComponent, ProductFiltersComponent, ProductDetailModal…).
 */
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly auth = inject(AuthService);
  readonly isAdmin = this.auth.isAdmin;
  readonly stepTypeLabels = STEP_TYPE_LABELS;
  readonly transportModeLabels = TRANSPORT_MODE_LABELS;
  readonly stepTypes = Object.keys(STEP_TYPE_LABELS) as StepType[];
  readonly transportModes = Object.keys(TRANSPORT_MODE_LABELS) as TransportMode[];

  stepTypeLabel(key: string): string {
    return STEP_TYPE_LABELS[key as StepType] ?? key;
  }

  transportModeLabel(key: string): string {
    return TRANSPORT_MODE_LABELS[key as TransportMode] ?? key;
  }

  private readonly palette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  readonly products = signal<Product[]>([]);
  loading = false;
  selectedProduct: Product | null = null;
  readonly qrProduct = signal<Product | null>(null);
  readonly urlCopied = signal<boolean>(false);
  readonly copiedHash = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly stepTypeFilter = signal<string>('');
  readonly transportFilter = signal<string>('');
  readonly supplierFilter = signal<string>('');
  readonly locationFilter = signal<string>('');
  readonly minWeight = signal<number | null>(null);
  readonly maxWeight = signal<number | null>(null);
  readonly minDistance = signal<number | null>(null);
  readonly maxDistance = signal<number | null>(null);
  readonly minCo2 = signal<number | null>(null);
  readonly maxCo2 = signal<number | null>(null);
  readonly sortBy = signal<SortKey>('date_desc');
  readonly showFilters = signal<boolean>(false);

  readonly uniqueSuppliers = computed(() => {
    const set = new Set<string>();
    for (const p of this.products()) {
      for (const s of p.steps) {
        if (s.supplier) set.add(s.supplier);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  readonly uniqueLocations = computed(() => {
    const set = new Set<string>();
    for (const p of this.products()) {
      for (const s of p.steps) {
        if (s.location) set.add(s.location);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  readonly filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const stepType = this.stepTypeFilter();
    const transport = this.transportFilter();
    const supplier = this.supplierFilter();
    const location = this.locationFilter();
    const wMin = this.minWeight();
    const wMax = this.maxWeight();
    const dMin = this.minDistance();
    const dMax = this.maxDistance();
    const cMin = this.minCo2();
    const cMax = this.maxCo2();

    let result = this.products().filter((p) => {
      if (term) {
        const hay = [
          p.name,
          p.description ?? '',
          p.owner?.company_name ?? '',
          ...p.steps.map((s) => s.name),
          ...p.steps.map((s) => s.supplier ?? ''),
          ...p.steps.map((s) => s.location ?? ''),
        ];
        if (!hay.some((h) => h.toLowerCase().includes(term))) return false;
      }
      if (stepType && !p.steps.some((s) => s.step_type === stepType)) return false;
      if (transport && !p.steps.some((s) => s.transport_mode === transport)) return false;
      if (supplier && !p.steps.some((s) => s.supplier === supplier)) return false;
      if (location && !p.steps.some((s) => s.location === location)) return false;
      if (wMin !== null && !p.steps.some((s) => s.weight_kg >= wMin)) return false;
      if (wMax !== null && !p.steps.some((s) => s.weight_kg <= wMax)) return false;
      if (dMin !== null && !p.steps.some((s) => (s.distance_km ?? 0) >= dMin)) return false;
      if (dMax !== null && !p.steps.some((s) => (s.distance_km ?? 0) <= dMax)) return false;
      const total = p.total_co2_kg ?? 0;
      if (cMin !== null && total < cMin) return false;
      if (cMax !== null && total > cMax) return false;
      return true;
    });

    const sort = this.sortBy();
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'date_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'co2_desc': return (b.total_co2_kg ?? 0) - (a.total_co2_kg ?? 0);
        case 'co2_asc': return (a.total_co2_kg ?? 0) - (b.total_co2_kg ?? 0);
        case 'name_asc': return a.name.localeCompare(b.name);
      }
    });

    return result;
  });

  readonly totalSteps = computed(() =>
    this.filteredProducts().reduce((sum, p) => sum + p.steps.length, 0),
  );

  readonly totalCo2 = computed(() =>
    this.filteredProducts().reduce((sum, p) => sum + (p.total_co2_kg ?? 0), 0),
  );

  readonly avgCo2 = computed(() => {
    const list = this.filteredProducts();
    return list.length ? this.totalCo2() / list.length : 0;
  });

  readonly activeFiltersCount = computed(() => {
    let n = 0;
    if (this.stepTypeFilter()) n++;
    if (this.transportFilter()) n++;
    if (this.supplierFilter()) n++;
    if (this.locationFilter()) n++;
    if (this.minWeight() !== null || this.maxWeight() !== null) n++;
    if (this.minDistance() !== null || this.maxDistance() !== null) n++;
    if (this.minCo2() !== null || this.maxCo2() !== null) n++;
    return n;
  });

  ngOnInit(): void {
    this.fetch();
  }

  hasActiveFilters(): boolean {
    return this.activeFiltersCount() > 0;
  }

  resetFilters(): void {
    this.stepTypeFilter.set('');
    this.transportFilter.set('');
    this.supplierFilter.set('');
    this.locationFilter.set('');
    this.minWeight.set(null);
    this.maxWeight.set(null);
    this.minDistance.set(null);
    this.maxDistance.set(null);
    this.minCo2.set(null);
    this.maxCo2.set(null);
    this.sortBy.set('date_desc');
  }

  openFilters(): void { this.showFilters.set(true); }
  closeFilters(): void { this.showFilters.set(false); }

  private fetch(): void {
    this.loading = true;
    this.productService.list().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  view(product: Product): void {
    this.selectedProduct = product;
  }

  closeModal(): void {
    this.selectedProduct = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.qrProduct()) this.closeQr();
    else if (this.selectedProduct) this.closeModal();
    else if (this.showFilters()) this.closeFilters();
  }

  remove(product: Product): void {
    if (!confirm(`Supprimer "${product.name}" ?`)) return;
    this.productService.delete(product.id).subscribe({
      next: () => this.fetch(),
    });
  }

  percent(value: number, total: number): number {
    if (!total) return 0;
    return (value / total) * 100;
  }

  colorFor(index: number): string {
    return this.palette[index % this.palette.length];
  }

  publicUrl(id: number): string {
    return `${window.location.origin}/p/${id}`;
  }

  copyHash(hash: string): void {
    navigator.clipboard.writeText(hash).then(() => {
      this.copiedHash.set(hash);
      setTimeout(() => this.copiedHash.set(null), 2000);
    });
  }

  qrImageUrl(id: number): string {
    return `${API_BASE_URL}/public/products/${id}/qrcode`;
  }

  openQr(product: Product): void {
    this.urlCopied.set(false);
    this.qrProduct.set(product);
  }

  closeQr(): void {
    this.qrProduct.set(null);
  }

  copyUrl(id: number): void {
    const url = this.publicUrl(id);
    navigator.clipboard.writeText(url).then(() => {
      this.urlCopied.set(true);
      setTimeout(() => this.urlCopied.set(false), 2000);
    });
  }

  downloadQr(product: Product): void {
    fetch(this.qrImageUrl(product.id))
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = product.name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
        a.download = `qr-greenpath-${safeName}-${product.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
  }
}
