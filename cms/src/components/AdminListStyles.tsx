import React from 'react'

/**
 * Brand-wide admin re-skin for the limousine-site-starter.
 *
 * Resend/Linear-style chip aesthetic: rounded "button chip" nav rows,
 * column headers as chips, form inputs as chips, dashboard cards as
 * chips. The starter ships with a dark sidebar (#111) and a gold
 * accent (#FFC700), so we keep that identity and lean into it.
 *
 * Targets verified Payload v3 class names (extracted from
 * @payloadcms/next/dist/prod/styles.css and @payloadcms/ui/dist/styles.css):
 *   .nav__wrap          sidebar wrapper
 *   .nav__link          sidebar row link
 *   .nav__link.active   active sidebar row
 *   .nav__label         group label
 *   .nav-group          collapsible group container
 *   .nav-group__toggle  group caret toggle
 *   .app-header         top bar
 *   .search-filter      list-view search pill
 *   .search-filter__input  the actual input inside the search pill
 *   .collection-list    list-view container
 *   .btn--style-primary primary CTA
 *   .pill               status / version chips
 *   .field-type         form field wrapper
 *
 * Light-mode content area, dark sidebar. The CSS variables remain
 * untouched so dark mode still picks up the gold accent.
 *
 * No body-level overrides here: those caused white-screen crashes in
 * earlier iterations by interacting with Payload's own body styles.
 * Stay scoped.
 *
 * IMPORTANT for maintainers: this is a JS template literal. Never use
 * backticks inside the CSS (e.g. for an inline code sample in a comment)
 * because that closes the literal and breaks the build. Plain quotes only.
 */
