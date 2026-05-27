/**
 * Garde-fous de routage selon l'état d'authentification.
 *
 * - `authGuard`  : bloque l'accès aux pages internes si non connecté
 *                  (redirige vers /login).
 * - `adminGuard` : bloque l'accès aux pages admin si rôle ≠ admin
 *                  (redirige vers /products).
 * - `guestGuard` : empêche d'afficher /login si déjà connecté
 *                  (redirige vers /products).
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
  router.navigate(['/products']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  router.navigate(['/products']);
  return false;
};
