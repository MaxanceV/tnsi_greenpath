import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<nav class="nav">
  <a routerLink="/" class="nav-logo">
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#10b981"/><path d="M20 9C13 13,10 20,13 27C16 34,26 34,29 27C32 20,29 13,23 10" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="20" cy="20" r="4" fill="white"/></svg>
    GreenPath
  </a>
  <div class="nav-links">
    <a routerLink="/search" class="nav-link">Rechercher un produit</a>
    <ng-container *ngIf="!auth.isAuthenticated()">
      <a routerLink="/login" class="nav-link">Connexion</a>
      <a href="mailto:contact&#64;greenpath.fr?subject=Devis GreenPath" class="btn-cta">Demander un devis</a>
    </ng-container>
    <a *ngIf="auth.isAuthenticated()" [routerLink]="auth.defaultRoute()" class="btn-cta">Mon dashboard</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-inner">
    <div class="hero-badge"><span class="dot"></span>Tracabilite GS1 · Blockchain SHA-256</div>
    <h1>La supply chain,<br><em>transparente enfin.</em></h1>
    <p class="hero-sub">GreenPath lie chaque produit a son histoire complete, de la matiere premiere jusqu au rayon, et la rend lisible en un scan.</p>
    <div class="hero-btns">
      <a routerLink="/search" class="btn-primary">Scanner un produit</a>
      <a href="mailto:contact&#64;greenpath.fr?subject=Devis GreenPath" class="btn-ghost">Je suis une entreprise</a>
    </div>
    <div class="hero-stats">
      <div class="stat"><span class="sn">100%</span><span class="sl">Transparent</span></div>
      <div class="sdiv"></div>
      <div class="stat"><span class="sn">GS1</span><span class="sl">Standard mondial</span></div>
      <div class="sdiv"></div>
      <div class="stat"><span class="sn">0</span><span class="sl">Compromis ethique</span></div>
    </div>
  </div>
  <div class="phone-wrap">
    <div class="phone">
      <div class="pscreen">
        <div class="phead"><svg width="12" height="12" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#10b981"/><circle cx="20" cy="20" r="6" fill="white"/></svg> GreenPath</div>
        <div class="pbadge">Tracabilite verifiee</div>
        <div class="pname">Tablette praline amande</div>
        <div class="pco2">0.79 kg CO2 · 6 etapes</div>
        <div class="pstep green">1 Cacao Ghana</div>
        <div class="pstep blue">3 Transport maritime</div>
        <div class="pstep purple">5 Fabrication</div>
        <div class="pqr"><svg width="52" height="52" viewBox="0 0 52 52"><rect width="52" height="52" fill="white" rx="4"/><rect x="4" y="4" width="18" height="18" rx="2" fill="#064e3b"/><rect x="7" y="7" width="12" height="12" rx="1" fill="white"/><rect x="9" y="9" width="8" height="8" rx="1" fill="#064e3b"/><rect x="30" y="4" width="18" height="18" rx="2" fill="#064e3b"/><rect x="33" y="7" width="12" height="12" rx="1" fill="white"/><rect x="35" y="9" width="8" height="8" rx="1" fill="#064e3b"/><rect x="4" y="30" width="18" height="18" rx="2" fill="#064e3b"/><rect x="7" y="33" width="12" height="12" rx="1" fill="white"/><rect x="9" y="35" width="8" height="8" rx="1" fill="#064e3b"/><rect x="30" y="30" width="4" height="4" fill="#064e3b"/><rect x="36" y="30" width="4" height="4" fill="#064e3b"/><rect x="42" y="30" width="4" height="4" fill="#064e3b"/><rect x="30" y="36" width="4" height="4" fill="#064e3b"/><rect x="42" y="36" width="4" height="4" fill="#064e3b"/><rect x="36" y="42" width="4" height="4" fill="#064e3b"/><rect x="42" y="42" width="4" height="4" fill="#064e3b"/></svg></div>
      </div>
    </div>
  </div>
</section>

