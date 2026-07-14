# design-system.md — VerifyNG

This file defines the design system rules for VerifyNG. Read this before building any UI component, page, or layout.

---

## Source of Truth

All design tokens — colours, typography, shadows, and grid values — are defined as CSS custom properties in `tokens/tokens.css`.

**Never hardcode any colour, font size, font weight, shadow, or spacing value.** Always use the corresponding CSS variable. If a token does not exist for what you need, check with the product owner before adding one.

---

## How to Use Tokens

Import `tokens/tokens.css` once at the root of the React app in `client/src/index.css`:

```css
@import '../../tokens/tokens.css';
```

Then use variables anywhere in component CSS modules:

```css
.card {
  background-color: var(--color-bg-white-0);
  border: 1px solid var(--color-stroke-soft-200);
  box-shadow: var(--effect-regular-shadow-small);
  color: var(--color-text-main-900);
}
```

---

## Typography

**Font:** Plus Jakarta Sans — loaded from Google Fonts. Add this to `client/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
```

### Typography Token Reference

Use these token names for text styles. Full values are in `tokens/tokens.css`.

| Token Name | Size | Weight | Use |
|---|---|---|---|---|
| `--font-title-h1-title-*` | 64px | 500 | Hero headings on the Home page |
| `--font-title-h2-title-*` | 48px | 500 | Section headings |
| `--font-title-h3-title-*` | 40px | 400 | Page headings |
| `--font-title-h4-title-*` | 32px | 500 | Card headings, modal titles |
| `--font-title-h5-title-*` | 24px | 500 | Section sub-headings |
| `--font-title-h6-title-*` | 20px | 500 | Component headings |
| `--font-label-x-large-*` | 24px | 500 | Hero labels, large stat numbers |
| `--font-label-large-*` | 18px | 500 | Form labels, nav links |
| `--font-label-medium-*` | 16px | 500 | Button text, tab labels |
| `--font-label-small-*` | 14px | 500 | Secondary labels, badges |
| `--font-label-x-small-*` | 12px | 500 | Captions, metadata |
| `--font-paragraph-large-*` | 18px | 400 | Body text — long form |
| `--font-paragraph-medium-*` | 16px | 400 | Body text — standard |
| `--font-paragraph-small-*` | 14px | 400 | Secondary body text |
| `--font-paragraph-x-small-*` | 12px | 400 | Fine print, timestamps |
| `--font-subheading-medium-*` | 16px | 500 uppercase | Section labels |
| `--font-subheading-small-*` | 14px | 500 uppercase | Category labels |

### Applying Typography in CSS

```css
.vendorName {
  font-size: var(--font-title-h5-title-font-size);
  font-weight: var(--font-title-h5-title-font-weight);
  line-height: var(--font-title-h5-title-line-height);
  letter-spacing: var(--font-title-h5-title-letter-spacing);
  font-family: var(--font-title-h5-title-font-family);
}
```

---

## Colour System

### Primary Colours — Brand Green

| Token | Use |
|---|---|
| `--color-primary-primary-base` | CTA buttons, active links, trust score badges, brand accents |
| `--color-primary-primary-dark` | Button hover states, active nav items |
| `--color-primary-primary-darker` | Footer backgrounds, deep UI surfaces |
| `--color-primary-primary-light` | Illustrations, decorative icon fills |
| `--color-primary-primary-lighter` | Card backgrounds, score badge tints, table header fills |

### Background Colours

| Token | Use |
|---|---|
| `--color-bg-white-0` | Card backgrounds, modals, input fields |
| `--color-bg-weak-100` | Page background, sidebar fills |
| `--color-bg-soft-200` | Dividers, skeleton loaders |
| `--color-bg-surface-700` | Dark surface areas |
| `--color-bg-strong-900` | Dark mode backgrounds (future) |

### Text Colours

