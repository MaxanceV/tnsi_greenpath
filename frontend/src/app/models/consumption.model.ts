export interface ConsumptionProductInfo {
  id: number;
  name: string;
  description?: string | null;
  total_co2_kg: number;
  owner_name?: string | null;
}

export interface Consumption {
  id: number;
  quantity: number;
  notes?: string | null;
  consumed_at: string;
  product: ConsumptionProductInfo;
  co2_kg: number;
}

export interface ConsumptionCreate {
  product_id: number;
  quantity?: number;
  notes?: string | null;
}

export interface ConsumptionStats {
  item_count: number;
  unique_product_count: number;
  total_co2_kg: number;
  avg_co2_per_item: number;
}
