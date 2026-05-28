import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  Consumption,
  ConsumptionStats,
} from '../../models/consumption.model';
import { ConsumptionService } from '../../services/consumption.service';

/**
 * Dashboard du consommateur : historique de scans, total CO₂ personnel.
 *
 * L'utilisateur arrive ici après login, peut consulter ses produits suivis,
 * supprimer des entrées et accéder à la fiche publique de chaque produit
 * pour rescanner / re-consulter les détails.
 */
@Component({
  selector: 'app-my-consumption',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <header class="page-header">
        <div>
          <h1>Ma consommation</h1>
          <p class="subtitle">Suivez l'empreinte carbone des produits que vous scannez en magasin.</p>
        </div>
      </header>

      <section class="kpis" *ngIf="stats() as s">
        <div class="kpi">
          <div class="kpi-value">{{ s.item_count }}</div>
          <div class="kpi-label">{{ s.item_count > 1 ? 'Produits scannés' : 'Produit scanné' }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">{{ s.unique_product_count }}</div>
          <div class="kpi-label">{{ s.unique_product_count > 1 ? 'Références différentes' : 'Référence différente' }}</div>
        </div>
        <div class="kpi kpi-accent">
          <div class="kpi-value">{{ s.total_co2_kg | number:'1.0-2' }} <span class="unit">kg CO₂</span></div>
          <div class="kpi-label">Empreinte cumulée</div>
        </div>
        <div class="kpi">
          <div class="kpi-value">{{ s.avg_co2_per_item | number:'1.0-2' }} <span class="unit">kg CO₂</span></div>
          <div class="kpi-label">Moyenne par produit</div>
        </div>
      </section>

      <p *ngIf="loading()" class="muted">Chargement...</p>

      <div *ngIf="!loading() && consumptions().length === 0" class="empty">
        <h2>Aucun produit suivi pour le moment</h2>
        <p>Scannez un QR code GreenPath en magasin pour ajouter votre premier produit. Vous pourrez ainsi comparer l'empreinte carbone avant d'acheter.</p>
      </div>

      <ul class="list" *ngIf="!loading() && consumptions().length > 0">
        <li *ngFor="let c of consumptions()" class="row">
          <div class="info">
            <div class="name">{{ c.product.name }}</div>
            <div class="meta">
              <span *ngIf="c.product.owner_name">par {{ c.product.owner_name }} · </span>
              Ajouté le {{ c.consumed_at | date:'dd/MM/yyyy à HH:mm' }}
              <span *ngIf="c.quantity !== 1"> · quantité {{ c.quantity }}</span>
            </div>
            <div class="notes" *ngIf="c.notes">{{ c.notes }}</div>
          </div>
          <div class="co2">
            <div class="co2-value">{{ c.co2_kg | number:'1.0-2' }}</div>
            <div class="co2-unit">kg CO₂</div>
          </div>
          <div class="actions">
            <a [routerLink]="['/p', c.product.id]" target="_blank" rel="noopener" class="btn btn-secondary">Voir détail</a>
            <button type="button" class="btn btn-danger" (click)="remove(c)">Retirer</button>
          </div>
        </li>
      </ul>
    </div>
  `,
  styles: [
    `
      .container { max-width: 1080px; margin: 0 auto; padding: 24px; font-family: system-ui, -apple-system, sans-serif; color: #1f2937; }
      .page-header { margin-bottom: 24px; }
      .page-header h1 { margin: 0; color: #0f5132; font-size: 1.8rem; }
      .subtitle { margin: 4px 0 0; color: #6b7280; font-size: 0.95rem; }
      .muted { color: #6b7280; }

      .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
      @media (max-width: 720px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
      .kpi { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); }
      .kpi-accent { background: linear-gradient(135deg, #10b981, #059669); color: white; border-color: transparent; }
      .kpi-accent .kpi-label { color: rgba(255, 255, 255, 0.85); }
      .kpi-value { font-size: 1.6rem; font-weight: 700; line-height: 1.2; }
      .kpi-value .unit { font-size: 0.85rem; font-weight: 500; opacity: 0.7; margin-left: 4px; }
      .kpi-label { font-size: 0.8rem; color: #6b7280; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.04em; }

      .empty {
        background: white;
        border: 2px dashed #e5e7eb;
        border-radius: 12px;
        padding: 48px 28px;
        text-align: center;
      }
      .empty h2 { margin: 0 0 8px; color: #0f5132; font-size: 1.2rem; }
      .empty p { margin: 0; color: #6b7280; max-width: 520px; margin: 0 auto; line-height: 1.55; }

      .list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
      .row { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; gap: 16px; }
      .info { flex: 1; min-width: 0; }
      .name { font-weight: 600; font-size: 1.05rem; }
      .meta { color: #6b7280; font-size: 0.82rem; margin-top: 2px; }
      .notes { color: #4b5563; font-size: 0.85rem; margin-top: 4px; font-style: italic; }
      .co2 { text-align: right; min-width: 90px; }
      .co2-value { font-weight: 700; font-size: 1.2rem; color: #0f5132; }
      .co2-unit { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
      .actions { display: flex; gap: 8px; flex-shrink: 0; }
      .btn { padding: 7px 12px; border-radius: 6px; border: none; cursor: pointer; font-size: 0.85rem; font-weight: 500; text-decoration: none; display: inline-block; font-family: inherit; }
      .btn-secondary { background: #e5e7eb; color: #1f2937; }
      .btn-secondary:hover { background: #d1d5db; }
      .btn-danger { background: #fee2e2; color: #991b1b; }
      .btn-danger:hover { background: #fecaca; }
    `,
  ],
})
export class MyConsumptionComponent implements OnInit {
  private readonly service = inject(ConsumptionService);

  readonly consumptions = signal<Consumption[]>([]);
  readonly stats = signal<ConsumptionStats | null>(null);
  readonly loading = signal<boolean>(false);

  ngOnInit(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    forkJoin({
      list: this.service.list(),
      stats: this.service.stats(),
    }).subscribe({
      next: ({ list, stats }) => {
        this.consumptions.set(list);
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  remove(c: Consumption): void {
    if (!confirm(`Retirer "${c.product.name}" de votre suivi ?`)) return;
    this.service.remove(c.id).subscribe({
      next: () => this.fetch(),
    });
  }
}
