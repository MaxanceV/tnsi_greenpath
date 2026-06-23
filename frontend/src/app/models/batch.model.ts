/**
 * Modèles TypeScript pour les lots GS1 (Batch/Lot Number, AI 10).
 *
 * Un Batch représente un ensemble d'unités d'un produit fabriquées
 * dans un intervalle de temps donné. Il peut avoir des parents (lots
 * de matières premières) et des enfants (lots de produits finis).
 */

export interface BatchParentInfo {
  id: number;
  lot_number: string;
  sscc?: string | null;
  product_id: number;
  product_name?: string | null;
}

export interface Batch {
  id: number;
  lot_number: string;
  /** SSCC GS1 (18 chiffres) — identifiant d'expédition du lot */
  sscc?: string | null;
  product_id: number;
  product_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  created_at: string;
  parents: BatchParentInfo[];
  children: BatchParentInfo[];
}

export interface BatchPayload {
  lot_number: string;
  sscc?: string | null;
  product_id: number;
  start_date?: string | null;
  end_date?: string | null;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  parent_batch_ids: number[];
}

export interface BatchUpdatePayload {
  lot_number: string;
  sscc?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  parent_batch_ids?: number[];
}

export interface ContributorRead {
  user_id: number;
  company_name: string;
  email: string;
  scope: string;
  granted_at: string;
  granted_by_name?: string | null;
}

export interface ContributorAdd {
  user_email: string;
  scope: 'read' | 'write';
}
