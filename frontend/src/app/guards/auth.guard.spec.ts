import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';

import { UserRole } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { adminGuard, authGuard, consumerGuard, guestGuard, staffGuard } from './auth.guard';

describe('guards d\'authentification', () => {
  let router: jasmine.SpyObj<Router>;

  function configureAuth(overrides: {
    isAuthenticated?: boolean;
    isAdmin?: boolean;
    role?: UserRole;
  }): void {
    const authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'isAuthenticated',
      'isAdmin',
      'currentUser',
      'defaultRoute',
    ]);
    authServiceSpy.isAuthenticated.and.returnValue(overrides.isAuthenticated ?? false);
    authServiceSpy.isAdmin.and.returnValue(overrides.isAdmin ?? false);
    authServiceSpy.currentUser.and.returnValue(
      overrides.role ? ({ role: overrides.role } as ReturnType<AuthService['currentUser']>) : null,
    );
    authServiceSpy.defaultRoute.and.returnValue('/products');

    router = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: router },
      ],
    });
  }

  function run(guard: CanActivateFn): boolean {
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as boolean;
  }

  describe('authGuard', () => {
    it('autorise un utilisateur authentifié', () => {
      configureAuth({ isAuthenticated: true });
      expect(run(authGuard)).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('redirige vers /login si non authentifié', () => {
      configureAuth({ isAuthenticated: false });
      expect(run(authGuard)).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('adminGuard', () => {
    it('autorise un admin', () => {
      configureAuth({ isAdmin: true });
      expect(run(adminGuard)).toBeTrue();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('redirige un non-admin vers sa route par défaut', () => {
      configureAuth({ isAdmin: false });
      expect(run(adminGuard)).toBeFalse();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/products');
    });
  });

  describe('staffGuard', () => {
    it('autorise une entreprise', () => {
      configureAuth({ role: 'entreprise' });
      expect(run(staffGuard)).toBeTrue();
    });

    it('autorise un admin', () => {
      configureAuth({ role: 'admin' });
      expect(run(staffGuard)).toBeTrue();
    });

    it('refuse un consommateur et redirige vers sa route par défaut', () => {
      configureAuth({ role: 'consommateur' });
      expect(run(staffGuard)).toBeFalse();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/products');
    });

    it('refuse un visiteur non connecté', () => {
      configureAuth({});
      expect(run(staffGuard)).toBeFalse();
    });
  });

  describe('consumerGuard', () => {
    it('autorise un consommateur', () => {
      configureAuth({ role: 'consommateur' });
      expect(run(consumerGuard)).toBeTrue();
    });

    it('autorise un admin', () => {
      configureAuth({ role: 'admin' });
      expect(run(consumerGuard)).toBeTrue();
    });

    it('refuse une entreprise et redirige vers sa route par défaut', () => {
      configureAuth({ role: 'entreprise' });
      expect(run(consumerGuard)).toBeFalse();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/products');
    });
  });

  describe('guestGuard', () => {
    it('autorise un visiteur non connecté', () => {
      configureAuth({ isAuthenticated: false });
      expect(run(guestGuard)).toBeTrue();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('redirige un utilisateur déjà connecté vers sa route par défaut', () => {
      configureAuth({ isAuthenticated: true });
      expect(run(guestGuard)).toBeFalse();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/products');
    });
  });
});
