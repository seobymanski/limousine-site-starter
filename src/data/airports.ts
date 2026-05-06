/**
 * Airports / FBOs the company services.
 *
 * - `slug` = lowercase ICAO (used in `/airports/[slug]/`).
 * - `cityCodes` = city slugs this airport serves (cross-links city pages
 *   ↔ airport pages).
 * - `fbos` = on-field FBO operators. Used by schema markup and as a hint
 *   to the AI generator when drafting airport-page content.
 *
 * The demo set below is enough for a fresh deploy to render. Replace with
 * the airports the client actually serves.
 */

export interface Airport {
  icao: string;
  iata?: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  cityCodes: string[]; // city slugs this airport serves
  fbos: string[];
  notes?: string;
}

export const airports: Airport[] = [
  // Demo set — a handful of major private aviation fields to keep the build
  // working out of the box. Replace with the client's real coverage.
  {
    icao: 'KTEB',
    iata: 'TEB',
    slug: 'kteb',
    name: 'Teterboro Airport',
    city: 'Teterboro, NJ',
    region: 'New York metro',
    cityCodes: ['new-york-city'],
    fbos: ['Meridian Teterboro', 'Signature Flight Support', 'Jet Aviation', 'Atlantic Aviation'],
    notes: 'Slot-controlled. Busiest private jet field on the East Coast.',
  },
  {
    icao: 'KOPF',
    iata: 'OPF',
    slug: 'kopf',
    name: 'Miami-Opa Locka Executive Airport',
    city: 'Opa-Locka, FL',
    region: 'Miami metro',
    cityCodes: ['miami'],
    fbos: ['Fontainebleau Aviation', 'Signature Flight Support', 'Atlantic Aviation', 'Million Air'],
  },
  {
    icao: 'KDAL',
    iata: 'DAL',
    slug: 'kdal',
    name: 'Dallas Love Field',
    city: 'Dallas, TX',
    region: 'Dallas metro',
    cityCodes: ['dallas'],
    fbos: ['Business Jet Center', 'Signature Flight Support'],
  },
  {
    icao: 'KVNY',
    iata: 'VNY',
    slug: 'kvny',
    name: 'Van Nuys Airport',
    city: 'Van Nuys, CA',
    region: 'Los Angeles metro',
    cityCodes: ['los-angeles'],
    fbos: ['Signature Flight Support', 'Jet Aviation', 'Castle & Cooke Aviation', 'Western Jet Aviation'],
  },
  {
    icao: 'KASE',
    iata: 'ASE',
    slug: 'kase',
    name: 'Aspen / Pitkin County Airport',
    city: 'Aspen, CO',
    region: 'Mountain',
    cityCodes: ['aspen'],
    fbos: ['Atlantic Aviation Aspen', 'Signature Flight Support'],
    notes: 'Slot-controlled. PPR required during peak ski weeks.',
  },
];

/** Look up airports by city slug. */
export function airportsByCity(citySlug: string): Airport[] {
  return airports.filter((a) => a.cityCodes.includes(citySlug));
}

/** Look up an airport by ICAO (case-insensitive). */
export function airportByCode(code: string): Airport | undefined {
  const lc = code.toLowerCase();
  return airports.find((a) => a.slug === lc);
}

/** All airport slugs — used for `/airports/index.astro` and dynamic routes. */
export const airportSlugs = airports.map((a) => a.slug);
