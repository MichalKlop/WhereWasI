# App Screenshots & UI Description

Since this is a code-only implementation (not running on an iOS simulator), here's a detailed description of what the app looks like when running:

## Welcome Screen

**Layout:**
```
┌─────────────────────────────┐
│   WhereWasI                │
│                             │
│         🗺️ (Map Icon)       │
│                             │
│      WhereWasI              │
│                             │
│  Visualize your Google      │
│  Maps Timeline location     │
│  history                    │
│                             │
│  ┌───────────────────────┐ │
│  │ Import Timeline Data  │ │
│  └───────────────────────┘ │
│                             │
│  How to export your Google  │
│  Timeline:                  │
│  1. Go to takeout.google... │
│  2. Select 'Location...'    │
│  3. Choose JSON format      │
│  4. Download and extract... │
│  5. Import the timeline...  │
│                             │
└─────────────────────────────┘
```

**Colors:**
- Background: White
- Primary buttons: Blue (#007AFF)
- Text: Black/Gray
- Icons: Blue
- Instructions box: Light gray background

## Map View

**Layout:**
```
┌─────────────────────────────┐
│ < WhereWasI            ☰   │ ← Navigation bar
├─────────────────────────────┤
│                             │
│    🗺️  [Interactive Map]   │
│                             │
│    • • •  Blue points       │
│    ──────  Blue routes      │
│    🔴🔴   Red heatmap        │
│                             │
│  ┌─────────────────┐        │
│  │ 📍 145 locations│        │
│  │ 🔀 23 routes    │        │
│  │ 🗑️ Clear Data   │        │
│  └─────────────────┘        │
└─────────────────────────────┘
```

**Map Elements:**
- **Points**: Blue circles (8pt diameter) with white borders
- **Routes**: Blue polylines (3pt width, 70% opacity)
- **Heatmap**: Red circles with varying opacity based on density
- **Statistics Card**: White background with shadow, bottom-left corner

## Settings Sheet

**Layout:**
```
┌─────────────────────────────┐
│         Settings      Done  │
├─────────────────────────────┤
│                             │
│  DISPLAY OPTIONS            │
│                             │
│  Show Points          [ON]  │
│  Show Routes          [ON]  │
│  Show Heatmap         [OFF] │
│                             │
│  MAP ACTIONS                │
│                             │
│  Center on Locations    >   │
│                             │
└─────────────────────────────┘
```

## Color Palette

**Primary Colors:**
- Blue: `#007AFF` (iOS system blue)
  - Used for buttons, primary actions, map points
  
- Red: `#FF3B30` (iOS system red)
  - Used for heatmap, delete/clear actions

- Gray: Various shades
  - Secondary text: `#8E8E93`
  - Borders: `#C6C6C8`
  - Background: `#F2F2F7`

**Map Colors:**
- Point markers: Blue with 60% opacity
- Point borders: White (1pt)
- Route lines: Blue with 70% opacity
- Heatmap: Red with variable opacity (0-30%)

## Typography

**Font Family:** SF Pro (iOS system font)

**Sizes:**
- Navigation Title: 17pt Regular
- Large Title: 34pt Bold
- Headline: 17pt Semibold
- Body: 17pt Regular
- Subheadline: 15pt Regular
- Caption: 12pt Regular

## Icons

All icons use SF Symbols:
- `map.fill` - App icon/logo
- `square.and.arrow.down` - Import button
- `slider.horizontal.3` - Settings button
- `location.fill` - Location count
- `arrow.triangle.turn.up.right.diamond.fill` - Route count
- `trash` - Clear data button

## Interactions

**Animations:**
- Smooth transitions when toggling visualization modes
- Fade in/out for overlays
- Smooth map region changes
- Sheet presentation with slide-up animation

**Gestures:**
- Tap: Select annotations, press buttons
- Pinch: Zoom map
- Pan: Move map
- Two-finger tap: Zoom out

## Responsive Layout

**iPhone (Portrait):**
- Full-screen map
- Floating stats card at bottom-left
- Settings as modal sheet

**iPad:**
- Wider map area
- Larger stats card
- Settings can be sidebar or sheet

**Landscape:**
- Stats card repositioned if needed
- Map takes advantage of full width

## Accessibility

**VoiceOver Labels:**
- "Import Timeline Data button"
- "Settings button"
- "Clear Data button"
- "Location marker, visited on [date]"

**Dynamic Type:**
- All text scales with system settings
- Layouts adapt to larger text sizes

## Dark Mode Support

The app uses system colors that automatically adapt:
- Background: White → Black
- Text: Black → White
- Blue accent: Adjusts brightness
- Map: Standard → Dark style
