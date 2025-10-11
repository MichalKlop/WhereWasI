# WhereWasI - Features Documentation

## Core Features

### 1. Data Import

#### Supported Formats
The app supports multiple Google Timeline JSON formats:

**Timeline Objects Format** (Current Google Takeout)
```json
{
  "timelineObjects": [
    {
      "placeVisit": { ... },
      "activitySegment": { ... }
    }
  ]
}
```

**Legacy Locations Format**
```json
{
  "locations": [
    {
      "latitudeE7": 375774490,
      "longitudeE7": -1224194160,
      "timestampMs": "1234567890000"
    }
  ]
}
```

**Semantic Segments Format**
```json
{
  "semanticSegments": [
    {
      "visit": { ... },
      "activity": { ... }
    }
  ]
}
```

#### Import Process
1. User taps "Import Timeline Data"
2. iOS file picker appears
3. User selects JSON file
4. App parses data asynchronously
5. Map displays with all locations

### 2. Map Visualization

#### Point Markers
- **What**: Blue circular markers for each location
- **When to use**: When you want to see individual location points
- **Features**:
  - Tap to see timestamp
  - Automatically sized for readability
  - White border for contrast

#### Route Polylines
- **What**: Blue lines connecting consecutive locations
- **When to use**: To visualize movement patterns and paths taken
- **Features**:
  - Intelligent route grouping (60-minute gap threshold)
  - Semi-transparent for overlay visibility
  - Connects points in chronological order

#### Heatmap Overlay
- **What**: Red circular overlays showing location density
- **When to use**: To identify frequently visited areas
- **Features**:
  - Grid-based density calculation
  - Intensity-based transparency
  - Automatic scaling based on data

### 3. Map Controls

#### Region Management
- **Auto-Center**: Automatically fits all data points when imported
- **Manual Center**: Button to re-center on all data
- **Pan & Zoom**: Standard MapKit gestures

#### Display Toggles
- **Show Points**: Toggle point markers on/off
- **Show Routes**: Toggle route lines on/off
- **Show Heatmap**: Toggle heatmap overlay on/off

### 4. Statistics Display

The app shows real-time statistics:
- Total number of locations
- Number of detected routes
- Quick access to clear data

### 5. User Interface

#### Welcome Screen
- App branding
- Import button
- Step-by-step Google Takeout instructions
- Error display (if import fails)

#### Map Screen
- Full-screen map
- Floating statistics card
- Settings button in navigation bar
- Navigation title

#### Settings Sheet
- Display option toggles
- Center on locations action
- Clean, form-based layout

## Technical Features

### Performance Optimizations

1. **Grid-Based Heatmap**
   - Groups nearby points into grid cells
   - Reduces number of map overlays
   - Scales with data size

2. **Route Extraction**
   - One-time processing on import
   - Cached in ViewModel
   - No re-computation on view updates

3. **Async Import**
   - Non-blocking file parsing
   - Progress indication
   - Error handling

### Data Processing

1. **Coordinate Conversion**
   - Automatic E7 to decimal conversion
   - Handles both E7 and decimal formats
   - Validates coordinate ranges

2. **Timestamp Parsing**
   - ISO 8601 format support
   - Millisecond timestamp support
   - Chronological sorting

3. **Route Detection**
   - Time-gap-based segmentation
   - Minimum 2 points per route
   - Configurable gap threshold

### Error Handling

1. **Parse Errors**
   - Invalid JSON format detection
   - Multiple format attempts
   - User-friendly error messages

2. **File Access Errors**
   - Permission handling
   - File read error reporting
   - Graceful degradation

3. **Data Validation**
   - Coordinate validation
   - Timestamp validation
   - Empty data handling

## Privacy Features

1. **Local Processing**
   - All data stays on device
   - No network requests
   - No analytics or tracking

2. **Data Control**
   - Easy data clearing
   - No persistent storage (currently)
   - User controls all data

## Accessibility

1. **VoiceOver Support**
   - All buttons labeled
   - Map annotations readable
   - Navigation structure clear

2. **Dynamic Type**
   - Text scales with system settings
   - Layout adapts to size changes

3. **Color Contrast**
   - High contrast markers
   - White borders for visibility
   - Readable against all map types

## Platform Support

- **iOS**: 16.0 or later
- **Devices**: iPhone and iPad
- **Orientations**: Portrait and Landscape
- **Screen Sizes**: All iPhone and iPad sizes

## Future Features (Roadmap)

See CONTRIBUTING.md for ideas on extending the app with:
- Date filtering
- Advanced statistics
- Export capabilities
- Animation through time
- Search functionality
- And more!
