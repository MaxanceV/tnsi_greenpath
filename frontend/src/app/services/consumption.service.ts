import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import {
  Consumption,
  ConsumptionCreate,
  ConsumptionStats,
} from '../models/consumption.model';

/**
 * Client HTTP du suivi de consommation (rôle consommateur).
 *
 * Toutes les méthodes requièrent un token JWT (intercepteur global) et
 * scope automatiquement les résultats au user courant côté backend.
 */
@Injectable({ providedIn: 'root' })
export class ConsumptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/consumption`;

  list(): Observable<Consumption[]> {
    return this.http.get<Consumption[]>(this.baseUrl);
  }

  add(payload: ConsumptionCreate): Observable<Consumption> {
    return this.http.post<Consumption>(this.baseUrl, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  stats(): Observable<ConsumptionStats> {
    return this.http.get<ConsumptionStats>(`${this.baseUrl}/stats`);
  }
}
