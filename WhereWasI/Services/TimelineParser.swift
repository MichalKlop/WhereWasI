//
//  TimelineParser.swift
//  WhereWasI
//
//  Service for parsing Google Timeline JSON data
//

import Foundation
import CoreLocation

class TimelineParser {
    
    enum ParserError: Error {
        case invalidJSON
        case noLocationData
        case invalidFileFormat
    }
    
    // Parse Google Timeline JSON from Data
    func parse(data: Data) throws -> [ProcessedLocationPoint] {
        let decoder = JSONDecoder()
        
        // Try to decode as TimelineData structure
        do {
            let timelineData = try decoder.decode(TimelineData.self, from: data)
            return processTimelineData(timelineData)
        } catch {
            // If that fails, try to decode as a dictionary with timelineObjects
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let timelineObjects = json["timelineObjects"] as? [[String: Any]] {
                return try parseTimelineObjects(timelineObjects)
            }
            throw ParserError.invalidJSON
        }
    }
    
    // Process TimelineData structure
    private func processTimelineData(_ data: TimelineData) -> [ProcessedLocationPoint] {
        var points: [ProcessedLocationPoint] = []
        
        // Process direct locations
        if let locations = data.locations {
            for location in locations {
                if let timestamp = location.timestamp {
                    let point = ProcessedLocationPoint(
                        coordinate: location.coordinate,
                        timestamp: timestamp,
                        accuracy: location.accuracy
                    )
                    points.append(point)
                }
            }
        }
        
        // Process semantic segments
        if let segments = data.semanticSegments {
            for segment in segments {
                if let visit = segment.visit,
                   let place = visit.topCandidate,
                   let coord = place.placeLocation?.coordinate {
                    if let startTime = parseTimestamp(segment.startTime) {
                        let point = ProcessedLocationPoint(
                            coordinate: coord,
                            timestamp: startTime,
                            accuracy: nil
                        )
                        points.append(point)
                    }
                }
            }
        }
        
        return points.sorted { $0.timestamp < $1.timestamp }
    }
    
    // Parse timeline objects format (newer Google Takeout format)
    private func parseTimelineObjects(_ objects: [[String: Any]]) throws -> [ProcessedLocationPoint] {
        var points: [ProcessedLocationPoint] = []
        
        for obj in objects {
            if let placeVisit = obj["placeVisit"] as? [String: Any],
               let location = placeVisit["location"] as? [String: Any],
               let latE7 = location["latitudeE7"] as? Int,
               let lonE7 = location["longitudeE7"] as? Int {
                
                let coord = CLLocationCoordinate2D(
                    latitude: Double(latE7) / 1e7,
                    longitude: Double(lonE7) / 1e7
                )
                
                if let duration = placeVisit["duration"] as? [String: Any],
                   let startTimestamp = duration["startTimestamp"] as? String,
                   let timestamp = parseTimestamp(startTimestamp) {
                    let point = ProcessedLocationPoint(
                        coordinate: coord,
                        timestamp: timestamp,
                        accuracy: nil
                    )
                    points.append(point)
                }
            }
            
            if let activitySegment = obj["activitySegment"] as? [String: Any],
               let startLocation = activitySegment["startLocation"] as? [String: Any],
               let latE7 = startLocation["latitudeE7"] as? Int,
               let lonE7 = startLocation["longitudeE7"] as? Int {
                
                let coord = CLLocationCoordinate2D(
                    latitude: Double(latE7) / 1e7,
                    longitude: Double(lonE7) / 1e7
                )
                
                if let duration = activitySegment["duration"] as? [String: Any],
                   let startTimestamp = duration["startTimestamp"] as? String,
                   let timestamp = parseTimestamp(startTimestamp) {
                    let point = ProcessedLocationPoint(
                        coordinate: coord,
                        timestamp: timestamp,
                        accuracy: nil
                    )
                    points.append(point)
                }
            }
        }
        
        return points.sorted { $0.timestamp < $1.timestamp }
    }
    
    // Parse timestamp string to Date
    private func parseTimestamp(_ timestamp: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        return formatter.date(from: timestamp)
    }
    
    // Extract routes from location points
    func extractRoutes(from points: [ProcessedLocationPoint], maxGapMinutes: Double = 60) -> [LocationRoute] {
        var routes: [LocationRoute] = []
        var currentRoute: [ProcessedLocationPoint] = []
        
        for (index, point) in points.enumerated() {
            if currentRoute.isEmpty {
                currentRoute.append(point)
            } else {
                let lastPoint = currentRoute.last!
                let timeDiff = point.timestamp.timeIntervalSince(lastPoint.timestamp) / 60.0
                
                if timeDiff <= maxGapMinutes {
                    currentRoute.append(point)
                } else {
                    if currentRoute.count >= 2 {
                        let route = LocationRoute(
                            coordinates: currentRoute.map { $0.coordinate },
                            startTime: currentRoute.first!.timestamp,
                            endTime: currentRoute.last!.timestamp
                        )
                        routes.append(route)
                    }
                    currentRoute = [point]
                }
            }
        }
        
        // Add the last route if it has enough points
        if currentRoute.count >= 2 {
            let route = LocationRoute(
                coordinates: currentRoute.map { $0.coordinate },
                startTime: currentRoute.first!.timestamp,
                endTime: currentRoute.last!.timestamp
            )
            routes.append(route)
        }
        
        return routes
    }
}
