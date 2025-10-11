# WhereWasI

An iOS app for visualizing your personal location history from Google Maps Timeline on an interactive map.

## Features

- **Import Google Timeline Data**: Import your location history from Google Takeout JSON files
- **Interactive Map**: Visualize your locations on an interactive MapKit-based map
- **Multiple Visualization Modes**:
  - Point markers for individual locations
  - Route polylines showing movement paths
  - Heatmap overlay for location density visualization
- **Data Statistics**: View total locations and routes tracked
- **Customizable Display**: Toggle different visualization layers on/off

## Requirements

- iOS 16.0 or later
- Xcode 15.0 or later
- Swift 5.9 or later

## Getting Started

### Getting Your Google Timeline Data

1. Go to [Google Takeout](https://takeout.google.com)
2. Deselect all and select only **Location History**
3. Choose **JSON** format for Location History
4. Click "Next step" and create the export
5. Download and extract the archive when ready
6. Look for JSON files in the extracted folder (typically named like `Records.json` or in the `Semantic Location History` folder)

### Using the App

1. Open WhereWasI on your iOS device
2. Tap "Import Timeline Data"
3. Select your Google Timeline JSON file
4. The app will parse and display your location history on the map
5. Use the settings (slider icon) to toggle visualization options:
   - Show/hide location points
   - Show/hide routes
   - Show/hide heatmap
6. Tap "Center on Locations" to fit all your data on the map

## Project Structure

```
WhereWasI/
├── WhereWasI/
│   ├── WhereWasIApp.swift          # App entry point
│   ├── Models/
│   │   └── LocationData.swift       # Data models for location history
│   ├── Views/
│   │   ├── ContentView.swift        # Main view controller
│   │   ├── MapView.swift            # MapKit integration
│   │   ├── FileImportView.swift    # File import interface
│   │   └── HeatmapOverlay.swift    # Heatmap visualization
│   ├── ViewModels/
│   │   └── MapViewModel.swift       # Map state management
│   ├── Services/
│   │   └── TimelineParser.swift     # JSON parsing logic
│   └── Resources/
│       └── Assets.xcassets/         # App icons and colors
└── WhereWasI.xcodeproj/
```

## Implementation Details

### Data Models

The app supports multiple Google Timeline JSON formats:
- Legacy format with `locations` array
- Semantic timeline with `semanticSegments`
- Timeline objects format with `timelineObjects`

### Map Features

- Uses `MKMapView` through UIViewRepresentable for full MapKit capabilities
- Custom annotations with timestamps
- Polylines for routes with configurable styling
- Circle overlays for heatmap visualization

### Performance

- Async/await for file parsing
- Grid-based heatmap generation for performance
- Configurable route grouping based on time gaps

## Privacy

- All location data is processed locally on your device
- No data is sent to any server
- Data can be cleared at any time using the "Clear Data" button

## License

This project is open source and available for personal use.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.
