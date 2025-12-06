import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  TextInput,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

// Professional dark atlas map style
const atlasMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9fb4cc" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  {
    featureType: "administrative",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9fb4cc" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a4c2e2" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#123022" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7fb28d" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1d2a3c" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#101827" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9fb4cc" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2c3f57" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a2433" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#c6ddff" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#152136" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a4c2e2" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a1b2b" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7aa6c9" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0a1b2b" }],
  },
];

// Low-zoom (country-level) basemap that removes clutter but stays on-brand with atlas colors
const atlasCountryStyle = [
  { elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9fb4cc" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2c3f57" }, { weight: 0.7 }],
  },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [{ color: "#3a4f6a" }, { weight: 1.2 }],
  },
  {
    featureType: "administrative.province",
    elementType: "geometry.stroke",
    stylers: [{ color: "#305070" }, { weight: 1 }],
  },
  { featureType: "administrative.locality", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#162336" }, { saturation: -10 }, { lightness: 5 }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#101827" }, { lightness: 10 }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6f85a3" }, { visibility: "simplified" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#23344c" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a2433" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9fb4cc" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a1b2b" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7aa6c9" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0a1b2b" }],
  },
];

// Marker component with press handler and bespoke styling
const MemoizedMarker = React.memo(({ coordinate, onPress, isSelected, isCluster, clusterSize }) => {
  const resolvedClusterSize = typeof clusterSize === 'number' ? clusterSize : 0;
  const clusterLabel = resolvedClusterSize > 999 ? '999+' : `${resolvedClusterSize}`;

  return (
    <Marker
      coordinate={coordinate}
      // Track view changes to ensure the custom view updates on selection
      tracksViewChanges={true}
      anchor={{ x: 0.5, y: 0.82 }} // balanced anchor to keep tails visible
      centerOffset={{ x: 0, y: -10 }} // nudge marker up to avoid clipping
      onPress={onPress}
      stopPropagation={true}
    >
      {isCluster ? (
        <View style={styles.clusterWrapper}>
          <View style={styles.clusterBody}>
            <Text style={styles.clusterText}>{clusterLabel}</Text>
          </View>
          <View style={styles.clusterTail} />
        </View>
      ) : (
        <View style={styles.markerWrapper}>
          <View style={[styles.markerBase, isSelected && styles.markerBaseSelected]}>
            <View style={[styles.markerDot, isSelected && styles.markerDotSelected]} />
          </View>
          <View style={[styles.markerTail, isSelected && styles.markerTailSelected]} />
        </View>
      )}
    </Marker>
  );
});

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
 * Check if a coordinate is within the visible map region
 */
const isCoordinateInViewport = (coordinate, region) => {
  if (!coordinate || !region) return false;
  
  const latMin = region.latitude - region.latitudeDelta / 2;
  const latMax = region.latitude + region.latitudeDelta / 2;
  const lonMin = region.longitude - region.longitudeDelta / 2;
  const lonMax = region.longitude + region.longitudeDelta / 2;
  
  return (
    coordinate.latitude >= latMin &&
    coordinate.latitude <= latMax &&
    coordinate.longitude >= lonMin &&
    coordinate.longitude <= lonMax
  );
};

/**
 * Check if a path intersects with the viewport
 */
const doesPathIntersectViewport = (pathCoordinates, region) => {
  if (!pathCoordinates || pathCoordinates.length === 0 || !region) return false;
  
  // Quick check: if any point is in viewport, show the path
  return pathCoordinates.some(coord => isCoordinateInViewport(coord, region));
};

/**
 * Simple grid-based clustering for markers to reduce draw calls at low zoom.
 * Returns a mix of clusters (count > 1) and single points (count === 1).
 */
const clusterPoints = (points, region, targetCount = 3) => {
  if (!points || points.length === 0 || !region) return [];
  if (points.length <= targetCount) return points;

  // Derive grid size from zoom level and density
  const latDelta = Math.max(region.latitudeDelta, 0.001);
  const lonDelta = Math.max(region.longitudeDelta, 0.001);

  // Coarser grid to encourage clustering: fewer, larger cells
  const density = Math.sqrt(points.length / targetCount);
  const gridDiv = Math.max(2, Math.min(10, Math.round((density || 1) * 2.2)));
  const cellLat = latDelta / gridDiv;
  const cellLon = lonDelta / gridDiv;

  const cells = new Map();

  points.forEach((p) => {
    if (!p || p.latitude == null || p.longitude == null) return;
    const keyLat = Math.floor(p.latitude / cellLat);
    const keyLon = Math.floor(p.longitude / cellLon);
    const key = `${keyLat}_${keyLon}`;
    if (!cells.has(key)) {
      cells.set(key, { sumLat: 0, sumLon: 0, count: 0, samples: [], items: [] });
    }
    const cell = cells.get(key);
    cell.sumLat += p.latitude;
    cell.sumLon += p.longitude;
    cell.count += 1;
    if (cell.samples.length < 3) cell.samples.push(p); // keep a few representatives
    if (cell.items.length < 120) cell.items.push(p); // collect members for cluster selection (capped)
  });

  const clusters = [];
  cells.forEach((cell) => {
    if (cell.count === 1) {
      clusters.push(cell.samples[0]);
    } else {
      clusters.push({
        latitude: cell.sumLat / cell.count,
        longitude: cell.sumLon / cell.count,
        arrayIndex: -1,
        metadata: { isCluster: true, clusterSize: cell.count, members: cell.items },
      });
    }
  });

  return clusters;
};

/**
 * Ramer-Douglas-Peucker polyline simplification for routes.
 * Reduces vertex count while preserving shape within tolerance.
 */
