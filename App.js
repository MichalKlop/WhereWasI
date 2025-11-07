import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  InteractionManager,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

// Custom dark mode map style
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

// Marker component with press handler
const MemoizedMarker = ({ coordinate, onPress, isSelected }) => {
  return (
    <Marker
      coordinate={coordinate}
      tracksViewChanges={false}
      pinColor={isSelected ? "#00FF00" : "#FF6B6B"}
      onPress={onPress}
      stopPropagation={true}
    />
  );
};

/**
 * Parse a geo coordinate string into a coordinate object
 * @param {string} geoString - Format: "geo:latitude,longitude"
 * @returns {object} - { latitude: number, longitude: number }
 */
const parseGeoString = (geoString) => {
  if (!geoString || typeof geoString !== 'string') return null;
  
  // Remove "geo:" prefix and split by comma
  const coordString = geoString.replace('geo:', '');
  const [lat, lon] = coordString.split(',');
  
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  
  // Validate coordinates
  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;
  
  return { latitude, longitude };
};

/**
 * Main App Component
 */
export default function App() {
  // State management
  const [visitPoints, setVisitPoints] = useState([]);
  const [timelinePaths, setTimelinePaths] = useState([]);
  const [showPoints, setShowPoints] = useState(true);
  const [showPolylines, setShowPolylines] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });
  
  // Use ref to track if marker/polyline was just tapped
  const markerTappedRef = useRef(false);
  
  // Animation for loading overlay
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const loadingScale = useRef(new Animated.Value(0.8)).current;

  // Show loading animation immediately
  const showLoadingAnimation = () => {
    // Set loading state immediately (synchronously)
    setIsLoadingDetail(true);
    
    // Start animations right away
    Animated.parallel([
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(loadingScale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Hide loading animation
  const hideLoadingAnimation = () => {
    Animated.parallel([
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(loadingScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsLoadingDetail(false);
    });
  };

  /**
   * Handle file selection and data parsing
   */
  const loadLocationData = async () => {
    try {
      setIsLoading(true);
      
      // Open document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      // Check if user cancelled
      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      // Get the selected file
      const file = result.assets[0];
      
      // Read the file content
      const fileContent = await FileSystem.readAsStringAsync(file.uri);
      
      // Parse JSON data
      const locationData = JSON.parse(fileContent);
      
      // Validate data structure
      if (!Array.isArray(locationData)) {
        Alert.alert('Error', 'Invalid file format. Expected an array of location objects.');
        setIsLoading(false);
        return;
      }

      // Parse the data
      const { visitCount, pathCount } = parseLocationData(locationData);
      
      Alert.alert('Success', `Loaded ${visitCount} points and ${pathCount} paths`);
      
    } catch (error) {
      console.error('Error loading file:', error);
      Alert.alert('Error', `Failed to load file: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Parse location data from the imported JSON
   * @param {array} data - Array of location history objects
   */
  const parseLocationData = (data) => {
    const visits = [];
    const paths = [];
    let firstValidCoordinate = null;

    data.forEach((item, index) => {
      // Parse visit objects (for points and heatmap)
      if (item.visit && item.visit.topCandidate && item.visit.topCandidate.placeLocation) {
        const coordinate = parseGeoString(item.visit.topCandidate.placeLocation);
        if (coordinate) {
          const visitData = {
            ...coordinate,
            metadata: {
              index,
              startTime: item.startTime,
              endTime: item.endTime,
              semanticType: item.visit.topCandidate.semanticType,
              probability: item.visit.topCandidate.probability,
              placeID: item.visit.topCandidate.placeID,
            }
          };
          visits.push(visitData);
          if (!firstValidCoordinate) {
            firstValidCoordinate = coordinate;
          }
        }
      }

      // Parse timeline path objects (for polylines)
      if (item.timelinePath && Array.isArray(item.timelinePath)) {
        const pathCoordinates = [];
        
        item.timelinePath.forEach((pathPoint) => {
          if (pathPoint.point) {
            const coordinate = parseGeoString(pathPoint.point);
            if (coordinate) {
              pathCoordinates.push(coordinate);
              if (!firstValidCoordinate) {
                firstValidCoordinate = coordinate;
              }
            }
          }
        });

        // Only add paths with at least 2 points
        if (pathCoordinates.length >= 2) {
          const pathData = {
            coordinates: pathCoordinates,
            metadata: {
              index,
              startTime: item.startTime,
              endTime: item.endTime,
              distance: item.activity?.distanceMeters,
              activityType: item.activity?.topCandidate?.type,
            }
          };
          paths.push(pathData);
        }
      }
    });

    // Update state with parsed data
    setVisitPoints(visits);
    setTimelinePaths(paths);

    // Center map on first valid coordinate
    if (firstValidCoordinate) {
      setMapRegion({
        latitude: firstValidCoordinate.latitude,
        longitude: firstValidCoordinate.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      });
    }

    console.log(`Parsed ${visits.length} visit points and ${paths.length} timeline paths`);
    
    // Return counts for success message
    return { visitCount: visits.length, pathCount: paths.length };
  };

  // Format date string for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Calculate duration between two dates
  const calculateDuration = (start, end) => {
    if (!start || !end) return 'Unknown';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Get items to display (filtered if something is selected, respecting toggle states)
  const displayedPoints = selectedPoint !== null 
    ? [visitPoints[selectedPoint]]
    : (selectedPath !== null ? [] : (showPoints ? visitPoints : []));
  
  const displayedPaths = selectedPath !== null
    ? [timelinePaths[selectedPath]]
    : (selectedPoint !== null ? [] : (showPolylines ? timelinePaths : []));

  // Hide loading animation when state changes
  useEffect(() => {
    if (!isLoadingDetail) return; // Only run if loading is active
    
    // Log the state change
    if (selectedPath !== null && timelinePaths[selectedPath]) {
      console.log('📍 Route selected:', selectedPath);
    } else if (selectedPoint !== null && visitPoints[selectedPoint]) {
      console.log('📍 Point selected:', selectedPoint);
    } else if (selectedPath === null && selectedPoint === null) {
      console.log('✕ Selection cleared');
    }
    
    // Wait for render to complete, then hide loading
    const timer = setTimeout(() => hideLoadingAnimation(), 150);
    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, [selectedPath, selectedPoint, isLoadingDetail]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        {/* Map View */}
        <MapView
        style={styles.map}
        initialRegion={mapRegion}
        region={visitPoints.length > 0 ? mapRegion : undefined}
        customMapStyle={darkMapStyle}
        provider={PROVIDER_GOOGLE}
        onPress={(e) => {
          // Only deselect if we're clicking on the map itself, not markers/polylines
          if (markerTappedRef.current) {
            markerTappedRef.current = false;
            return;
          }
          
          // Show loading animation when deselecting
          showLoadingAnimation();
          
          // Defer state update to allow loading to show first
          setTimeout(() => {
            setSelectedPoint(null);
            setSelectedPath(null);
          }, 150);
        }}
      >
        {/* Render Point Markers */}
        {showPoints && displayedPoints.map((point, index) => {
          const originalIndex = selectedPoint !== null ? selectedPoint : index;
          return (
            <MemoizedMarker
              key={`marker-${originalIndex}`}
              coordinate={point}
              isSelected={selectedPoint === originalIndex}
              onPress={() => {
                markerTappedRef.current = true;
                showLoadingAnimation();
                // Delay state update to ensure loading shows first
                setTimeout(() => {
                  setSelectedPoint(originalIndex);
                  setSelectedPath(null);
                }, 150);
              }}
            />
          );
        })}

        {/* Render Polylines with tap targets */}
        {showPolylines && displayedPaths.map((path, index) => {
          const originalIndex = selectedPath !== null ? selectedPath : index;
          const isSelected = selectedPath === originalIndex;
          
          return [
            // Invisible wide polyline for tap detection
            <Polyline
              key={`polyline-tap-${originalIndex}`}
              coordinates={path.coordinates}
              strokeColor="rgba(0,0,0,0.01)"
              strokeWidth={1}
              lineCap="round"
              lineJoin="round"
              tappable={true}
              onPress={() => {
                markerTappedRef.current = true;
                showLoadingAnimation();
                // Use longer delay for routes (more expensive to render)
                setTimeout(() => {
                  setSelectedPath(originalIndex);
                  setSelectedPoint(null);
                }, 200);
              }}
            />,
            // Visible polyline
            <Polyline
              key={`polyline-visible-${originalIndex}`}
              coordinates={path.coordinates}
              strokeColor={isSelected ? "#00FF00" : "#4A90E2"}
              strokeWidth={isSelected ? 6 : 4}
              lineCap="round"
              lineJoin="round"
            />
          ];
        })}

        {/* Render Heatmap */}
        {showHeatmap && visitPoints.length > 0 && !selectedPoint && !selectedPath && (
          <Heatmap
            points={visitPoints}
            radius={150}
            opacity={0.8}
            gradient={{
              colors: ['#00FF00', '#FFFF00', '#FF0000'],
              startPoints: [0.1, 0.5, 1.0],
              colorMapSize: 256,
            }}
          />
        )}
      </MapView>

      {/* Control Panel */}
      <View style={styles.controlPanel}>
        {/* Load Data Button */}
        <TouchableOpacity
          style={[styles.button, styles.loadButton]}
          onPress={loadLocationData}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>📁 Load Data</Text>
          )}
        </TouchableOpacity>

        {/* Data Info */}
        {visitPoints.length > 0 && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Points: {visitPoints.length} | Paths: {timelinePaths.length}
            </Text>
          </View>
        )}

        {/* Layer Toggle Buttons */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              showPoints && styles.toggleButtonActive,
            ]}
            onPress={() => {
              console.log('🔄 Toggle Points:', !showPoints);
              showLoadingAnimation();
              setTimeout(() => {
                setShowPoints(!showPoints);
              }, 150);
            }}
          >
            <Text style={styles.toggleText}>
              {showPoints ? '📍' : '📍'} Points
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              showPolylines && styles.toggleButtonActive,
            ]}
            onPress={() => {
              console.log('🔄 Toggle Routes:', !showPolylines);
              showLoadingAnimation();
              setTimeout(() => {
                setShowPolylines(!showPolylines);
              }, 150);
            }}
          >
            <Text style={styles.toggleText}>
              {showPolylines ? '🛣️' : '🛣️'} Routes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              showHeatmap && styles.toggleButtonActive,
            ]}
            onPress={() => {
              const newState = !showHeatmap;
              console.log('🔄 Toggle Heatmap:', newState, newState ? '(auto-hiding points & routes)' : '');
              showLoadingAnimation();
              setTimeout(() => {
                setShowHeatmap(newState);
                // When enabling heatmap, disable points and routes
                if (newState) {
                  setShowPoints(false);
                  setShowPolylines(false);
                }
              }, 150);
            }}
          >
            <Text style={styles.toggleText}>
              {showHeatmap ? '🔥' : '🔥'} Heatmap
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Detail Panel */}
      {(selectedPoint !== null || selectedPath !== null) && (
        <View style={styles.detailPanel}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>
              {selectedPoint !== null ? '📍 Location Visit' : '🛣️ Route'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                // Show loading animation while re-rendering all items
                showLoadingAnimation();
                
                // Defer state update to allow loading to show first
                setTimeout(() => {
                  setSelectedPoint(null);
                  setSelectedPath(null);
                }, 150);
              }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.detailContent}>
            {selectedPoint !== null && visitPoints[selectedPoint] && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>
                    {visitPoints[selectedPoint].metadata.semanticType || 'Unknown'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Start:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(visitPoints[selectedPoint].metadata.startTime)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>End:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(visitPoints[selectedPoint].metadata.endTime)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>
                    {calculateDuration(
                      visitPoints[selectedPoint].metadata.startTime,
                      visitPoints[selectedPoint].metadata.endTime
                    )}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Confidence:</Text>
                  <Text style={styles.detailValue}>
                    {visitPoints[selectedPoint].metadata.probability 
                      ? `${(parseFloat(visitPoints[selectedPoint].metadata.probability) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Coordinates:</Text>
                  <Text style={styles.detailValue}>
                    {visitPoints[selectedPoint].latitude.toFixed(6)}, {visitPoints[selectedPoint].longitude.toFixed(6)}
                  </Text>
                </View>
              </>
            )}
            
            {selectedPath !== null && timelinePaths[selectedPath] && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Activity:</Text>
                  <Text style={styles.detailValue}>
                    {timelinePaths[selectedPath].metadata.activityType || 'Unknown'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Start:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(timelinePaths[selectedPath].metadata.startTime)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>End:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(timelinePaths[selectedPath].metadata.endTime)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>
                    {calculateDuration(
                      timelinePaths[selectedPath].metadata.startTime,
                      timelinePaths[selectedPath].metadata.endTime
                    )}
                  </Text>
                </View>
                
                {timelinePaths[selectedPath].metadata.distance && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Distance:</Text>
                    <Text style={styles.detailValue}>
                      {(parseFloat(timelinePaths[selectedPath].metadata.distance) / 1000).toFixed(2)} km
                      {' '}({(parseFloat(timelinePaths[selectedPath].metadata.distance) * 0.000621371).toFixed(2)} mi)
                    </Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Points:</Text>
                  <Text style={styles.detailValue}>
                    {timelinePaths[selectedPath].coordinates.length}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoadingDetail && (
        <Animated.View 
          style={[
            styles.loadingOverlay,
            {
              opacity: loadingOpacity,
              transform: [{ scale: loadingScale }]
            }
          ]}
        >
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        </Animated.View>
      )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  map: {
    flex: 1,
  },
  controlPanel: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  button: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  loadButton: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  toggleButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(74, 144, 226, 0.5)',
    borderColor: '#4A90E2',
    borderWidth: 2,
  },
  toggleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  detailPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.97)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '45%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 15,
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#4A90E2',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 144, 226, 0.3)',
  },
  detailTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailContent: {
    padding: 12,
    paddingBottom: 16,
    maxHeight: 300,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    color: '#9CA5B3',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 15,
    borderWidth: 2,
    borderColor: '#4A90E2',
    minWidth: 200,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
});

