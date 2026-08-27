/**
 * Fuseaux proposés dans les réglages.
 *
 * Liste courte et lisible plutôt que les ~600 identifiants IANA : l'objectif
 * est de définir ce que « aujourd'hui » signifie, pas de couvrir la planète.
 * Toute valeur IANA valide reste acceptée côté serveur.
 */
export const TIMEZONE_OPTIONS = [
  'Africa/Algiers',
  'Africa/Casablanca',
  'Africa/Tunis',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/London',
  'Europe/Brussels',
  'Europe/Zurich',
  'Europe/Lisbon',
  'America/Montreal',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'UTC',
] as const
