# Veya Luma — Design System & Visual Language Specification (DESIGN.md)

**Brand Identity**: Veya Luma  
**Category**: Personalized Entertainment & Cinematic Discovery (Vertical 01: Cinema / Film; Scalable to Games, Anime, & Interactive Arts)  
**Target Platform**: Desktop Web Experience (Optimized for 1440 × 900 canvas)  
**System Designation**: *Cinematic Luminary*  
**Stitch Source Project**: Project ID `6658946113334506031` ("Veya Luma Cinematic Discovery")  
**Aesthetic Core**: Atmospheric Depth, Luminous Obsidian Surfaces, Editorial Radiance, and Art-Driven Environmental Bleed

---

## 1. Executive Design Philosophy

Veya Luma is designed as an intimate cinematic sanctuary rather than a cold movie database, streaming platform, or SaaS analytics dashboard. The experience prioritizes emotional resonance, intellectual depth, and visual immersion.

### Key Tenets
1. **Whoa, This Feels Different**: The interface feels alive, mysterious, warm, and sophisticated. It rejects sterile white tables, generic gray cards, and conventional admin panels.
2. **Dynamic Environmental Bleed**: The UI absorbs atmospheric color, ambient lighting, and tonal moods directly from featured artwork.
3. **Restrained Radiance**: Accents pulse with deep cyan, ultraviolet, warm amber, and electric teal without descending into childish neon or generic purple "AI gradients."
4. **Editorial Drama**: High-contrast pairing of monumental serif headlines with ultra-crisp geometric sans metadata creates an auteur, high-fashion film dossier feeling.
5. **Radical Algorithmic Honesty**: Clear explanation of cognitive vectors, dimensional resonance scores, and explicit notes on where films might diverge from user taste.
6. **Scalable Beyond Cinema**: Neutral yet ethereal iconography and naming conventions allow seamless expansion into future verticals (Games, Anime, Literature) without brand rework.

---

## 2. Color Palette & Lighting System

### 2.1 Base & Surface Colors (Obsidian Matrix)
The background layers build spatial depth using deep charcoals, near-blacks, and midnight plum tones:

- **Canvas / Root Background**: `#06080E` (Deep Space Obsidian)
- **Surface Dim**: `#0A0D14` (Midnight Basalt)
- **Surface Standard**: `#10131A` / `#101420` (Obsidian Chamber)
- **Surface Container Low**: `#151822` (Translucent Slate)
- **Surface Container Mid**: `#191B26` (Floating Plate)
- **Surface Container High**: `#222634` (Elevated Card / Modal)
- **Surface Bright / Highlight**: `#2F3445` (Subtle Rim Highlight)

### 2.2 Radiant Accents & Atmospheric Auras
Derived from cinematic lighting archetypes (anamorphic lens flares, twilight desert horizons, neon noir rain):

- **Luminous Cyan (`primary`)**: `#00F0FF` (Used for active vectors, primary focus halos, and interactive anchors)
- **Ultraviolet / Deep Violet (`secondary`)**: `#8A5CFF` / `#7038FF` (Used for non-linear temporal traits, secondary pills, and cognitive depth)
- **Atmospheric Teal (`accent-teal`)**: `#14F195` / `#00D2B4` (Used for harmonic match badges, synchronizations, and audio profiles)
- **Warm Amber / Solar Copper (`accent-amber`)**: `#FFB443` / `#E87A30` (Used for foundational keystones, beloved favorites, and tactile scores)
- **Ethereal Rose / Crimson (`accent-crimson`)**: `#FF4D6D` / `#D82855` (Used for boundary filters, suppressed tropes, and high visceral impact)

### 2.3 Environmental Gradient Formulas
- **Cosmic Glow**: `radial-gradient(circle at 50% 20%, rgba(0, 240, 255, 0.08), rgba(138, 92, 255, 0.04) 60%, transparent 80%)`
- **Solar Flare**: `radial-gradient(circle at 80% 30%, rgba(255, 180, 67, 0.12), rgba(232, 122, 48, 0.05) 50%, transparent 75%)`
- **Obsidian Card Gradient**: `linear-gradient(180deg, rgba(25, 27, 38, 0.75) 0%, rgba(16, 19, 26, 0.90) 100%)`
- **Border Illumination**: `linear-gradient(135deg, rgba(0, 240, 255, 0.4) 0%, rgba(138, 92, 255, 0.15) 50%, rgba(255, 255, 255, 0.05) 100%)`

---

## 3. Typography Hierarchy

### 3.1 Typefaces
- **Editorial & Hero Serif**: `Playfair Display`, `serif`  
  *Qualities*: Dramatic, elegant, auteur, high-contrast ligatures.  
  *Usage*: Hero questions, major editorial headers, movie titles, philosophy callouts.
- **Interface & Metadata Sans**: `Plus Jakarta Sans`, `-apple-system`, `sans-serif`  
  *Qualities*: Hyper-legible, geometric, crisp, professional optical tracking.  
  *Usage*: Global navigation, vector tags, descriptions, ratings, telemetry readouts, buttons.

