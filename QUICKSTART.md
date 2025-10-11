# Quick Start Guide

## Get Your Location Data

1. Go to [takeout.google.com](https://takeout.google.com)
2. Click "Deselect all"
3. Scroll down and select only "Location History"
4. Click "Next step"
5. Choose delivery method (email recommended)
6. Click "Create export"
7. Wait for email notification (can take hours for large datasets)
8. Download and extract the ZIP file

## Import to WhereWasI

1. Open WhereWasI on your iPhone or iPad
2. Tap "Import Timeline Data"
3. Navigate to your extracted Google Takeout folder
4. Find the Location History folder
5. Select any JSON file (look for "Records.json" or files in "Semantic Location History")
6. Wait for processing (progress indicator will show)

## Explore Your Data

### View Points
- Points are shown as blue circles
- Tap a point to see the timestamp
- Toggle points on/off in Settings (slider icon)

### View Routes
- Routes appear as blue lines connecting locations
- Shows your movement patterns
- Toggle routes on/off in Settings

### View Heatmap
- Red areas show where you spend most time
- Intensity indicates frequency of visits
- Toggle heatmap on/off in Settings

### Navigate the Map
- **Pinch**: Zoom in/out
- **Drag**: Pan around
- **Double-tap**: Zoom in
- **Two-finger tap**: Zoom out

## Settings

Tap the slider icon (☰) in the top right to access:
- **Show Points**: Toggle location markers
- **Show Routes**: Toggle movement lines
- **Show Heatmap**: Toggle density overlay
- **Center on Locations**: Fit all data on screen

## Tips

- **Large datasets**: May take a few seconds to process
- **Multiple files**: Import different time periods separately
- **Performance**: Disable heatmap for very large datasets
- **Clear data**: Use the "Clear Data" button to start fresh

## Troubleshooting

### "Failed to import timeline data"
- Make sure the file is a valid JSON file
- Try a different JSON file from your export
- Check that the file isn't corrupted

### "No location data found"
- The file might be in a different format
- Try files from different folders in your export
- Ensure you exported Location History, not Location Services

### App is slow
- Disable heatmap visualization
- Try importing a smaller date range
- Clear data and import a subset of locations

## Privacy

- All processing happens on your device
- No data is sent to any server
- No accounts or sign-in required
- Clear data anytime with one tap

## Getting Help

- Check [FEATURES.md](FEATURES.md) for detailed feature documentation
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Open an issue on GitHub for bugs or questions
