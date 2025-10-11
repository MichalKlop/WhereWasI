//
//  LocationData.swift
//  WhereWasI
//
//  Data models for Google Timeline location history
//

import Foundation
import CoreLocation

// MARK: - Google Timeline JSON Structure

struct TimelineData: Codable {
    let locations: [TimelineLocation]?
    let semanticSegments: [SemanticSegment]?
}

struct TimelineLocation: Codable, Identifiable {
    var id: String { "\(latitude),\(longitude),\(timestampMs)" }
    
    let latitudeE7: Int
    let longitudeE7: Int
    let timestampMs: String
    let accuracy: Int?
    let altitude: Int?
    let verticalAccuracy: Int?
    
    var latitude: Double {
        Double(latitudeE7) / 1e7
    }
    
    var longitude: Double {
        Double(longitudeE7) / 1e7
    }
    
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
    
    var timestamp: Date? {
        guard let ms = Int64(timestampMs) else { return nil }
        return Date(timeIntervalSince1970: TimeInterval(ms) / 1000.0)
    }
}

struct SemanticSegment: Codable, Identifiable {
    var id: String { "\(startTime)\(endTime)" }
    
    let startTime: String
    let endTime: String
    let visit: Visit?
    let activity: Activity?
}

struct Visit: Codable {
    let topCandidate: Place?
    let hierarchyLevel: Int?
}

struct Activity: Codable {
    let topCandidate: ActivityType?
    let distanceMeters: Int?
    let start: Location?
    let end: Location?
}

struct Place: Codable {
    let placeId: String?
    let name: String?
    let placeLocation: Location?
}

struct Location: Codable {
    let latitudeE7: Int?
    let longitudeE7: Int?
    
    var latitude: Double? {
        guard let lat = latitudeE7 else { return nil }
        return Double(lat) / 1e7
    }
    
    var longitude: Double? {
        guard let lon = longitudeE7 else { return nil }
        return Double(lon) / 1e7
    }
    
    var coordinate: CLLocationCoordinate2D? {
        guard let lat = latitude, let lon = longitude else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lon)
    }
}

struct ActivityType: Codable {
    let type: String?
}

// MARK: - Processed Location Data

struct ProcessedLocationPoint: Identifiable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
    let timestamp: Date
    let accuracy: Int?
}

struct LocationRoute: Identifiable {
    let id = UUID()
    let coordinates: [CLLocationCoordinate2D]
    let startTime: Date
    let endTime: Date
}
