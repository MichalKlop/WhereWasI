//
//  MapViewModel.swift
//  WhereWasI
//
//  ViewModel for managing map data and state
//

import Foundation
import MapKit
import SwiftUI

@MainActor
class MapViewModel: ObservableObject {
    @Published var locationPoints: [ProcessedLocationPoint] = []
    @Published var routes: [LocationRoute] = []
    @Published var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 10, longitudeDelta: 10)
    )
    
    @Published var showPoints = true
    @Published var showRoutes = true
    @Published var showHeatmap = false
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let parser = TimelineParser()
    
    // Import and process timeline data
    func importTimelineData(from url: URL) async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Read file data
            let data = try Data(contentsOf: url)
            
            // Parse the data
            let points = try parser.parse(data: data)
            
            // Update on main actor
            self.locationPoints = points
            self.routes = parser.extractRoutes(from: points)
            
            // Center map on data
            if let firstPoint = points.first {
                centerMapOnLocations()
            }
            
            isLoading = false
        } catch {
            errorMessage = "Failed to import timeline data: \(error.localizedDescription)"
            isLoading = false
        }
    }
    
    // Center map on all location points
    func centerMapOnLocations() {
        guard !locationPoints.isEmpty else { return }
        
        var minLat = locationPoints[0].coordinate.latitude
        var maxLat = locationPoints[0].coordinate.latitude
        var minLon = locationPoints[0].coordinate.longitude
        var maxLon = locationPoints[0].coordinate.longitude
        
        for point in locationPoints {
            minLat = min(minLat, point.coordinate.latitude)
            maxLat = max(maxLat, point.coordinate.latitude)
            minLon = min(minLon, point.coordinate.longitude)
            maxLon = max(maxLon, point.coordinate.longitude)
        }
        
        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2,
            longitude: (minLon + maxLon) / 2
        )
        
        let span = MKCoordinateSpan(
            latitudeDelta: max(0.01, (maxLat - minLat) * 1.2),
            longitudeDelta: max(0.01, (maxLon - minLon) * 1.2)
        )
        
        region = MKCoordinateRegion(center: center, span: span)
    }
    
    // Generate heatmap data
    func generateHeatmapData() -> [(coordinate: CLLocationCoordinate2D, intensity: Double)] {
        var heatmapPoints: [(coordinate: CLLocationCoordinate2D, intensity: Double)] = []
        
        // Group nearby points to create density-based heatmap
        let gridSize = 0.01 // ~1km grid
        var grid: [String: Int] = [:]
        
        for point in locationPoints {
            let gridLat = Int(point.coordinate.latitude / gridSize)
            let gridLon = Int(point.coordinate.longitude / gridSize)
            let key = "\(gridLat),\(gridLon)"
            grid[key, default: 0] += 1
        }
        
        // Convert grid to heatmap points
        let maxCount = Double(grid.values.max() ?? 1)
        for (key, count) in grid {
            let components = key.split(separator: ",")
            if components.count == 2,
               let gridLat = Int(components[0]),
               let gridLon = Int(components[1]) {
                let coord = CLLocationCoordinate2D(
                    latitude: Double(gridLat) * gridSize + gridSize / 2,
                    longitude: Double(gridLon) * gridSize + gridSize / 2
                )
                let intensity = Double(count) / maxCount
                heatmapPoints.append((coordinate: coord, intensity: intensity))
            }
        }
        
        return heatmapPoints
    }
    
    // Clear all data
    func clearData() {
        locationPoints.removeAll()
        routes.removeAll()
        errorMessage = nil
    }
}
