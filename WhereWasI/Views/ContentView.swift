//
//  ContentView.swift
//  WhereWasI
//
//  Main content view with map and controls
//

import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = MapViewModel()
    @State private var showSettings = false
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.locationPoints.isEmpty {
                    FileImportView(viewModel: viewModel)
                } else {
                    mapContent
                }
            }
            .navigationTitle("WhereWasI")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .navigationBarTrailing) {
                    if !viewModel.locationPoints.isEmpty {
                        Button(action: {
                            showSettings.toggle()
                        }) {
                            Image(systemName: "slider.horizontal.3")
                        }
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(viewModel: viewModel)
            }
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }
    
    private var mapContent: some View {
        ZStack(alignment: .bottomLeading) {
            MapView(viewModel: viewModel)
                .edgesIgnoringSafeArea(.all)
            
            VStack(alignment: .leading, spacing: 10) {
                statsCard
            }
            .padding()
        }
    }
    
    private var statsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "location.fill")
                    .foregroundColor(.blue)
                Text("\(viewModel.locationPoints.count) locations")
                    .font(.headline)
            }
            
            if !viewModel.routes.isEmpty {
                HStack {
                    Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                        .foregroundColor(.green)
                    Text("\(viewModel.routes.count) routes")
                        .font(.subheadline)
                }
            }
            
            Button(action: {
                viewModel.clearData()
            }) {
                Label("Clear Data", systemImage: "trash")
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
        .padding()
        .background(Color.white.opacity(0.9))
        .cornerRadius(10)
        .shadow(radius: 5)
    }
}

struct SettingsView: View {
    @ObservedObject var viewModel: MapViewModel
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Display Options")) {
                    Toggle("Show Points", isOn: $viewModel.showPoints)
                    Toggle("Show Routes", isOn: $viewModel.showRoutes)
                    Toggle("Show Heatmap", isOn: $viewModel.showHeatmap)
                }
                
                Section(header: Text("Map Actions")) {
                    Button("Center on Locations") {
                        viewModel.centerMapOnLocations()
                        dismiss()
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
