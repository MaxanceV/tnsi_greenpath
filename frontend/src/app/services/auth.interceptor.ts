import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Intercepteur HTTP global :
 * - ajoute automatiquement l'en-tête `Authorization: Bearer <jwt>` sur
 *   toutes les requêtes sortantes si un token est présent ;
 * - intercepte les réponses 401 (token expiré ou révoqué) pour déconnecter
 *   l'utilisateur et le rediriger vers `/login`.
 *
 * Exception : un 401 sur `/auth/login` est laissé tel quel — c'est le
 * composant de login qui doit afficher le message d'erreur (sinon
 * l'intercepteur redirige vers /login et avale le message).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  const isLoginRequest = req.url.endsWith('/auth/login');

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && token && !isLoginRequest) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
