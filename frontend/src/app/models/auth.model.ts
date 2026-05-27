export type UserRole = 'admin' | 'entreprise';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Super Admin',
  entreprise: 'Entreprise',
};

export interface User {
  id: number;
  email: string;
  company_name: string;
  role: UserRole;
  created_at: string;
  product_count: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserCreate {
  email: string;
  password: string;
  company_name: string;
  role: UserRole;
}

export interface UserUpdate {
  company_name?: string;
  role?: UserRole;
  password?: string;
}