<section class="section bg-gray">
  <div class="inner">
    <div class="label green">Pour les consommateurs</div>
    <h2>Savoir d ou vient ce que vous achetez.</h2>
    <p class="sub">Un simple QR code sur l emballage suffit. Acces a l histoire complete du produit sans app, sans compte.</p>
    <div class="feat-grid">
      <div class="feat"><div class="ficon" style="background:#d1fae5;color:#065f46"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h3>Origine garantie</h3><p>Chaque etape est enregistree et infalsifiable grace a une chaine de signatures cryptographiques.</p></div>
      <div class="feat"><div class="ficon" style="background:#dbeafe;color:#1e40af"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><h3>Empreinte carbone</h3><p>Visualisez l impact CO2 de chaque etape et comparez vos achats en toute connaissance de cause.</p></div>
      <div class="feat"><div class="ficon" style="background:#fce7f3;color:#9d174d"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div><h3>Commerce equitable</h3><p>Identifiez les produits issus de filieres responsables et soutenez les producteurs locaux.</p></div>
      <div class="feat"><div class="ficon" style="background:#fef3c7;color:#92400e"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01"/></svg></div><h3>Standard GS1</h3><p>Base sur le GTIN-14, identifiant universel sur tous les codes-barres. Compatible tous smartphones.</p></div>
    </div>
    <div class="hiw">
      <p class="hiw-title">Comment ca marche en 3 secondes</p>
      <div class="hiw-row">
        <div class="hstep"><div class="hnum">1</div><h4>Scannez</h4><p>Le QR code sur l emballage</p></div>
        <div class="harr">&#8594;</div>
        <div class="hstep"><div class="hnum">2</div><h4>Decouvrez</h4><p>L histoire complete du produit</p></div>
        <div class="harr">&#8594;</div>
        <div class="hstep"><div class="hnum">3</div><h4>Faites confiance</h4><p>Donnees signees cryptographiquement</p></div>
      </div>
    </div>
    <div class="center"><a routerLink="/search" class="btn-primary">Essayez maintenant</a></div>
  </div>
</section>

<section class="section bg-dark">
  <div class="inner biz-grid">
    <div>
      <div class="label" style="color:#6ee7b7">Pour les entreprises</div>
      <h2 style="color:white">Differenciez-vous.<br>Prouvez vos engagements.</h2>
      <p style="color:rgba(255,255,255,0.7);margin-bottom:24px">73% des consommateurs prets a payer plus pour un produit transparent. GreenPath est votre avantage competitif.</p>
      <ul class="biz-list">
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Dashboard de gestion produits et supply chains</li>
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Multi-entreprises : invitez vos fournisseurs</li>
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Generation automatique de QR codes GS1</li>
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Calcul CO2 automatique par etape et par lot</li>
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Chaine blockchain SHA-256 infalsifiable</li>
        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Conformite AGEC et Green Claims Directive UE</li>
      </ul>
      <a href="mailto:contact&#64;greenpath.fr?subject=Devis GreenPath" class="btn-primary" style="margin-top:12px">Demander une demo gratuite</a>
    </div>
    <div>
      <div class="dash-card">
        <div class="dc-head"><svg width="12" height="12" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#10b981"/><circle cx="20" cy="20" r="6" fill="white"/></svg> Dashboard GreenPath</div>
        <div class="dc-stats"><div class="dc-s"><span class="dc-n">24</span><span class="dc-l">Produits</span></div><div class="dc-s"><span class="dc-n">138</span><span class="dc-l">Etapes</span></div><div class="dc-s"><span class="dc-n">7</span><span class="dc-l">Partenaires</span></div></div>
        <div class="dc-bar-row"><span class="dc-bl">CO2 moyen</span><div class="dc-bar"><div class="dc-fill" style="width:62%"></div></div><span class="dc-bv">0.62 kg</span></div>
      </div>
      <div class="dash-card" style="margin-top:12px">
        <div style="color:#6ee7b7;font-size:0.75rem;font-weight:700;margin-bottom:10px">Chaine verifiee</div>
        <div class="dc-step"><div class="dc-dot" style="background:#10b981"></div>Cacao Ghana - signe</div>
        <div class="dc-step"><div class="dc-dot" style="background:#3b82f6"></div>Transport maritime - signe</div>
        <div class="dc-step"><div class="dc-dot" style="background:#8b5cf6"></div>Fabrication - signe</div>
      </div>
    </div>
  </div>
</section>

