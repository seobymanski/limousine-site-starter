/**
 * Shared BlogPost type used by the Astro site + payload.ts fetcher.
 * Extend per client if additional fields are added to the Payload schema.
 *
 * For richText fields (body, locationSections.* and airportSections.* prose
 * blocks), the value is the HTML string produced by `lexicalToHtml` in
 * lib/payload.ts — drop into `set:html={...}`.
 */

export interface LocationSections {
  opening?: string;
  benefitsHeading?: string;
  benefitsBody?: string;
  about?: string;
  ctaHeading?: string;
  whatWeOffer?: string;
  topServices?: Array<{ heading: string; body: string }>;
  whyChooseUs?: string;
  pricing?: string;
  events?: string;
  neighborhoods?: string;
  venues?: string;
  closingCtaHeading?: string;
  faqs?: Array<{ question: string; answer: string }>;
}

export interface AirportSections {
  opening?: string;
  benefitsHeading?: string;
  benefitsBody?: string;
  about?: string;
  ctaHeading?: string;
  whatWeOffer?: string;
  topServices?: Array<{ heading: string; body: string }>;
  whyChooseUs?: string;
  fboOperators?: Array<{
    name: string;
    url?: string;
    terminal?: string;
    body?: string;
  }>;
  airportQuickFacts?: {
    runwayCount?: string;
    longestRunway?: string;
    elevation?: string;
    hours?: string;
    customsAvailable?: boolean;
    slotPPR?: string;
    body?: string;
    sourceUrl?: string;
  };
  driveTimes?: Array<{
    destination: string;
    range: string;
    url?: string;
    blurb?: string;
  }>;
  localConsiderations?: string;
  closingCtaHeading?: string;
  faqs?: Array<{ question: string; answer: string }>;
}

export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    role?: string;
    image?: string;
  };
  publishedDate: string;
  status: 'published' | 'draft';
  featuredImage?: string;
  featuredImageAlt?: string;
  bannerImage?: string;
  bannerImageAlt?: string;
  galleryImages?: Array<{ url: string; alt?: string; caption?: string }>;
  eventDetails?: {
    eventDate?: string;
    eventTime?: string;
    venue?: string;
    city?: string;
    price?: string;
    registrationUrl?: string;
    registrationLabel?: string;
  };
  buildingShowcase?: {
    architect?: string;
    yearBuilt?: string;
    style?: string;
    address?: string;
    city?: string;
    status?: string;
    tagline?: string;
    projectTeam?: Array<{ role: string; name: string; link?: string }>;
  };
  locationSections?: LocationSections;
  airportSections?: AirportSections;
  readingTime: number;
  metaTitle: string;
  metaDescription: string;
  relatedPosts: string[];
}
