# Contributing to WhereWasI

Thank you for your interest in contributing to WhereWasI!

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Open `WhereWasI.xcodeproj` in Xcode
4. Build and run the project

## Development Setup

### Requirements

- macOS 13.0 or later
- Xcode 15.0 or later
- iOS 16.0+ deployment target

### Project Structure

- `WhereWasI/Models/` - Data models for location data
- `WhereWasI/Views/` - SwiftUI views
- `WhereWasI/ViewModels/` - View models with business logic
- `WhereWasI/Services/` - Services like the timeline parser
- `WhereWasI/Resources/` - Assets and resources

## Making Changes

### Code Style

- Follow Swift naming conventions
- Use SwiftUI best practices
- Add comments for complex logic
- Keep functions focused and small

### Testing Your Changes

1. Test with the sample data in `SampleData/sample-timeline.json`
2. Test with your own Google Timeline data
3. Test all visualization modes (points, routes, heatmap)
4. Verify the app works on both iPhone and iPad

### Submitting Changes

1. Create a new branch for your feature/fix
2. Make your changes
3. Test thoroughly
4. Commit with clear, descriptive messages
5. Push to your fork
6. Open a Pull Request

## Feature Ideas

Here are some ideas for contributions:

- **Date Range Filtering**: Filter locations by date range
- **Statistics Dashboard**: Show statistics like most visited places, distance traveled
- **Export Features**: Export visualizations or filtered data
- **Animation**: Animate movement through time
- **Search**: Search for specific locations
- **Clustering**: Cluster nearby points for better performance with large datasets
- **Different Map Types**: Support satellite, hybrid map views
- **Dark Mode**: Optimize colors for dark mode
- **Accessibility**: Improve VoiceOver support

## Questions?

Open an issue for questions or discussion about potential features.
