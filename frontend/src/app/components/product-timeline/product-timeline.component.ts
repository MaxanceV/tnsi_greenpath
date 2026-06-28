import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

import {
  Step,
  STEP_TYPE_LABELS,
  TRANSPORT_MODE_LABELS,
} from '../../models/product.model';

interface LayoutNode {
  step: Step;
  col: number;
  row: number;
  left: number;
  top: number;
  color: string;
}

interface DagArrow {
  d: string;
  color: string;
  markerId: string;
}

@Component({
  selector: 'app-product-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline-wrapper">

      <p *ngIf="!dagNodes.length" class="empty-msg">Aucune etape a afficher.</p>

      <div *ngIf="dagNodes.length" class="dag-scroll">
        <div class="dag-container"
             [style.width.px]="dagW"
             [style.height.px]="dagH">

          <svg class="dag-svg"
               [attr.width]="dagW"
               [attr.height]="dagH"
               xmlns="http://www.w3.org/2000/svg"
               aria-hidden="true">
            <defs>
              <marker *ngFor="let c of PALETTE"
                      [attr.id]="markerId(c)"
                      markerWidth="9" markerHeight="9"
                      refX="8" refY="4.5" orient="auto">
                <path d="M0,0 L9,4.5 L0,9 Z" [attr.fill]="c" stroke="none"/>
              </marker>
            </defs>
            <path *ngFor="let a of dagArrows"
                  [attr.d]="a.d"
                  [attr.stroke]="a.color"
                  stroke-width="2.5"
                  fill="none"
                  stroke-linecap="round"
                  [attr.marker-end]="'url(#' + a.markerId + ')'"/>
          </svg>

          <div *ngFor="let node of dagNodes"
               class="dag-card"
               [style.left.px]="node.left"
               [style.top.px]="node.top"
               [style.border-top-color]="node.color">

            <div class="card-header">
              <span class="step-pos" [style.background]="node.color">{{ node.step.position }}</span>
              <span class="step-name">{{ node.step.name }}</span>
            </div>

            <div class="card-badges">
              <span class="type-badge" [class]="'type-' + node.step.step_type">
                {{ stepTypeLabels[node.step.step_type] }}
              </span>
              <span class="co2-badge" *ngIf="node.step.co2_kg !== undefined">
                {{ node.step.co2_kg | number:'1.0-2' }} kg CO2
              </span>
            </div>

            <dl class="card-details">
              <ng-container *ngIf="node.step.supplier">
                <dt>Fournisseur</dt><dd>{{ node.step.supplier }}</dd>
              </ng-container>
              <ng-container *ngIf="node.step.location">
                <dt>Lieu</dt><dd>{{ node.step.location }}</dd>
              </ng-container>
              <dt>Poids</dt><dd>{{ node.step.weight_kg }} kg</dd>
              <ng-container *ngIf="node.step.transport_mode">
                <dt>Transport</dt><dd>{{ transportModeLabels[node.step.transport_mode] }}</dd>
              </ng-container>
              <ng-container *ngIf="node.step.distance_km !== null && node.step.distance_km !== undefined">
                <dt>Distance</dt><dd>{{ node.step.distance_km }} km</dd>
              </ng-container>
            </dl>

            <div class="upstream-tag" *ngIf="node.step.upstream_product_name">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Source : {{ node.step.upstream_product_name }}
            </div>

            <div class="contributor-tag" *ngIf="node.step.contributor">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
              Saisi par {{ node.step.contributor.company_name }}
            </div>

            <div class="hash-tag" *ngIf="node.step.hash">
              <span class="hash-label" [style.background]="node.color">Hash</span>
              <code>{{ node.step.hash.substring(0, 12) }}...</code>
            </div>

          </div>
        </div>
      </div>

      <div class="co2-summary" *ngIf="totalCo2 && totalCo2 > 0">
        <div class="co2-bar">
          <div *ngFor="let step of sortedSteps"
               class="co2-seg"
               [style.width.%]="percent(step.co2_kg ?? 0, totalCo2)"
               [style.background]="colorAt(step)"
               [title]="step.name + ' - ' + (step.co2_kg ?? 0) + ' kg CO2'">
          </div>
        </div>
        <div class="co2-legend">
          <div *ngFor="let step of sortedSteps" class="legend-item">
            <span class="legend-dot" [style.background]="colorAt(step)"></span>
            <span class="legend-name">{{ step.name }}</span>
            <span class="legend-pct">{{ percent(step.co2_kg ?? 0, totalCo2) | number:'1.0-0' }}%</span>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .timeline-wrapper { display: flex; flex-direction: column; gap: 20px; }
    .empty-msg { color: #6b7280; font-style: italic; }

    .dag-scroll { overflow-x: auto; overflow-y: visible; padding: 12px 4px 24px; }

    .dag-container { position: relative; }

    .dag-svg { position: absolute; top: 0; left: 0; pointer-events: none; overflow: visible; }

    .dag-card {
      position: absolute;
      width: 200px;
      min-height: 155px;
      background: white;
      border: 1px solid #e5e7eb;
      border-top: 3px solid #10b981;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 0.83rem;
      box-sizing: border-box;
      transition: box-shadow 0.15s;
    }
    .dag-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12); z-index: 1; }

    .card-header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
    .step-pos {
      color: white; min-width: 22px; height: 22px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.72rem; font-weight: 700; flex-shrink: 0; padding: 0 4px;
    }
    .step-name { font-weight: 600; color: #1f2937; line-height: 1.25; font-size: 0.84rem; }

    .card-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .type-badge { padding: 2px 7px; border-radius: 999px; font-size: 0.69rem; font-weight: 600; }
    .type-matiere_premiere { background: #d1fae5; color: #065f46; }
    .type-fabrication       { background: #dbeafe; color: #1e40af; }
    .type-transport         { background: #fef3c7; color: #92400e; }
    .type-distribution      { background: #fce7f3; color: #9d174d; }
    .co2-badge { font-size: 0.69rem; font-weight: 600; color: #0f5132; margin-left: auto; }

    .card-details {
      display: grid; grid-template-columns: auto 1fr;
      column-gap: 8px; row-gap: 2px; margin: 0 0 6px; font-size: 0.76rem;
    }
    .card-details dt { color: #6b7280; }
    .card-details dd { margin: 0; color: #1f2937; word-break: break-word; }

    .upstream-tag, .contributor-tag {
      display: flex; align-items: center; gap: 5px;
      font-size: 0.7rem; margin-top: 4px; padding: 3px 7px; border-radius: 4px;
    }
    .upstream-tag   { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .contributor-tag{ background: #f0fdf4; color: #065f46; border: 1px solid #bbf7d0; }

    .hash-tag { display: flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 0.7rem; }
    .hash-label {
      color: white; padding: 1px 6px; border-radius: 3px;
      font-size: 0.63rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    }
    .hash-tag code { font-family: ui-monospace, monospace; color: #065f46; font-size: 0.7rem; }

    .co2-summary { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; }
    .co2-bar { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: rgba(255,255,255,0.6); margin-bottom: 10px; }
    .co2-seg { transition: width 0.3s ease; }
    .co2-legend { display: flex; flex-wrap: wrap; gap: 10px; }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: #065f46; }
    .legend-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
    .legend-name { font-weight: 500; }
    .legend-pct  { color: #047857; font-weight: 600; }
  `],
})
export class ProductTimelineComponent implements OnChanges {
  @Input() steps: Step[] = [];
  @Input() totalCo2: number = 0;

  dagNodes: LayoutNode[] = [];
  dagArrows: DagArrow[] = [];
  dagW = 0;
  dagH = 0;
  sortedSteps: Step[] = [];

  readonly stepTypeLabels = STEP_TYPE_LABELS;
  readonly transportModeLabels = TRANSPORT_MODE_LABELS;

  readonly PALETTE = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
  ];

  private readonly CARD_W  = 200;
  private readonly CARD_H  = 165;
  private readonly COL_GAP = 72;
  private readonly ROW_GAP = 16;

  ngOnChanges(): void {
    this.sortedSteps = [...this.steps].sort((a, b) => a.position - b.position);
    this.buildDag();
  }

  colorAt(step: Step): string {
    return this.PALETTE[(step.position - 1) % this.PALETTE.length];
  }

  markerId(color: string): string {
    return 'gparr' + color.replace('#', '');
  }

  private buildDag(): void {
    if (!this.steps.length) {
      this.dagNodes = [];
      this.dagArrows = [];
      this.dagW = 0;
      this.dagH = 0;
      return;
    }

    const levelMap = new Map<number, number>();
    for (const s of this.steps) levelMap.set(s.position, 0);

    let changed = true;
    let guard = 0;
    while (changed && guard++ < 200) {
      changed = false;
      for (const s of this.steps) {
        for (const pp of s.parent_positions ?? []) {
          const parentLevel = levelMap.get(pp) ?? 0;
          if ((levelMap.get(s.position) ?? 0) <= parentLevel) {
            levelMap.set(s.position, parentLevel + 1);
            changed = true;
          }
        }
      }
    }

    const colGroups = new Map<number, Step[]>();
    for (const s of this.steps) {
      const col = levelMap.get(s.position) ?? 0;
      const g = colGroups.get(col) ?? [];
      g.push(s);
      colGroups.set(col, g);
    }
    for (const [, g] of colGroups) g.sort((a, b) => a.position - b.position);

    this.dagNodes = [];
    for (const [col, group] of colGroups) {
      group.forEach((s, row) => {
        this.dagNodes.push({
          step: s, col, row,
          left: col * (this.CARD_W + this.COL_GAP),
          top: row * (this.CARD_H + this.ROW_GAP),
          color: this.colorAt(s),
        });
      });
    }

    const maxCol = Math.max(...this.dagNodes.map(n => n.col));
    const maxRow = Math.max(...this.dagNodes.map(n => n.row));
    this.dagW = (maxCol + 1) * (this.CARD_W + this.COL_GAP) - this.COL_GAP + 24;
    this.dagH = (maxRow + 1) * (this.CARD_H + this.ROW_GAP) - this.ROW_GAP + 24;

    const byPos = new Map(this.dagNodes.map(n => [n.step.position, n]));
    this.dagArrows = [];
    for (const child of this.dagNodes) {
      for (const pp of child.step.parent_positions ?? []) {
        const parent = byPos.get(pp);
        if (!parent) continue;
        const x1 = parent.left + this.CARD_W;
        const y1 = parent.top + this.CARD_H / 2;
        const x2 = child.left;
        const y2 = child.top + this.CARD_H / 2;
        const mx = (x1 + x2) / 2;
        this.dagArrows.push({
          d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`,
          color: parent.color,
          markerId: this.markerId(parent.color),
        });
      }
    }
  }

  percent(value: number, total: number): number {
    if (!total) return 0;
    return (value / total) * 100;
  }
}
