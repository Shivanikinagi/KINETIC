# Design System Strategy: The Kinetic Marketplace

## 1. Overview & Creative North Star
**The Creative North Star: "The Quantum Ledger"**

This design system moves away from the static, "boxy" nature of traditional fintech dashboards. Instead, it treats the P2P compute marketplace as a living, breathing ecosystem of high-velocity data. We are moving beyond the "template" look by leveraging **intentional asymmetry**—where heavy data visualizations are balanced by expansive negative space—and **tonal depth** that mimics a physical trading floor seen through a high-tech lens. 

The goal is a "High-End Editorial" feel for blockchain infrastructure. By utilizing extreme typographic scale and sophisticated layering, we create an environment that feels both authoritative (trustworthy) and cutting-edge (computational).

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep obsidian tones, punctuated by the high-frequency energy of electric cyan.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Layout boundaries must be defined solely through:
- **Background Color Shifts:** Placing a `surface-container-low` component against a `surface` backdrop.
- **Tonal Transitions:** Using soft gradients to suggest where one functional area ends and another begins.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested physical layers. This creates a "spatial" rather than "flat" experience.
- **Base Layer:** `surface` (#131314) or `surface-dim`.
- **Sectioning:** Use `surface-container-low` for large content areas.
- **Interaction/Emphasis:** Use `surface-container-highest` (#353436) for active or hovered elements.
- **Nested Depth:** An inner data table should sit on `surface-container-lowest` to "recess" into the page, while a primary action card should sit on `surface-container-high` to "project" toward the user.

### The "Glass & Gradient" Rule
To achieve the "Trading Floor" atmosphere, floating panels (modals, dropdowns, or hovering detail panes) must use **Glassmorphism**.
- **Token Usage:** Use `surface-variant` at 60% opacity with a `24px` backdrop-blur.
- **Signature Textures:** Main CTAs and high-level metrics should utilize a linear gradient from `primary` (#e9feff) to `primary-container` (#00f5ff) at a 135-degree angle. This "inner glow" provides a professional polish that flat fills cannot replicate.

---

## 3. Typography: Precision & Power
Our typography balances the editorial elegance of **Space Grotesk** with the functional precision of **Inter**.

*   **Display & Headlines (Space Grotesk):** Use these for high-impact data points and section headers. The wider aperture and geometric structure of Space Grotesk suggest a futuristic, "compute-ready" brand.
*   **Body & Labels (Inter):** Reserved for technical metadata, descriptions, and UI controls. Inter provides the legibility required for complex P2P transaction details.
*   **The Hierarchical Leap:** Do not be afraid of the gap. Pair a `display-lg` metric (e.g., "4.2 TH/s") directly with a `label-sm` unit descriptor. This high-contrast scaling creates a signature look that feels premium and intentional.

---

## 4. Elevation & Depth
In this system, elevation is a product of light and tone, not drop shadows.

### The Layering Principle
Depth is achieved by "stacking" surface-container tiers. For instance, a `primary-container` button should never sit on a `primary` surface; it should sit on a `surface-container-high` to maximize contrast and perceived "lift."

### Ambient Shadows
If a floating effect is required (e.g., a "Buy" flyout), shadows must be:
- **Color:** A tinted version of `surface_tint` (Cyan-tinted obsidian).
- **Properties:** 40px–60px Blur, 4% Opacity. It should feel like a soft ambient occlusion, not a "drop shadow."

### The "Ghost Border" Fallback
If accessibility requires a container edge, use the **Ghost Border**:
- **Token:** `outline-variant` (#3a494a).
- **Opacity:** 15%–20% maximum. 
- **Rule:** Never use 100% opaque borders for decorative containment.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`). Text: `on-primary` (Bold). No border. High-glow on hover using `primary_fixed`.
- **Secondary:** Ghost Border (`outline-variant` at 20%) with a `surface-container-low` fill.
- **Tertiary:** Text-only using `primary` token with `label-md` weight.

### Cards & Lists
- **The "No-Divider" Rule:** Forbid the use of horizontal rules. Separate list items using a `12px` vertical gap and a subtle background shift (`surface-container-lowest`) on hover.
- **Compute Cards:** Use `lg` (0.5rem) roundedness. Apply a subtle "Glass" fill to the header section of the card to differentiate it from the body.

### Data Visualization (Sleek Elements)
- **Status Indicators:** Use `primary` (#e9feff) for active nodes. Apply a CSS "pulse" animation with a spread of 8px using the `primary_fixed_dim` color.
- **Sparklines:** Use `primary` with a 2px stroke width. Apply a vertical gradient fill below the line (from `primary` at 20% opacity to `transparent`).

### Input Fields
- **State:** Instead of a border change on focus, use a "Glow" state. The background should shift to `surface-container-highest` and the `outline` token should appear at 30% opacity.
- **Typography:** Input text must use `title-sm` for high readability during high-stakes trading.

---

## 6. Do’s and Don’ts

### Do
- **Do** use `primary` cyan sparingly. It is a "laser pointer" for the user's eye.
- **Do** leverage asymmetric layouts. Align a large headline to the far left and the primary action to the far right with significant whitespace between.
- **Do** use `JetBrains Mono` (as a substitute for data-heavy `label-sm`) for wallet addresses and transaction hashes to emphasize the "compute" nature of the platform.

### Don't
- **Don't** use pure white (#FFFFFF). Always use `primary` (#e9feff) or `on-surface` (#e5e2e3) to maintain the dark-mode optics.
- **Don't** use standard Material Design "elevated" cards with 100% opaque shadows. It breaks the "Quantum Ledger" aesthetic.
- **Don't** cram information. If a screen feels crowded, increase the surface-container nesting rather than adding borders or lines.