<section class="section bg-white">
  <div class="inner">
    <div class="label green">Nos offres</div>
    <h2>Choisissez votre niveau de transparence</h2>
    <p class="sub">Toutes nos offres incluent la page consommateur publique et le QR code GS1. Sans engagement.</p>
    <div class="price-grid">
      <div class="price-card">
        <div class="pname">Starter</div>
        <div class="pdesc">Pour les artisans et petits producteurs</div>
        <ul class="pfeats">
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Jusqu a 10 produits traces</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>QR codes GS1 illimites</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Page publique personnalisee</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Calcul CO2 automatique</li>
          <li class="no"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Multi-entreprises</li>
          <li class="no"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>API et integrations</li>
        </ul>
        <a href="mailto:contact&#64;greenpath.fr?subject=Offre Starter" class="pbtn">Demander un devis</a>
      </div>
      <div class="price-card featured">
        <div class="fbadge">Le plus populaire</div>
        <div class="pname">Pro</div>
        <div class="pdesc">Pour les PME avec plusieurs gammes</div>
        <ul class="pfeats">
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Produits illimites</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>QR codes GS1 illimites</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Page publique personnalisee</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Calcul CO2 + rapport PDF</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Multi-entreprises (5 partenaires)</li>
          <li class="no"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>API et integrations ERP</li>
        </ul>
        <a href="mailto:contact&#64;greenpath.fr?subject=Offre Pro" class="pbtn pfeatbtn">Demander un devis</a>
      </div>
      <div class="price-card">
        <div class="pname">Enterprise</div>
        <div class="pdesc">Pour les grands groupes multi-sites</div>
        <ul class="pfeats">
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Tout l offre Pro</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Partenaires illimites</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>API REST complete + webhooks</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Integration ERP / WMS</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>SSO et gestion des acces</li>
          <li class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>SLA garanti + support dedie</li>
        </ul>
        <a href="mailto:contact&#64;greenpath.fr?subject=Offre Enterprise" class="pbtn">Contacter les ventes</a>
      </div>
    </div>
  </div>
</section>

<section class="section bg-dark center">
  <div class="inner">
    <h2 style="color:white">Pret a rendre votre supply chain transparente ?</h2>
    <p style="color:rgba(255,255,255,0.7);margin-bottom:32px">Rejoignez les entreprises qui font de la tracabilite un avantage, pas une contrainte.</p>
    <div class="cta-btns">
      <a href="mailto:contact&#64;greenpath.fr?subject=Devis GreenPath" class="btn-primary">Demander une demo</a>
      <a routerLink="/search" class="btn-ghost">Explorer les produits</a>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="footer-inner">
    <div class="fbrand"><svg width="22" height="22" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#10b981"/><path d="M20 9C13 13,10 20,13 27C16 34,26 34,29 27C32 20,29 13,23 10" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="20" cy="20" r="4" fill="white"/></svg> GreenPath</div>
    <div class="flinks">
      <a routerLink="/search">Rechercher</a>
      <a routerLink="/login">Connexion</a>
      <a href="mailto:contact&#64;greenpath.fr">contact&#64;greenpath.fr</a>
    </div>
    <span class="fcopy">2026 GreenPath</span>
  </div>