const css = `
/* Hide Payload's default dashboard tiles. The DashboardCards component
   renders the same data with descriptions inline. The starter also has
   the previous .dashboard__card-list polish in custom.scss; those rules
   become inert once the parent tiles are display:none. */
.modular-dashboard,
.dashboard__card-list {
  display: none !important;
}

/* The manual Save button is replaced by the AutoSaveField indicator on
   every editable collection. Hide it (Payload renders it as id
   "action-save") but keep it in the DOM so the autosave field can
   still click it programmatically. */
#action-save,
button#action-save {
  display: none !important;
}

/* ------------------------------------------------------------------ */
/* Primary CTAs in brand gold                                          */
/* ------------------------------------------------------------------ */
.btn--style-primary {
  background: #FFC700 !important;
  border-color: #FFC700 !important;
  color: #111 !important;
}

.btn--style-primary:not([disabled]):hover {
  background: #d4a300 !important;
  border-color: #d4a300 !important;
  color: #111 !important;
}

/* ------------------------------------------------------------------ */
/* Sidebar — keep the dark surface, add chip-style nav items          */
/* ------------------------------------------------------------------ */
.nav,
.nav__wrap,
.template-default__nav {
  background: #111 !important;
  border-right: 1px solid #1e1e1e !important;
}

/* Whatever lives in the dark thin strip on the left of the nav (Payload's
   nav-toggler / open-state padding) — match the sidebar so we don't get a
   two-tone strip. */
.template-default__nav-toggler-wrapper,
.template-default__nav-toggler-container {
  background: #111 !important;
}

/* Group label ("Content", "Analytics", "Settings") in brand gold. The
   visible text inherits color from .nav-group__toggle (Payload sets it
   to elevation-400), so we override the toggle's color too — and force
   the chevron stroke to gold for consistency. */
.nav-group__toggle,
.nav-group__toggle:hover,
.nav-group__toggle:focus,
.nav-group__toggle:focus-visible,
.nav-group .nav__label,
.nav-group__toggle .nav__label,
.nav__label,
.nav-group__toggle * {
  color: #FFC700 !important;
  font-weight: 800 !important;
  font-size: 13px !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
}

.nav-group__toggle .stroke,
.nav-group__toggle:focus-visible .stroke {
  stroke: #FFC700 !important;
}

/* Each row link — chip-style button. Soft ivory text on dark elevation
   chips; gold-bordered active state. */
.nav__link,
.nav__link * {
  color: #e8e8e2 !important;
}

.nav__link {
  border-radius: 8px !important;
  margin: 3px 10px !important;
  padding: 8px 12px !important;
  font-weight: 500 !important;
  background: #1e1e1e !important;
  border: 1px solid #2a2a2a !important;
  text-decoration: none !important;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease !important;
}

.nav__link:hover,
.nav__link:hover * {
  color: #FFC700 !important;
}

.nav__link:hover {
  background: #2a2a2a !important;
  border-color: #363636 !important;
  text-decoration: none !important;
}

/* Kill any text-decoration underline Payload paints on nav anchors */
.nav__link,
.nav__link:hover,
.nav__link:focus,
.nav__link.active,
.nav__link.active:hover {
  text-decoration: none !important;
  box-shadow: none !important;
}

/* Active row — gold border + gold text so it stands out */
.nav__link.active,
.nav__link.active * {
  color: #FFC700 !important;
}

.nav__link.active {
  background: #2a2a2a !important;
  border-color: #FFC700 !important;
  font-weight: 600 !important;
}

.nav__link.active:hover,
.nav__link.active:hover * {
  color: #FFC700 !important;
}

.nav__link.active:hover {
  background: #363636 !important;
  border-color: #FFC700 !important;
}

/* Hide Payload's small left-edge active-indicator bar — the gold border
   already conveys the active state, the bar is visual noise. */
.nav__link-indicator {
  display: none !important;
}

/* Group caret toggle — same pill treatment */
.nav-group__toggle {
  border-radius: 8px !important;
  margin: 2px 10px !important;
  padding: 8px 12px !important;
}

.nav-group__toggle:hover {
  background: rgba(255, 199, 0, 0.08) !important;
}

html[data-theme='light'] .nav-group__toggle:hover {
  background: rgba(255, 199, 0, 0.08) !important;
}

/* Log-out row */
.nav__log-out {
  border-radius: 8px !important;
  margin: 2px 10px !important;
}

/* ------------------------------------------------------------------ */
/* Inputs / search — soft rounded pill                                 */
/* ------------------------------------------------------------------ */
.search-filter,
.collection-list__search-input {
  border-radius: 999px !important;
}

.search-filter:focus-within {
  border-color: #FFC700 !important;
  box-shadow: 0 0 0 3px rgba(255, 199, 0, 0.18) !important;
}

/* ------------------------------------------------------------------ */
/* Tables — airy rows                                                  */
/* ------------------------------------------------------------------ */
.collection-list thead th {
  font-size: 12px !important;
  font-weight: 600 !important;
  letter-spacing: 0.04em !important;
  text-transform: none !important;
  padding: 12px 14px !important;
}

.collection-list tbody td {
  padding: 14px !important;
  vertical-align: middle;
}

/* ------------------------------------------------------------------ */
/* Status pills (Published / Draft) fully rounded                      */
/* ------------------------------------------------------------------ */
.pill {
  border-radius: 999px !important;
  font-weight: 600 !important;
  letter-spacing: 0.02em !important;
}

/* ==================================================================
   List & edit views — port the same chip aesthetic into the main
   content area so collection pages feel cohesive with the sidebar.
   The content surface is light, so chips here use warm neutrals.
   ================================================================== */

/* Page titles — keep ink-black for legibility on light bg; the gold
   accent shows up via active tabs, hyperlinks, and primary CTAs. */
.list-header__title,
.collection-edit__header h1,
.global-edit__header h1,
h1.label-generic-doc-title,
.list-header h1 {
  color: #0f0f0f !important;
  font-weight: 800 !important;
  letter-spacing: -0.01em !important;
}

/* Tab labels: dark when active, with a gold underline so the brand
   accent picks up the focus. */
.tabs-field__tab-button {
  color: #84847c !important;
}

.tabs-field__tab-button.tabs-field__tab-button--active {
  color: #0f0f0f !important;
  border-bottom-color: #FFC700 !important;
  font-weight: 700 !important;
}

/* List-view table — soft hairlines + warm hover */
.collection-list table,
.relationship--has-many table {
  border-collapse: separate !important;
  border-spacing: 0 !important;
}

/* Column headers as chip-style buttons matching the sidebar nav.
   Shorter than form inputs — these are labels, not pressable. */
.collection-list thead th,
.relationship--has-many thead th {
  color: #0f0f0f !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.10em !important;
  text-transform: uppercase !important;
  background: #fafaf5 !important;
  border: 1px solid #e8e8e2 !important;
  border-radius: 6px !important;
  padding: 2px 10px !important;
  margin: 0 4px 4px 0 !important;
  white-space: nowrap !important;
}

/* Force the table to use border-spacing so the chips become discrete
   rectangles with predictable gaps between them. */
.collection-list .table table,
.collection-list table {
  border-collapse: separate !important;
  border-spacing: 12px 4px !important;
}

/* The row-select column is Payload's .cell-_select. Strip chip styling
   so it doesn't render as a button alongside the TITLE chip — it's
   just an inline checkbox. */
th.cell-_select,
td.cell-_select,
.cell-_select {
  background: transparent !important;
  border: 0 !important;
  padding: 0 !important;
  width: 30px !important;
  min-width: 30px !important;
  vertical-align: middle !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

/* And the indeterminate / select-all checkbox in the header row sits
   higher so it visually centers with the chip-style TITLE next to it. */
thead th.cell-_select,
thead th.cell-_select * {
  transform: translateY(-2px);
}

/* Force the sub-header (which holds the search bar + bulk-actions
   toolbar) to wrap so the toolbar can fall onto its own row when it
   appears, rather than crowding the search bar or column headers. */
.collection-list__sub-header,
.list-controls {
  flex-wrap: wrap !important;
  row-gap: 18px !important;
}

/* Bulk-actions toolbar (1 selected — Select all — Edit — Delete)
   gets its own full-width row above the column headers. */
.list-selection {
  display: flex !important;
  width: 100% !important;
  flex-basis: 100% !important;
  margin-top: 12px !important;
  margin-bottom: 12px !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding: 8px 0 !important;
  order: 10 !important;
}

/* Push the table down from the sub-header (which now grows when the
   toolbar wraps onto its own row). */
.collection-list__tables,
.table-wrap {
  margin-top: 16px !important;
  clear: both !important;
}

/* Sort icons in column headers — ink-black to match the chip text */
.collection-list thead th svg,
.collection-list thead th .stroke {
  stroke: #0f0f0f !important;
}

.collection-list thead th svg path,
.collection-list thead th svg polyline,
.collection-list thead th svg line {
  stroke: #0f0f0f !important;
}

/* Active-sort arrow gets the gold accent, idle arrow stays subtle */
.collection-list thead th .sort-column__asc--active svg,
.collection-list thead th .sort-column__desc--active svg {
  stroke: #d4a300 !important;
}

.collection-list thead th .sort-column__asc:not(.sort-column__asc--active) svg,
.collection-list thead th .sort-column__desc:not(.sort-column__desc--active) svg {
  opacity: 0.4;
}

.collection-list tbody tr {
  transition: background 0.12s ease !important;
}

.collection-list tbody tr:hover {
  background: #fbfbf6 !important;
}

.collection-list tbody td,
.relationship--has-many tbody td {
  border-bottom: 1px solid #eeeee8 !important;
  padding: 14px !important;
}

/* Title / first-column cell — ink-black at rest, gold on hover. */
.collection-list tbody td:first-child a,
.cell-title a {
  color: #0f0f0f !important;
  font-weight: 700 !important;
}

.collection-list tbody td:first-child a:hover,
.cell-title a:hover {
  color: #d4a300 !important;
}

/* Field labels in pewter caps */
.field-type__wrap > label,
.field-label,
label.field-type__label {
  color: #636360 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
}

/* Short inputs — chip-style: warm-paper bg, taupe border, ink-black
   text with a bold weight so the value reads as a pressable token.
   Mirrors the sidebar nav chip on a light surface. */
.field-type input[type='text'],
.field-type input[type='email'],
.field-type input[type='number'],
.field-type input[type='url'],
.field-type input[type='tel'],
.field-type input[type='password'],
.field-type input[type='search'],
.field-type input[type='date'],
.field-type__wrap input[type='text'],
.field-type__wrap input[type='email'],
.field-type__wrap input[type='number'],
.field-type__wrap input[type='url'],
.field-type__wrap input[type='tel'],
.field-type__wrap input[type='password'],
.field-type__wrap input[type='search'],
.field-type__wrap input[type='date'] {
  background: #fafaf5 !important;
  border: 1px solid #e8e8e2 !important;
  border-radius: 8px !important;
  color: #0f0f0f !important;
  font-weight: 700 !important;
  padding: 9px 14px !important;
  transition: background 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease !important;
}

.field-type input:focus,
.field-type__wrap input:focus {
  background: #ffffff !important;
  border-color: #FFC700 !important;
  box-shadow: 0 0 0 3px rgba(255, 199, 0, 0.18) !important;
  outline: none !important;
}

/* Textareas + rich-text bodies stay neutral for readability — long text
   in a heavy weight fatigues the eye. */
.field-type textarea,
.field-type__wrap textarea {
  background: #fbfbf6 !important;
  border: 1px solid #eeeee8 !important;
  border-radius: 8px !important;
}

.field-type textarea:focus,
.field-type__wrap textarea:focus {
  background: #ffffff !important;
  border-color: #FFC700 !important;
  box-shadow: 0 0 0 3px rgba(255, 199, 0, 0.18) !important;
  outline: none !important;
}

/* Select / react-select control — chip style to match short inputs */
.rs__control,
.field-type__wrap .rs__control {
  background: #fafaf5 !important;
  border-color: #e8e8e2 !important;
  border-radius: 8px !important;
  min-height: 40px !important;
}

.rs__single-value,
.field-type__wrap .rs__single-value {
  color: #0f0f0f !important;
  font-weight: 700 !important;
}

.rs__control--is-focused,
.field-type__wrap .rs__control--is-focused {
  background: #ffffff !important;
  border-color: #FFC700 !important;
  box-shadow: 0 0 0 3px rgba(255, 199, 0, 0.18) !important;
}

.rs__option--is-focused {
  background: #fafaf5 !important;
  color: #0f0f0f !important;
}

.rs__option--is-selected {
  background: #FFC700 !important;
  color: #111 !important;
}

/* Pagination */
.paginator__page,
.paginator__page-button {
  border-radius: 999px !important;
  border-color: #e8e8e2 !important;
  background: #fbfbf6 !important;
  color: #363636 !important;
}

.paginator__page--active,
.paginator__page-button--active {
  background: #FFC700 !important;
  color: #111 !important;
  border-color: #FFC700 !important;
}

/* "Create New" CTA in list-view sub-header gets the pill treatment */
.collection-list__sub-header .btn,
.list-controls .btn--style-primary {
  border-radius: 999px !important;
}

/* ------------------------------------------------------------------ */
/* Gold hyperlinks throughout (excluding nav, buttons, thumbnails)    */
/* ------------------------------------------------------------------ */
main a:not(.btn):not(.nav__link):not(.nav-group__toggle):not(.thumbnail__link),
.collection-list a:not(.btn),
.collection-edit a:not(.btn),
.global-edit a:not(.btn),
.step-nav a,
.breadcrumbs a,
.field-type a:not(.btn),
.relationship--single-value a,
.relationship-cell a {
  color: #b08400 !important;
  text-decoration: none !important;
}

main a:not(.btn):not(.nav__link):not(.nav-group__toggle):not(.thumbnail__link):hover,
.collection-list a:not(.btn):hover,
.collection-edit a:not(.btn):hover,
.global-edit a:not(.btn):hover,
.step-nav a:hover,
.breadcrumbs a:hover,
.field-type a:not(.btn):hover,
.relationship--single-value a:hover,
.relationship-cell a:hover {
  color: #d4a300 !important;
  text-decoration: underline !important;
}

/* List-view title cells: no underline at rest, underline on hover */
.collection-list tbody td:first-child a,
.cell-title a {
  text-decoration: none !important;
}

.collection-list tbody td:first-child a:hover,
.cell-title a:hover {
  text-decoration: underline !important;
}

/* Pin the bulk-actions toolbar — keep starter's original positioning
   rule from before the re-skin (the chip-spacing rules above already
   override most of it, but leave this for the empty list case where
   the toolbar appears before column headers render). */
.collection-list,
.collection-list__wrap {
  position: relative;
}

.collection-list .list-controls {
  min-height: 36px;
}
`

const AdminListStyles: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: css }} />
)

export default AdminListStyles
