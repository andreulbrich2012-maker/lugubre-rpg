---
name: Lúgubre RPG
description: Vitral de catedral à noite para o sistema de RPG dark fantasy Lúgubre (livro 0.5 Beta).
colors:
  abyss: "#08070b"
  lead: "#020203"
  bone: "#ece4d2"
  mist: "#b9b0a0"
  ember: "#e0a63a"
  blood: "#8e1a32"
  glass-1: "#13101a"
  glass-2: "#0c0a10"
  p-caos: "#7a1630"
  p-gaia: "#1f6a3f"
  p-ponto: "#1c3e9e"
  p-erebo: "#3a2a5e"
  p-nix: "#232a6b"
  p-tartaro: "#8a3a14"
  p-eter: "#2a7c86"
  p-ananque: "#a4781a"
typography:
  display:
    fontFamily: "\"Grenze Gotisch\", Georgia, serif"
    fontSize: "3.75rem"
    fontWeight: 400
    lineHeight: 0.95
  headline:
    fontFamily: "\"Grenze Gotisch\", Georgia, serif"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1
  title:
    fontFamily: "\"Grenze Gotisch\", Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.33
  body:
    fontFamily: "\"Schibsted Grotesk\", system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "\"liga\" 1, \"kern\" 1"
  lead:
    fontFamily: "\"Schibsted Grotesk\", system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "\"Schibsted Grotesk\", system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  md: "2px"
  lg: "3px"
  xl: "4px"
  2xl: "6px"
  full: "9999px"
spacing:
  gutter: "16px"
  section: "80px"
  section-wide: "112px"
  container: "80rem"
components:
  button-lit:
    backgroundColor: "{colors.ember}"
    textColor: "#1a1004"
    rounded: "{rounded.md}"
    padding: "0.55rem 1.15rem"
    height: "2.75rem"
  button-glass:
    backgroundColor: "{colors.glass-1}"
    textColor: "{colors.ember}"
    rounded: "{rounded.md}"
    padding: "0.55rem 1.15rem"
    height: "2.75rem"
  button-glass-hover:
    textColor: "#ffffff"
  field:
    backgroundColor: "rgba(0, 0, 0, .45)"
    textColor: "{colors.bone}"
    rounded: "{rounded.md}"
    padding: "0.75rem"
    height: "40px"
  panel:
    backgroundColor: "{colors.glass-1}"
    textColor: "{colors.bone}"
    rounded: "0px"
  badge:
    backgroundColor: "{colors.glass-2}"
    textColor: "{colors.bone}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.1rem 0.5rem"
  nav-link:
    textColor: "{colors.mist}"
    padding: "0.5rem 0.75rem"
  nav-link-active:
    textColor: "{colors.bone}"
---

# Design System: Lúgubre RPG

## Overview

**Creative North Star: "The Rose Window at Night"**

Lúgubre is a cathedral stained-glass window seen from inside after dark. Black lead dominates every screen; colour lives only in deep, darkened glass panes, and those panes brighten only when light passes through them (hover, selection, the active route, the primary action). The light itself is one hue per theme (amber in the default "sombrio" theme), carried as the `--light` RGB triplet so every glow, focus ring and lit pane follows the theme.

The world spans the landing page, the rulebook, the character sheet, the campaign room and the virtual tabletop. Marketing and tool surfaces share the same materials: lead lines, frosted grain, glass panes and a gothic inscription face. Density changes from screen to screen; the materials do not. Game state is shown by the shape of the lead and the glass: a double lead line for selected, a dashed one for hidden, cracked glass for damage, grey dead glass for downed.

Three themes switch through `data-theme` on the root: **sombrio** (default, amber light), **lúgubre** (blood-red glass, coral light) and **daltonismo** (blue glass, yellow light, a colour-blind-safe set). Components read only the CSS custom properties, never a theme's literal hex.