const simplifyPath = (points, tolerance) => {
  if (!points || points.length < 3) return points || [];
  const sqTolerance = tolerance * tolerance;

  const getSqDist = (p1, p2) => {
    const dx = p1.latitude - p2.latitude;
    const dy = p1.longitude - p2.longitude;
    return dx * dx + dy * dy;
  };

  const getSqSegDist = (p, p1, p2) => {
    let x = p1.latitude;
    let y = p1.longitude;
    let dx = p2.latitude - x;
    let dy = p2.longitude - y;

    if (dx !== 0 || dy !== 0) {
      const t = ((p.latitude - x) * dx + (p.longitude - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = p2.latitude;
        y = p2.longitude;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }

    dx = p.latitude - x;
    dy = p.longitude - y;
    return dx * dx + dy * dy;
  };

  const simplifyRadialDist = (pts, sqTol) => {
    let prev = pts[0];
    const newPts = [prev];
    for (let i = 1; i < pts.length; i++) {
      const pt = pts[i];
      if (getSqDist(pt, prev) > sqTol) {
        newPts.push(pt);
        prev = pt;
      }
    }
    if (prev !== pts[pts.length - 1]) newPts.push(pts[pts.length - 1]);
    return newPts;
  };

  const simplifyDouglasPeucker = (pts, sqTol) => {
    const last = pts.length - 1;
    const stack = [[0, last]];
    const keep = new Array(pts.length).fill(false);
    keep[0] = keep[last] = true;

    while (stack.length) {
      const [first, end] = stack.pop();
      let maxSqDist = 0;
      let index = -1;
      for (let i = first + 1; i < end; i++) {
        const sqDist = getSqSegDist(pts[i], pts[first], pts[end]);
        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }
      if (maxSqDist > sqTol) {
        keep[index] = true;
        stack.push([first, index], [index, end]);
      }
    }
    return pts.filter((_, i) => keep[i]);
  };

  const pts = simplifyRadialDist(points, sqTolerance);
  return simplifyDouglasPeucker(pts, sqTolerance);
};

/**
 * Downsample array to reduce density for better performance
 */
const downsample = (array, maxItems) => {
  if (array.length <= maxItems) return array;
  
  const step = Math.ceil(array.length / maxItems);
  const result = [];
  
  for (let i = 0; i < array.length; i += step) {
    result.push(array[i]);
  }
  
  return result;
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
  const [parseProgress, setParseProgress] = useState(0);
  const [useViewportFiltering, setUseViewportFiltering] = useState(true);
  const [maxRenderItems, setMaxRenderItems] = useState(2000); // Soft cap; clustering/simplify handle density
  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [dataDateRange, setDataDateRange] = useState({ min: null, max: null });
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [clusterSelection, setClusterSelection] = useState(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  // Keep the control panel below notches/Dynamic Island
  const panelTopOffset = 60;
  
  // Use ref to track if marker/polyline was just tapped
  const markerTappedRef = useRef(false);
  const mapViewRef = useRef(null);
  const currentRegionRef = useRef(mapRegion);
  
  // Animation for loading overlay
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const loadingScale = useRef(new Animated.Value(0.8)).current;

  const resolvePointIndex = useCallback((point) => {
    if (!point) return null;
    if (point.arrayIndex != null) return point.arrayIndex;
    if (point.metadata?.index != null) return point.metadata.index;
    const found = visitPoints.findIndex(
      (p) =>
        p === point ||
        (p.latitude === point.latitude &&
         p.longitude === point.longitude &&
         p.metadata?.startTime === point.metadata?.startTime)
    );
    return found >= 0 ? found : null;
  }, [visitPoints]);

  const handleSelectClusterMember = useCallback((member) => {
    const pointIndex = resolvePointIndex(member);
    if (pointIndex === null || pointIndex < 0) return;
    markerTappedRef.current = true;
    showLoadingAnimation();
    setTimeout(() => {
      setSelectedPoint(pointIndex);
      setSelectedPath(null);
      setClusterSelection(null);
    }, 150);
  }, [resolvePointIndex]);

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
   * Handle file selection and data parsing with chunked processing
   */
  const loadLocationData = async () => {
    try {
      setIsLoading(true);
      setParseProgress(0);
      
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

      // Parse the data in chunks to avoid blocking the UI
      await parseLocationDataChunked(locationData);
      
    } catch (error) {
      console.error('Error loading file:', error);
      Alert.alert('Error', `Failed to load file: ${error.message}`);
    } finally {
      setIsLoading(false);
      setParseProgress(0);
    }
  };

  /**
   * Parse location data in chunks to avoid blocking the UI
   */
  const parseLocationDataChunked = async (data) => {
    const visits = [];
    const paths = [];
    let firstValidCoordinate = null;
    
    const CHUNK_SIZE = 500; // Process 500 items at a time
    const totalItems = data.length;
    let processedItems = 0;

    // Process data in chunks
    for (let i = 0; i < totalItems; i += CHUNK_SIZE) {
      const chunk = data.slice(i, Math.min(i + CHUNK_SIZE, totalItems));
      
      // Process chunk
      chunk.forEach((item, chunkIndex) => {
        const index = i + chunkIndex;
        
        // Parse visit objects (for points and heatmap)
        if (item.visit && item.visit.topCandidate && item.visit.topCandidate.placeLocation) {
          const coordinate = parseGeoString(item.visit.topCandidate.placeLocation);
          if (coordinate) {
            const visitData = {
              ...coordinate,
              arrayIndex: visits.length,
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

          // Simplify and cap to reduce memory while keeping shape
          if (pathCoordinates.length >= 2) {
            const simplified = simplifyPath(pathCoordinates, 0.0002); // aggressive simplification for memory
            const limited = simplified.slice(0, 300); // hard cap per path

            if (limited.length >= 2) {
              const pathData = {
                coordinates: limited,
                arrayIndex: paths.length,
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
        }
      });

      processedItems += chunk.length;
      const progress = (processedItems / totalItems) * 100;
      setParseProgress(progress);

      // Update state incrementally for better UX
      if (i % (CHUNK_SIZE * 5) === 0 || i + CHUNK_SIZE >= totalItems) {
        setVisitPoints([...visits]);
        setTimelinePaths([...paths]);
      }

      // Yield to UI thread every chunk
      await new Promise(resolve => {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(resolve, 0);
        });
      });
    }

    // Final update
    setVisitPoints(visits);
    setTimelinePaths(paths);

    // Center map on first valid coordinate
    if (firstValidCoordinate) {
      const newRegion = {
        latitude: firstValidCoordinate.latitude,
        longitude: firstValidCoordinate.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
      setAndAnimateRegion(newRegion);
    }

    Alert.alert('Success', `Loaded ${visits.length} points and ${paths.length} paths`);
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

  const startOfDay = (date) => {
    if (!date) return null;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfDay = (date) => {
    if (!date) return null;
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const formatShortDate = (value) => {
    if (!value) return 'Any time';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Invalid';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatInputDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  const parseInputToDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const formatRangeLabel = (start, end) => {
    if (!start && !end) return 'Showing all dates';
    const startLabel = start ? formatShortDate(start) : 'Earliest';
    const endLabel = end ? formatShortDate(end) : 'Latest';
    return `${startLabel} → ${endLabel}`;
  };

  const filterLabel = useMemo(
    () => formatRangeLabel(filterStartDate, filterEndDate),
    [filterStartDate, filterEndDate]
  );

  const datasetRangeLabel = useMemo(() => {
    if (dataDateRange.min && dataDateRange.max) {
      return `Dataset span: ${formatShortDate(dataDateRange.min)} → ${formatShortDate(dataDateRange.max)}`;
    }
    return 'Dataset span: load data to view';
  }, [dataDateRange]);

  const datasetRangeLabelShort = useMemo(() => {
    if (dataDateRange.min && dataDateRange.max) {
      return `Dataset: ${formatShortDate(dataDateRange.min)} → ${formatShortDate(dataDateRange.max)}`;
    }
    return 'Dataset: load data';
  }, [dataDateRange]);

  // Handle map region changes
  const handleRegionChangeComplete = useCallback((region) => {
    currentRegionRef.current = region;
    setMapRegion(region);
  }, []);

  // Avoid making MapView fully controlled (prevents subtle camera drift on zoom).
  // Use this when we explicitly need to center/animate to a region.
  const setAndAnimateRegion = useCallback((region) => {
    currentRegionRef.current = region;
    setMapRegion(region);
    if (mapViewRef.current && region) {
      mapViewRef.current.animateToRegion(region, 400);
    }
  }, []);

  const dateRangeMs = useMemo(() => ({
    start: filterStartDate ? startOfDay(filterStartDate)?.getTime?.() ?? null : null,
    end: filterEndDate ? endOfDay(filterEndDate)?.getTime?.() ?? null : null,
  }), [filterStartDate, filterEndDate]);

  const isDateFiltered = useMemo(
    () => dateRangeMs.start !== null || dateRangeMs.end !== null,
    [dateRangeMs]
  );

  const isWithinDateRange = useCallback((startTime, endTime) => {
    if (!isDateFiltered) return true;

    const start = startTime ? new Date(startTime).getTime() : null;
    const end = endTime ? new Date(endTime).getTime() : start;

    if (start !== null && Number.isNaN(start)) return false;
    if (end !== null && Number.isNaN(end)) return false;

    if (dateRangeMs.start !== null && (end === null || end < dateRangeMs.start)) {
      return false;
    }
    if (dateRangeMs.end !== null && (start === null || start > dateRangeMs.end)) {
      return false;
    }
    return true;
  }, [dateRangeMs, isDateFiltered]);

  const filteredVisitPoints = useMemo(() => {
    if (!isDateFiltered) return visitPoints;
    return visitPoints.filter(point => isWithinDateRange(point?.metadata?.startTime, point?.metadata?.endTime));
  }, [visitPoints, isDateFiltered, isWithinDateRange]);

  const filteredTimelinePaths = useMemo(() => {
    if (!isDateFiltered) return timelinePaths;
    return timelinePaths.filter(path => isWithinDateRange(path?.metadata?.startTime, path?.metadata?.endTime));
  }, [timelinePaths, isDateFiltered, isWithinDateRange]);

  useEffect(() => {
    if (!visitPoints.length && !timelinePaths.length) {
      setDataDateRange({ min: null, max: null });
      return;
    }

    let min = null;
    let max = null;

    const consider = (start, end) => {
      const startMs = start ? new Date(start).getTime() : null;
      const endMs = end ? new Date(end).getTime() : startMs;
      if (startMs !== null && !Number.isNaN(startMs)) {
        min = min === null ? startMs : Math.min(min, startMs);
      }
      if (endMs !== null && !Number.isNaN(endMs)) {
        max = max === null ? endMs : Math.max(max, endMs);
      }
    };

    visitPoints.forEach((p) => consider(p?.metadata?.startTime, p?.metadata?.endTime));
    timelinePaths.forEach((p) => consider(p?.metadata?.startTime, p?.metadata?.endTime));

    setDataDateRange({ min, max });
  }, [visitPoints, timelinePaths]);

  useEffect(() => {
    // Keep custom inputs in sync with the applied filter
    setStartInput(filterStartDate ? formatInputDate(filterStartDate) : '');
    setEndInput(filterEndDate ? formatInputDate(filterEndDate) : '');
  }, [filterStartDate, filterEndDate]);

  useEffect(() => {
    if (selectedPoint !== null) {
      const point = visitPoints[selectedPoint];
      if (!point || !isWithinDateRange(point?.metadata?.startTime, point?.metadata?.endTime)) {
        setSelectedPoint(null);
      }
    }
    if (selectedPath !== null) {
      const path = timelinePaths[selectedPath];
      if (!path || !isWithinDateRange(path?.metadata?.startTime, path?.metadata?.endTime)) {
        setSelectedPath(null);
      }
    }
  }, [dateRangeMs, visitPoints, timelinePaths, selectedPoint, selectedPath, isWithinDateRange]);

  const applyDatePreset = (preset) => {
    const dayMs = 24 * 60 * 60 * 1000;
    const base = dataDateRange.max ? new Date(dataDateRange.max) : new Date();
    let start = null;
    let end = null;

    switch (preset) {
      case 'today':
        start = startOfDay(base);
        end = endOfDay(base);
        break;
      case '7d':
        start = startOfDay(new Date(base.getTime() - 6 * dayMs));
        end = endOfDay(base);
        break;
      case '30d':
        start = startOfDay(new Date(base.getTime() - 29 * dayMs));
        end = endOfDay(base);
        break;
      case 'year':
        start = startOfDay(new Date(base.getFullYear(), 0, 1));
        end = endOfDay(base);
        break;
      default:
        start = null;
        end = null;
        break;
    }

    setFilterStartDate(start);
    setFilterEndDate(end);
    setDatePreset(preset);
    setStartInput(start ? formatInputDate(start) : '');
    setEndInput(end ? formatInputDate(end) : '');
  };

  const applyCustomRange = () => {
    const parsedStart = startInput ? parseInputToDate(startInput) : null;
    const parsedEnd = endInput ? parseInputToDate(endInput) : null;

    if (startInput && !parsedStart) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD for the start date.');
      return;
    }
    if (endInput && !parsedEnd) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD for the end date.');
      return;
    }

    const start = parsedStart ? startOfDay(parsedStart) : null;
    const end = parsedEnd ? endOfDay(parsedEnd) : null;

    if (!start && !end) {
      clearDateFilter();
      return;
    }

    if (start && end && start.getTime() > end.getTime()) {
      Alert.alert('Invalid range', 'Start date must be before the end date.');
      return;
    }

    setFilterStartDate(start);
    setFilterEndDate(end);
    setDatePreset('custom');
  };

  const clearDateFilter = () => {
    setFilterStartDate(null);
    setFilterEndDate(null);
    setStartInput('');
    setEndInput('');
    setDatePreset('all');
  };

  // Filter points based on viewport with clustering to keep everything visible without overload
  const getVisiblePoints = useMemo(() => {
    if (selectedPoint !== null) {
      const selected = visitPoints[selectedPoint];
      if (
        selected &&
        selected.latitude != null &&
        selected.longitude != null &&
        isWithinDateRange(selected?.metadata?.startTime, selected?.metadata?.endTime)
      ) {
        return [selected];
      }
      return [];
    }
    
    if (selectedPath !== null || !showPoints) {
      return [];
    }

    let points = filteredVisitPoints;

    // Apply viewport filtering if enabled
    if (useViewportFiltering) {
      points = filteredVisitPoints.filter(point => 
        point && point.latitude != null && point.longitude != null &&
        isCoordinateInViewport(point, currentRegionRef.current)
      );
    }

    // Filter out invalid points
    points = points.filter(point => point && point.latitude != null && point.longitude != null);

    // Cluster if very dense to keep draw calls reasonable while keeping coverage.
    // During loading, keep the target smaller to avoid overload.
    const hasDateFilter = Boolean(filterStartDate || filterEndDate);
    const clusterTarget = (() => {
      if (isLoading) return 50;
      if (hasDateFilter) return 2; // force clustering even on smaller filtered sets
      return Math.min(maxRenderItems, 70);
    })();
    points = clusterPoints(points, mapRegion, clusterTarget);

    return points;
  }, [visitPoints, filteredVisitPoints, selectedPoint, selectedPath, showPoints, useViewportFiltering, maxRenderItems, mapRegion, isLoading, isWithinDateRange, filterStartDate, filterEndDate]);

  // Filter paths based on viewport with simplification to keep everything visible
  const pathsCappedRef = useRef(false);

  const getVisiblePaths = useMemo(() => {
    pathsCappedRef.current = false;

    // Skip rendering paths while loading to avoid heavy draw calls mid-parse
    if (isLoading) {
      return [];
    }

    if (selectedPath !== null) {
      const selected = timelinePaths[selectedPath];
      if (
        selected &&
        Array.isArray(selected.coordinates) &&
        selected.coordinates.length > 1 &&
        isWithinDateRange(selected?.metadata?.startTime, selected?.metadata?.endTime)
      ) {
        return [selected];
      }
      return [];
    }
    
    if (selectedPoint !== null || !showPolylines) {
      return [];
    }

    let paths = filteredTimelinePaths;

    // Filter out invalid paths
    paths = paths.filter(path => 
      path && Array.isArray(path.coordinates) && path.coordinates.length > 1
    );

    // Apply viewport filtering if enabled
    if (useViewportFiltering) {
      paths = paths.filter(path => 
        doesPathIntersectViewport(path.coordinates, currentRegionRef.current)
      );
    }

    // Simplify routes based on zoom to reduce segment count without dropping routes
    const wideView = mapRegion.latitudeDelta > 1.5 || mapRegion.longitudeDelta > 1.5;
    const tolerance = wideView
      ? Math.max(0.0007, mapRegion.latitudeDelta / 80)   // aggressive when zoomed out
      : Math.max(0.00015, mapRegion.latitudeDelta / 250); // lighter when zoomed in

    paths = paths.map(path => {
      const coords = path.coordinates || [];
      const simplified = simplifyPath(coords, tolerance);
      const limited = simplified.slice(0, wideView ? 120 : 200); // cap segments per path
      return {
        ...path,
        coordinates: limited,
      };
    });

    // Hard cap number of visible paths to avoid overdraw/oom
    const pathCap = 300;
    if (paths.length > pathCap) {
      paths = downsample(paths, pathCap);
      pathsCappedRef.current = true;
    }

    return paths;
  }, [timelinePaths, filteredTimelinePaths, selectedPath, selectedPoint, showPolylines, useViewportFiltering, maxRenderItems, mapRegion, isWithinDateRange, isLoading]);

  // Debug counts for visibility/render pressure
  const visiblePointsCount = getVisiblePoints.length;
  const visiblePathsCount = getVisiblePaths.length;
  const filteredPointCount = filteredVisitPoints.length;
  const filteredPathCount = filteredTimelinePaths.length;
  const visibleClusterCount = getVisiblePoints.filter(p => p?.metadata?.isCluster).length;
  const showPointsLimitedNotice = !isLoading && visibleClusterCount > 0;
  const showPathsLimitedNotice = !isLoading && selectedPath === null && (pathsCappedRef.current || visiblePathsCount >= 295);
  // Clamp heatmap radius to safe bounds (Google heatmap requires radius roughly 10–50)
  const heatmapRadius = useMemo(() => {
    const base = 36;
    const scale = Math.max(0.6, Math.min(2.5, 1 / Math.max(0.2, mapRegion.latitudeDelta)));
    return Math.min(50, Math.max(10, Math.round(base * scale)));
  }, [mapRegion]);

  // Swap to a simplified basemap when viewing large areas (country/continent)
  const baseMapStyle = useMemo(() => {
    const span = Math.max(mapRegion.latitudeDelta, mapRegion.longitudeDelta);
    // Push the handoff further out to reduce visible jumps
    return span > 8 ? atlasCountryStyle : atlasMapStyle;
  }, [mapRegion]);

  useEffect(() => {
    // Avoid spam while loading; log when load completes or counts change meaningfully
    const totalPoints = visitPoints.length;
    const totalPaths = timelinePaths.length;
  }, [visiblePointsCount, visiblePathsCount, visibleClusterCount, isLoading, mapRegion, visitPoints.length, timelinePaths.length, filteredPointCount, filteredPathCount]);

  // Hide loading animation when state changes
  useEffect(() => {
    if (!isLoadingDetail) return; // Only run if loading is active
    
    // Wait for render to complete, then hide loading
    const timer = setTimeout(() => hideLoadingAnimation(), 150);
    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, [selectedPath, selectedPoint, isLoadingDetail]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        {/* Map View */}
        <MapView
          ref={mapViewRef}
          style={styles.map}
          initialRegion={mapRegion}
          customMapStyle={baseMapStyle}
          // Heatmap requires Google provider on iOS and Android
          provider={PROVIDER_GOOGLE}
          paddingAdjustmentBehavior="never" // avoid camera shifting with safe-area insets when zoomed
          mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
          onRegionChangeComplete={handleRegionChangeComplete}
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
          setClusterSelection(null);
          }, 150);
        }}
      >
        {/* Render Point Markers */}
        {getVisiblePoints.map((point, index) => {
          // Skip invalid points
          if (!point || point.latitude == null || point.longitude == null) {
            return null;
          }

          const isCluster = point.metadata?.isCluster;
          // Use arrayIndex/metadata.index for real points; clusters just use loop index
          const originalIndex = isCluster ? -1 : (point.arrayIndex ?? point.metadata?.index ?? index);
          // Include selection state in key to force remount when toggling selection (helps pinColor refresh)
          const markerKey = isCluster
            ? `cluster-${index}-${point.latitude}-${point.longitude}`
            : `marker-${originalIndex}-${selectedPoint === originalIndex ? 'selected' : 'normal'}`;

          const coordinate = {
            latitude: point.latitude,
            longitude: point.longitude,
          };

          return (
            <MemoizedMarker
              key={markerKey}
              coordinate={coordinate}
              isCluster={isCluster}
              clusterSize={point.metadata?.clusterSize}
              isSelected={!isCluster && selectedPoint === originalIndex}
              onPress={() => {
                if (isCluster) {
                  markerTappedRef.current = true;
                  const members = point.metadata?.members || [];
                  setClusterSelection({
                    coordinate,
                    count: point.metadata?.clusterSize || members.length,
                    members,
                  });
                  return;
                }
                markerTappedRef.current = true;
                showLoadingAnimation();
                setTimeout(() => {
                  setSelectedPoint(originalIndex);
                  setSelectedPath(null);
                  setClusterSelection(null);
                }, 150);
              }}
            />
          );
        })}

        {/* Render Polylines with tap targets */}
        {getVisiblePaths.map((path, index) => {
          if (!path || !Array.isArray(path.coordinates) || path.coordinates.length < 2) {
            return null;
          }

          // Use the path's array index if present, fallback to current loop index
          const originalIndex = path.arrayIndex ?? index;
          const isSelected = selectedPath === originalIndex;

          const validCoordinates = path.coordinates.filter(
            coord => coord && coord.latitude != null && coord.longitude != null
          );

          if (validCoordinates.length < 2) {
            return null;
          }
          
          return [
            // Invisible wide polyline for tap detection
            <Polyline
              key={`polyline-tap-${originalIndex}`}
              coordinates={validCoordinates}
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
              coordinates={validCoordinates}
              strokeColor={isSelected ? "#FBBF24" : "#7DD3FC"}
              strokeWidth={isSelected ? 6 : 4}
              lineCap="round"
              lineJoin="round"
            />
          ];
        })}

        {/* Render Heatmap */}
        {showHeatmap && filteredVisitPoints.length > 0 && !selectedPoint && !selectedPath && (
          <Heatmap
            points={filteredVisitPoints}
            radius={heatmapRadius}
            opacity={0.8}
            gradient={{
              colors: ['#0EA5E9', '#8B5CF6', '#FBBF24'],
              startPoints: [0.15, 0.55, 1],
              colorMapSize: 256,
            }}
          />
        )}
      </MapView>

      {/* Control Panel */}
      <View style={[styles.controlPanel, { top: panelTopOffset }]}>
        <View style={styles.panelHeader}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>WhereWasI?</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.button, styles.loadButton]}
              onPress={loadLocationData}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingButtonContent}>
                  <ActivityIndicator color="#0b1220" size="small" />
                  {parseProgress > 0 && (
                    <Text style={styles.progressTextDark}>
                      {Math.round(parseProgress)}%
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.buttonText}>Import JSON</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostIconButton}
              onPress={() => setIsPanelExpanded((v) => !v)}
            >
              <Text style={styles.ghostIconText}>{isPanelExpanded ? '▴' : '▾'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {visitPoints.length === 0 && !isPanelExpanded && (
          <View style={styles.inlineSummary}>
            <Text style={styles.inlineSummaryText}>Import your Google Timeline JSON to begin</Text>
          </View>
        )}

        {isPanelExpanded && (
          <>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Visits</Text>
                <Text style={styles.statValue}>{filteredPointCount || 0}</Text>
                {visitPoints.length > 0 && (
                  <Text style={styles.statHint}>of {visitPoints.length} total</Text>
                )}
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Routes</Text>
                <Text style={styles.statValue}>{filteredPathCount || 0}</Text>
                {timelinePaths.length > 0 && (
                  <Text style={styles.statHint}>of {timelinePaths.length} total</Text>
                )}
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Date range</Text>
                <Text style={styles.statValueSmall}>
                  {isDateFiltered ? filterLabel : 'All time'}
                </Text>
                <Text style={styles.statHint}>{datasetRangeLabelShort}</Text>
              </View>
            </View>

            {visitPoints.length === 0 && (
              <View style={styles.helperCard}>
                <Text style={styles.helperTitle}>Import your Google Timeline</Text>
                <Text style={styles.helperText}>
                  Load your exported JSON to explore visits, routes, and density. Your data stays on your device.
                </Text>
              </View>
            )}
          </>
        )}

        {visitPoints.length > 0 && (
          <>
            <View style={[styles.sectionCard, styles.compactSection]}>

              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    showPoints && styles.toggleButtonActive,
                  ]}
                  onPress={() => {
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
                    showLoadingAnimation();
                    setTimeout(() => {
                      setShowHeatmap(newState);
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
              {(showPointsLimitedNotice || showPathsLimitedNotice) && (
                <Text style={styles.noticeText}>
                  {showPointsLimitedNotice ? 'Clustering dense points; zoom in for detail. ' : ''}
                  {showPathsLimitedNotice ? 'Routes limited for performance; zoom in for more.' : ''}
                </Text>
              )}
            </View>

            <View style={[
              styles.sectionCard,
              styles.filterCard,
              !isPanelExpanded && styles.filterCardCollapsed
            ]}>
              <TouchableOpacity
                style={styles.filterHeader}
                onPress={() => setIsFilterExpanded((v) => !v)}
                activeOpacity={0.85}
              >
                <View style={styles.filterHeaderLeft}>
                  <View style={styles.filterTitleRow}>
                    <Text style={styles.filterTitle}>Date filter</Text>
                    <View style={styles.datasetBadge}>
                      <Text style={styles.datasetBadgeText}>{datasetRangeLabelShort}</Text>
                    </View>
                  </View>
                  <View style={styles.filterHeaderRow}>
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                    <Text style={styles.filterStatus}>
                      {isDateFiltered ? filterLabel : 'All dates'}
                    </Text>
                  </View>
                </View>
                <View style={styles.filterHeaderActions}>
                  <Text style={styles.filterChevron}>{isFilterExpanded ? '▴' : '▾'}</Text>
                </View>
              </TouchableOpacity>

              {isFilterExpanded && (
                <>
                  <View style={styles.filterDivider} />

                  <View style={styles.filterRangeRow}>
                    <View style={styles.filterInputGroup}>
                      <Text style={styles.filterInputLabel}>From</Text>
                      <TextInput
                        style={styles.filterInputBox}
                        value={startInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#7f8ba0"
                        onChangeText={setStartInput}
                        onEndEditing={applyCustomRange}
                        onSubmitEditing={applyCustomRange}
                        returnKeyType="done"
                      />
                    </View>
                    <View style={styles.filterInputGroup}>
                      <Text style={styles.filterInputLabel}>To</Text>
                      <TextInput
                        style={styles.filterInputBox}
                        value={endInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#7f8ba0"
                        onChangeText={setEndInput}
                        onEndEditing={applyCustomRange}
                        onSubmitEditing={applyCustomRange}
                        returnKeyType="done"
                      />
                    </View>
                  </View>

                  <View style={styles.filterChipRow}>
                    {[
                      { id: 'all', label: 'All time' },
                      { id: 'today', label: 'Today' },
                      { id: '7d', label: 'Last 7d' },
                      { id: '30d', label: 'Last 30d' },
                      { id: 'year', label: 'This year' },
                    ].map((preset) => (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.filterChip,
                          datePreset === preset.id && styles.filterChipActive,
                        ]}
                        onPress={() => applyDatePreset(preset.id)}
                      >
                        <Text style={[
                          styles.filterChipText,
                          datePreset === preset.id && styles.filterChipTextActive,
                        ]}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.filterFooterRow}>
                    <TouchableOpacity
                      style={[styles.filterApplyButton, styles.filterApplyPrimary]}
                      onPress={clearDateFilter}
                    >
                      <Text style={styles.filterApplyText}>Reset</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </>
        )}
      </View>

      {/* Cluster selection panel */}
      {clusterSelection?.members?.length > 0 && (
        <View style={styles.clusterPanel}>
          <View style={styles.clusterPanelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clusterPanelTitle}>Cluster of {clusterSelection.count} points</Text>
              <Text style={styles.clusterPanelSubtitle}>Tap a visit to view details</Text>
            </View>
            <TouchableOpacity
              style={styles.clusterCloseButton}
              onPress={() => setClusterSelection(null)}
            >
              <Text style={styles.clusterCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.clusterList} showsVerticalScrollIndicator={false}>
            {clusterSelection.members.map((member, idx) => {
              const pointIndex = resolvePointIndex(member);
              return (
                <TouchableOpacity
                  key={`${member?.metadata?.startTime || idx}-${member?.latitude}-${member?.longitude}-${idx}`}
                  style={styles.clusterItem}
                  onPress={() => handleSelectClusterMember(member)}
                  activeOpacity={0.85}
                >
                  <View style={styles.clusterItemLeft}>
                    <Text style={styles.clusterItemTitle}>
                      {member?.metadata?.semanticType || 'Visit'}
                    </Text>
                    <Text style={styles.clusterItemMeta}>
                      {formatDate(member?.metadata?.startTime)}
                    </Text>
                  </View>
                  <View style={styles.clusterItemRight}>
                    <Text style={styles.clusterItemCoords}>
                      {member?.latitude?.toFixed?.(3)}, {member?.longitude?.toFixed?.(3)}
                    </Text>
                    {member?.metadata?.probability && (
                      <Text style={styles.clusterItemBadge}>
                        {(parseFloat(member.metadata.probability) * 100).toFixed(0)}%
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

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
            <View style={styles.detailGrid}>
              <View style={styles.detailItemFull}>
                <View style={styles.detailRowInline}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Coordinates</Text>
                    <Text style={styles.detailValue}>
                      {visitPoints[selectedPoint].latitude.toFixed(6)}, {visitPoints[selectedPoint].longitude.toFixed(6)}
                    </Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text style={styles.detailValue}>
                      {visitPoints[selectedPoint].metadata.semanticType || 'Unknown'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.detailSubValue}>
                  Confidence: {visitPoints[selectedPoint].metadata.probability 
                    ? `${(parseFloat(visitPoints[selectedPoint].metadata.probability) * 100).toFixed(1)}%`
                    : 'N/A'}
                </Text>
              </View>

              <View style={styles.detailItemFull}>
                <View style={styles.detailRowInline}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailSubLabel}>Start</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(visitPoints[selectedPoint].metadata.startTime)}
                    </Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailSubLabel}>End</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(visitPoints[selectedPoint].metadata.endTime)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.detailSubValue}>
                  Duration: {calculateDuration(
                    visitPoints[selectedPoint].metadata.startTime,
                    visitPoints[selectedPoint].metadata.endTime
                  )}
                </Text>
              </View>
            </View>
          )}
          
          {selectedPath !== null && timelinePaths[selectedPath] && (
            <View style={styles.detailGrid}>
              <View style={styles.detailItemFull}>
                <View style={styles.detailRowInline}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Points</Text>
                    <Text style={styles.detailValue}>
                      {timelinePaths[selectedPath].coordinates.length}
                    </Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Activity</Text>
                    <Text style={styles.detailValue}>
                      {timelinePaths[selectedPath].metadata.activityType || 'Unknown'}
                    </Text>
                  </View>
                </View>
                {timelinePaths[selectedPath].metadata.distance && (
                  <Text style={styles.detailSubValue}>
                    Distance: {(parseFloat(timelinePaths[selectedPath].metadata.distance) / 1000).toFixed(2)} km ({(parseFloat(timelinePaths[selectedPath].metadata.distance) * 0.000621371).toFixed(2)} mi)
                  </Text>
                )}
              </View>

              <View style={styles.detailItemFull}>
                <View style={styles.detailRowInline}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailSubLabel}>Start</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(timelinePaths[selectedPath].metadata.startTime)}
                    </Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailSubLabel}>End</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(timelinePaths[selectedPath].metadata.endTime)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.detailSubValue}>
                  Duration: {calculateDuration(
                    timelinePaths[selectedPath].metadata.startTime,
                    timelinePaths[selectedPath].metadata.endTime
                  )}
                </Text>
              </View>
            </View>
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
            <ActivityIndicator size="large" color="#38bdf8" />
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
    backgroundColor: '#0b1220',
  },
  map: {
    flex: 1,
  },
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 18, // extra padding to prevent tail clipping
  },
  markerBase: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e53935',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerBaseSelected: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  markerDotSelected: {
    backgroundColor: '#111827',
  },
  markerTail: {
    marginTop: -2,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#e53935',
  },
  markerTailSelected: {
    borderTopColor: '#f59e0b',
  },
  clusterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10, // moderate padding; smaller body prevents clipping
  },
  clusterBody: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  clusterTail: {
    marginTop: -1,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#e53935',
  },
  controlPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'rgba(10, 15, 25, 0.9)',
    borderRadius: 18,
    padding: 12,
    gap: 6,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.18)',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandRow: {
    flex: 1,
    gap: 2,
  },
  brandTitle: {
    color: '#E5ECF5',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  loadButton: {
    backgroundColor: '#7DD3FC',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTextDark: {
    color: '#0b1220',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonText: {
    color: '#0b1220',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  ghostIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ghostIconText: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '800',
  },
  inlineSummary: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inlineSummaryText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  statLabel: {
    color: '#9FB4CC',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  statValueSmall: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  statHint: {
    color: '#7DD3FC',
    fontSize: 10,
    fontWeight: '700',
  },
  helperCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  helperTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '800',
  },
  helperText: {
    color: '#9FB4CC',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  compactSection: {
    paddingVertical: 6,
    paddingHorizontal: 9,
    gap: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionHint: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  filterCard: {
    backgroundColor: 'rgba(17,24,39,0.75)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.25)',
    marginBottom: 0,
  },
  filterCardCollapsed: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(17,24,39,0.82)',
    borderColor: 'rgba(125, 211, 252, 0.18)',
    marginTop: 6,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  filterTitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterStatus: {
    color: '#C9D8EA',
    fontSize: 10.5,
    fontWeight: '700',
  },
  filterHint: {
    color: '#9CA5B3',
    fontSize: 10,
    marginTop: 2,
    marginBottom: 2,
  },
  filterAction: {
    color: '#7DD3FC',
    fontSize: 12,
    fontWeight: '700',
  },
  filterActionDisabled: {
    opacity: 0.4,
  },
  filterHeaderActions: {
    alignItems: 'center',
    paddingLeft: 6,
  },
  filterChevron: {
    color: '#E2E8F0',
    fontSize: 13,
    marginTop: 0,
  },
  filterDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 2,
  },
  filterRangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  filterInputGroup: {
    flex: 1,
  },
  filterInputLabel: {
    color: '#9CA5B3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  filterInputBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.4)',
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 6,
  },
  filterChip: {
    paddingVertical: 4.5,
    paddingHorizontal: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(125, 211, 252, 0.18)',
    borderColor: '#7DD3FC',
  },
  filterChipText: {
    color: '#C9D8EA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  filterChipTextActive: {
    color: '#E2E8F0',
  },
  filterFooterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterApplyPrimary: {
    backgroundColor: '#38bdf8',
  },
  filterApplyGhost: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterApplyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  filterApplyTextSecondary: {
    color: '#C9D8EA',
    fontSize: 11,
    fontWeight: '700',
  },
  datasetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  datasetBadgeText: {
    color: '#B8CBE2',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 14,
    backgroundColor: 'rgba(125, 211, 252, 0.16)',
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  currentBadgeText: {
    color: '#D7E9FF',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  noticeText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    lineHeight: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    flexWrap: 'wrap',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: 78,
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(125, 211, 252, 0.16)',
    borderColor: '#7DD3FC',
    borderWidth: 1.5,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  toggleText: {
    color: '#E5ECF5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  clusterPanel: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(10, 15, 25, 0.95)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.18)',
    padding: 14,
    maxHeight: 260,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    zIndex: 20,
  },
  clusterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  clusterPanelTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  clusterPanelSubtitle: {
    color: '#9CA5B3',
    fontSize: 11,
    marginTop: 2,
  },
  clusterCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  clusterCloseText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '800',
  },
  clusterList: {
    maxHeight: 200,
  },
  clusterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  clusterItemLeft: {
    flex: 1,
    gap: 2,
  },
  clusterItemTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  clusterItemMeta: {
    color: '#9CA5B3',
    fontSize: 11,
  },
  clusterItemRight: {
    alignItems: 'flex-end',
    gap: 4,
    paddingLeft: 10,
  },
  clusterItemCoords: {
    color: '#C9D8EA',
    fontSize: 11,
    fontWeight: '700',
  },
  clusterItemBadge: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(229,57,53,0.18)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229,57,53,0.4)',
  },
  detailPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 15, 25, 0.97)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '40%', // keep panel compact; content scrolls if needed
    paddingBottom: 6,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderTopWidth: 1.5,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: 'rgba(125,211,252,0.25)',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.35)',
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
    maxHeight: 280, // ensure panel doesn't overflow when content is short
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    width: '48%',
  },
  detailItemThird: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    width: '30%',
  },
  detailItemFull: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    width: '100%',
  },
  detailRowInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailLabel: {
    color: '#9FB4CC',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  detailValue: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  detailSubValue: {
    color: '#C9D8EA',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  detailCol: {
    flex: 1,
    minWidth: '45%',
  },
  detailSubLabel: {
    color: '#9CA5B3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 8, 15, 0.75)',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 15,
    borderWidth: 2,
    borderColor: '#38bdf8',
    minWidth: 200,
  },
  loadingText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
});