| Token | Use |
|---|---|
| `--color-text-main-900` | Primary body text, headings |
| `--color-text-sub-500` | Secondary text, descriptions |
| `--color-text-soft-400` | Placeholder text, muted labels |
| `--color-text-disabled-300` | Disabled state text |
| `--color-text-white-0` | Text on dark or coloured backgrounds |

### Stroke / Border Colours

| Token | Use |
|---|---|
| `--color-stroke-soft-200` | Default card borders, input borders |
| `--color-stroke-sub-300` | Stronger borders, dividers |
| `--color-stroke-strong-900` | Focus rings, high-contrast borders |

### State Colours

| Token | Use |
|---|---|
| `--color-state-success` | Success states, verified badges |
| `--color-state-error` | Scam alert banners, error messages, destructive actions |
| `--color-state-warning` | Caution badges, warning messages |
| `--color-state-information` | Info tooltips, neutral alerts |
| `--color-state-verified` | Verified buyer badge |
| `--color-state-away` | Amber trust states (maps to Proceed with Caution score range) |

---

## Trust Score Badge Colours

The trust score badge colour must always match the score range:

| Score Range | Label | Background Token | Text Token |
|---|---|---|---|
| 8.5 – 10.0 | Highly Trusted | `--color-primary-primary-lighter` | `--color-primary-primary-base` |
| 7.0 – 8.4 | Mostly Reliable | `--color-primary-primary-lighter` | `--color-primary-primary-dark` |
| 5.0 – 6.9 | Proceed with Caution | Use `--color-state-away` tint | `--color-state-away` |
| 3.0 – 4.9 | Poor Track Record | Use `--color-state-warning` tint | `--color-state-warning` |
| 0.0 – 2.9 | High Risk | Use `--color-state-error` tint | `--color-state-error` |

*Note: Since background tints are not defined in the tokens stylesheet, implement them programmatically using modern CSS `color-mix()` (e.g. `background-color: color-mix(in srgb, var(--color-state-error) 10%, transparent);`).*

---

## Shadows

Use shadow tokens from `tokens/tokens.css` — never write custom `box-shadow` values.

| Token | Use |
|---|---|
| `--effect-regular-shadow-x-small` | Subtle lift — buttons, chips |
| `--effect-regular-shadow-small` | Default card shadow |
| `--effect-regular-shadow-medium` | Elevated cards, dropdowns |
| `--effect-regular-shadow-large` | Modals, drawers |
| `--effect-regular-shadow-x-large` | Tooltips, popovers |
| `--effect-regular-shadow-2x-large` | Modals over modals, prominent overlays |

---

## Spacing

Spacing values must be defined using a consistent scale. Use multiples of 4px:

| Value | Usage |
|---|---|
| 4px | Tight internal spacing (icon gaps, badge padding) |
| 8px | Small component padding |
| 12px | Component internal padding |
| 16px | Standard padding, gap between elements |
| 24px | Section padding, card padding |
| 32px | Large gaps between sections |
| 48px | Page section spacing |
| 64px | Large section breaks |

---

## Layout and Grid

Grid token values are defined in `tokens/tokens.css` under `--grid-*`. Key values for VerifyNG:

- **Mobile:** 4 columns, 20px gutter, 24px offset — use `--grid-mobile-*` tokens (flat: `--grid-mobile-count`, `--grid-mobile-gutter-size`, etc.)
- **Desktop (1440px):** 12 columns, 24px gutter — use `--grid-topbar-1440-1-*` tokens (indexed: `--grid-topbar-1440-1-section-size`, `--grid-topbar-1440-1-gutter-size`, `--grid-topbar-1440-1-count`)
- **Max content width:** 1200px — center content with auto margins on desktop

---

## Component Design Rules

### Buttons

