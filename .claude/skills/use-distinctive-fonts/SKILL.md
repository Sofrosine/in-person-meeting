---
name: use-distinctive-fonts
description: Enforces distinctive, high-quality typography choices for the meeting notes app. Avoids generic AI-slop fonts. Always apply when building UI components.
disable-model-invocation: false
user-invocable: true
---

# Use Distinctive Fonts - Meeting Notes App

Typography instantly signals quality. Avoid using boring, generic fonts.

**Never use**: Inter, Roboto, Open Sans, Lato, Arial, default system fonts

## Recommended Font Choices for a Meeting Recording App

### Primary Display / Headers
Choose ONE distinctive font for headers and key UI elements:
- **Space Grotesk** - Technical, modern, clean authority
- **Bricolage Grotesque** - Distinctive geometric character
- **Plus Jakarta Sans** - Refined, professional warmth
- **Outfit** - Modern, geometric with personality
- **Syne** - Bold, editorial presence for recording screens

### Body / Transcript Text
For readable long-form transcript content:
- **Source Serif 4** - Elegant readability for meeting transcripts
- **Newsreader** - Editorial clarity for dense text
- **Literata** - Designed for extended reading (perfect for transcripts)
- **Crimson Pro** - Sophisticated serif for professional feel

### Monospace / Technical Elements (timers, timestamps, metadata)
- **JetBrains Mono** - Crisp and clear for recording timers
- **Fira Code** - Technical precision for timestamps
- **IBM Plex Mono** - Professional monospace for duration displays
- **Space Mono** - Quirky-technical for metadata

## Pairing Principle

High contrast = interesting. Use contrasting pairs:
- **Syne (display) + Literata (body) + JetBrains Mono (timer)** - Editorial studio
- **Space Grotesk (display) + Source Serif 4 (body) + IBM Plex Mono (data)** - Technical professional
- **Bricolage Grotesque (display) + Crimson Pro (body) + Fira Code (timer)** - Distinctive professional

## Weight & Size Rules

Use extremes for impact:
- Headers: Weight **700-900**, size **28-40px**
- Subheadings: Weight **500-600**, size **18-22px**
- Body: Weight **400**, size **15-16px**
- Captions/metadata: Weight **300-400**, size **12-13px**
- Timer display: Weight **200 or 700**, size **48-72px** (go big!)

Size jumps should be **2.5x+**, not timid 1.5x.

## Loading in React Native / Expo

Use `expo-font` or `@expo-google-fonts`:
```typescript
import { useFonts } from 'expo-font';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Literata_400Regular } from '@expo-google-fonts/literata';
import { JetBrainsMono_300Light } from '@expo-google-fonts/jetbrains-mono';
```

Pick one distinctive combination, use it decisively across the entire app.
