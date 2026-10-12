# Darvia — Phase 1 Design and Requirements

Status: **APPROVED** (no code was written during this phase)

## 1. Design direction

Luxury cinematic + modern minimalism + subtle 3D.

- Charcoal sections, warm-neutral text, restrained gold accent
- Large editorial property photography
- Generous whitespace and clear typography
- Animation is decorative only — never the sole carrier of information
- All copy is Arabic-first with proper RTL support
- Every string lives in a locale-ready structure (no Arabic hardcoded into logic)

## 2. Colour system

> **Superseded (v2).** The original gold-only palette (`#C9A24B` / charcoal) is replaced
> entirely by the system below. This is the **single source of truth** — do not merge the two.
> Tokens live in `src/app/globals.css` (`@theme`) and are consumed as Tailwind utilities
> (`bg-*`, `text-*`, `border-*`, `outline-*`, `shadow-*`). No raw hex in components.

**Brand — dark luxury:** `obsidian #101112` · `charcoal #191B1F` · `charcoal-elevated #22252A`
**Brand — signature gold:** `gold #C5A46D` · `gold-light #D9BD8A` · `gold-deep #987747` · `gold-soft #F3EBDD`
**Brand — premium navy:** `navy #142B45` · `navy-deep #0D1B2A` · `navy-muted #526A82` · `navy-pale #EAF0F5`
**Warm neutrals:** `ivory #F8F6F1` · `cream #F1EDE5` · `beige #E5DED2` · `warmgray #C7C2B9`

**Backgrounds:** `background #F8F6F1` · `background-dark #101112`
**Surfaces:** `surface #FFFFFF` · `surface-ivory` · `surface-cream` · `surface-beige` · `surface-dark #191B1F` · `surface-elevated #22252A` · `surface-gold #F3EBDD` · `surface-blue #EAF0F5`
**Text (light bg):** `ink #202328` · `ink-secondary #62666D` · `ink-muted #777B82`
**Text (dark bg):** `on-dark #F8F6F1` · `on-dark-secondary #C5C7CB` · `on-dark-muted #9A9EA5`
**Borders:** `line #E5DED2` · `line-strong #D8D4CC` · `line-dark #343840`
**Status:** `success #237A57` / `#E8F4ED` · `warning #A96712` / `#FFF3DB` · `error #B4232F` / `#FCEBED` · `info #285F8F` / `#EAF2FA` · `neutral #667085` / `#F0F1F3`
**Focus ring:** `focus-ring #142B45` (light surfaces) · `focus-ring-inverse #D9BD8A` (dark surfaces)
**Overlay:** `overlay #101112` (use with opacity) · **Shadows:** `shadow-card`, `shadow-elevated`

### Usage rules by section

- **Nav:** transparent/dark over hero; ivory on light pages; gold active indicator; visible hover + focus-visible.
- **Hero:** cinematic photo, charcoal overlay only if readability needs it, ivory headline, small gold accent, clear primary CTA. No large gold text.
- **Cards:** white/ivory on light sections; charcoal only in dark sections; gold only for small premium labels/states; image stays dominant.
- **Detail pages:** light bg for info/description; dark cinematic gallery sections; price/location/area easy to scan.
- **Search/filters:** light neutral surfaces, charcoal labels, navy/gold active states, obvious selected filters.
- **Footer:** deep charcoal or navy, ivory headings, gold used sparingly (icons/separators/links).
- **Admin:** light ivory/white workspace, dark charcoal sidebar, gold selected indicators, subtle gray borders, clear success/warning/error — usability over decoration.

### Buttons (classes in `globals.css`)

- `.btn-primary` — bg gold, text obsidian, hover gold-light
- `.btn-secondary-dark` — bg charcoal, text white, hover `#343840`
- `.btn-secondary-light` — bg white, text ink, border `#D8D4CC`, hover cream
- `.btn-navy` — bg navy, text white, hover `#1D3B5C`
- `.btn-whatsapp` / `.btn-facebook` — **scoped brand exception**; see below
- All variants define hover, focus-visible, disabled, loading (`aria-busy`) states. No hover-only signalling.

### Contact brand exception (scoped)

`--color-whatsapp #25D366` and `--color-facebook #1877F2` are the official brand
colours, kept for recognition. They are used **only** for the WhatsApp/Facebook icons and
contact buttons (`.btn-whatsapp`, `.btn-facebook`) — never for general UI. Hover is a
brightness shift, introducing no new colours.

### Property status badges

`.badge-available` (green) · `.badge-sold` (neutral gray) · `.badge-rented` (blue) ·
`.badge-draft` (muted gray) · `.badge-featured` (soft champagne gold). Soft backgrounds,
readable text, and always paired with a text label — colour is never the only signal.

### Contrast (WCAG) notes

Verified pairs meet **AA for normal text** except the following, which meet **AA large/UI (≥3:1)**
only — use them for large text, icons, borders, or decorative accents, never small body text:
`ink-muted` on light (≈4.0), `gold-deep` on light (≈3.8–4.2), `warning` on warning-bg (≈4.1),
`neutral` on neutral-bg (≈4.4). For small gold text on light backgrounds use `navy` or `ink`.

**Contact brand exception — contrast caveat.** White text/icon on WhatsApp green
`#25D366` is **1.98:1** and fails WCAG (even the 3:1 non-text threshold); white on Facebook
`#1877F2` is 4.23:1 (large/UI only). Using `ink`/`obsidian` text instead gives WhatsApp
9.53:1 and Facebook 4.46:1. Default keeps the recognizable white-on-brand look; switch to
dark text if strict AA compliance is required.

