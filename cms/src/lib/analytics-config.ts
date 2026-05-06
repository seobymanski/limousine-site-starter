/**
 * Per-client analytics constants. Edit these once when setting up a new
 * client site. They feed every analytics module — DataForSEO competitor /
 * gap analysis, LLM mention detection, default keyword tracking location.
 *
 * EDIT PER CLIENT.
 */

/**
 * Bare site domain (no protocol, no path). Used by:
 *   - dataforseo-runner: pulls this domain's ranked-keyword profile every
 *     week and uses it as the baseline for competitor gap analysis.
 *   - llm-mentions: detects whether an LLM cited this domain in its answer.
 */
export const OUR_DOMAIN = 'example.com'

/**
 * Lowercase brand-name variants to detect in LLM responses. Include casual
 * spellings, punctuation variants, abbreviations, and any common typos.
 * The matcher is case-insensitive substring + word-ish boundary, so don't
 * include single common words that would false-positive.
 *
 * Example for a brand "Acme Co": ['acme co', 'acme', 'acme.co']
 */
// TODO (per-client): list every spelling/variation of the client's brand name
// so analytics can match brand mentions in tracked LLM/SERP results.
export const OUR_BRAND_VARIANTS: string[] = ['starter limo co', 'starter limo']

/**
 * Default geo location for tracked keywords. Used as the prefilled value
 * when a new keyword is added without specifying its own location, and as
 * the location label on bulk-imported keywords.
 *
 * Use "City, State, Country" for local SEO ("Austin, TX, USA"), or just a
 * country name for national tracking ("United States").
 */
export const DEFAULT_LOCATION = 'United States'

/**
 * Display name shown in the analytics admin UI ("Acme Co was mentioned in
 * 3 of 5 AI answers..."). Distinct from OUR_DOMAIN (which is the bare
 * domain used for substring/citation matching) so you can write the brand
 * however reads naturally.
 */
export const OUR_BRAND_DISPLAY = '[BRAND]'
