/**
 * Brand colors for the admin UI. When forking this starter for a new client,
 * edit the values in this file — every admin component reads from here so a
 * palette swap happens in one place.
 *
 * This starter uses a HYBRID layout: dark sidebar (yellow text on near-black)
 * with a light content area (dark text on warm paper). Both palettes are
 * exposed below.
 *
 * Quickest rebrand: change `primary`, `primaryRgb`, `primaryDark`,
 * `primaryDeep`, and `onPrimary`. Most surface colors only need touching if
 * you want a different content/sidebar contrast.
 *
 * For a translucent wash of the primary color (focus rings, hover tints),
 * use `primaryAlpha(0.18)` — any alpha works without declaring a new token.
 *
 * Defaults below are the starter's "yellow accent on warm-paper canvas" look.
 */

// Primary brand color in `r, g, b` digits — kept separate so the alpha helper
// below can build rgba() strings at any opacity. Must match `brand.primary`.
const primaryRgb = '255, 199, 0'

export const brand = {
  // === Core brand accent ===
  primary: '#FFC700',         // brand accent
  primaryRgb,                  // same color, RGB digits — for rgba() use
  primaryDark: '#d4a300',     // hover / pressed shade (slightly darker)
  primaryDeep: '#b08400',     // deep gold — section labels & accent text on light bg
  onPrimary: '#111111',       // text color when sitting on a primary-colored bg

  // === Light content surface (list views, edit forms, dashboard) ===
  surface: '#fafaf5',         // panels, list rows
  surfaceHover: '#fbfbf6',    // row hover
  surfaceCard: '#ffffff',     // inputs, focused states, pure-white cards
  surfaceBorder: '#e8e8e2',
  surfaceBorderLight: '#eeeee8',
  surfaceBorderStrong: '#363636',

  // Light-surface text
  textBody: '#0f0f0f',
  textMuted: '#636360',
  textSubtle: '#84847c',

  // === Dark sidebar palette ===
  sidebarBg: '#111111',
  sidebarLinkBg: '#1e1e1e',
  sidebarLinkHover: '#2a2a2a',
  sidebarLinkActive: '#363636',
  sidebarBorder: '#363636',
  sidebarText: '#e8e8e2',

  // === Dashboard card tokens (semantic aliases of the above) ===
  cardBodyBg: '#ffffff',
  cardBodyFg: '#636360',
  cardHeaderBg: '#FFC700',     // = primary
  cardHeaderFg: '#0f0f0f',     // = onPrimary
  cardBorder: '#e8e8e2',
  cardHoverBorder: 'rgba(176, 132, 0, 0.5)',
  cardHoverShadow: 'rgba(15, 15, 15, 0.35)',

  // Section heading color above each card grid
  sectionLabelFg: '#b08400',   // = primaryDeep
} as const

/**
 * Build a translucent wash of the primary brand color at the given alpha.
 *   primaryAlpha(0.18) → "rgba(255, 199, 0, 0.18)"
 */
export const primaryAlpha = (alpha: number): string =>
  `rgba(${primaryRgb}, ${alpha})`
