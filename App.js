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
const MemoizedMarker = React.memo(({ coordinate, onPress, isSelected }) => {
  return (
    <Marker
      coordinate={coordinate}
      tracksViewChanges={false}
      pinColor={isSelected ? "#00FF00" : "#FF6B6B"}
      onPress={onPress}
      stopPropagation={true}
    />
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
const clusterPoints = (points, region, targetCount = 800) => {
  if (!points || points.length === 0 || !region) return [];
  if (points.length <= targetCount) return points;

  // Derive grid size from zoom level and density
  const latDelta = Math.max(region.latitudeDelta, 0.001);
  const lonDelta = Math.max(region.longitudeDelta, 0.001);

  // More grid cells when zoomed out; fewer when zoomed in
  const gridDiv = Math.max(10, Math.min(60, Math.round(Math.sqrt(points.length / targetCount) * 25)));
  const cellLat = latDelta / gridDiv;
  const cellLon = lonDelta / gridDiv;

  const cells = new Map();

  points.forEach((p) => {
    if (!p || p.latitude == null || p.longitude == null) return;
    const keyLat = Math.floor(p.latitude / cellLat);
    const keyLon = Math.floor(p.longitude / cellLon);
    const key = `${keyLat}_${keyLon}`;
    if (!cells.has(key)) {
      cells.set(key, { sumLat: 0, sumLon: 0, count: 0, samples: [] });
    }
    const cell = cells.get(key);
    cell.sumLat += p.latitude;
    cell.sumLon += p.longitude;
    cell.count += 1;
    if (cell.samples.length < 3) cell.samples.push(p); // keep a few representatives
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
        metadata: { isCluster: true, clusterSize: cell.count },
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
  
  // Use ref to track if marker/polyline was just tapped
  const markerTappedRef = useRef(false);
  const mapViewRef = useRef(null);
  const currentRegionRef = useRef(mapRegion);
  
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
      setMapRegion(newRegion);
      currentRegionRef.current = newRegion;
    }

    console.log(`Parsed ${visits.length} visit points and ${paths.length} timeline paths`);
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
    const clusterTarget = isLoading ? 300 : Math.min(maxRenderItems, 600);
    points = clusterPoints(points, mapRegion, clusterTarget);

    return points;
  }, [visitPoints, filteredVisitPoints, selectedPoint, selectedPath, showPoints, useViewportFiltering, maxRenderItems, mapRegion, isLoading, isWithinDateRange]);

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
      console.warn('[DEBUG] capping visible paths to avoid overdraw:', paths.length, '->', pathCap);
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

  useEffect(() => {
    // Avoid spam while loading; log when load completes or counts change meaningfully
    const totalPoints = visitPoints.length;
    const totalPaths = timelinePaths.length;
    console.log(
      `[DEBUG] render state | loading:${isLoading} | total points:${totalPoints} (filtered:${filteredPointCount}) visible points:${visiblePointsCount} clusters:${visibleClusterCount} | total paths:${totalPaths} (filtered:${filteredPathCount}) visible paths:${visiblePathsCount} | region dLat:${mapRegion.latitudeDelta?.toFixed?.(3)} dLon:${mapRegion.longitudeDelta?.toFixed?.(3)}`
    );
    if (visiblePointsCount > 1200) {
      console.warn('[DEBUG] high visible point count, potential overdraw:', visiblePointsCount);
    }
    if (visiblePathsCount > 400) {
      console.warn('[DEBUG] high visible path count, potential overdraw:', visiblePathsCount);
    }
  }, [visiblePointsCount, visiblePathsCount, visibleClusterCount, isLoading, mapRegion, visitPoints.length, timelinePaths.length, filteredPointCount, filteredPathCount]);

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
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        {/* Map View */}
        <MapView
          ref={mapViewRef}
          style={styles.map}
          initialRegion={mapRegion}
          region={visitPoints.length > 0 ? mapRegion : undefined}
          customMapStyle={darkMapStyle}
          provider={PROVIDER_GOOGLE}
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
          const markerKey = isCluster
            ? `cluster-${index}-${point.latitude}-${point.longitude}`
            : `marker-${originalIndex}`;

          const coordinate = {
            latitude: point.latitude,
            longitude: point.longitude,
          };

          return (
            <MemoizedMarker
              key={markerKey}
              coordinate={coordinate}
              isSelected={!isCluster && selectedPoint === originalIndex}
              onPress={() => {
                if (isCluster) {
                  return;
                }
                markerTappedRef.current = true;
                showLoadingAnimation();
                setTimeout(() => {
                  setSelectedPoint(originalIndex);
                  setSelectedPath(null);
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
              strokeColor={isSelected ? "#00FF00" : "#4A90E2"}
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
            <View style={styles.loadingButtonContent}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              {parseProgress > 0 && (
                <Text style={styles.progressText}>
                  {Math.round(parseProgress)}%
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.buttonText}>📁 Load Data</Text>
          )}
        </TouchableOpacity>

        {/* Data Info */}
        {visitPoints.length > 0 && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Showing {filteredPointCount}/{visitPoints.length} points | {filteredPathCount}/{timelinePaths.length} routes
            </Text>
            <Text style={styles.infoSubText}>
              Rendering: {getVisiblePoints.length} points, {getVisiblePaths.length} paths
            </Text>
            {isDateFiltered && (
              <Text style={styles.infoSubText}>
                {formatRangeLabel(filterStartDate, filterEndDate)}
              </Text>
            )}
            {(showPointsLimitedNotice || showPathsLimitedNotice) && (
              <Text style={styles.noticeText}>
                {showPointsLimitedNotice ? 'Clustering dense points; zoom in for detail. ' : ''}
                {showPathsLimitedNotice ? 'Routes limited for performance; zoom in for more.' : ''}
              </Text>
            )}
          </View>
        )}

        {/* Date Filter */}
        {visitPoints.length > 0 && (
          <View style={styles.filterCard}>
            <TouchableOpacity
              style={styles.filterHeader}
              onPress={() => setIsFilterExpanded((v) => !v)}
              activeOpacity={0.85}
            >
              <View style={styles.filterHeaderLeft}>
                <View style={styles.filterTitleRow}>
                  <Text style={styles.filterTitle}>Date Filter</Text>
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
                <TouchableOpacity onPress={clearDateFilter} disabled={!isDateFiltered}>
                  <Text style={[
                    styles.filterAction,
                    !isDateFiltered && styles.filterActionDisabled
                  ]}>
                    Reset
                  </Text>
                </TouchableOpacity>
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
                      placeholderTextColor="#708299"
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
                      placeholderTextColor="#708299"
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
                    onPress={applyCustomRange}
                  >
                    <Text style={styles.filterApplyText}>Apply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterApplyButton, styles.filterApplyGhost]}
                    onPress={clearDateFilter}
                  >
                    <Text style={styles.filterApplyTextSecondary}>Full range</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  infoSubText: {
    color: '#9CA5B3',
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  filterCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 9,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 6,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  filterTitle: {
    color: '#FFFFFF',
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
    color: '#C6D4E3',
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
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '700',
  },
  filterActionDisabled: {
    opacity: 0.4,
  },
  filterHeaderActions: {
    alignItems: 'flex-end',
    gap: 2,
    paddingLeft: 10,
  },
  filterChevron: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 0,
  },
  filterDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 6,
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
    borderColor: 'rgba(74, 144, 226, 0.35)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(74, 144, 226, 0.22)',
    borderColor: 'rgba(74, 144, 226, 0.8)',
  },
  filterChipText: {
    color: '#C6D4E3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#4A90E2',
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
    color: '#C6D4E3',
    fontSize: 11,
    fontWeight: '700',
  },
  datasetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  datasetBadgeText: {
    color: '#AFC3D6',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 14,
    backgroundColor: 'rgba(74, 144, 226, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.4)',
  },
  currentBadgeText: {
    color: '#CFE2FF',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  noticeText: {
    color: '#FFDD57',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
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
    maxHeight: '40%', // keep panel compact; content scrolls if needed
    paddingBottom: 6,
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
    color: '#9CA5B3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  detailSubValue: {
    color: '#C6D4E3',
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