**Key Characteristics:**
- Lead (#020203 family) separates everything; there are no grey hairline borders.
- The eight Primordial glass colours are always darkened, used as fills and never as neon.
- One light hue per theme drives glows, focus, lit panes and the primary button.
- The gothic display face is for headings and numerals. Every control and every line of reading text uses the grotesque.
- Near-square corners (2px) everywhere except circular medallions (tokens, the d20 target).

## Colors

The palette is near-black lead and abyss, eight darkened jewel glasses, bone text and a single amber light.

### Primary
- **Ember Light** (ember): the only light source. It fills the lit primary button with a radial gradient from #ffe1a0 through ember, drives the active nav underline, the focus outline, the caret and the selection tint (at .35 alpha), and highlights key numbers in derived results.

### Secondary
- **Blood Glass** (blood): danger and damage. Used for the theme's red glass, targetable-token glow and damage float text.

### Tertiary: The Eight Primordials
- **Caos** (p-caos), **Gaia** (p-gaia), **Ponto** (p-ponto), **Érebo** (p-erebo), **Nix** (p-nix), **Tártaro** (p-tartaro), **Éter** (p-eter), **Ananque** (p-ananque): one glass per Primordial from the rulebook. These fill rose-window petals, token medallions, gauges and tabletop washes. On text they are always mixed toward bone (`color-mix(in srgb, <glass> 40%, #f4ecd8)`) so they stay legible.

### Neutral
- **Abyss** (abyss): the page ground, under a faint radial wash of light from the top (`--bg-radial`).
- **Lead** (lead): every structural line, frame, divider, scrollbar track and token rim.
- **Smoked Glass** (glass-1 / glass-2): the fill of panes, ghost buttons and badges, as a top-to-bottom gradient.
- **Bone** (bone): headings and primary text.
- **Mist** (mist): secondary text, captions, inactive nav, placeholders (at 70%).

### Named Rules
**The One Light Rule.** Light has one hue per theme, always read through `rgb(var(--light) / α)`. Glows, focus rings, lit panes and the primary button all use it. A second glow colour never appears beside it.

**The Dark Glass Rule.** Primordial colours are deep fills, lit by brightness or radial gradients. They are never raised to saturated neon and never used raw as text colour.

**The Theme-Variable Rule.** Components reference `var(--color-*)`, `var(--glass-*)` and `--light`, never one theme's literal hex, so all three themes (sombrio, lúgubre, daltonismo) stay correct.

## Typography

**Display Font:** Grenze Gotisch (with Georgia, serif), self-hosted
**Body Font:** Schibsted Grotesk (with system-ui, sans-serif), self-hosted 400/500/700

**Character:** A blackletter inscription carved into the window sits over a sober working grotesque. The gothic face sets the tone, and the grotesque does all the reading and operating.

### Hierarchy
- **Display** (400, 3rem rising to 3.75rem at xl and 4.5rem for the closing call, 0.95–1): page heroes and section openers on the landing and rulebook.
- **Headline** (400, 3rem, 1): section titles (h2) on the landing and the rulebook chapter title.
- **Title** (400, 1.5rem–1.875rem): card, panel, note and sheet titles; chapter rows; character names.
- **Numerals** (display face, 1.5rem, tabular): attribute values, d20 faces, roman chapter numerals in ember at 70%.
- **Body** (400, 16px, 1.55): all reading text. The lead paragraph is 1.125rem in mist with max-width about 28–36rem.
- **Label** (600–700, 11–12px): badges, token names, mobile tab labels. Uppercase with wide tracking is reserved for abbreviated stat keys (FOR, AGI) and tabletop condition tags. These are data, not decoration.

### Named Rules
**The Inscription Rule.** Grenze Gotisch sets headings, names and numerals only. Buttons, fields, nav, captions and body copy always use Schibsted Grotesk.

**The Tabular Count Rule.** Every number that changes (life, totals, attributes, dice) uses tabular figures.

## Layout

The layout uses a centred 80rem container (max-w-7xl; the dashboard widens to 1600px) with 16px side gutters. Landing sections breathe at 80px vertical padding, rising to 112px from the sm breakpoint. Two-column splits are asymmetric (1.3fr/1fr for the hero, 1fr/1.4fr and .8fr/1.2fr for sections) and align to the bottom. Sections are separated by full-bleed lead rules rather than background colour changes. Lists such as chapters and the developer diary are ruled rows with 3px lead lines between them, not cards.

Mobile collapses to a single column. Primary navigation moves to a fixed bottom bar with five tabs (min 56px tall) plus a bottom sheet menu, and content reserves 80px at the bottom for that bar. On the landing page the rose window is sized at `min(60svh, 600px)`, so the hero headline shares the first viewport.

## Elevation & Depth

Depth comes from light, not lift. Surfaces are lead-framed glass with an inner hairline of light (outline 1px at light/.13, inset 4px) and a 1px top highlight. One deep ambient drop shadow seats the panel on the abyss. Glow, not offset, marks state: lit buttons, the active token and the critical d20 bloom in the theme light. Shadows are always soft and black or light-tinted, never hard-offset.

### Shadow Vocabulary
- **Panel seat** (`0 1px 0 rgb(var(--light)/.06) inset, 0 24px 48px -20px rgba(0,0,0,.8)`): every gothic panel.
- **Lit button glow** (`0 0 0 1px rgb(var(--light)/.5), 0 10px 30px -12px rgb(var(--light)/.7)`): primary action, stronger on hover.
- **Ambient glow** (`0 0 40px -8px rgb(var(--light)/.45)`): the Tailwind `shadow-glow` utility.
- **Active token halo** (`0 0 0 3px lead, 0 0 26px 6px rgb(var(--light)/.65)`): the token whose turn it is.
- **Object drop** (`drop-shadow(0 10px 24px rgba(0,0,0,.7))`): free-standing glass objects (d20).

### Named Rules
**The Light-Through-Glass Rule.** A surface becomes "active" by letting light in: a radial gradient of light/.28 to light/.06 from the top over glass-1 (`.lit`). Do not lift it, scale it or recolour its border.

## Shapes

Shapes are rectilinear and nearly square: 2px radius on buttons, fields, badges and the spinner, and 0 on panels, which read as glass set in lead. Lead lines run 2–6px (3px is the workhorse for frames and row dividers, 4px for nav and footer edges, 6px for the lead rule between sections). Three recurring gothic silhouettes are part of the world. The **lancet** is a card masked with a pointed arch over its top 7rem. The **medallion** is a circular token with a 4px lead rim. The **diamond** is the loading spinner, a square rotated from 45°. The rose window is the landing's signature drawing; it is not a reusable container.

## Components

### Buttons
Buttons are glass panes held in lead: heavy, square and lit from within.
- **Shape:** near-square (2px), 3px lead frame, min height 44px, 700 weight, .02em tracking.
- **Lit (primary):** dark ink (#1a1004) on a radial amber gradient with frosted grain. Hover brightens it (1.12) and widens the glow.
- **Glass (ghost):** ember text on a smoked glass gradient with a 1px light ring. Hover turns the text white and fills an inner glow.
- **Disabled:** 50% opacity, desaturated to .3.
- **Focus:** global 2px ember outline, 3px offset.

### Cards / Containers (Gothic Panel)
- **Corner Style:** square.
- **Background:** frosted grain over a top-left radial wash of light over a glass-1 to near-black gradient.
- **Border:** 3px lead, plus a 1px inner light hairline inset 4px.
- **Shadow Strategy:** panel seat (see Elevation).
- **Inner panes:** a smaller `pane` (same lead frame, no shadow) for nested groups. It is lit when selected.

### Inputs / Fields
- **Style:** 2px lead border, 1px light ring at .14, 45% black fill, 2px radius, 12px padding, min 40px tall. The caret is ember.
- **Focus:** the ring brightens to light/.75 with an 18px soft glow. The border colour never changes.

### Navigation
- **Desktop:** a sticky top bar on 95% abyss with a 4px lead bottom edge. The wordmark is in the display face ("Lúgubre" ember, "RPG" bone). Links are 500-weight mist and turn bone on hover. The active link gets a 4px ember bar with a glow, which scales in from the centre under the bar.
- **Mobile:** a fixed bottom tab bar (4px lead top edge, 11px semibold labels, active tab lit). The menu opens as a bottom sheet with a 6px lead top edge, and its rows are lead-framed glass that light up when active.

### Badge
Badge text is bone, 12px bold, inside a 2px lead frame with a 1px light ring on glass-2. It carries short facts (level, class, status), not section labels.

### Gauge
Life, sanity and mana bars are 20px tall: 3px lead frame, black well, and a fill of the matching Primordial glass with a 1px inner top highlight. Width eases over .5s.

### Tabletop Token (signature)
Each token is a circular glass medallion: a 4px lead rim and a radial fill from the token colour (`--tc`) mixed with white down to black. State is shown only by the lead and the glass:
- **Selected:** 3px double ember outline.
- **Hidden from players:** dashed rim at 55% opacity.
- **Active turn:** light halo.
- **Targetable:** blood halo and a crosshair cursor.
- **Down:** grayscale, half brightness.
- **Damaged:** a procedural crack SVG flashes over the token with a shake. No number is shown.

### Glass d20 (signature)
The d20 is a faceted glass die with a drop shadow. While rolling it tumbles for .9s, then lands with an overshoot. A critical roll blooms in the theme light with a pale-gold face; a fumble tints the face pale red.

### Lancet Card
A gothic panel is clipped to a pointed arch, with a lead arch stroke drawn on top. A glass window with a light wash sits above a 3px lead divider and a display-face title with a mist caption below.

## Do's and Don'ts

### Do:
- **Do** separate regions with lead (3px frames and dividers, 6px section rules) instead of grey borders or background bands.
- **Do** show "on" by letting light through the glass (`.lit`: radial light/.28 to light/.06 over glass-1).
- **Do** read every glow, ring and tint through `rgb(var(--light) / α)` and the `--color-*` variables, so the three themes hold.
- **Do** encode game state in the lead and glass: double for selected, dashed for hidden, cracked for damaged, grey for down.
- **Do** keep corners at 2px, or 0 for panels. Circles are reserved for medallions and dice targets.
- **Do** honour prefers-reduced-motion: dice, cracks, shakes, pings and floats drop to near-instant.

### Don't:
- **Don't** use neon or saturated Primordial colours, or put raw glass colours on text. Mix them toward bone.
- **Don't** add purple-castle glow, generic fantasy hero art or rounded SaaS cards. The world is lead and glass.
- **Don't** set buttons, fields, navigation or reading text in Grenze Gotisch.
- **Don't** reveal hidden numbers through the visual layer. Damage shows as a crack, never as a value on the target.
- **Don't** introduce a second light hue in a theme, or hard offset shadows.
