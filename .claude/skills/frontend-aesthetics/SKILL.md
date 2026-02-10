---
name: frontend-aesthetics
description: Enforces high-quality, distinctive frontend design that avoids generic AI-slop aesthetics. Covers typography, color, motion, backgrounds, and layout decisions specific to the meeting notes app.
disable-model-invocation: false
user-invocable: true
---

# Frontend Aesthetics - Anti-AI-Slop Design Rules

You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. **Avoid this**: make creative, distinctive frontends that surprise and delight.

## Typography

Choose fonts that are beautiful, unique, and interesting.

**NEVER USE**: Arial, Inter, Roboto, Open Sans, Lato, system-ui defaults

**DO USE** (pick one distinctive combination):
- Display: Syne, Bricolage Grotesque, Outfit, Plus Jakarta Sans
- Body/Transcripts: Literata, Source Serif 4, Newsreader, Crimson Pro
- Monospace/Data: JetBrains Mono, IBM Plex Mono, Fira Code

Load via `@expo-google-fonts` packages in the Expo project.

## Color & Theme

Commit to the **Studio Noir** cohesive aesthetic (see `/meeting-app-theme` skill):
- Dark foundation (#0D0D0F → #252529)
- Warm amber accent (#F59E0B) as the signature color
- Red (#EF4444) reserved exclusively for "recording live" state
- Emerald (#10B981) for "completed/ready" state

**NEVER**: Purple gradients on white, pastel startup palettes, generic blue CTAs

Use CSS variables / React Native theme constants for consistency across all screens.

## Motion & Animation

Use animations for high-impact moments, not everywhere:

### Priority Animations (must have)
1. **Recording button pulse** - breathing glow when recording (Reanimated)
2. **Recording start** - button morph circle → rounded-rect with haptic feedback
3. **Meeting list entrance** - staggered fade-in from bottom (50ms delay each)
4. **Notification arrival** - subtle slide-down toast with blur

### Nice-to-Have Animations
- Waveform visualization during recording
- Timer digit transitions
- Screen transitions (shared element for meeting card → detail)
- Pull-to-refresh custom animation

### Implementation
- Use `react-native-reanimated` for complex animations
- Use `Animated` API for simple opacity/transform
- Add haptic feedback (`expo-haptics`) on record start/stop
- Keep animations at 60fps — test on real devices

## Backgrounds & Atmosphere

**NEVER** default to flat solid colors. Create depth:

### Recording Screen
```
Background: radial gradient with subtle amber glow at center
Overlay: very faint noise texture for analog warmth
Effect: ambient light that intensifies when recording
```

### Meetings List
```
Background: deep solid with subtle vertical gradient
Cards: slightly elevated surface with thin border
Depth: cards cast no shadow but have layered backgrounds
```

### Meeting Detail
```
Background: deep dark with subtle warm tone
Transcript area: slightly different surface tone for reading comfort
Summary: highlighted section with amber accent border
```

## Layout Principles

### Recording Screen (the hero)
- Recording button: centered, dominant, 80-120px
- Timer: large monospace above button
- Status: minimal text below button
- Negative space is intentional — the screen breathes
- Nothing competes with the record button

### Meetings List
- Cards, not bare list items
- Status indicator on left edge (colored bar)
- Key info hierarchy: Title > Date > Duration > Status
- Compact but not cramped

### Meeting Detail
- Sticky header with meeting metadata
- Summary in highlighted card at top
- Full transcript in scrollable body
- Clean typography optimized for reading

## Spacing System

Use an 8px base grid:
- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px
- `3xl`: 64px

Screen padding: 20-24px horizontal. Consistent across all screens.

## Icons
- Use `@expo/vector-icons` (Ionicons or Feather set)
- Stroke-style icons, not filled (matches the refined aesthetic)
- Icon size: 20-24px for navigation, 28-32px for primary actions
- Color follows text hierarchy rules

## What Makes This NOT Look Like AI Slop
1. One bold font choice used decisively (not three safe fonts)
2. Dark theme with WARM accent (not cold blue/purple)
3. Intentional negative space (not every pixel filled)
4. One signature color (amber) used sparingly but memorably
5. Animations that serve purpose (recording feedback, not decoration)
6. Real atmosphere (gradients, depth) not flat surfaces
7. Professional confidence, not "startup playful"