### 3.2 Scale & Leading
- **Display Hero (XXL)**: `font-size: 52px – 64px`, `line-height: 1.1`, `Playfair Display`, `font-weight: 500 – 600`
- **Section Heading (XL)**: `font-size: 36px – 42px`, `line-height: 1.15`, `Playfair Display`, `font-weight: 600`
- **Card Title / Feature (LG)**: `font-size: 24px – 28px`, `line-height: 1.25`, `Playfair Display`, `font-weight: 600`
- **Subheader / Quote (MD)**: `font-size: 18px – 20px`, `line-height: 1.45`, `Playfair Display (italic) or Plus Jakarta Sans`
- **Body & Longform**: `font-size: 14px – 15px`, `line-height: 1.6`, `Plus Jakarta Sans`, `font-weight: 400`
- **Telemetry & Labels (Micro)**: `font-size: 11px – 12px`, `line-height: 1.3`, `letter-spacing: 0.08em – 0.15em`, `text-transform: uppercase`, `font-weight: 600`

---

## 4. Layout Architecture & Spatial Grid

- **Canvas Dimension**: Fixed-fluid 1440px desktop baseline with full-width atmospheric outer bleed.
- **Content Max-Width**: `1320px` centered with `60px` dynamic horizontal gutters.
- **Vertical Spacing Rhythm**:
  - `Section Gap`: `72px – 96px`
  - `Component Gap`: `32px – 48px`
  - `Internal Card Padding`: `24px – 36px`
- **Corner Radii Tokens**:
  - `radius-sm`: `6px` (badges, micro tags, status dots)
  - `radius-md`: `10px – 12px` (buttons, input fields, dropdown menus)
  - `radius-lg`: `16px – 20px` (standard cinematic cards, duel containers)
  - `radius-xl`: `24px – 32px` (hero feature modules, floating panels)
  - `radius-full`: `9999px` (pills, filter switches, avatar nodes)

---

## 5. Signature Component Catalog

### 5.1 Global Floating Nav Bar (Glass Chrome)
- **Container**: Translucent obsidian pill or edge-to-edge floating header with `backdrop-filter: blur(20px)` and subtle `rgba(255,255,255,0.06)` border.
- **Brand Mark**: Abstract celestial radiant prism (`Veya Luma`) emitting subtle cyan-indigo luminescence. No cameras, no clapperboards.
- **Vertical Selector**: Interactive pill group (`Movies` [active], `Games` [preview], `Anime` [preview]).
- **Primary Routes**: `Discover`, `Taste Discovery`, `Recommendations`, `My Library`, `Search`.
- **Identity Node**: Subtle glowing circular avatar indicating curatorial clearance status.

### 5.2 Natural Language Discovery Portal
- **Input Field**: Wide glowing aperture field (`height: 64px`), soft radial focus backdrop, and integrated `Discover →` gradient CTA.
- **Seed Chips**: Horizontal cluster of intuitive natural language seeds (`"Mind-bending sci-fi"`, `"Like Interstellar, less bleak"`, `"Atmospheric neo-noir"`).

### 5.3 Cinematic Duel & Movie Cards
- **Composition**: Prominent 16:9 or 4:3 high-resolution key art with subtle gradient vignette overlay (`linear-gradient(to top, #10131a 10%, transparent 60%)`).
- **Interactive State**:
  - *Default*: Calm, crisp typography, match percentage tag (`98% Match`), core auteur/year metadata.
  - *Hover*: Smooth 200ms transform (`scale(1.02)`), ambient radial illumination matching key artwork tones, border luminance accentuation.
  - *Reaction Suite*: Tactile instinctive response pills (`Love`, `Like`, `Neutral`, `Dislike`, `Unseen`).

### 5.4 Cognitive Constellations & Telemetry Radar
- **Taste Constellation**: Abstract topological node map linking latent themes (*Acoustic Solitude*, *Cerebral Sci-Fi*, *Non-Linear Form*) with glowing connecting filaments.
- **Radar Polygonal Mesh**: 5-axis harmonic matrix (Atmosphere, Narrative, Speculative, Auteur, Dissonance).
- **Algorithmic Transparency Modules**: "Why this feels like your movie" pipeline, followed by honest friction alerts ("Where this might differ from your usual taste").

### 5.5 Library Grids & Chronological Odyssey
- **Watch History**: Vertical chronological spine with glowing orbital date nodes (`September 2026`, `August 2026`) and comprehensive session telemetry.
- **Favourites & Watchlist**: Curated pantheon with keystones, custom sorting (Resonance Match, Chronological, Acoustic Depth), and atmospheric null states.

---

## 6. Motion & Micro-Interactions

- **Timing Curves**:
  - `Micro-interactions`: `150ms – 220ms` (`cubic-bezier(0.2, 0.8, 0.2, 1)`)
  - `Card Elevation & Expansion`: `280ms – 350ms` (`cubic-bezier(0.16, 1, 0.3, 1)`)
  - `Page & Stage Transitions`: `400ms – 500ms` (`cubic-bezier(0.25, 1, 0.5, 1)`)
- **Prohibited Behaviors**: No chaotic bouncy springs, spinning loaders, generic sparkle particles, or noisy marquee text.

---

## 7. Accessibility & Contrast Standards
- High contrast WCAG AA maintained across all text surfaces (`#FFFFFF` primary, `#B3B9C9` secondary on `#06080E` / `#10131A`).
- All active interactive states possess dual visual indicators (color shift + glowing perimeter + icon/text transformation).
- Clear keyboard navigation outlines using focused cyan ring offsets (`box-shadow: 0 0 0 2px rgba(0, 240, 255, 0.6)`).
