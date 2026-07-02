import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { API_BASE_URL } from '../config/api.config';
import { TokenResponse, User } from '../models/auth.model';
import { AuthService } from './auth.service';

const TOKEN_KEY = 'greenpath_token';
const USER_KEY = 'greenpath_user';

const mockUser: User = {
  id: 1,
  email: 'test@test.com',
  company_name: 'Test Co',
  role: 'entreprise',
  created_at: '2026-01-01T00:00:00Z',
  product_count: 0,
};

const mockTokenResponse: TokenResponse = {
  access_token: 'fake-jwt-token',
  token_type: 'bearer',
  user: mockUser,
};

describe('AuthService', () => {
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  function createService(): AuthService {
    return TestBed.inject(AuthService);
  }

  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('état initial', () => {
    it("n'est pas authentifié si localStorage est vide", () => {
      const service = createService();
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.currentUser()).toBeNull();
    });

    it('restaure l\'utilisateur depuis localStorage au démarrage', () => {
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
      const service = createService();
      expect(service.currentUser()).toEqual(mockUser);
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('ignore un localStorage corrompu sans planter', () => {
      localStorage.setItem(USER_KEY, '{not-json');
      const service = createService();
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('login', () => {
    it('envoie les identifiants au bon endpoint et persiste la session au succès', () => {
      const service = createService();
      service.login({ email: mockUser.email, password: 'secret' }).subscribe();

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: mockUser.email, password: 'secret' });
      req.flush(mockTokenResponse);

      expect(service.currentUser()).toEqual(mockUser);
      expect(service.isAuthenticated()).toBeTrue();
      expect(localStorage.getItem(TOKEN_KEY)).toBe('fake-jwt-token');
      expect(JSON.parse(localStorage.getItem(USER_KEY)!)).toEqual(mockUser);
    });

    it("ne modifie pas l'état si les identifiants sont refusés", () => {
      const service = createService();
      service.login({ email: mockUser.email, password: 'wrong' }).subscribe({ error: () => {} });

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
      req.flush({ detail: 'Identifiants invalides' }, { status: 401, statusText: 'Unauthorized' });

      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });

  describe('register', () => {
    it('persiste la session au succès', () => {
      const service = createService();
      service
        .register({ email: mockUser.email, password: 'secret', company_name: 'Test Co' })
        .subscribe();

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/register`);
      expect(req.request.method).toBe('POST');
      req.flush(mockTokenResponse);

      expect(service.currentUser()).toEqual(mockUser);
      expect(localStorage.getItem(TOKEN_KEY)).toBe('fake-jwt-token');
    });
  });

  describe('logout', () => {
    it('efface la session locale et redirige vers /login', () => {
      localStorage.setItem(TOKEN_KEY, 'fake-jwt-token');
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
      const service = createService();
      expect(service.isAuthenticated()).toBeTrue();

      service.logout();

      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(USER_KEY)).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('refreshMe', () => {
    it('met à jour currentUser et le localStorage depuis /auth/me', () => {
      const service = createService();
      const updatedUser: User = { ...mockUser, company_name: 'Nouveau nom' };

      service.refreshMe().subscribe();

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/me`);
      expect(req.request.method).toBe('GET');
      req.flush(updatedUser);

      expect(service.currentUser()).toEqual(updatedUser);
      expect(JSON.parse(localStorage.getItem(USER_KEY)!)).toEqual(updatedUser);
    });
  });

  describe('getToken', () => {
    it('retourne le token stocké', () => {
      localStorage.setItem(TOKEN_KEY, 'fake-jwt-token');
      const service = createService();
      expect(service.getToken()).toBe('fake-jwt-token');
    });

    it("retourne null si aucun token n'est stocké", () => {
      const service = createService();
      expect(service.getToken()).toBeNull();
    });
  });

  describe('signals dérivés du rôle', () => {
    it('isAdmin/isCompany/isConsumer reflètent le rôle courant', () => {
      localStorage.setItem(USER_KEY, JSON.stringify({ ...mockUser, role: 'admin' }));
      const service = createService();
      expect(service.isAdmin()).toBeTrue();
      expect(service.isCompany()).toBeFalse();
      expect(service.isConsumer()).toBeFalse();
    });
  });

  describe('defaultRoute', () => {
    it("renvoie '/my-consumption' pour un consommateur", () => {
      localStorage.setItem(USER_KEY, JSON.stringify({ ...mockUser, role: 'consommateur' }));
      const service = createService();
      expect(service.defaultRoute()).toBe('/my-consumption');
    });

    it("renvoie '/products' pour les autres rôles", () => {
      localStorage.setItem(USER_KEY, JSON.stringify({ ...mockUser, role: 'entreprise' }));
      const service = createService();
      expect(service.defaultRoute()).toBe('/products');
    });

    it("renvoie '/products' si personne n'est connecté", () => {
      const service = createService();
      expect(service.defaultRoute()).toBe('/products');
    });
  });
});
