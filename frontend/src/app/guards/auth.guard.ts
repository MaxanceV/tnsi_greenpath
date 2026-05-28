/**
 * Garde-fous de routage selon l'état d'authentification.
 *
 * - `authGuard`     : bloque l'accès aux pages internes si non connecté.
 * - `adminGuard`    : réservé au rôle `admin` (pages d'administration).
 * - `staffGuard`    : admin ou entreprise (pages d'édition de produits).
 * - `consumerGuard` : admin ou consommateur (page de suivi personnel).
 * - `guestGuard`    : empêche d'afficher login/signup si déjà connecté
 *                     (redirige vers la home par rôle).
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  router.navigateByUrl(auth.defaultRoute());
  return false;
};

export const staffGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.currentUser()?.role;
  if (role === 'admin' || role === 'entreprise') return true;
  router.navigateByUrl(auth.defaultRoute());
  return false;
};

export const consumerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.currentUser()?.role;
  if (role === 'consommateur' || role === 'admin') return true;
  router.navigateByUrl(auth.defaultRoute());
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  router.navigateByUrl(auth.defaultRoute());
  return false;
};
