/**
 * URL de base de l'API backend, dérivée dynamiquement de l'hôte courant.
 *
 * - Si la page est ouverte sur http://localhost:4200 → API sur http://localhost:8000
 * - Si la page est ouverte sur http://192.168.1.42:4200 → API sur http://192.168.1.42:8000
 *
 * Permet l'accès LAN (téléphone sur le même Wi-Fi) sans config manuelle.
 */
export const API_BASE_URL: string =
  typeof window !== 'undefined' && window.location?.hostname
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000';