## 3. Typography

- **Arabic headings:** Tajawal (fallback: Cairo)
- **Arabic body:** IBM Plex Sans Arabic
- **English UI (headings + body):** Inter — selected per locale via `html[lang]`
- Latin text/numbers inside Arabic also render in IBM Plex Sans Arabic's Latin glyphs
- Self-hosted via `next/font` (free, no external requests)
- Scale (mobile → desktop):
  - h1 `2rem → 3.5rem`
  - h2 `1.5rem → 2.25rem`
  - h3 `1.25rem → 1.5rem`
  - body `1rem`, small `0.875rem`
  - line-height 1.6 body / 1.15 headings

## 4. Bilingual RTL/LTR approach (ar + en)

- Direction is **locale-driven**: `<html lang="ar" dir="rtl">` for `/ar`, `<html lang="en" dir="ltr">` for `/en`
- Layout uses logical properties only (`ps/pe`, `ms/me`, `text-start/end`, `start/end`) — never hardcoded left/right
- Mirror only directional icons (arrows, chevrons); never mirror photos, logos, or brand glyphs
- In Arabic, prices/phones/URLs are wrapped in `<bdi dir="ltr">` to isolate LTR runs; currency `ج.م` placed per RTL convention
- **Bilingual content model:** property records store Arabic + English fields (per-field). English is the required base; Arabic is optional per listing and falls back to English, and the admin list flags listings missing Arabic. (Superseded the earlier "Arabic required, English optional" rule — see `docs/phase-3-db-design.md` and `docs/project-plan.md`.)

## 5. Pages and routes

Public (each page served under both `/ar` and `/en`):

- `/` — redirects to `/ar` or `/en` (first visit → English); see proxy rules
- `/{locale}` — home
- `/{locale}/properties` — listing + filters
- `/{locale}/properties/[slug]` — property detail (one shared slug per property across locales)
- `/{locale}/areas/[area]` — area browse
- `/{locale}/about` — about
- `/{locale}/contact` — contact

Admin (not localized; unprefixed and excluded from the locale redirect):

- `/admin/login`
- `/admin`
- `/admin/properties`
- `/admin/properties/new`
- `/admin/properties/[id]/edit`
- `/admin/settings`

## 6. Wireframes (mobile-first, RTL)

### Home

```
[logo        properties areas about   (WhatsApp)]
┌───────────────────────────────────────┐
│  HERO — full-bleed property photo      │
│  headline / value prop / [Explore]     │
└───────────────────────────────────────┘
عقارات مميزة  → [card] [card] [card]  (swipe on mobile)
ابحث عن عقارك  → [search + filters] → [grid 1/2/3 col]
تصفح حسب المنطقة → 6 area cards
من نحن (factual)      تواصل معنا (WhatsApp · Facebook · هاتف)
[footer: contact · pages · privacy · social]
[floating WhatsApp FAB on mobile]
```

### Listing page

- Filter bar: نوع العرض (sale/rent)، نوع العقار، المنطقة، السعر، المساحة، الحالة
- Sort: الأحدث (newest)، السعر (price)
- Responsive card grid → pagination / progressive load
- Loading skeletons, empty state, error state
- Filters query the database, not just the UI

### Detail page

- Main cover photo → photo gallery
- Title, price, listing type, availability
- Location and key facts
- Description and feature list
- WhatsApp CTA prefilled with property title + link
- Share actions
- Similar properties
- SEO metadata, canonical URL, social preview

### Admin

- Sidebar: نظرة عامة (overview)، العقارات (properties)، الإعدادات (settings)
- Dashboard metric cards (total, published, drafts, availability counts, recently updated)
- Properties table (status, featured, edit/delete)
- Add/edit form — all fields per project spec §5, with multi-image upload, cover select, reorder, removal
- Settings form (brand name/logo, WhatsApp, phone, email, Facebook, homepage copy, areas)
- Delete confirmation — removes only that listing's own files

## 7. Animation and interaction

- Hero: restrained fade + slight scale entrance (no video)
- Scroll reveals via `whileInView` (short, subtle)
- Image hover zoom
- Desktop-only 3D card tilt (pointer-based)
- Fast page/element transitions
- Sticky WhatsApp FAB on mobile
- Reduced-motion: honor `prefers-reduced-motion` — disable transforms, parallax, tilt, and any WebGL; keep only instant/opacity. No WebGL blocking first paint.

## 8. Responsive and accessibility

- Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280`
- Tap targets ≥ 44px
- Visible focus rings
- Semantic landmarks
- Alt text required on every image
- Keyboard-operable filters and gallery
- No essential information conveyed by colour alone

## 9. Sample data flagging

- All placeholder listings set `is_sample = true`
- Sample marker visible in admin only (never public)
- Cleanly replaceable later
- No fake reviews, credentials, or property claims

## 10. Feature list (v1 confirmation)

1. Bilingual (Arabic + English) responsive homepage
2. Property listing and filtering (all property types, all 6 launch areas)
3. Individual property pages
4. Multiple photos per property (no video)
5. WhatsApp and Facebook contact links
6. Secure admin login
7. Admin create/edit/publish/unpublish/delete
8. Site contact settings
9. Basic SEO and social sharing
10. Supabase/Vercel deployment, entirely on free tiers

Deferred: video upload/storage, inquiry form, favourites, comparison, maps, analytics, advanced 3D.
