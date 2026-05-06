/**
 * Site navigation structure used by Header.astro and Footer.astro.
 */

import { siteConfig } from './site-config';
import { airports } from './airports';

export const primaryNav = [
  {
    label: 'Services',
    href: '/services/',
    children: siteConfig.services.map((s) => ({
      label: s.name,
      href: `/services/${s.slug}/`,
    })),
  },
  {
    label: 'Cities',
    href: '/private-jet-transfer/',
    children: siteConfig.cities.slice(0, 8).map((c) => ({
      label: c.city,
      href: `/private-jet-transfer/${c.slug}/`,
    })),
  },
  {
    label: 'FBOs',
    href: '/airports/',
    children: airports.slice(0, 8).map((a) => ({
      label: `${a.icao} · ${a.name}`,
      href: `/airports/${a.slug}/`,
    })),
  },
  { label: 'Fleet', href: '/fleet/' },
  { label: 'About', href: '/about/' },
];

export const footerLinks = {
  services: siteConfig.services.map((s) => ({
    label: s.name,
    href: `/services/${s.slug}/`,
  })),
  company: [
    { label: 'About', href: '/about/' },
    { label: 'Fleet', href: '/fleet/' },
    { label: 'Cities', href: '/private-jet-transfer/' },
    { label: 'FBOs', href: '/airports/' },
    { label: 'Contact', href: '/contact/' },
  ],
};
