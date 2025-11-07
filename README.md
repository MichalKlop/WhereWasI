# Google Maps Location History Visualizer

A React Native iOS application built with Expo that allows users to import and visualize their Google Maps location history data on an interactive map with multiple visualization layers.

## Overview

This application provides a comprehensive way to explore your Google Maps location history by importing your exported JSON data and visualizing it through three distinct map layers: point markers, polylines, and heatmaps. The app features a modern dark mode interface and optimized performance for handling large datasets.

## Features

- **📁 File Import**: Import your Google Maps location history JSON file directly from your device
- **📍 Point Visualization**: View all visit locations as interactive markers on the map
- **🛣️ Route Visualization**: Display timeline paths as polylines showing your movement routes
- **🔥 Heatmap Layer**: Visualize location density using a heatmap overlay
- **🎛️ Layer Controls**: Toggle visibility of each visualization layer independently
- **🌙 Dark Mode**: Custom dark mode map styling for better visual experience
- **⚡ Performance Optimized**: Optimized rendering for large datasets with memoized markers

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or physical iOS device
- Xcode (for iOS development)

### Setup

1. Clone or download this repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install required Expo packages:
   ```bash
   npx expo install react-native-maps
   npx expo install expo-document-picker
   npx expo install expo-file-system
   ```

4. Start the Expo development server:
   ```bash
   npx expo start
   ```

5. Run on iOS:
   - Press `i` in the terminal to open in iOS Simulator, or
   - Scan the QR code with the Expo Go app on your physical device

## Usage

1. **Launch the App**: Open the app on your iOS device or simulator

2. **Load Your Data**:
   - Tap the "Load Data" button
   - Select your Google Maps location history JSON file from your device
   - The app will automatically parse and load your location data

3. **Explore Your Data**:
   - Use the toggle buttons to show/hide different visualization layers:
     - **Toggle Points**: Show/hide visit location markers
     - **Toggle Polylines**: Show/hide route paths
     - **Toggle Heatmap**: Show/hide the heatmap overlay
   - Interact with the map by panning and zooming to explore different areas

## Data Format

The application expects a Google Maps location history JSON file with the following structure:

### Visit Objects
Visit locations are extracted from objects containing a `visit` key:
```json
{
  "endTime": "2014-12-25T21:20:05.469-08:00",
  "startTime": "2014-12-25T11:47:40.250-08:00",
  "visit": {
    "topCandidate": {
      "placeLocation": "geo:37.492491,-122.264012"
    }
  }
}
```

### Timeline Path Objects
Route paths are extracted from objects containing a `timelinePath` key:
```json
{
  "endTime": "2017-12-06T22:00:00.000Z",
  "startTime": "2017-12-06T20:00:00.000Z",
  "timelinePath": [
    { "point": "geo:37.502362,-122.261583" },
    { "point": "geo:37.504912,-122.260035" },
    { "point": "geo:37.504644,-122.260390" }
  ]
}
```

### How to Export Your Google Maps Data

1. Go to [Google Takeout](https://takeout.google.com/)
2. Select "Location History" from the list of services
3. Choose your preferred export format (JSON)
4. Download and extract the archive
5. Locate the `Location History.json` file

## Technical Details

### Architecture

- **Framework**: React Native with Expo managed workflow
- **Mapping**: `react-native-maps` for map rendering
- **State Management**: React hooks (`useState`)
- **File Handling**: `expo-document-picker` for file selection
- **File System**: `expo-file-system` for reading JSON files

### Performance Optimizations

- Markers are wrapped in `React.memo` to prevent unnecessary re-renders
- `tracksViewChanges={false}` prop is set on all markers to improve performance
- Efficient parsing of large JSON datasets

### Project Structure

```
Project/
├── App.js              # Main application component
├── location-history.json  # Sample/imported location data (optional)
└── README.md           # This file
```

## Dependencies

- `react-native-maps`: Map rendering and visualization
- `expo-document-picker`: File selection from device
- `expo-file-system`: File reading and parsing
- `expo`: Expo framework and utilities
- `react-native`: React Native core

## Limitations

- Currently designed for iOS only
- Requires Google Maps location history JSON format
- Large datasets may take time to parse and render

## Future Enhancements

Potential improvements for future versions:
- Android support
- Date range filtering
- Location clustering for better performance
- Export functionality for filtered data
- Statistics and analytics dashboard
- Custom map styles and themes

## License

This project is provided as-is for educational and personal use.

## Contributing

Contributions, issues, and feature requests are welcome. Please feel free to submit a pull request or open an issue.

## Support

For issues or questions, please open an issue in the repository or contact the project maintainer.

---

**Note**: This application processes location data locally on your device. No data is transmitted to external servers.

