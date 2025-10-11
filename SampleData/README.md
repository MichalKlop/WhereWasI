# Sample Timeline Data

This directory contains sample Google Timeline JSON data for testing the WhereWasI app.

## Files

- `sample-timeline.json`: A sample timeline file with a few locations across different cities (San Francisco, Oakland, New York, Atlanta)

## Usage

1. Open WhereWasI in the iOS Simulator or on a device
2. Tap "Import Timeline Data"
3. Navigate to and select `sample-timeline.json`
4. The app will display the locations on the map

## Format

The sample data uses the `timelineObjects` format from Google Takeout, which includes:
- `placeVisit` objects for stationary locations
- `activitySegment` objects for movement between places

Each location uses the E7 format (latitude/longitude multiplied by 10^7) which is the standard Google Timeline format.
