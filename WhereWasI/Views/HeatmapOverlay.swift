//
//  HeatmapOverlay.swift
//  WhereWasI
//
//  Heatmap visualization overlay for location density
//

import SwiftUI
import MapKit

struct HeatmapOverlay: View {
    let heatmapData: [(coordinate: CLLocationCoordinate2D, intensity: Double)]
    
    var body: some View {
        // This is a placeholder view
        // The actual heatmap rendering is handled in MapView's MKOverlayRenderer
        EmptyView()
    }
}
