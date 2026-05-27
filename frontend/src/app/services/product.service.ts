import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { DashboardStats, Product, ProductPayload } from '../models/product.model';

/**
 * Client HTTP de l'API produits.
 *
 * Toutes les méthodes de CRUD sont automatiquement authentifiées via
 * l'intercepteur HTTP global. La méthode `getPublic` cible l'endpoint
 * public utilisé par la page consommateur (accessible via QR code).
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/products`;
  private readonly publicUrl = `${API_BASE_URL}/public/products`;

  list(): Observable<Product[]> {
    return this.http.get<Product[]>(this.baseUrl);
  }

  get(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  create(payload: ProductPayload): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, payload);
  }

  update(id: number, payload: ProductPayload): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  stats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/stats/summary`);
  }

  getPublic(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.publicUrl}/${id}`);
  }
}
