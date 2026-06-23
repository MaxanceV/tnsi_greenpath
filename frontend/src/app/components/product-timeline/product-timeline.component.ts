import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import {
  Step,
  STEP_TYPE_LABELS,
  StepGroup,
  StepType,
  TRANSPORT_MODE_LABELS,
  TransportMode,
} from '../../models/product.model';

/**
 * Composant de visualisation de la timeline d'un produit.
 *
 * Affiche les étapes sous forme de timeline horizontale avec flèches entre
 * les nœuds. Gère deux cas :
 * - Étapes séquentielles : affichées en ligne, reliées par une flèche →
 * - Étapes parallèles    : regroupées dans une colonne verticale au même
 *   niveau, avec une étiquette "// parallèle"
 *
 * L'algorithme de groupement :
 *   1. Trier les étapes par position.
 *   2. Regrouper les étapes ayant le même parallel_group non-null.
 *   3. Les étapes sans parallel_group (null) forment chacune un groupe solo.
 *   4. Les groupes sont ensuite ordonnés par la position minimale de leurs étapes.
 *
 * Utilisation :
 *   <app-product-timeline [steps]="product.steps" [totalCo2]="product.total_co2_kg" />
 */
@Component({
  selector: 'app-product-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline-wrapper">

      <!-- Ligne principale de la timeline -->
      <div class="timeline-track">
        <ng-container *ngFor="let group of stepGroups; let i = index; let last = last">

          <!-- Nœud (simple ou parallèle) -->
          <div class="timeline-node" [class.parallel-node]="group.isParallel">

            <!-- Carte(s) d'étape -->
            <div class="step-cards" [class.parallel-cards]="group.isParallel">
              <div
                *ngFor="let step of group.steps; let si = index"
                class="step-card"
                [class.parallel-card]="group.isParallel"
                [style.border-top-color]="colorFor(step)"
                [style.border-left-color]="group.isParallel ? colorFor(step) : ''"
              >
                <!-- En-tête de la carte -->
                <div class="card-header">
                  <span class="step-position" [style.background]="colorFor(step)">{{ step.position }}</span>
                  <span class="step-name">{{ step.name }}</span>
                </div>

                <!-- Badge type -->
                <div class="card-badges">
                  <span class="type-badge" [class]="'type-' + step.step_type">
                    {{ stepTypeLabels[step.step_type] }}
                  </span>
                  <span class="co2-badge" *ngIf="step.co2_kg !== undefined">
                    {{ step.co2_kg | number:'1.0-2' }} kg CO₂
                  </span>
                </div>

                <!-- Détails -->
                <dl class="card-details">
                  <ng-container *ngIf="step.supplier">
                    <dt>Fournisseur</dt>
                    <dd>{{ step.supplier }}</dd>
                  </ng-container>
                  <ng-container *ngIf="step.location">
                    <dt>Lieu</dt>
                    <dd>{{ step.location }}</dd>
                  </ng-container>
                  <dt>Poids</dt>
                  <dd>{{ step.weight_kg }} kg</dd>
                  <ng-container *ngIf="step.transport_mode">
                    <dt>Transport</dt>
                    <dd>{{ transportModeLabels[step.transport_mode] }}</dd>
                  </ng-container>
                  <ng-container *ngIf="step.distance_km !== null && step.distance_km !== undefined">
                    <dt>Distance</dt>
                    <dd>{{ step.distance_km }} km</dd>
                  </ng-container>
                </dl>

                <!-- Lien produit amont (multi-entreprise) -->
                <div class="upstream-tag" *ngIf="step.upstream_product_name">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  Source : {{ step.upstream_product_name }}
                </div>

                <!-- Contributeur externe -->
                <div class="contributor-tag" *ngIf="step.contributor">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  Saisi par {{ step.contributor.company_name }}
                </div>

                <!-- Hash blockchain (tronqué) -->
                <div class="hash-tag" *ngIf="step.hash">
                  <span class="hash-label">Hash</span>
                  <code>{{ step.hash.substring(0, 12) }}…</code>
                </div>
              </div>
            </div>
          </div>

          <!-- Flèche entre les nœuds (sauf après le dernier) -->
          <div class="timeline-arrow" *ngIf="!last" aria-hidden="true">
            <div class="arrow-line"></div>
            <svg class="arrow-head" width="10" height="16" viewBox="0 0 10 16" fill="none">
              <path d="M0 0 L10 8 L0 16" stroke="#10b981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>

        </ng-container>
      </div>

      <!-- Légende CO₂ par étape -->
      <div class="co2-summary" *ngIf="totalCo2 && totalCo2 > 0">
        <div class="co2-bar">
          <div
            *ngFor="let step of steps; let i = index"
            class="co2-seg"
            [style.width.%]="percent(step.co2_kg ?? 0, totalCo2)"
            [style.background]="colorFor(step)"
            [title]="step.name + ' — ' + (step.co2_kg ?? 0) + ' kg CO₂'"
          ></div>
        </div>
        <div class="co2-legend">
          <div *ngFor="let step of steps; let i = index" class="legend-item">
            <span class="legend-dot" [style.background]="colorFor(step)"></span>
            <span class="legend-name">{{ step.name }}</span>
            <span class="legend-pct">{{ percent(step.co2_kg ?? 0, totalCo2) | number:'1.0-0' }}%</span>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* ======= Wrapper ======= */
    .timeline-wrapper {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* ======= Track principale ======= */
    .timeline-track {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 0;
      overflow-x: auto;
      padding: 8px 4px 12px;
    }

    /* ======= Nœud ======= */
    .timeline-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 180px;
      max-width: 220px;
      flex-shrink: 0;
    }

    .parallel-node {
      min-width: 200px;
    }

    /* ======= Étiquette parallèle ======= */
    .parallel-label {
      margin-bottom: 6px;
      text-align: center;
    }

    .parallel-badge {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    /* ======= Cartes d'étapes ======= */
    .step-cards {
      display: flex;
      flex-direction: column;
      gap: 0;
      width: 100%;
    }

    .parallel-cards {
      gap: 8px;
    }

    .step-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-top: 3px solid #10b981;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 0.84rem;
      transition: box-shadow 0.15s;
    }

    .step-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .parallel-card {
      border-left: 3px solid #f59e0b;
    }

    /* ======= En-tête de carte ======= */
    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .step-position {
      color: white;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .step-name {
      font-weight: 600;
      color: #1f2937;
      line-height: 1.2;
      font-size: 0.85rem;
    }

    /* ======= Badges ======= */
    .card-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .type-badge {
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .type-matiere_premiere { background: #d1fae5; color: #065f46; }
    .type-fabrication { background: #dbeafe; color: #1e40af; }
    .type-transport { background: #fef3c7; color: #92400e; }
    .type-distribution { background: #fce7f3; color: #9d174d; }

    .co2-badge {
      font-size: 0.72rem;
      font-weight: 600;
      color: #0f5132;
      margin-left: auto;
    }

    /* ======= Détails ======= */
    .card-details {
      display: grid;
      grid-template-columns: auto 1fr;
      column-gap: 8px;
      row-gap: 2px;
      margin: 0 0 6px;
      font-size: 0.78rem;
    }

    .card-details dt { color: #6b7280; }
    .card-details dd { margin: 0; color: #1f2937; }

    /* ======= Tags spéciaux ======= */
    .upstream-tag,
    .contributor-tag {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      margin-top: 4px;
      padding: 3px 7px;
      border-radius: 4px;
    }

    .upstream-tag {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }

    .contributor-tag {
      background: #f0fdf4;
      color: #065f46;
      border: 1px solid #bbf7d0;
    }

    .hash-tag {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 4px;
      font-size: 0.72rem;
    }

    .hash-label {
      background: #16a34a;
      color: white;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .hash-tag code {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      color: #065f46;
      font-size: 0.72rem;
    }

    /* ======= Flèche entre nœuds ======= */
    .timeline-arrow {
      display: flex;
      align-items: center;
      padding: 0 4px;
      margin-top: 28px; /* aligne avec le haut des cartes */
      flex-shrink: 0;
    }

    .arrow-line {
      width: 24px;
      height: 2px;
      background: #10b981;
    }

    .arrow-head {
      flex-shrink: 0;
    }

    /* ======= Légende CO₂ ======= */
    .co2-summary {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 12px 16px;
    }

    .co2-bar {
      display: flex;
      height: 10px;
      border-radius: 5px;
      overflow: hidden;
      background: rgba(255,255,255,0.6);
      margin-bottom: 10px;
    }

    .co2-seg { transition: width 0.3s ease; }

    .co2-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.78rem;
      color: #065f46;
    }

    .legend-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }

    .legend-name { font-weight: 500; }
    .legend-pct { color: #047857; font-weight: 600; }

    /* ======= Responsive ======= */
    @media (max-width: 640px) {
      .timeline-track {
        flex-direction: column;
        align-items: stretch;
        overflow-x: visible;
      }

      .timeline-arrow {
        flex-direction: column;
        padding: 4px 0;
        margin-top: 0;
        align-items: flex-start;
        padding-left: 22px;
      }

      .arrow-line {
        width: 2px;
        height: 16px;
      }

      .arrow-head {
        transform: rotate(90deg);
      }

      .timeline-node {
        max-width: 100%;
        min-width: unset;
      }
    }
  `],
})
export class ProductTimelineComponent implements OnChanges {
  @Input() steps: Step[] = [];
  @Input() totalCo2: number = 0;

  stepGroups: StepGroup[] = [];

  readonly stepTypeLabels = STEP_TYPE_LABELS;
  readonly transportModeLabels = TRANSPORT_MODE_LABELS;

  private readonly palette = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
  ];

  ngOnChanges(): void {
    this.stepGroups = this.buildGroups(this.steps);
  }

  /**
   * Construit les groupes de steps pour la timeline.
   * Les étapes avec parallel_group identique sont regroupées.
   * L'ordre des groupes est déterminé par la position minimale du groupe.
   */
  buildGroups(steps: Step[]): StepGroup[] {
    const sorted = [...steps].sort((a, b) => a.position - b.position);
    const groupMap = new Map<number, Step[]>();
    const soloSteps: Step[] = [];

    for (const step of sorted) {
      if (step.parallel_group !== null && step.parallel_group !== undefined) {
        const g = groupMap.get(step.parallel_group) ?? [];
        g.push(step);
        groupMap.set(step.parallel_group, g);
      } else {
        soloSteps.push(step);
      }
    }

    // Construire la liste de groupes avec leur position minimale
    const groups: (StepGroup & { minPosition: number })[] = [];

    for (const step of soloSteps) {
      groups.push({
        parallel_group: null,
        steps: [step],
        isParallel: false,
        minPosition: step.position,
      });
    }

    for (const [pg, pgSteps] of groupMap.entries()) {
      const minPos = Math.min(...pgSteps.map((s) => s.position));
      groups.push({
        parallel_group: pg,
        steps: pgSteps,
        isParallel: true,
        minPosition: minPos,
      });
    }

    // Trier les groupes par position minimale
    groups.sort((a, b) => a.minPosition - b.minPosition);

    return groups.map(({ parallel_group, steps, isParallel }) => ({
      parallel_group,
      steps,
      isParallel,
    }));
  }

  colorFor(step: Step): string {
    // Couleur fixe par type d'étape pour la cohérence visuelle
    const typeColors: Record<string, string> = {
      matiere_premiere: '#10b981',
      fabrication: '#3b82f6',
      transport: '#f59e0b',
      distribution: '#ec4899',
    };
    return typeColors[step.step_type] ?? this.palette[step.position % this.palette.length];
  }

  percent(value: number, total: number): number {
    if (!total) return 0;
    return (value / total) * 100;
  }
}