- Primary button: `--color-primary-primary-base` background, `--color-text-white-0` text
- Primary hover: `--color-primary-primary-dark` background
- Secondary button: transparent background, `--color-primary-primary-base` text, `--color-stroke-soft-200` border
- Secondary hover: `--color-primary-primary-lighter` background
- Ghost button: transparent background, `--color-text-sub-500` text, no border
- Ghost hover: `--color-bg-weak-100` background, `--color-text-main-900` text
- Disabled (all variants): `--color-bg-soft-200` background, `--color-text-disabled-300` text, no border
- Border radius: 8px for standard buttons, 24px for pill/rounded buttons
- Minimum touch target: 44px height — critical for mobile users

### Inputs and Form Fields

- Default border: `--color-stroke-soft-200`
- Focus border: `--color-primary-primary-base`
- Error border: `--color-state-error`
- Placeholder text: `--color-text-soft-400`
- Border radius: 8px

### Cards

- Background: `--color-bg-white-0`
- Border: 1px solid `--color-stroke-soft-200`
- Shadow: `--effect-regular-shadow-small`
- Border radius: 12px
- Padding: 16px (mobile), 24px (desktop)

### Scam Alert Banner

- Background: tint of `--color-state-error`
- Left border: 3px solid `--color-state-error`
- Text: `--color-state-error`
- Icon: ⚠️ always present
- Position: always at the top of the vendor profile, above all other content

---

## Mobile-First Rules

- Write all CSS for mobile first, then add breakpoints for larger screens
- Minimum supported viewport: 375px
- Standard breakpoints:
  - Mobile: 375px – 767px (default styles)
  - Tablet: 768px – 1023px (`@media (min-width: 768px)`)
  - Desktop: 1024px and above (`@media (min-width: 1024px)`)
- Touch targets must be at least 44x44px — never smaller
- Font sizes must never go below 12px on any screen size

---

## MVP Component Inventory

Build these components in `client/src/components/`. Each gets its own folder with `index.tsx` and a CSS module file.

**Search**
- `SearchBar` — text input with search icon; accepts `onSearch(query: string)` callback; debounce 300ms before firing
- `SearchResults` — list of vendor result cards; accepts `vendors: Vendor[]`

**Vendor**
- `VendorCard` — summary card shown in search results; shows name, trust score badge, review count, scam flag
- `VendorProfile` — full vendor profile layout; composes TrustScoreBadge, ReviewSummary, ReviewList
- `TrustScoreBadge` — numeric score + label; colour derived from score range (see Trust Score Badge Colours above)
- `ScamAlertBanner` — red alert banner; only rendered when `vendor.scamFlag === true`; always at top of profile

**Reviews**
- `ReviewList` — paginated list of reviews; accepts `reviews: Review[]` and pagination props
- `ReviewCard` — single review; shows star rating, text, date, verified buyer badge, channel
- `ReviewForm` — submission form; star rating selector + text area + optional fields
- `StarRating` — interactive or display-only; accepts `value` and optional `onChange`

**Auth**
- `LoginForm` — email + password
- `RegisterForm` — email + password + display name
- `AuthGuard` — wrapper that redirects unauthenticated users away from protected pages

**Shared**
- `Button` — primary, secondary, ghost variants; accepts `variant`, `size`, `disabled`, `onClick`
- `Badge` — small label chip; accepts `label` and `colour`
- `LoadingSpinner` — loading state indicator
- `EmptyState` — no data available (vendor not found, no reviews yet)
- `ErrorMessage` — inline error for form validation and API errors

**Component Rules**
- Components receive data through props — they never fetch data directly
- All data fetching lives in custom hooks (`hooks/`) or page-level components
- Every component that can be loading must accept an `isLoading` prop and render `LoadingSpinner`
- All interactive components must handle keyboard events (Enter/Space) alongside click events

---

## Accessibility Rules

- All interactive elements must have visible focus states using `--color-primary-primary-base` as the focus ring colour
- Colour alone must never convey meaning — always pair colour with text or an icon (e.g. scam badge uses both red colour and ⚠️ icon)
- Images and icons must have `alt` text or `aria-label`
- Form inputs must have associated `<label>` elements

