import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { ChatRequest, ChatResponse } from '../models/chat.model';

/**
 * Client HTTP du chatbot RAG. Une seule méthode : envoyer une question
 * avec l'historique récent → recevoir la réponse + les sources utilisées.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/chat`;

  ask(payload: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.url, payload);
  }
}
