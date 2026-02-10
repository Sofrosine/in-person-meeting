---
name: meeting-app-theme
description: Enforces the Studio Noir aesthetic for the meeting recording app - dark professional recording studio atmosphere with warm amber accents, audio waveform motifs, and cinematic depth. Always apply when designing screens.
disable-model-invocation: false
user-invocable: true
---

# Meeting App Theme - "Studio Noir" Aesthetic

Always design with a **professional recording studio** aesthetic — dark, warm, cinematic, and confident.

## Design Philosophy

Think: late-night podcast studio, professional voice booth, analog-meets-digital warmth. The app should feel like a premium tool that a professional reaches for before every important conversation.

## Color Palette

### Dark Foundation
```
--bg-primary: #0D0D0F          // Deep near-black (the studio walls)
--bg-secondary: #161619        // Slightly lifted surfaces
--bg-tertiary: #1E1E23         // Cards, elevated containers
--bg-surface: #252529          // Input fields, interactive surfaces
```

### Warm Amber Accent (the "recording light")
```
--accent-primary: #F59E0B      // Amber - the main accent (recording indicator)
--accent-warm: #D97706         // Deeper amber for hover/pressed states
--accent-glow: rgba(245, 158, 11, 0.15)  // Subtle amber glow for backgrounds
--accent-hot: #EF4444          // Red - live recording state only
--accent-hot-glow: rgba(239, 68, 68, 0.2) // Red glow for active recording
```

### Text Hierarchy
```
--text-primary: #F5F5F0        // Warm white (not pure white)
--text-secondary: #A0A0A0      // Muted gray for secondary info
--text-tertiary: #6B6B6B       // Subtle gray for timestamps, metadata
--text-accent: #F59E0B         // Amber for highlighted text
```

### Status Colors
```
--status-recording: #EF4444    // Red pulse - actively recording
--status-processing: #F59E0B   // Amber spin - processing transcript
--status-complete: #10B981     // Emerald - transcript ready
--status-failed: #EF4444       // Red static - error state
```

## Visual Elements

### Recording Button
- Large circular button, center of screen
- Idle: Dark surface with subtle amber ring outline
- Recording: Pulsing red with animated glow rings radiating outward
- Morphs shape: circle → rounded square when recording (like iOS voice memos)

### Audio Waveform Motifs
- Subtle animated waveform bars behind the recording timer
- Static waveform visualization on meeting list items (shows audio "fingerprint")
- Micro-waveform in the meeting detail header

### Cards & Surfaces
- Rounded corners (16px radius)
- Subtle 1px border: `rgba(255, 255, 255, 0.06)`
- No heavy box shadows — use layered backgrounds for depth
- Glassmorphism sparingly: `backdrop-filter: blur(20px)` on overlays only

### Depth & Atmosphere
- Radial gradient from center: subtle warm glow behind recording area
- Background: `radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.03) 0%, transparent 70%)`
- Very subtle noise texture overlay for analog warmth (optional)

### Borders & Dividers
- Never solid harsh lines
- Use `rgba(255, 255, 255, 0.06)` for subtle separation
- Or gradient dividers that fade at edges

## Component Styling

### Timer Display
- Monospace font, weight 200 (ultralight) or 700 (bold)
- Size: 48-64px during recording
- Color: `--text-primary` with subtle amber tint when recording
- Format: `00:00:00` (HH:MM:SS)

### Meeting List Items
- Dark card with slight elevation
- Left accent bar showing status color (2px)
- Title in primary text, date in tertiary
- Duration badge in monospace
- Subtle waveform preview graphic

### Tab Bar
- Dark, minimal, no heavy borders
- Active tab: amber icon + amber underline
- Inactive: muted gray icons
- Slight blur background

### Status Badges
- Small pill shape
- Filled with status color at low opacity (15%)
- Text in status color
- "Recording" badge pulses subtly

## Animation Guidelines
- Recording pulse: smooth, breathing rhythm (2s ease-in-out infinite)
- Waveform: subtle bobbing bars (CSS or Reanimated)
- Screen transitions: fade + slight scale (0.98 → 1.0)
- List items: stagger entrance by 50ms each
- Status changes: color crossfade (300ms)

## What to AVOID
- Pure white backgrounds
- Blue/purple gradient "AI-startup" look
- Flat, lifeless gray-on-white design
- Generic Material Design or iOS default styling
- Busy patterns or distracting decorations
- Bright colors competing with the recording indicator
