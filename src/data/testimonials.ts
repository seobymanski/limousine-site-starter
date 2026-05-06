/**
 * Customer testimonials — surfaced on the homepage, about page, and select
 * service pages.
 *
 * TODO (per-client): replace with real published reviews from the client's
 * Google Business Profile, Yelp, or other public sources. Empty array is
 * also fine — testimonial sections render gracefully when there are zero
 * entries.
 */

export interface Testimonial {
  name: string
  quote: string
  role?: string
  rating: number
  source?: string
}

export const testimonials: Testimonial[] = [
  {
    name: 'Sample Reviewer',
    quote:
      'Replace this entry with real customer testimonials sourced from the client\'s Google Business Profile or other public review platforms. Keep it three to five entries — long lists tire the eye.',
    rating: 5,
    source: 'Google',
  },
]
