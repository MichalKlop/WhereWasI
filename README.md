# WhereWasI? - An iOS App for Visualizing Personal Location Timeline Data

## Overview

An interactive iOS mapping app that visualizes your personal location history from Google Maps Timeline. Users manually import their Google Timeline data (as a JSON) and can then choose how it is visualized and filtered. Data will be visualized as points, polylines (points connected by lines), and as a heatmap. Filters include time range and location. 

## Features

- **📁 File Import**: Import your Google Maps location history JSON file directly from your device
- **📍 Point Visualization**: View all visit locations as interactive markers on the map
- **🛣️ Route Visualization**: Display timeline paths as polylines showing your movement routes
- **🔥 Heatmap Layer**: Visualize location density using a heatmap overlay
- **🎛️ Layer Controls**: Toggle visibility of each visualization layer independently

## Installation

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the app:**
   ```bash
   npx expo start
   ```

3. **Run on iOS:**
   - Press `i` for iOS Simulator, or
   - Scan the QR code with Expo Go on your device

### Prerequisites

- Node.js (v14 or higher)
- npm
- Expo CLI (optional)
- iOS Simulator or physical iOS device with Expo Go

## Usage

0. **Download your Data**:
   1. Go to [Google Takeout](https://takeout.google.com/)
   2. Deselect All
   3. Select "Timeline" from the list of services
   4. Choose JSON as the data format
   5. Download and extract the archive
   6. Keep your `Location History.json` file somewhere easy to find on your phone

2. **Launch the App**: Open the app on your iOS device or simulator

3. **Load Your Data**:
   - Tap the "Load Data" button
   - Select your Google Maps location history JSON file from your device
   - The app will automatically parse and load your location data

4. **Explore Your Data**:
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
├── App.js                 # Main application component
├── app.json              # Expo configuration
├── babel.config.js       # Babel configuration
├── package.json          # Dependencies and scripts
├── .gitignore            # Git ignore rules
├── location-history.json # Sample/imported location data (optional)
├── prompt.md             # Project requirements specification
├── README.md             # Project documentation
└── INSTALL.md            # Detailed installation guide
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
