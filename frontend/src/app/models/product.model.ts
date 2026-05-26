export type StepType =
  | 'matiere_premiere'
  | 'fabrication'
  | 'transport'
  | 'distribution';

export type TransportMode = 'camion' | 'bateau' | 'avion' | 'train' | 'aucun';

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  matiere_premiere: 'Matière première',
  fabrication: 'Fabrication',
  transport: 'Transport',
  distribution: 'Distribution',
};

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  camion: 'Camion',
  bateau: 'Bateau',
  avion: 'Avion',
  train: 'Train',
  aucun: 'Aucun',
};

export interface Step {
  id?: number;
  product_id?: number;
  position: number;
  name: string;
  step_type: StepType;
  supplier?: string | null;
  location?: string | null;
  weight_kg: number;
  transport_mode?: TransportMode | null;
  distance_km?: number | null;
  co2_kg?: number;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  steps: Step[];
  total_co2_kg?: number;
}

export interface DashboardStats {
  product_count: number;
  step_count: number;
  total_co2_kg: number;
  avg_co2_kg: number;
}

export interface ProductPayload {
  name: string;
  description?: string | null;
  steps: Step[];
}
