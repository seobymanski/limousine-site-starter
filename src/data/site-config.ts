/**
 * Site-wide configuration for the starter template.
 *
 * TODO (per-client): replace every value below with the client's real data.
 * Used by schema components, header, footer, contact page, and SEO meta.
 */

export const siteConfig = {
  // ---- Brand identity ----
  name: 'Starter Limo Co',
  fullName: 'Starter Limousine Company',
  shortName: 'Starter Limo',
  tagline: 'Premier Chauffeured Service',
  description:
    'Premier private jet ground transportation. Direct-to-FBO transfers, discrete VIP service, charter buses, and luxury chauffeurs.',
  founded: 2026,
  founder: 'Founder Name',

  // ---- Contact ----
  url: 'https://example.com',
  phone: '555.555.5555',
  phoneRaw: '+15555555555',
  phoneHref: 'tel:+15555555555',
  email: 'reservations@example.com',
  emailHref: 'mailto:reservations@example.com',

  /** Primary HQ — used in default schema markup */
  address: {
    street: '123 Main Street',
    city: 'Teterboro',
    state: 'NJ',
    zip: '07608',
    country: 'US',
    fbo: 'Meridian Teterboro',
    airport: 'KTEB',
  },

  /** Operating bases (add as many as the client has) */
  offices: [
    {
      label: 'Headquarters',
      city: 'Teterboro',
      state: 'NJ',
      zip: '07608',
      street: '123 Main Street',
      fbo: 'Meridian Teterboro',
      airport: 'KTEB',
      isHQ: true,
    },
  ],

  /** 24/7 reservations */
  hours: {
    label: 'Mon – Sun, 24 hours',
    detail: 'Reservations and dispatch available 24 hours a day, every day of the year.',
  },

  /** Strategic partnerships, certifications — leave empty if none */
  partnerships: {
    // caa: {
    //   name: 'strategic partnership',
    //   label: 'Official Luxury Chauffeured Partner of the CAA',
    // },
  },

  social: {
    facebook: '',
    instagram: '',
    linkedin: '',
    google: '',
  },

  /** Top-level service catalogue. Each slug must match an `/src/pages/services/<slug>.astro` page. */
  services: [
    {
      name: 'Private FBO Transfers',
      slug: 'private-fbo-transfers',
      shortDescription:
        'Direct-to-ramp pickup and drop-off at every major private aviation field. Step off the jet, your car is on the tarmac.',
    },
    {
      name: 'Luxury Ground Transportation',
      slug: 'luxury-ground-transportation',
      shortDescription:
        'Sedans, SUVs, and Sprinters for executive travel, hourly bookings, and city-to-city moves.',
    },
    {
      name: 'Charter Bus Service',
      slug: 'charter-bus-service',
      shortDescription:
        'Mini-coaches and full-size motor coaches for crews, corporate offsites, and group transfers.',
    },
    {
      name: 'Discrete VIP Transportation',
      slug: 'discrete-vip-transportation',
      shortDescription:
        'Quiet, named full-time chauffeurs for principals, talent, and family-office clients who require absolute privacy.',
    },
  ],

  /** Vehicle classes — populated by the demo fleet. Replace with the client's actual roster. */
  fleet: [
    { type: 'Sedan', capacity: 'Up to 3 passengers', detail: 'Cadillac XTS, Lincoln Continental, Mercedes S-Class' },
    { type: 'SUV', capacity: 'Up to 6 passengers', detail: 'Cadillac Escalade ESV, Chevrolet Suburban' },
    { type: 'Sprinter', capacity: 'Up to 14 passengers', detail: 'Mercedes-Benz Sprinter (executive interior)' },
    { type: 'Mini-coach', capacity: 'Up to 28 passengers', detail: 'Executive shuttle bus' },
    { type: 'Motor Coach', capacity: 'Up to 56 passengers', detail: 'Full-size charter bus' },
  ],

  /**
   * Service cities. Each slug becomes /private-jet-transfer/<slug>/.
   * The demo set below is enough for a fresh deploy to render. Add real
   * cities for the client and remove the demo entries.
   */
  cities: [
    { city: 'New York City', state: 'NY', slug: 'new-york-city', region: 'Northeast' },
    { city: 'Miami', state: 'FL', slug: 'miami', region: 'Southeast' },
    { city: 'Dallas', state: 'TX', slug: 'dallas', region: 'South' },
    { city: 'Los Angeles', state: 'CA', slug: 'los-angeles', region: 'West' },
    { city: 'Aspen', state: 'CO', slug: 'aspen', region: 'Mountain' },
  ],
}

export type SiteConfig = typeof siteConfig
