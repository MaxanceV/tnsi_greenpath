import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- ══ NAV ══════════════════════════════════════════════════════════════ -->
    <nav class="nav">
      <a routerLink="/" class="nav-logo">
        <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="20" fill="#10b981"/>
          <path d="M20 9 C13 13,10 20,13 27C16 34,26 34,29 27C32 20,29 13,23 10"
                stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <circle cx="20" cy="20" r="4" fill="white"/>
        </svg>
        <span>GreenPath</span>
      </a>
      <div class="nav-links">
        <a routerLink="/search" class="nav-link">Rechercher un produit</a>
        <ng-container *ngIf="!auth.isAuthenticated()">
          <a routerLink="/login" class="nav-link">Connexion</a>
          <a href="mailto:contact@greenpath.fr?subject=Demande de devis GreenPath"
             class="btn-nav-cta">Demander un devis</a>
        </ng-container>
        <ng-container *ngIf="auth.isAuthenticated()">
          <a [routerLink]="auth.defaultRoute()" class="btn-nav-cta">Mon dashboard →</a>
        </ng-container>
      </div>
    </nav>

    <!-- ══ HERO ═════════════════════════════════════════════════════════════ -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          Traçabilité GS1 certifiée · Blockchain SHA-256
        </div>
        <h1>La supply chain,<br><em>transparente enfin.</em></h1>
        <p class="hero-sub">
          GreenPath lie chaque produit à son histoire complète — de la matière première
          jusqu'au rayon — et la rend lisible en un scan.
        </p>
        <div class="hero-ctas">
          <a routerLink="/search" class="btn-primary-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Scanner un produit
          </a>
          <a href="mailto:contact@greenpath.fr?subject=Demande de devis GreenPath"
             class="btn-secondary-lg">Je suis une entreprise →</a>
        </div>
        <div class="hero-stats">
          <div class="stat"><span class="stat-n">100%</span><span class="stat-l">Transparent</span></div>
          <div class="stat-sep"></div>
          <div class="stat"><span class="stat-n">GS1</span><span class="stat-l">Standard mondial</span></div>
          <div class="stat-sep"></div>
          <div class="stat"><span class="stat-n">0</span><span class="stat-l">Compromis éthique</span></div>
        </div>
      </div>
      <div class="hero-phone">
        <div class="phone-mock">
          <div class="phone-screen">
            <div class="phone-header">
              <svg width="14" height="14" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#10b981"/><circle cx="20" cy="20" r="6" fill="white"/></svg>
              <span>GreenPath</span>
            </div>
            <div class="phone-product">
              <div class="ph-badge">✓ Traçabilité vérifiée</div>
              <div class="ph-name">Tablette praliné amande</div>
              <div class="ph-co2">0.79 kg CO₂ · 6 étapes</div>
              <div class="ph-steps">
                <div class="ph-step green">① Cacao Ghana</div>
                <div class="ph-step blue">③ Transport maritime</div>
                <div class="ph-step purple">⑤ Fabrication</div>
              </div>
              <div class="ph-qr">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <rect width="52" height="52" fill="white" rx="4"/>
                  <rect x="4" y="4" width="18" height="18" rx="2" fill="#064e3b"/>
                  <rect x="7" y="7" width="12" height="12" rx="1" fill="white"/>
                  <rect x="9" y="9" width="8" height="8" rx="1" fill="#064e3b"/>
                  <rect x="30" y="4" width="18" height="18" rx="2" fill="#064e3b"/>
                  <rect x="33" y="7" width="12" height="12" rx="1" fill="white"/>
                  <rect x="35" y="9" width="8" height="8" rx="1" fill="#064e3b"/>
                  <rect x="4" y="30" width="18" height="18" rx="2" fill="#064e3b"/>
                  <rect x="7" y="33" width="12" height="12" rx="1" fill="white"/>
                  <rect x="9" y="35" width="8" height="8" rx="1" fill="#064e3b"/>
                  <rect x="30" y="30" width="4" height="4" fill="#064e3b"/>
                  <rect x="36" y="30" width="4" height="4" fill="#064e3b"/>
                  <rect x="42" y="30" width="4" height="4" fill="#064e3b"/>
                  <rect x="30" y="36" width="4" height="4" fill="#064e3b"/>
                  <rect x="42" y="36" width="4" height="4" fill="#064e3b"/>
                  <rect x="36" y="42" width="4" height="4" fill="#064e3b"/>
                  <rect x="42" y="42" width="4" height="4" fill="#064e3b"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ POUR LES CONSOMMATEURS ════════════════════════════════════════════ -->
    <section class="section consumer-section">
      <div class="section-inner">
        <div class="section-label green">Pour les consommateurs</div>
        <h2>Savoir d'où vient<br>ce que vous achetez.</h2>
        <p class="section-sub">
          Un simple QR code sur l'emballage suffit. En quelques secondes, accédez
          à l'histoire complète du produit — sans app, sans compte.
        </p>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon" style="background:#d1fae5;color:#065f46">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3>Origine garantie</h3>
            <p>Chaque étape — culture, transformation, transport — est enregistrée et infalsifiable grâce à une chaîne de signatures cryptographiques.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon" style="background:#dbeafe;color:#1e40af">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3>Empreinte carbone</h3>
            <p>Visualisez l'impact CO₂ de chaque étape de fabrication et comparez vos achats en toute connaissance de cause.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon" style="background:#fce7f3;color:#9d174d">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <h3>Commerce équitable</h3>
            <p>Identifiez les produits issus de filières responsables. Soutenez les producteurs locaux et les pratiques durables en connaissance de cause.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon" style="background:#fef3c7;color:#92400e">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01"/>
              </svg>
            </div>
            <h3>Standard GS1</h3>
            <p>Basé sur le GTIN-14, identifiant universel présent sur tous les codes-barres. Compatible avec tous les smartphones, aucune app à installer.</p>
          </div>
        </div>

        <div class="how-it-works">
          <div class="hiw-title">Comment ça marche en 3 secondes</div>
          <div class="hiw-steps">
            <div class="hiw-step">
              <div class="hiw-num">1</div>
              <div class="hiw-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01"/>
                </svg>
              </div>
              <h4>Scannez</h4>
              <p>Le QR code sur l'emballage avec l'appareil photo de votre téléphone</p>
            </div>
            <div class="hiw-arrow">→</div>
            <div class="hiw-step">
              <div class="hiw-num">2</div>
              <div class="hiw-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h4>Découvrez</h4>
              <p>L'histoire complète du produit, étape par étape, en temps réel</p>
            </div>
            <div class="hiw-arrow">→</div>
            <div class="hiw-step">
              <div class="hiw-num">3</div>
              <div class="hiw-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h4>Faites confiance</h4>
              <p>Les données sont signées cryptographiquement — impossibles à falsifier</p>
            </div>
          </div>
        </div>

        <div class="section-cta">
          <a routerLink="/search" class="btn-primary-lg">
            Essayez maintenant — c'est gratuit
          </a>
        </div>
      </div>
    </section>

    <!-- ══ POUR LES ENTREPRISES ══════════════════════════════════════════════ -->
    <section class="section biz-section">
      <div class="biz-bg"></div>
      <div class="section-inner biz-inner">
        <div class="biz-text">
          <div class="section-label white-label">Pour les entreprises</div>
          <h2 class="white-h2">Différenciez-vous.<br>Prouvez vos engagements.</h2>
          <p class="biz-sub">
            Dans un marché où 73 % des consommateurs sont prêts à payer plus
            pour un produit transparent*, GreenPath est votre avantage compétitif.
          </p>
          <ul class="biz-list">
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Dashboard de gestion de vos produits et supply chains
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Multi-entreprises : invitez vos fournisseurs à renseigner leurs étapes
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Génération automatique de QR codes GS1 imprimables
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Calcul CO₂ automatique par étape et par lot
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Chaîne blockchain SHA-256 — données infalsifiables et auditables
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Conformité réglementation AGEC et Green Claims Directive UE
            </li>
          </ul>
          <p class="biz-source">* Étude Nielsen 2023 — Consumer Sustainability Survey</p>
          <a href="mailto:contact@greenpath.fr?subject=Demande de devis GreenPath"
             class="btn-primary-lg">Demander une démo gratuite</a>
        </div>
        <div class="biz-visual">
          <div class="biz-card-stack">
            <div class="biz-card bc-1">
              <div class="bc-header">
                <svg width="14" height="14" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#10b981"/><circle cx="20" cy="20" r="6" fill="white"/></svg>
                Dashboard GreenPath
              </div>
              <div class="bc-stat-row">
                <div class="bc-stat"><span class="bc-n">24</span><span class="bc-l">Produits</span></div>
                <div class="bc-stat"><span class="bc-n">138</span><span class="bc-l">Étapes</span></div>
                <div class="bc-stat"><span class="bc-n">7</span><span class="bc-l">Partenaires</span></div>
              </div>
              <div class="bc-bar-row">
                <span class="bc-bar-label">CO₂ moyen</span>
                <div class="bc-bar"><div class="bc-bar-fill" style="width:62%"></div></div>
                <span class="bc-bar-val">0.62 kg</span>
              </div>
            </div>
            <div class="biz-card bc-2">
              <div class="bc-chain-title">Chaîne vérifiée ✓</div>
              <div class="bc-step"><div class="bc-dot" style="background:#10b981"></div><span>Cacao Ghana — signé</span></div>
              <div class="bc-step"><div class="bc-dot" style="background:#3b82f6"></div><span>Transport maritime — signé</span></div>
              <div class="bc-step"><div class="bc-dot" style="background:#8b5cf6"></div><span>Fabrication — signé</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ OFFRES ════════════════════════════════════════════════════════════ -->
    <section class="section pricing-section">
      <div class="section-inner">
        <div class="section-label green">Nos offres</div>
        <h2>Choisissez votre niveau<br>de transparence</h2>
        <p class="section-sub">Toutes nos offres incluent la page consommateur publique et le QR code GS1. Sans engagement.</p>

        <div class="pricing-grid">
          <div class="pricing-card">
            <div class="plan-name">Starter</div>
            <div class="plan-desc">Pour les artisans et petits producteurs qui veulent démarrer la traçabilité</div>
            <ul class="plan-features">
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Jusqu'à 10 produits tracés</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>QR codes GS1 illimités</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Page publique personnalisée</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Calcul CO₂ automatique</li>
              <li class="disabled"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Multi-entreprises</li>
              <li class="disabled"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>API & intégrations</li>
            </ul>
            <a href="mailto:contact@greenpath.fr?subject=Offre Starter GreenPath" class="btn-plan">Demander un devis</a>
          </div>

          <div class="pricing-card featured">
            <div class="featured-badge">Le plus populaire</div>
            <div class="plan-name">Pro</div>
            <div class="plan-desc">Pour les PME avec plusieurs gammes et des fournisseurs à intégrer</div>
            <ul class="plan-features">
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Produits illimités</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>QR codes GS1 illimités</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Page publique personnalisée</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Calcul CO₂ + rapport PDF</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Multi-entreprises (5 partenaires)</li>
              <li class="disabled"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>API & intégrations ERP</li>
            </ul>
            <a href="mailto:contact@greenpath.fr?subject=Offre Pro GreenPath" class="btn-plan featured-btn">Demander un devis</a>
          </div>

          <div class="pricing-card">
            <div class="plan-name">Enterprise</div>
            <div class="plan-desc">Pour les grands groupes avec des supply chains complexes et multi-sites</div>
            <ul class="plan-features">
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Tout l'offre Pro</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Partenaires illimités</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>API REST complète + webhooks</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Intégration ERP / WMS</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>SSO & gestion des accès</li>
              <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>SLA garanti + support dédié</li>
            </ul>
            <a href="mailto:contact@greenpath.fr?subject=Offre Enterprise GreenPath" class="btn-plan">Contacter les ventes</a>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ CTA FINALE ════════════════════════════════════════════════════════ -->
    <section class="cta-final">
      <div class="cta-bg"></div>
      <div class="cta-inner">
        <h2>Prêt à rendre votre<br>supply chain transparente ?</h2>
        <p>Rejoignez les entreprises qui font de la traçabilité un avantage, pas une contrainte.</p>
        <div class="cta-btns">
          <a href="mailto:contact@greenpath.fr?subject=Demande de devis GreenPath"
             class="btn-primary-lg">Demander une démo →</a>
          <a routerLink="/search" class="btn-ghost-lg">Explorer les produits</a>
        </div>
      </div>
    </section>

    <!-- ══ FOOTER ═════════════════════════════════════════════════════════════ -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="20" fill="#10b981"/>
            <path d="M20 9C13 13,10 20,13 27C16 34,26 34,29 27C32 20,29 13,23 10"
                  stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <circle cx="20" cy="20" r="4" fill="white"/>
          </svg>
          <span>GreenPath</span>
        </div>
        <div class="footer-links">
          <a routerLink="/search">Rechercher un produit</a>
          <a routerLink="/login">Connexion entreprise</a>
          <a href="mailto:contact@greenpath.fr">contact@greenpath.fr</a>
        </div>
        <div class="footer-legal">
          © 2026 GreenPath · Traçabilité & transparence des supply chains
        </div>
      </div>
    </footer>
  `,
  styles: [`
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :host { display: block; font-family: system-ui, -apple-system, sans-serif; color: #1f2937; }

    /* ── NAV ── */
    .nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 40px; height: 64px;
      background: rgba(6,78,59,0.92); backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none;
      color: white; font-weight: 700; font-size: 1.1rem; }
    .nav-links { display: flex; align-items: center; gap: 24px; }
    .nav-link { color: rgba(255,255,255,0.8); text-decoration: none; font-size: 0.9rem;
      transition: color 0.15s; }
    .nav-link:hover { color: white; }
    .btn-nav-cta {
      background: #10b981; color: white; padding: 8px 18px; border-radius: 8px;
      text-decoration: none; font-size: 0.88rem; font-weight: 600; transition: background 0.15s;
    }
    .btn-nav-cta:hover { background: #059669; }

    /* ── HERO ── */
    .hero {
      position: relative; min-height: 100vh; display: flex; align-items: center;
      overflow: hidden; padding: 80px 40px 60px;
    }
    .hero-bg {
      position: absolute; inset: 0;
      background: url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1600&q=80') center/cover no-repeat;
    }
    .hero-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(4,47,37,0.93) 0%, rgba(6,78,59,0.88) 50%, rgba(15,81,50,0.75) 100%);
    }
    .hero-content { position: relative; max-width: 560px; }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(16,185,129,0.2); border: 1px solid rgba(16,185,129,0.4);
      color: #6ee7b7; padding: 6px 14px; border-radius: 999px; font-size: 0.78rem;
      font-weight: 500; margin-bottom: 24px;
    }
    .badge-dot { width: 7px; height: 7px; background: #10b981; border-radius: 50%;
      animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .hero-content h1 {
      font-size: clamp(2.4rem, 5vw, 3.6rem); font-weight: 900; color: white;
      line-height: 1.1; margin-bottom: 20px; letter-spacing: -0.02em;
    }
    .hero-content h1 em { color: #6ee7b7; font-style: normal; }
    .hero-sub { color: rgba(255,255,255,0.75); font-size: 1.1rem; line-height: 1.6; margin-bottom: 32px; }
    .hero-ctas { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 40px; }
    .hero-stats { display: flex; align-items: center; gap: 20px; }
    .stat { display: flex; flex-direction: column; gap: 2px; }
    .stat-n { color: white; font-size: 1.3rem; font-weight: 800; }
    .stat-l { color: rgba(255,255,255,0.55); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; }
    .stat-sep { width: 1px; height: 32px; background: rgba(255,255,255,0.15); }

    /* Phone mockup */
    .hero-phone {
      position: absolute; right: 8%; bottom: 0; width: 240px;
      display: flex; align-items: flex-end; justify-content: center;
    }
    .phone-mock {
      width: 200px; background: #1f2937; border-radius: 28px; padding: 10px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.5);
      border: 2px solid rgba(255,255,255,0.08);
      transform: perspective(800px) rotateY(-8deg) rotateX(4deg);
    }
    .phone-screen { background: white; border-radius: 20px; overflow: hidden; padding: 14px; }
    .phone-header { display: flex; align-items: center; gap: 6px; font-size: 0.7rem;
      font-weight: 700; color: #064e3b; margin-bottom: 12px; }
    .ph-badge { background: #d1fae5; color: #065f46; font-size: 0.65rem; font-weight: 700;
      padding: 3px 8px; border-radius: 999px; margin-bottom: 6px; display: inline-block; }
    .ph-name { font-size: 0.78rem; font-weight: 700; color: #1f2937; margin-bottom: 3px; }
    .ph-co2 { font-size: 0.65rem; color: #6b7280; margin-bottom: 10px; }
    .ph-steps { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .ph-step { font-size: 0.63rem; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
    .ph-step.green { background: #d1fae5; color: #065f46; }
    .ph-step.blue  { background: #dbeafe; color: #1e40af; }
    .ph-step.purple{ background: #ede9fe; color: #5b21b6; }
    .ph-qr { display: flex; justify-content: center; }

    /* ── BUTTONS ── */
    .btn-primary-lg {
      display: inline-flex; align-items: center; gap: 8px;
      background: #10b981; color: white; padding: 14px 28px;
      border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 0.95rem;
      transition: background 0.15s, transform 0.1s; border: none; cursor: pointer;
    }
    .btn-primary-lg:hover { background: #059669; transform: translateY(-1px); }
    .btn-secondary-lg {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.12); color: white; padding: 14px 28px;
      border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.95rem;
      border: 1px solid rgba(255,255,255,0.25); transition: background 0.15s;
    }
    .btn-secondary-lg:hover { background: rgba(255,255,255,0.2); }
    .btn-ghost-lg {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.1); color: white; padding: 14px 28px;
      border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.95rem;
      border: 1px solid rgba(255,255,255,0.3); transition: background 0.15s;
    }
    .btn-ghost-lg:hover { background: rgba(255,255,255,0.2); }

    /* ── SECTIONS COMMUNES ── */
    .section { padding: 96px 40px; }
    .section-inner { max-width: 1080px; margin: 0 auto; }
    .section-label {
      font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
      margin-bottom: 16px;
    }
    .section-label.green { color: #10b981; }
    .section-label.white-label { color: #6ee7b7; }
    .section > .section-inner > h2,
    .section-inner > h2 {
      font-size: clamp(1.9rem, 3.5vw, 2.8rem); font-weight: 800; line-height: 1.15;
      letter-spacing: -0.02em; margin-bottom: 16px;
    }
    .section-sub { color: #6b7280; font-size: 1rem; line-height: 1.6; max-width: 560px; margin-bottom: 48px; }

    /* ── CONSUMER SECTION ── */
    .consumer-section { background: #f9fafb; }
    .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 56px; }
    @media (max-width: 640px) { .features-grid { grid-template-columns: 1fr; } }
    .feature-card {
      background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;
      transition: box-shadow 0.15s;
    }
    .feature-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .feature-icon { width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
    .feature-card h3 { font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 8px; }
    .feature-card p { font-size: 0.87rem; color: #6b7280; line-height: 1.6; }

    .how-it-works { background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; margin-bottom: 40px; }
    .hiw-title { font-size: 0.9rem; font-weight: 700; color: #374151; margin-bottom: 28px; text-align: center; }
    .hiw-steps { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
    .hiw-step { text-align: center; max-width: 180px; }
    .hiw-num {
      width: 28px; height: 28px; background: #d1fae5; color: #065f46;
      border-radius: 50%; font-size: 0.8rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;
    }
    .hiw-icon { margin-bottom: 8px; }
    .hiw-step h4 { font-size: 0.88rem; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
    .hiw-step p { font-size: 0.78rem; color: #6b7280; line-height: 1.5; }
    .hiw-arrow { font-size: 1.4rem; color: #d1d5db; flex-shrink: 0; }
    .section-cta { text-align: center; }

    /* ── BIZ SECTION ── */
    .biz-section { position: relative; overflow: hidden; }
    .biz-bg {
      position: absolute; inset: 0;
      background: url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80') center/cover no-repeat;
    }
    .biz-bg::after {
      content:''; position: absolute; inset:0;
      background: linear-gradient(135deg, rgba(4,47,37,0.97) 0%, rgba(6,78,59,0.93) 100%);
    }
    .biz-inner { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
    @media (max-width: 840px) { .biz-inner { grid-template-columns: 1fr; } }
    .white-h2 { color: white; }
    .biz-sub { color: rgba(255,255,255,0.7); font-size: 0.95rem; line-height: 1.6; margin-bottom: 28px; max-width: none; }
    .biz-list { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
    .biz-list li { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.85); font-size: 0.9rem; }
    .biz-source { color: rgba(255,255,255,0.35); font-size: 0.72rem; margin-bottom: 28px; }

    .biz-card-stack { position: relative; height: 300px; }
    .biz-card { position: absolute; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px; padding: 20px; backdrop-filter: blur(8px); }
    .bc-1 { top: 0; left: 0; right: 0; }
    .bc-2 { bottom: 0; right: -24px; left: 24px; }
    .bc-header { display: flex; align-items: center; gap: 7px; color: #6ee7b7; font-size: 0.78rem;
      font-weight: 700; margin-bottom: 16px; }
    .bc-stat-row { display: flex; gap: 24px; margin-bottom: 16px; }
    .bc-stat { display: flex; flex-direction: column; gap: 2px; }
    .bc-n { color: white; font-size: 1.3rem; font-weight: 800; }
    .bc-l { color: rgba(255,255,255,0.45); font-size: 0.65rem; }
    .bc-bar-row { display: flex; align-items: center; gap: 8px; }
    .bc-bar-label { color: rgba(255,255,255,0.5); font-size: 0.7rem; white-space: nowrap; }
    .bc-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; }
    .bc-bar-fill { height: 100%; background: #10b981; border-radius: 3px; }
    .bc-bar-val { color: #6ee7b7; font-size: 0.7rem; white-space: nowrap; }
    .bc-chain-title { color: #6ee7b7; font-size: 0.75rem; font-weight: 700; margin-bottom: 12px; }
    .bc-step { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.75); font-size: 0.78rem; margin-bottom: 8px; }
    .bc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

    /* ── PRICING ── */
    .pricing-section { background: white; }
    .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    @media (max-width: 840px) { .pricing-grid { grid-template-columns: 1fr; } }
    .pricing-card {
      border: 1px solid #e5e7eb; border-radius: 16px; padding: 28px 24px;
      position: relative; transition: box-shadow 0.2s;
    }
    .pricing-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.1); }
    .pricing-card.featured { border-color: #10b981; border-width: 2px; }
    .featured-badge {
      position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
      background: #10b981; color: white; font-size: 0.72rem; font-weight: 700;
      padding: 4px 14px; border-radius: 999px; white-space: nowrap;
    }
    .plan-name { font-size: 1.2rem; font-weight: 800; color: #1f2937; margin-bottom: 8px; }
    .plan-desc { font-size: 0.83rem; color: #6b7280; line-height: 1.5; margin-bottom: 24px; min-height: 52px; }
    .plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
    .plan-features li { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #374151; }
    .plan-features li.disabled { color: #9ca3af; }
    .btn-plan {
      display: block; text-align: center; padding: 12px; border-radius: 8px;
      text-decoration: none; font-weight: 700; font-size: 0.9rem; transition: all 0.15s;
      border: 2px solid #e5e7eb; color: #374151;
    }
    .btn-plan:hover { border-color: #10b981; color: #065f46; }
    .btn-plan.featured-btn { background: #10b981; color: white; border-color: #10b981; }
    .btn-plan.featured-btn:hover { background: #059669; border-color: #059669; }

    /* ── CTA FINALE ── */
    .cta-final { position: relative; overflow: hidden; padding: 100px 40px; text-align: center; }
    .cta-bg {
      position: absolute; inset: 0;
      background: url('https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80') center/cover no-repeat;
    }
    .cta-bg::after {
      content:''; position:absolute; inset:0;
      background: linear-gradient(rgba(4,47,37,0.92), rgba(6,78,59,0.92));
    }
    .cta-inner { position: relative; z-index: 1; max-width: 600px; margin: 0 auto; }
    .cta-inner h2 { font-size: clamp(1.8rem,3.5vw,2.6rem); font-weight: 800; color: white;
      margin-bottom: 16px; letter-spacing: -0.02em; }
    .cta-inner p { color: rgba(255,255,255,0.7); font-size: 1rem; margin-bottom: 36px; }
    .cta-btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

    /* ── FOOTER ── */
    .footer { background: #0f172a; padding: 32px 40px; }
    .footer-inner { max-width: 1080px; margin: 0 auto; display: flex; align-items: center;
      justify-content: space-between; flex-wrap: wrap; gap: 20px; }
    .footer-brand { display: flex; align-items: center; gap: 8px; color: white;
      font-weight: 700; font-size: 0.95rem; }
    .footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
    .footer-links a { color: rgba(255,255,255,0.5); text-decoration: none; font-size: 0.83rem;
      transition: color 0.15s; }
    .footer-links a:hover { color: white; }
    .footer-legal { color: rgba(255,255,255,0.3); font-size: 0.75rem; }
  `],
})
export class LandingComponent {
  readonly auth = inject(AuthService);
}
