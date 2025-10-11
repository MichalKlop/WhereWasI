# WhereWasI - Architecture Documentation

## Overview

WhereWasI is an iOS application built with SwiftUI and MapKit that visualizes location history data from Google Maps Timeline.

## Architecture Pattern

The app follows the **MVVM (Model-View-ViewModel)** architecture pattern:

```
┌─────────────┐
│   Views     │  ← SwiftUI Views
└─────┬───────┘
      │
      ├─ Bindings (@Published, @ObservedObject)
      ↓
┌─────────────┐
│ ViewModels  │  ← Business Logic & State
└─────┬───────┘
      │
      ├─ Uses
      ↓
┌─────────────┐
│  Services   │  ← Data Processing
└─────┬───────┘
      │
      ├─ Operates on
      ↓
┌─────────────┐
│   Models    │  ← Data Structures
└─────────────┘
```

## Components

### Models (`WhereWasI/Models/`)

**LocationData.swift**
- `TimelineData`: Root structure for Google Timeline JSON
- `TimelineLocation`: Individual location point with E7 coordinates
- `ProcessedLocationPoint`: Processed location with CLLocationCoordinate2D
- `LocationRoute`: Group of connected coordinates representing a path

### Views (`WhereWasI/Views/`)

**ContentView.swift**
- Main container view
- Switches between FileImportView and map display
- Contains settings sheet
- Shows statistics overlay

**FileImportView.swift**
- Initial view for file import
- Shows instructions for Google Takeout
- Handles file picker presentation

**MapView.swift**
- UIViewRepresentable wrapper for MKMapView
- Renders annotations, polylines, and overlays
- Implements MKMapViewDelegate

**HeatmapOverlay.swift**
- Placeholder for heatmap visualization
- Actual rendering done in MapView's renderer

### ViewModels (`WhereWasI/ViewModels/`)

**MapViewModel.swift**
- `@Published` properties for reactive UI updates
- Manages location points and routes
- Controls visualization toggles
- Handles data import and processing
- Generates heatmap data
- Centers map on data bounds

### Services (`WhereWasI/Services/`)

**TimelineParser.swift**
- Parses multiple Google Timeline JSON formats:
  - Legacy format with `locations` array
  - Semantic segments format
  - Timeline objects format (current)
- Converts E7 coordinates to CLLocationCoordinate2D
- Groups locations into routes based on time gaps
- Error handling for invalid formats

## Data Flow

### Import Flow

```
User selects file
      ↓
FileImportView triggers import
      ↓
MapViewModel.importTimelineData()
      ↓
TimelineParser.parse()
      ↓
ProcessedLocationPoint array
      ↓
MapViewModel updates @Published properties
      ↓
Views automatically update
```

### Visualization Flow

```
User toggles visualization option
      ↓
MapViewModel @Published property changes
      ↓
MapView.updateUIView() called
      ↓
MKMapView updated with overlays/annotations
      ↓
MKMapViewDelegate renders visuals
```

## Map Rendering

### Annotations (Points)
- Created from `ProcessedLocationPoint` array
- Custom `LocationAnnotation` with timestamp
- Rendered as blue circles with white borders

### Polylines (Routes)
- Generated from consecutive locations
- Time-based grouping (default 60 min gap)
- Rendered as blue lines with transparency

### Heatmap (Density)
- Grid-based density calculation
- Circular overlays with intensity-based alpha
- Red color with variable transparency

## Performance Considerations

1. **Grid-based Heatmap**: Reduces overlay count by grouping nearby points
2. **Route Extraction**: Only processes on data import, not on every render
3. **Async/Await**: Non-blocking file parsing
4. **Lazy Loading**: Views only render when data is available

## Error Handling

- Parser throws specific errors for debugging
- ViewModel catches and displays user-friendly messages
- Invalid JSON formats gracefully handled
- File access errors reported to user

## State Management

All state is managed through `MapViewModel`:
- `@Published` properties trigger view updates
- Single source of truth
- Centralized business logic
- Easy to test and maintain

## Future Enhancements

- Persistence layer (CoreData or SwiftData)
- Background processing for large files
- Incremental loading for huge datasets
- Custom map tiles
- 3D visualization
