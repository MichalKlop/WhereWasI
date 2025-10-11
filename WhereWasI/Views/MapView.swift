//
//  MapView.swift
//  WhereWasI
//
//  SwiftUI view for displaying the map with location data
//

import SwiftUI
import MapKit

struct MapView: UIViewRepresentable {
    @ObservedObject var viewModel: MapViewModel
    
    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator
        mapView.showsUserLocation = false
        return mapView
    }
    
    func updateUIView(_ mapView: MKMapView, context: Context) {
        // Update region
        mapView.setRegion(viewModel.region, animated: true)
        
        // Remove all overlays and annotations
        mapView.removeAnnotations(mapView.annotations)
        mapView.removeOverlays(mapView.overlays)
        
        // Add point annotations
        if viewModel.showPoints {
            let annotations = viewModel.locationPoints.map { point in
                let annotation = LocationAnnotation(coordinate: point.coordinate, timestamp: point.timestamp)
                return annotation
            }
            mapView.addAnnotations(annotations)
        }
        
        // Add route polylines
        if viewModel.showRoutes {
            for route in viewModel.routes {
                let polyline = MKPolyline(coordinates: route.coordinates, count: route.coordinates.count)
                mapView.addOverlay(polyline)
            }
        }
        
        // Add heatmap
        if viewModel.showHeatmap {
            let heatmapData = viewModel.generateHeatmapData()
            for item in heatmapData {
                let circle = MKCircle(center: item.coordinate, radius: 500)
                circle.title = "\(item.intensity)"
                mapView.addOverlay(circle)
            }
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, MKMapViewDelegate {
        var parent: MapView
        
        init(_ parent: MapView) {
            self.parent = parent
        }
        
        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard annotation is LocationAnnotation else { return nil }
            
            let identifier = "LocationPoint"
            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier)
            
            if annotationView == nil {
                annotationView = MKAnnotationView(annotation: annotation, reuseIdentifier: identifier)
                annotationView?.canShowCallout = true
                
                // Create custom pin
                let circleView = UIView(frame: CGRect(x: 0, y: 0, width: 10, height: 10))
                circleView.backgroundColor = .systemBlue.withAlphaComponent(0.6)
                circleView.layer.cornerRadius = 5
                circleView.layer.borderWidth = 1
                circleView.layer.borderColor = UIColor.white.cgColor
                
                annotationView?.addSubview(circleView)
                annotationView?.frame = circleView.frame
            } else {
                annotationView?.annotation = annotation
            }
            
            return annotationView
        }
        
        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            if let polyline = overlay as? MKPolyline {
                let renderer = MKPolylineRenderer(polyline: polyline)
                renderer.strokeColor = .systemBlue.withAlphaComponent(0.7)
                renderer.lineWidth = 3
                return renderer
            } else if let circle = overlay as? MKCircle {
                let renderer = MKCircleRenderer(circle: circle)
                let intensity = Double(circle.title ?? "0") ?? 0.0
                renderer.fillColor = .systemRed.withAlphaComponent(intensity * 0.3)
                renderer.strokeColor = .clear
                return renderer
            }
            return MKOverlayRenderer(overlay: overlay)
        }
    }
}

// Custom annotation class
class LocationAnnotation: NSObject, MKAnnotation {
    let coordinate: CLLocationCoordinate2D
    let timestamp: Date
    
    init(coordinate: CLLocationCoordinate2D, timestamp: Date) {
        self.coordinate = coordinate
        self.timestamp = timestamp
        super.init()
    }
    
    var title: String? {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: timestamp)
    }
}
