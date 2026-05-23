import React from 'react'
import { brand, primaryAlpha } from '../lib/brand'

/**
 * Brand-wide admin re-skin for the limousine-site-starter.
 *
 * All brand colors are read from `lib/brand.ts` so a palette swap happens
 * in one place — do NOT hardcode hex values here.
 *
 * Resend/Linear-style chip aesthetic: rounded "button chip" nav rows,
 * column headers as chips, form inputs as chips, dashboard cards as chips.
 * Dark sidebar with a light content area; both palettes live in brand.ts.
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
 * No body-level overrides here: those caused white-screen crashes in
 * earlier iterations by interacting with Payload's own body styles. Stay scoped.
 *
 * IMPORTANT for maintainers: this is a JS template literal. Never use
 * backticks inside the CSS (e.g. for an inline code sample in a comment)
 * because that closes the literal and breaks the build. Plain quotes only.
 */
const css = `
/* Hide Payload's default dashboard tiles. The DashboardCards component
   renders the same data with descriptions inline. */
.modular-dashboard,
.dashboard__card-list {
  display: none !important;
}

/* The manual Save button is replaced by the AutoSaveField indicator on
   every editable collection. Hide it (Payload renders it as id
   "action-save") but keep it in the DOM so the autosave field can
   still click it programmatically. */
body.mh-autosave-active #action-save,
body.mh-autosave-active button#action-save {
  display: none !important;
}

/* …but inside drawers (e.g. Media create from a blog-post Hero Image
   field), KEEP the Save button so uploads can be committed. */
body.mh-autosave-active .drawer #action-save,
body.mh-autosave-active .drawer button#action-save {
  display: inline-flex !important;
}

/* ------------------------------------------------------------------ */
/* Primary CTAs in brand accent                                        */
/* ------------------------------------------------------------------ */
.btn--style-primary {
  background: ${brand.primary} !important;
  border-color: ${brand.primary} !important;
  color: ${brand.onPrimary} !important;
}

.btn--style-primary:not([disabled]):hover {
  background: ${brand.primaryDark} !important;
  border-color: ${brand.primaryDark} !important;
  color: ${brand.onPrimary} !important;
}

/* ------------------------------------------------------------------ */
/* Sidebar — dark surface with chip-style nav items                    */
/* ------------------------------------------------------------------ */
.nav,
.nav__wrap,
.template-default__nav {
  background: ${brand.sidebarBg} !important;
  border-right: 1px solid ${brand.sidebarLinkBg} !important;
}

.template-default__nav-toggler-wrapper,
.template-default__nav-toggler-container {
  background: ${brand.sidebarBg} !important;
}

/* Group label in brand accent. */
.nav-group__toggle,
.nav-group__toggle:hover,
.nav-group__toggle:focus,
.nav-group__toggle:focus-visible,
.nav-group .nav__label,
.nav-group__toggle .nav__label,
.nav__label,
.nav-group__toggle * {
  color: ${brand.primary} !important;
  font-weight: 800 !important;
  font-size: 13px !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
}

.nav-group__toggle .stroke,
.nav-group__toggle:focus-visible .stroke {
  stroke: ${brand.primary} !important;
}

.nav__link,
.nav__link * {
  color: ${brand.sidebarText} !important;
}

.nav__link {
  border-radius: 8px !important;
  margin: 3px 10px !important;
  padding: 8px 12px !important;
  font-weight: 500 !important;
  background: ${brand.sidebarLinkBg} !important;
  border: 1px solid ${brand.sidebarLinkHover} !important;
  text-decoration: none !important;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease !important;
}

.nav__link:hover,
.nav__link:hover * {
  color: ${brand.primary} !important;
}

.nav__link:hover {
  background: ${brand.sidebarLinkHover} !important;
  border-color: ${brand.sidebarBorder} !important;
  text-decoration: none !important;
}

.nav__link,
.nav__link:hover,
.nav__link:focus,
.nav__link.active,
.nav__link.active:hover {
  text-decoration: none !important;
  box-shadow: none !important;
}

.nav__link.active,
.nav__link.active * {
  color: ${brand.primary} !important;
}

.nav__link.active {
  background: ${brand.sidebarLinkHover} !important;
  border-color: ${brand.primary} !important;
  font-weight: 600 !important;
}

.nav__link.active:hover,
.nav__link.active:hover * {
  color: ${brand.primary} !important;
}

.nav__link.active:hover {
  background: ${brand.sidebarLinkActive} !important;
  border-color: ${brand.primary} !important;
}

.nav__link-indicator {
  display: none !important;
}

.nav-group__toggle {
  border-radius: 8px !important;
  margin: 2px 10px !important;
  padding: 8px 12px !important;
}

.nav-group__toggle:hover {
  background: ${primaryAlpha(0.08)} !important;
}

html[data-theme='light'] .nav-group__toggle:hover {
  background: ${primaryAlpha(0.08)} !important;
}

.nav__log-out {
  border-radius: 8px !important;
  margin: 2px 10px !important;
}

/* ------------------------------------------------------------------ */
/* Inputs / search                                                     */
/* ------------------------------------------------------------------ */
.search-filter,
.collection-list__search-input {
  border-radius: 999px !important;
}

.search-filter:focus-within {
  border-color: ${brand.primary} !important;
  box-shadow: 0 0 0 3px ${primaryAlpha(0.18)} !important;
}

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

.list-selection .edit-many,
.list-selection .edit-many__toggle {
  display: none !important;
}

.pill {
  border-radius: 999px !important;
  font-weight: 600 !important;
  letter-spacing: 0.02em !important;
}

/* ==================================================================
   List & edit views — chip aesthetic on the light content surface.
   ================================================================== */

.list-header__title,
.collection-edit__header h1,
.global-edit__header h1,
h1.label-generic-doc-title,
.list-header h1 {
  color: ${brand.textBody} !important;
  font-weight: 800 !important;
  letter-spacing: -0.01em !important;
}

.tabs-field__tab-button {
  color: ${brand.textSubtle} !important;
}

.tabs-field__tab-button.tabs-field__tab-button--active {
  color: ${brand.textBody} !important;
  border-bottom-color: ${brand.primary} !important;
  font-weight: 700 !important;
}

.collection-list table,
.relationship--has-many table {
  border-collapse: separate !important;
  border-spacing: 0 !important;
}

.collection-list thead th,
.relationship--has-many thead th {
  color: ${brand.textBody} !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.10em !important;
  text-transform: uppercase !important;
  background: ${brand.surface} !important;
  border: 1px solid ${brand.surfaceBorder} !important;
  border-radius: 6px !important;
  padding: 2px 10px !important;
  margin: 0 4px 4px 0 !important;
  white-space: nowrap !important;
}

.collection-list .table table,
.collection-list table {
  border-collapse: separate !important;
  border-spacing: 12px 4px !important;
}

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

thead th.cell-_select,
thead th.cell-_select * {
  transform: translateY(-2px);
}

.collection-list__sub-header,
.collection-list__header,
.list-controls,
.list-controls__search,
.list-controls__buttons,
.list-header,
.list-header__heading {
  flex-wrap: wrap !important;
  row-gap: 18px !important;
}

.list-selection {
  display: flex !important;
  width: 100% !important;
  flex: 0 0 100% !important;
  flex-basis: 100% !important;
  margin: 12px 0 !important;
  padding: 8px 0 !important;
  order: 10 !important;
  align-items: center !important;
  justify-content: flex-start !important;
}

.collection-list__tables,
.table-wrap {
  margin-top: 16px !important;
  clear: both !important;
}

.collection-list thead th svg,
.collection-list thead th .stroke {
  stroke: ${brand.textBody} !important;
}

.collection-list thead th svg path,
.collection-list thead th svg polyline,
.collection-list thead th svg line {
  stroke: ${brand.textBody} !important;
}

.collection-list thead th .sort-column__asc--active svg,
.collection-list thead th .sort-column__desc--active svg {
  stroke: ${brand.primaryDark} !important;
}

.collection-list thead th .sort-column__asc:not(.sort-column__asc--active) svg,
.collection-list thead th .sort-column__desc:not(.sort-column__desc--active) svg {
  opacity: 0.4;
}

.collection-list tbody tr {
  transition: background 0.12s ease !important;
}

.collection-list tbody tr:hover {
  background: ${brand.surfaceHover} !important;
}

.collection-list tbody td,
.relationship--has-many tbody td {
  border-bottom: 1px solid ${brand.surfaceBorderLight} !important;
  padding: 14px !important;
}

.collection-list tbody td:first-child a,
.cell-title a {
  color: ${brand.textBody} !important;
  font-weight: 700 !important;
}

.collection-list tbody td:first-child a:hover,
.cell-title a:hover {
  color: ${brand.primaryDark} !important;
}

.field-type__wrap > label,
.field-label,
label.field-type__label {
  color: ${brand.textMuted} !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
}

.field-type input[type='text']:not(.rs__input):not([class*='rs__']),
.field-type input[type='email']:not(.rs__input):not([class*='rs__']),
.field-type input[type='number']:not(.rs__input):not([class*='rs__']),
.field-type input[type='url']:not(.rs__input):not([class*='rs__']),
.field-type input[type='tel']:not(.rs__input):not([class*='rs__']),
.field-type input[type='password']:not(.rs__input):not([class*='rs__']),
.field-type input[type='search']:not(.rs__input):not([class*='rs__']),
.field-type input[type='date']:not(.rs__input):not([class*='rs__']),
.field-type__wrap > input[type='text']:not(.rs__input):not([class*='rs__']),
.field-type__wrap > input[type='email']:not(.rs__input):not([class*='rs__']),
.field-type__wrap > input[type='number']:not(.rs__input):not([class*='rs__']),
.field-type__wrap > input[type='url']:not(.rs__input):not([class*='rs__']),
.field-type__wrap > input[type='tel']:not(.rs__input):not([class*='rs__']),
.field-type__wrap > input[type='password']:not(.rs__input):not([class*='rs__']),
.field-type__wrap > input[type='search']:not(.rs__input):not([class*='rs__']),
.field-type__wrap > input[type='date']:not(.rs__input):not([class*='rs__']) {
  background: ${brand.surface} !important;
  border: 1px solid ${brand.surfaceBorder} !important;
  border-radius: 8px !important;
  color: ${brand.textBody} !important;
  font-weight: 700 !important;
  padding: 9px 14px !important;
  transition: background 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease !important;
}

.field-type input:focus,
.field-type__wrap input:focus {
  background: ${brand.surfaceCard} !important;
  border-color: ${brand.primary} !important;
  box-shadow: 0 0 0 3px ${primaryAlpha(0.18)} !important;
  outline: none !important;
}

.field-type textarea,
.field-type__wrap textarea {
  background: ${brand.surfaceHover} !important;
  border: 1px solid ${brand.surfaceBorderLight} !important;
  border-radius: 8px !important;
}

.field-type textarea:focus,
.field-type__wrap textarea:focus {
  background: ${brand.surfaceCard} !important;
  border-color: ${brand.primary} !important;
  box-shadow: 0 0 0 3px ${primaryAlpha(0.18)} !important;
  outline: none !important;
}

.rs__control,
.field-type__wrap .rs__control {
  background: ${brand.surface} !important;
  border-color: ${brand.surfaceBorder} !important;
  border-radius: 8px !important;
  min-height: 40px !important;
}

.rs__input,
.rs__input-container,
.field-type__wrap .rs__input,
.field-type__wrap .rs__input-container {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  outline: none !important;
  color: ${brand.textBody} !important;
  font-weight: 700 !important;
}

.rs__value-container,
.field-type__wrap .rs__value-container {
  padding: 4px 10px !important;
}

.rs__single-value,
.rs__placeholder,
.field-type__wrap .rs__single-value,
.field-type__wrap .rs__placeholder {
  color: ${brand.textBody} !important;
  font-weight: 700 !important;
  margin: 0 !important;
}

.rs__multi-value,
.field-type__wrap .rs__multi-value {
  background: ${primaryAlpha(0.18)} !important;
  border-radius: 999px !important;
  padding: 0 4px 0 8px !important;
}

.rs__multi-value__label,
.field-type__wrap .rs__multi-value__label {
  color: ${brand.textBody} !important;
  font-weight: 700 !important;
  padding: 2px 4px !important;
}

.rs__multi-value__remove,
.field-type__wrap .rs__multi-value__remove {
  color: ${brand.textBody} !important;
  border-radius: 999px !important;
}

.rs__multi-value__remove:hover,
.field-type__wrap .rs__multi-value__remove:hover {
  background: ${primaryAlpha(0.30)} !important;
}

.rs__control--is-focused,
.field-type__wrap .rs__control--is-focused {
  background: ${brand.surfaceCard} !important;
  border-color: ${brand.primary} !important;
  box-shadow: 0 0 0 3px ${primaryAlpha(0.18)} !important;
}

.rs__option--is-focused {
  background: ${brand.surface} !important;
  color: ${brand.textBody} !important;
}

.rs__option--is-selected {
  background: ${brand.primary} !important;
  color: ${brand.onPrimary} !important;
}

.paginator__page,
.paginator__page-button {
  border-radius: 999px !important;
  border-color: ${brand.surfaceBorder} !important;
  background: ${brand.surfaceHover} !important;
  color: ${brand.surfaceBorderStrong} !important;
}

.paginator__page--active,
.paginator__page-button--active {
  background: ${brand.primary} !important;
  color: ${brand.onPrimary} !important;
  border-color: ${brand.primary} !important;
}

.collection-list__sub-header .btn,
.list-controls .btn--style-primary {
  border-radius: 999px !important;
}

/* ------------------------------------------------------------------ */
/* Brand-accent hyperlinks throughout (excluding nav, buttons, thumbs) */
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
  color: ${brand.primaryDeep} !important;
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
  color: ${brand.primaryDark} !important;
  text-decoration: underline !important;
}

.collection-list tbody td:first-child a,
.cell-title a {
  text-decoration: none !important;
}

.collection-list tbody td:first-child a:hover,
.cell-title a:hover {
  text-decoration: underline !important;
}

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
