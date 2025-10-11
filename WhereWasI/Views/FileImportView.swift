//
//  FileImportView.swift
//  WhereWasI
//
//  View for importing Google Timeline JSON files
//

import SwiftUI
import UniformTypeIdentifiers

struct FileImportView: View {
    @ObservedObject var viewModel: MapViewModel
    @State private var showFileImporter = false
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "map.fill")
                .font(.system(size: 60))
                .foregroundColor(.blue)
            
            Text("WhereWasI")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("Visualize your Google Maps Timeline location history")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Spacer()
                .frame(height: 20)
            
            Button(action: {
                showFileImporter = true
            }) {
                Label("Import Timeline Data", systemImage: "square.and.arrow.down")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
            }
            
            if viewModel.isLoading {
                ProgressView("Loading timeline data...")
                    .padding()
            }
            
            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding()
            }
            
            VStack(alignment: .leading, spacing: 10) {
                Text("How to export your Google Timeline:")
                    .font(.headline)
                    .padding(.top)
                
                VStack(alignment: .leading, spacing: 5) {
                    InstructionStep(number: 1, text: "Go to Google Takeout (takeout.google.com)")
                    InstructionStep(number: 2, text: "Select 'Location History'")
                    InstructionStep(number: 3, text: "Choose JSON format")
                    InstructionStep(number: 4, text: "Download and extract the archive")
                    InstructionStep(number: 5, text: "Import the timeline JSON file here")
                }
                .font(.caption)
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(10)
            .padding(.horizontal)
            
            Spacer()
        }
        .padding()
        .fileImporter(
            isPresented: $showFileImporter,
            allowedContentTypes: [UTType.json],
            allowsMultipleSelection: false
        ) { result in
            handleFileImport(result: result)
        }
    }
    
    private func handleFileImport(result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            Task {
                await viewModel.importTimelineData(from: url)
            }
        case .failure(let error):
            viewModel.errorMessage = "Failed to import file: \(error.localizedDescription)"
        }
    }
}

struct InstructionStep: View {
    let number: Int
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("\(number).")
                .fontWeight(.semibold)
                .foregroundColor(.blue)
            Text(text)
        }
    }
}
