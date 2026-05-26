import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  STEP_TYPE_LABELS,
  StepType,
  TRANSPORT_MODE_LABELS,
  TransportMode,
} from '../../models/product.model';
import { ProductService } from '../../services/product.service';

const STEP_TYPES = Object.keys(STEP_TYPE_LABELS) as StepType[];
const TRANSPORT_MODES = Object.keys(TRANSPORT_MODE_LABELS) as TransportMode[];

const uniquePositionsValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const steps = control as FormArray;
  const positions = steps.controls.map((c) => Number(c.get('position')?.value));
  const dup = positions.length !== new Set(positions).size;
  return dup ? { duplicatePositions: true } : null;
};

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css',
})
export class ProductFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly stepTypes = STEP_TYPES;
  readonly transportModes = TRANSPORT_MODES;
  readonly stepTypeLabels = STEP_TYPE_LABELS;
  readonly transportModeLabels = TRANSPORT_MODE_LABELS;

  productId: number | null = null;
  loading = false;
  submitting = false;
  serverError: string | null = null;

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(500)]],
    steps: this.fb.array([], { validators: uniquePositionsValidator }),
  });

  get steps(): FormArray {
    return this.form.get('steps') as FormArray;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.productId = Number(idParam);
      this.loadProduct(this.productId);
    } else {
      this.addStep();
    }
  }

  private loadProduct(id: number): void {
    this.loading = true;
    this.productService.get(id).subscribe({
      next: (product) => {
        this.form.patchValue({
          name: product.name,
          description: product.description ?? '',
        });
        this.steps.clear();
        for (const step of product.steps) {
          this.steps.push(this.buildStepGroup(step));
        }
        this.loading = false;
      },
      error: () => {
        this.serverError = 'Impossible de charger le produit';
        this.loading = false;
      },
    });
  }

  private buildStepGroup(values?: Partial<{
    position: number;
    name: string;
    step_type: StepType;
    supplier: string | null;
    location: string | null;
    weight_kg: number;
    transport_mode: TransportMode | null;
    distance_km: number | null;
  }>): FormGroup {
    return this.fb.group({
      position: [
        values?.position ?? this.steps.length + 1,
        [Validators.required, Validators.min(1)],
      ],
      name: [values?.name ?? '', [Validators.required, Validators.maxLength(120)]],
      step_type: [values?.step_type ?? 'matiere_premiere', [Validators.required]],
      supplier: [values?.supplier ?? '', [Validators.maxLength(120)]],
      location: [values?.location ?? '', [Validators.maxLength(120)]],
      weight_kg: [
        values?.weight_kg ?? null,
        [Validators.required, Validators.min(0.0001)],
      ],
      transport_mode: [values?.transport_mode ?? ''],
      distance_km: [values?.distance_km ?? null, [Validators.min(0)]],
    });
  }

  addStep(): void {
    this.steps.push(this.buildStepGroup());
  }

  removeStep(index: number): void {
    this.steps.removeAt(index);
    this.renumberPositions();
  }

  moveStep(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.steps.length) return;
    const ctrl = this.steps.at(index);
    this.steps.removeAt(index);
    this.steps.insert(target, ctrl);
    this.renumberPositions();
  }

  private renumberPositions(): void {
    this.steps.controls.forEach((ctrl, i) => {
      ctrl.get('position')?.setValue(i + 1);
    });
  }

  hasError(control: AbstractControl | null, error: string): boolean {
    if (!control) return false;
    return control.touched && control.hasError(error);
  }

  submit(): void {
    this.serverError = null;
    if (this.form.invalid || this.steps.length === 0) {
      this.form.markAllAsTouched();
      if (this.steps.length === 0) {
        this.serverError = 'Ajoutez au moins une étape';
      }
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name.trim(),
      description: raw.description?.trim() || null,
      steps: raw.steps.map((s: any) => ({
        position: s.position,
        name: s.name.trim(),
        step_type: s.step_type,
        supplier: s.supplier?.trim() || null,
        location: s.location?.trim() || null,
        weight_kg: Number(s.weight_kg),
        transport_mode: s.transport_mode || null,
        distance_km:
          s.distance_km === null || s.distance_km === '' ? null : Number(s.distance_km),
      })),
    };

    this.submitting = true;
    const request$ =
      this.productId !== null
        ? this.productService.update(this.productId, payload)
        : this.productService.create(payload);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.submitting = false;
        const detail = err?.error?.detail;
        if (Array.isArray(detail)) {
          this.serverError = detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(' | ');
        } else if (typeof detail === 'string') {
          this.serverError = detail;
        } else {
          this.serverError = 'Erreur lors de l\'enregistrement';
        }
      },
    });
  }
}
