import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { Batch, BatchPayload, BatchUpdatePayload, ContributorAdd, ContributorRead } from '../models/batch.model';

/**
 * Service HTTP pour les lots GS1 (Batches) et les contributeurs multi-entreprise.
 *
 * Batches : GET /batches, POST /batches, GET /batches/:id, PUT /batches/:id, DELETE /batches/:id
 * Contributors : GET/POST/DELETE /products/:id/contributors
 */
@Injectable({ providedIn: 'root' })
export class BatchService {
  private readonly http = inject(HttpClient);
  private readonly batchUrl = `${API_BASE_URL}/batches`;
  private readonly productUrl = `${API_BASE_URL}/products`;

  // ---- Batches ----

  listBatches(productId?: number): Observable<Batch[]> {
    const params = productId !== undefined ? `?product_id=${productId}` : '';
    return this.http.get<Batch[]>(`${this.batchUrl}${params}`);
  }

  getBatch(id: number): Observable<Batch> {
    return this.http.get<Batch>(`${this.batchUrl}/${id}`);
  }

  createBatch(payload: BatchPayload): Observable<Batch> {
    return this.http.post<Batch>(this.batchUrl, payload);
  }

  updateBatch(id: number, payload: BatchUpdatePayload): Observable<Batch> {
    return this.http.put<Batch>(`${this.batchUrl}/${id}`, payload);
  }

  deleteBatch(id: number): Observable<void> {
    return this.http.delete<void>(`${this.batchUrl}/${id}`);
  }

  // ---- Contributeurs ----

  listContributors(productId: number): Observable<ContributorRead[]> {
    return this.http.get<ContributorRead[]>(`${this.productUrl}/${productId}/contributors`);
  }

  addContributor(productId: number, payload: ContributorAdd): Observable<ContributorRead> {
    return this.http.post<ContributorRead>(`${this.productUrl}/${productId}/contributors`, payload);
  }

  removeContributor(productId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.productUrl}/${productId}/contributors/${userId}`);
  }
}
