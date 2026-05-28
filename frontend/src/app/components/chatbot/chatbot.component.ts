import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ChatMessage, ChatSource } from '../../models/chat.model';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';

interface DisplayMessage extends ChatMessage {
  sources?: ChatSource[];
  error?: boolean;
}

/**
 * Widget chatbot RAG : bouton flottant en bas à droite, panel qui s'ouvre,
 * conversation avec historique, suggestions adaptées au rôle, affichage des
 * sources retournées par le retrieval.
 */
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button
      *ngIf="!open()"
      type="button"
      class="bubble"
      (click)="toggle()"
      aria-label="Ouvrir le chatbot"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="bubble-label">Chat GreenBot</span>
    </button>

    <div *ngIf="open()" class="panel">
      <header class="panel-header">
        <div>
          <h3>GreenBot</h3>
          <p class="panel-sub">Assistant carbone GreenPath · RAG</p>
        </div>
        <button type="button" class="btn-close" (click)="toggle()" aria-label="Fermer">✕</button>
      </header>

      <div class="messages" #messagesContainer>
        <div *ngIf="messages().length === 0" class="welcome">
          <p>Bonjour {{ firstName() }} ! Je peux analyser tes données GreenPath. Essaie par exemple :</p>
          <div class="suggestions">
            <button *ngFor="let s of suggestions()" type="button" class="suggestion" (click)="ask(s)">{{ s }}</button>
          </div>
        </div>

        <div *ngFor="let m of messages()" class="message" [class.user]="m.role === 'user'" [class.assistant]="m.role === 'assistant'">
          <div class="bubble-msg" [class.error]="m.error">{{ m.content }}</div>
          <div class="sources" *ngIf="m.role === 'assistant' && m.sources && m.sources.length > 0">
            <details>
              <summary>{{ m.sources.length }} source(s) utilisée(s)</summary>
              <ul>
                <li *ngFor="let s of m.sources">
                  <strong>{{ s.title }}</strong>
                  <span class="src-kind">[{{ s.kind }}]</span>
                  <span class="src-snippet">{{ s.snippet }}</span>
                </li>
              </ul>
            </details>
          </div>
        </div>

        <div *ngIf="loading()" class="message assistant">
          <div class="bubble-msg typing">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
      </div>

      <form class="input-row" (ngSubmit)="send()">
        <input
          type="text"
          [(ngModel)]="draft"
          name="draft"
          placeholder="Pose une question..."
          [disabled]="loading()"
          autocomplete="off"
        />
        <button type="submit" [disabled]="loading() || !draft.trim()">Envoyer</button>
      </form>
    </div>
  `,
  styles: [
    `
      :host { position: fixed; bottom: 20px; right: 20px; z-index: 5000; font-family: system-ui, -apple-system, sans-serif; }

      .bubble {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 12px 18px;
        border-radius: 999px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white; border: none;
        font-size: 0.92rem; font-weight: 600;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
        font-family: inherit;
      }
      .bubble:hover { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(16, 185, 129, 0.45); }
      .bubble-label { white-space: nowrap; }

      .panel {
        width: 380px;
        max-width: calc(100vw - 40px);
        height: 560px;
        max-height: calc(100vh - 100px);
        background: white;
        border-radius: 14px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
        display: flex; flex-direction: column;
        overflow: hidden;
        border: 1px solid #e5e7eb;
      }
      .panel-header {
        background: linear-gradient(135deg, #065f46, #10b981);
        color: white;
        padding: 14px 18px;
        display: flex; justify-content: space-between; align-items: center;
      }
      .panel-header h3 { margin: 0; font-size: 1.05rem; }
      .panel-sub { margin: 2px 0 0; font-size: 0.75rem; opacity: 0.85; }
      .btn-close {
        background: transparent; border: none; color: white;
        font-size: 1.2rem; cursor: pointer;
        width: 28px; height: 28px; border-radius: 6px;
      }
      .btn-close:hover { background: rgba(255, 255, 255, 0.15); }

      .messages {
        flex: 1; overflow-y: auto;
        padding: 16px;
        background: #f9fafb;
        display: flex; flex-direction: column; gap: 12px;
      }
      .welcome {
        background: white;
        padding: 14px;
        border-radius: 10px;
        border: 1px solid #e5e7eb;
      }
      .welcome p { margin: 0 0 10px; font-size: 0.88rem; color: #1f2937; }
      .suggestions { display: flex; flex-direction: column; gap: 6px; }
      .suggestion {
        text-align: left;
        background: #f0fdf4; color: #065f46;
        border: 1px solid #a7f3d0;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.82rem;
        font-family: inherit;
      }
      .suggestion:hover { background: #d1fae5; }

      .message { display: flex; flex-direction: column; gap: 4px; }
      .message.user { align-items: flex-end; }
      .message.assistant { align-items: flex-start; }
      .bubble-msg {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 0.92rem;
        line-height: 1.45;
        white-space: pre-wrap;
      }
      .message.user .bubble-msg {
        background: #10b981; color: white;
        border-bottom-right-radius: 4px;
      }
      .message.assistant .bubble-msg {
        background: white; color: #1f2937;
        border: 1px solid #e5e7eb;
        border-bottom-left-radius: 4px;
      }
      .bubble-msg.error { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

      .typing { display: flex; gap: 4px; padding: 14px 18px; }
      .dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #9ca3af;
        animation: bounce 1.2s infinite;
      }
      .dot:nth-child(2) { animation-delay: 0.2s; }
      .dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-4px); opacity: 1; }
      }

      .sources { font-size: 0.75rem; color: #6b7280; max-width: 85%; }
      .sources summary { cursor: pointer; padding: 4px 0; user-select: none; }
      .sources summary:hover { color: #065f46; }
      .sources ul { list-style: none; padding: 0; margin: 6px 0 0; display: flex; flex-direction: column; gap: 6px; }
      .sources li {
        background: #f3f4f6;
        padding: 6px 8px;
        border-radius: 6px;
        line-height: 1.4;
      }
      .src-kind {
        background: #e5e7eb;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        margin-left: 4px;
        text-transform: uppercase;
      }
      .src-snippet { display: block; margin-top: 3px; color: #4b5563; font-size: 0.72rem; }

      .input-row {
        display: flex; gap: 8px;
        padding: 12px;
        border-top: 1px solid #e5e7eb;
        background: white;
      }
      .input-row input {
        flex: 1;
        padding: 9px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.9rem;
        font-family: inherit;
      }
      .input-row input:focus { outline: 2px solid #10b981; outline-offset: -1px; border-color: #10b981; }
      .input-row button {
        background: #10b981; color: white;
        border: none; padding: 9px 14px;
        border-radius: 8px;
        font-size: 0.9rem; font-weight: 600;
        cursor: pointer; font-family: inherit;
      }
      .input-row button:hover:not(:disabled) { background: #059669; }
      .input-row button:disabled { background: #9ca3af; cursor: not-allowed; }
    `,
  ],
})
export class ChatbotComponent {
  private readonly chatService = inject(ChatService);
  private readonly auth = inject(AuthService);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  readonly open = signal<boolean>(false);
  readonly messages = signal<DisplayMessage[]>([]);
  readonly loading = signal<boolean>(false);
  draft = '';

  toggle(): void {
    this.open.update((v) => !v);
  }

  firstName(): string {
    const name = this.auth.currentUser()?.company_name || 'utilisateur';
    return name.split(' ')[0];
  }

  /** Suggestions de questions adaptées au rôle pour aider l'utilisateur à démarrer. */
  suggestions(): string[] {
    const role = this.auth.currentUser()?.role;
    if (role === 'consommateur') {
      return [
        'Quel est mon produit le plus émetteur en CO2 ?',
        'Compare les pommes locales et les avocats du Mexique',
        'Quels conseils pour réduire mon empreinte ?',
      ];
    }
    if (role === 'entreprise') {
      return [
        'Quelle est l\'étape la plus émettrice de mes produits ?',
        'Compare mes produits entre eux',
        'Quelles bonnes pratiques pour réduire mes émissions de transport ?',
      ];
    }
    return [
      'Quel produit a la plus grande empreinte CO2 ?',
      'Quelles entreprises utilisent le plus le transport maritime ?',
      'Donne-moi les ordres de grandeur ADEME pour le textile',
    ];
  }

  ask(question: string): void {
    this.draft = question;
    this.send();
  }

  send(): void {
    const question = this.draft.trim();
    if (!question || this.loading()) return;

    const history = this.messages().map((m) => ({ role: m.role, content: m.content }));
    this.messages.update((arr) => [...arr, { role: 'user', content: question }]);
    this.draft = '';
    this.loading.set(true);
    this.scrollToBottom();

    this.chatService.ask({ question, history }).subscribe({
      next: (res) => {
        this.messages.update((arr) => [
          ...arr,
          { role: 'assistant', content: res.answer, sources: res.sources },
        ]);
        this.loading.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        const detail = err?.error?.detail || 'Une erreur est survenue.';
        this.messages.update((arr) => [
          ...arr,
          { role: 'assistant', content: detail, error: true },
        ]);
        this.loading.set(false);
        this.scrollToBottom();
      },
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