</footer>
  `,
  styles: [`
    *{box-sizing:border-box;margin:0;padding:0}
    :host{display:block;font-family:system-ui,-apple-system,sans-serif;color:#1f2937}
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:60px;background:rgba(6,78,59,0.95);backdrop-filter:blur(10px)}
    .nav-logo{display:flex;align-items:center;gap:8px;text-decoration:none;color:white;font-weight:700}
    .nav-links{display:flex;align-items:center;gap:20px}
    .nav-link{color:rgba(255,255,255,0.8);text-decoration:none;font-size:0.88rem}
    .nav-link:hover{color:white}
    .btn-cta{background:#10b981;color:white;padding:7px 16px;border-radius:7px;text-decoration:none;font-size:0.85rem;font-weight:600}
    .btn-cta:hover{background:#059669}
    .hero{min-height:100vh;display:flex;align-items:center;padding:80px 32px 60px;background:linear-gradient(145deg,#022c22 0%,#064e3b 45%,#065f46 100%);position:relative;overflow:hidden}
    .hero::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 55% 65% at 80% 50%,rgba(16,185,129,0.1) 0%,transparent 70%)}
    .hero-inner{position:relative;max-width:520px}
    .hero-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(16,185,129,0.18);border:1px solid rgba(16,185,129,0.35);color:#6ee7b7;padding:5px 13px;border-radius:999px;font-size:0.76rem;font-weight:500;margin-bottom:22px}
    .dot{width:6px;height:6px;background:#10b981;border-radius:50%;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
    .hero-inner h1{font-size:clamp(2.2rem,5vw,3.4rem);font-weight:900;color:white;line-height:1.1;margin-bottom:18px;letter-spacing:-0.02em}
    .hero-inner h1 em{color:#6ee7b7;font-style:normal}
    .hero-sub{color:rgba(255,255,255,0.72);font-size:1.05rem;line-height:1.6;margin-bottom:28px}
    .hero-btns{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:36px}
    .hero-stats{display:flex;align-items:center;gap:18px}
    .stat{display:flex;flex-direction:column;gap:2px}
    .sn{color:white;font-size:1.2rem;font-weight:800}
    .sl{color:rgba(255,255,255,0.5);font-size:0.68rem;text-transform:uppercase;letter-spacing:0.06em}
    .sdiv{width:1px;height:28px;background:rgba(255,255,255,0.15)}
    .phone-wrap{position:absolute;right:7%;bottom:0;width:220px;display:flex;align-items:flex-end}
    .phone{width:188px;background:#1f2937;border-radius:26px;padding:9px;box-shadow:0 28px 70px rgba(0,0,0,0.45);border:2px solid rgba(255,255,255,0.07);transform:perspective(700px) rotateY(-7deg) rotateX(3deg)}
    .pscreen{background:white;border-radius:18px;padding:13px}
    .phead{display:flex;align-items:center;gap:5px;font-size:0.67rem;font-weight:700;color:#064e3b;margin-bottom:10px}
    .pbadge{background:#d1fae5;color:#065f46;font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:999px;margin-bottom:5px;display:inline-block}
    .pname{font-size:0.75rem;font-weight:700;color:#1f2937;margin-bottom:2px}
    .pco2{font-size:0.62rem;color:#6b7280;margin-bottom:8px}
    .pstep{font-size:0.6rem;padding:3px 7px;border-radius:4px;font-weight:500;margin-bottom:3px}
    .pstep.green{background:#d1fae5;color:#065f46}
    .pstep.blue{background:#dbeafe;color:#1e40af}
    .pstep.purple{background:#ede9fe;color:#5b21b6}
    .pqr{display:flex;justify-content:center;margin-top:8px}
    .btn-primary{display:inline-flex;align-items:center;gap:7px;background:#10b981;color:white;padding:13px 26px;border-radius:9px;text-decoration:none;font-weight:700;font-size:0.92rem;transition:background 0.15s,transform 0.1s}
    .btn-primary:hover{background:#059669;transform:translateY(-1px)}
    .btn-ghost{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,0.1);color:white;padding:13px 26px;border-radius:9px;text-decoration:none;font-weight:600;font-size:0.92rem;border:1px solid rgba(255,255,255,0.25)}
    .btn-ghost:hover{background:rgba(255,255,255,0.18)}
    .section{padding:88px 32px}
    .inner{max-width:1040px;margin:0 auto}
    .bg-gray{background:#f9fafb}
    .bg-dark{background:linear-gradient(145deg,#022c22 0%,#064e3b 50%,#065f46 100%)}
    .bg-white{background:white}
    .label{font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px}
    .label.green{color:#10b981}
    .inner h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:800;line-height:1.15;letter-spacing:-0.02em;margin-bottom:14px}
    .sub{color:#6b7280;font-size:0.97rem;line-height:1.6;max-width:540px;margin-bottom:44px}
    .feat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-bottom:48px}
    .feat{background:white;border:1px solid #e5e7eb;border-radius:11px;padding:22px;transition:box-shadow 0.15s}
    .feat:hover{box-shadow:0 6px 20px rgba(0,0,0,0.07)}
    .ficon{width:42px;height:42px;border-radius:9px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
    .feat h3{font-size:0.97rem;font-weight:700;color:#1f2937;margin-bottom:7px}
    .feat p{font-size:0.84rem;color:#6b7280;line-height:1.55}
    .hiw{background:white;border:1px solid #e5e7eb;border-radius:14px;padding:28px;margin-bottom:36px}
    .hiw-title{font-size:0.87rem;font-weight:700;color:#374151;margin-bottom:24px;text-align:center}
    .hiw-row{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}
    .hstep{text-align:center;max-width:165px}
    .hnum{width:26px;height:26px;background:#d1fae5;color:#065f46;border-radius:50%;font-size:0.78rem;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 8px}
    .hstep h4{font-size:0.85rem;font-weight:700;color:#1f2937;margin-bottom:3px}
    .hstep p{font-size:0.75rem;color:#6b7280;line-height:1.45}
    .harr{font-size:1.3rem;color:#d1d5db;flex-shrink:0}
    .center{text-align:center}
    .biz-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
    .biz-list{list-style:none;display:flex;flex-direction:column;gap:11px;margin-bottom:10px}
    .biz-list li{display:flex;align-items:center;gap:9px;color:rgba(255,255,255,0.82);font-size:0.88rem}
    .dash-card{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:13px;padding:18px;backdrop-filter:blur(8px)}
    .dc-head{display:flex;align-items:center;gap:6px;color:#6ee7b7;font-size:0.75rem;font-weight:700;margin-bottom:14px}
    .dc-stats{display:flex;gap:20px;margin-bottom:14px}
    .dc-s{display:flex;flex-direction:column;gap:2px}
    .dc-n{color:white;font-size:1.2rem;font-weight:800}
    .dc-l{color:rgba(255,255,255,0.42);font-size:0.63rem}
    .dc-bar-row{display:flex;align-items:center;gap:7px}
    .dc-bl{color:rgba(255,255,255,0.48);font-size:0.68rem;white-space:nowrap}
    .dc-bar{flex:1;height:5px;background:rgba(255,255,255,0.1);border-radius:3px}
    .dc-fill{height:100%;background:#10b981;border-radius:3px}
    .dc-bv{color:#6ee7b7;font-size:0.68rem;white-space:nowrap}
    .dc-step{display:flex;align-items:center;gap:7px;color:rgba(255,255,255,0.72);font-size:0.76rem;margin-bottom:7px}
    .dc-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
    .price-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
    .price-card{border:1px solid #e5e7eb;border-radius:14px;padding:26px 22px;position:relative;transition:box-shadow 0.2s}
    .price-card:hover{box-shadow:0 10px 36px rgba(0,0,0,0.09)}
    .price-card.featured{border-color:#10b981;border-width:2px}
    .fbadge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#10b981;color:white;font-size:0.7rem;font-weight:700;padding:3px 13px;border-radius:999px;white-space:nowrap}
    .pname{font-size:1.15rem;font-weight:800;color:#1f2937;margin-bottom:7px}
    .pdesc{font-size:0.81rem;color:#6b7280;line-height:1.5;margin-bottom:22px;min-height:48px}
    .pfeats{list-style:none;display:flex;flex-direction:column;gap:9px;margin-bottom:26px}
    .pfeats li{display:flex;align-items:center;gap:7px;font-size:0.83rem}
    .pfeats li.ok{color:#374151}
    .pfeats li.no{color:#9ca3af}
    .pbtn{display:block;text-align:center;padding:11px;border-radius:7px;text-decoration:none;font-weight:700;font-size:0.88rem;border:2px solid #e5e7eb;color:#374151;transition:all 0.15s}
    .pbtn:hover{border-color:#10b981;color:#065f46}
    .pfeatbtn{background:#10b981;color:white;border-color:#10b981}
    .pfeatbtn:hover{background:#059669;border-color:#059669}
    .cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
    .footer{background:#0f172a;padding:28px 32px}
    .footer-inner{max-width:1040px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
    .fbrand{display:flex;align-items:center;gap:7px;color:white;font-weight:700}
    .flinks{display:flex;gap:20px;flex-wrap:wrap}
    .flinks a{color:rgba(255,255,255,0.48);text-decoration:none;font-size:0.81rem}
    .flinks a:hover{color:white}
    .fcopy{color:rgba(255,255,255,0.28);font-size:0.73rem}
  `],
})
export class LandingComponent {
  readonly auth = inject(AuthService);
}
