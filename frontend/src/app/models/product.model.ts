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

/** Info sur l'entreprise ayant saisi une étape (multi-entreprise) */
export interface StepContributor {
  id: number;
  company_name: string;
}

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
  /** Hash SHA-256 chaîné de l'étape (cf. services/blockchain.py côté back) */
  hash?: string | null;
  /**
   * Groupe de parallélisme : les étapes avec le même parallel_group
   * sont affichées côte à côte dans la timeline.
   * null = étape séquentielle classique.
   */
  parallel_group?: number | null;
  /** Entreprise ayant saisi cette étape. null = owner du produit. */
  contributor?: StepContributor | null;
  /** ID du produit GreenPath amont intégré dans cette étape */
  upstream_product_id?: number | null;
  upstream_batch_id?: number | null;
  upstream_product_name?: string | null;
}

export interface ProductOwner {
  id: number;
  company_name: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  /** GTIN-14 GS1 du produit (code-barres standard) */
  gtin?: string | null;
  created_at: string;
  steps: Step[];
  total_co2_kg?: number;
  owner?: ProductOwner | null;
  /** True si la chaîne de hashes est cohérente avec le contenu des étapes */
  chain_valid?: boolean;
  /** Nombre d'entreprises tierces ayant accès en écriture */
  contributor_count?: number;
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
  gtin?: string | null;
  steps: Step[];
}

/**
 * Groupe d'étapes pour la visualisation en timeline.
 * Les étapes séquentielles ont un groupe de 1 élément.
 * Les étapes parallèles sont regroupées dans le même tableau.
 */
export interface StepGroup {
  parallel_group: number | null;
  steps: Step[];
  isParallel: boolean;
}
