export type StepType =
  | 'matiere_premiere'
  | 'fabrication'
  | 'transport'
  | 'distribution';

export type TransportMode = 'camion' | 'bateau' | 'avion' | 'train' | 'aucun';

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  matiere_premiere: 'Matiere premiere',
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

/** Info sur l'entreprise ayant saisi une etape (multi-entreprise) */
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
  /** Hash SHA-256 chaine de l'etape */
  hash?: string | null;
  /**
   * Positions des etapes parentes dans ce produit (DAG parent->enfant).
   * Ex: [1, 2] = cette etape depend des etapes a position 1 et 2.
   * [] = etape racine (aucun parent).
   */
  parent_positions?: number[];
  /** Entreprise ayant saisi cette etape. null = owner du produit. */
  contributor?: StepContributor | null;
  /** ID du produit GreenPath amont integre dans cette etape */
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
  /** True si la chaine de hashes est coherente avec le contenu des etapes */
  chain_valid?: boolean;
  /** Nombre d'entreprises tierces ayant acces en ecriture */
  contributor_count?: number;
}

/** Entreprise tierce ayant acces a un produit */
export interface Contributor {
  user_id: number;
  company_name: string;
  email: string;
  scope: string;
  granted_at: string;
  granted_by_name?: string | null;
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
