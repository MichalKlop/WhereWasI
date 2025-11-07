**Role:** You are an expert React Native developer specializing in geospatial applications and the Expo framework.

**Task:** Your task is to develop the complete, single-file `App.js` code for an iOS geospatial visualization application. This app allows a user to import their Google Maps location history JSON file and visualize it on a map with several different layers.

### Core Requirements:

1.  **Framework:** The application must be built using **React Native** and the **Expo** managed workflow.
2.  **Mapping Library:** You must use **`react-native-maps`** as the exclusive mapping provider.
3.  **File Import:** The app must include a "Load Data" button that uses the **`expo-document-picker`** library to allow the user to select their JSON file from their device.
4.  **Data Parsing:** Upon successful import, the app must parse the loaded JSON file. See the "Data Parsing Logic" section below for the specific data structures to handle.
5.  **State Management:** Use React `useState` hooks to manage:
      * The array of parsed "visit" points.
      * The array of parsed "timeline" polylines.
      * The visibility state (boolean) for each of the three map layers (Points, Polylines, Heatmap).
6.  **Map Features:** The `MapView` component must render the following features based on the parsed data:
      * **Point Layer:** Render all "visit" locations as `<Marker>` components.
      * **Polyline Layer:** Render all "timelinePath" segments as `<Polyline>` components.
      * **Heatmap Layer:** Use the "visit" point coordinates to render a `<Heatmap>` component.
7.  **UI Controls:**
      * Provide three buttons (e.g., "Toggle Points", "Toggle Polylines", "Toggle Heatmap") that show/hide their respective layers based on the state.
      * The "Load Data" button should be the primary call to action.
8.  **Map Styling:** Apply a custom dark mode map style to the `<MapView>` component using the `customMapStyle` prop.
9.  **Performance:** To handle a large number of markers, the `<Marker>` components must:
      * Be wrapped in `React.memo`.
      * Have the `tracksViewChanges={false}` prop set to `false` to prevent unnecessary re-renders.

### Data Parsing Logic:

The imported Google Maps JSON file (e.g., `Location History.json`) is a large array of objects. You must iterate through this array and parse two distinct object types:

1.  **"Visit" Objects (for Points & Heatmap):**

      * Identify objects that have a `visit` key.
      * Extract the coordinate string from `visit.topCandidate.placeLocation`.
      * **Example Data:**
        ```json
        {
          "endTime" : "2014-12-25T21:20:05.469-08:00",
          "startTime" : "2014-12-25T11:47:40.250-08:00",
          "visit" : {
            "topCandidate" : {
              "placeLocation" : "geo:37.492491,-122.264012"
            }
          }
        }
        ```
      * **Parsing:** The string `"geo:37.492491,-122.264012"` must be parsed (e.g., split by `:` and `,`) into a coordinate object: `{ latitude: 37.492491, longitude: -122.264012 }`.

2.  **"Timeline Path" Objects (for Polylines):**

      * Identify objects that have a `timelinePath` key.
      * Iterate through the `timelinePath` array.
      * Extract the coordinate string from each `point` value.
      * **Example Data:**
        ```json
        {
          "endTime" : "2017-12-06T22:00:00.000Z",
          "startTime" : "2017-12-06T20:00:00.000Z",
          "timelinePath" : [
            { "point" : "geo:37.502362,-122.261583" },
            { "point" : "geo:37.504912,-122.260035" },
            { "point" : "geo:37.504644,-122.260390" },
            { "point" : "geo:37.504182,-122.258534" }
          ]
        }
        ```
      * **Parsing:** Each `timelinePath` object should produce an array of coordinate objects, e.g., `[ { latitude: 37.502362, longitude: -122.261583 }, { latitude: 37.504912, longitude: -122.260035 },... ]`. The main state should store an array of these arrays (one for each path).

### Dependencies:

Assume the user will install the following dependencies:
`npx expo install react-native-maps`
`npx expo install expo-document-picker`
`npx expo install expo-file-system`

### Deliverable:

Provide the complete, self-contained code for `App.js` that fulfills all of the above requirements. Ensure the code is clean, well-commented, and includes the necessary `import` statements for all components and hooks.