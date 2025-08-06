import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GpsLocation, Horse } from '@shared/schema';
import { Clock, MapPin, TrendingUp, Maximize2 } from 'lucide-react';

interface TrailViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  horse: Horse;
  initialLocations: GpsLocation[];
}

export default function TrailViewerModal({ isOpen, onClose, horse, initialLocations }: TrailViewerModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [timeRange, setTimeRange] = useState('2h');
  const [filteredLocations, setFilteredLocations] = useState<GpsLocation[]>([]);

  // Fetch all locations for this horse
  const { data: allLocations = [] } = useQuery<GpsLocation[]>({
    queryKey: ['/api/locations'],
    enabled: isOpen,
  });

  // Filter locations based on time range and horse ID
  useEffect(() => {
    if (!isOpen) return;

    const horseLocations = allLocations.filter(loc => loc.horseId === horse.id);
    const now = new Date();
    let cutoffTime: Date;

    switch (timeRange) {
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '2h':
        cutoffTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        break;
      case '6h':
        cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '12h':
        cutoffTime = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        cutoffTime = new Date(0); // Show all locations
        break;
    }

    const filtered = horseLocations
      .filter(loc => loc.timestamp && new Date(loc.timestamp) >= cutoffTime)
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());

    setFilteredLocations(filtered);
  }, [allLocations, horse.id, timeRange, isOpen]);

  // Initialize map
  useEffect(() => {
    if (!isOpen || !mapContainer.current || map.current) return;

    // Add a small delay to ensure the container is properly rendered
    setTimeout(() => {
      if (!mapContainer.current || map.current) return;

      try {
        console.log('Initializing trail map...');
        
        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: {
            version: 8,
            sources: {
              'osm': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
              }
            },
            layers: [{
              id: 'osm',
              type: 'raster',
              source: 'osm'
            }]
          },
          center: [37.6173, 55.7558], // Moscow center
          zoom: 12,
          attributionControl: false,
        });

        map.current.on('load', () => {
          console.log('Trail map loaded successfully');
        });

        map.current.on('error', (e) => {
          console.error('MapLibre error in trail viewer:', e);
        });

        map.current.on('styledata', () => {
          console.log('Trail map style loaded');
        });

      } catch (error) {
        console.error('Failed to initialize trail map:', error);
      }
    }, 100);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isOpen]);

  // Update trail on map when locations change
  useEffect(() => {
    if (!map.current || !filteredLocations.length) return;

    // Wait for map to be fully loaded
    const updateTrail = () => {
      if (!map.current || !map.current.isStyleLoaded()) {
        setTimeout(updateTrail, 200);
        return;
      }

    // Remove existing trail layers and sources
    if (map.current.getLayer('trail-line')) {
      map.current.removeLayer('trail-line');
    }
    if (map.current.getLayer('trail-points')) {
      map.current.removeLayer('trail-points');
    }
    if (map.current.getLayer('start-point')) {
      map.current.removeLayer('start-point');
    }
    if (map.current.getLayer('end-point')) {
      map.current.removeLayer('end-point');
    }
    if (map.current.getSource('trail')) {
      map.current.removeSource('trail');
    }
    if (map.current.getSource('trail-points')) {
      map.current.removeSource('trail-points');
    }
    if (map.current.getSource('start-point')) {
      map.current.removeSource('start-point');
    }
    if (map.current.getSource('end-point')) {
      map.current.removeSource('end-point');
    }

    // Create trail line coordinates
    const coordinates = filteredLocations.map(loc => [
      parseFloat(loc.longitude),
      parseFloat(loc.latitude)
    ]);

    // Add trail line
    map.current.addSource('trail', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      }
    });

    map.current.addLayer({
      id: 'trail-line',
      type: 'line',
      source: 'trail',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': horse.markerColor || '#22c55e',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    // Add trail points
    const pointFeatures = filteredLocations.map((loc, index) => ({
      type: 'Feature' as const,
      properties: {
        timestamp: loc.timestamp,
        battery: loc.batteryLevel,
        index: index
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [parseFloat(loc.longitude), parseFloat(loc.latitude)]
      }
    }));

    map.current.addSource('trail-points', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: pointFeatures
      }
    });

    map.current.addLayer({
      id: 'trail-points',
      type: 'circle',
      source: 'trail-points',
      paint: {
        'circle-radius': 3,
        'circle-color': horse.markerColor || '#22c55e',
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.7
      }
    });

    // Add start point (green)
    if (filteredLocations.length > 0) {
      const startLocation = filteredLocations[0];
      map.current.addSource('start-point', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { type: 'start' },
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(startLocation.longitude), parseFloat(startLocation.latitude)]
          }
        }
      });

      map.current.addLayer({
        id: 'start-point',
        type: 'circle',
        source: 'start-point',
        paint: {
          'circle-radius': 8,
          'circle-color': '#10b981',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }

    // Add end point (red)
    if (filteredLocations.length > 1) {
      const endLocation = filteredLocations[filteredLocations.length - 1];
      map.current.addSource('end-point', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { type: 'end' },
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(endLocation.longitude), parseFloat(endLocation.latitude)]
          }
        }
      });

      map.current.addLayer({
        id: 'end-point',
        type: 'circle',
        source: 'end-point',
        paint: {
          'circle-radius': 8,
          'circle-color': '#ef4444',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }

    // Fit map to trail bounds with delay to ensure map is ready
    if (coordinates.length > 0) {
      setTimeout(() => {
        if (!map.current) return;
        
        const bounds = new maplibregl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord as [number, number]));
        
        if (!bounds.isEmpty()) {
          map.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 16,
            duration: 1000
          });
        }
      }, 100);
    }

    // Add click handlers for trail points
    map.current.on('click', 'trail-points', (e) => {
      if (e.features && e.features[0]) {
        const feature = e.features[0];
        const props = feature.properties;
        
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-2">
              <strong>GPS точка</strong><br>
              Время: ${new Date(props.timestamp).toLocaleString('ru-RU')}<br>
              ${props.battery ? `Батарея: ${props.battery}%` : ''}
            </div>
          `)
          .addTo(map.current!);
      }
    });

      // Change cursor on hover
      map.current.on('mouseenter', 'trail-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'trail-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    };

    updateTrail();
  }, [filteredLocations, horse.markerColor]);

  // Calculate trail statistics
  const calculateDistance = (locations: GpsLocation[]): number => {
    if (locations.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      const lat1 = parseFloat(locations[i - 1].latitude);
      const lon1 = parseFloat(locations[i - 1].longitude);
      const lat2 = parseFloat(locations[i].latitude);
      const lon2 = parseFloat(locations[i].longitude);
      
      // Haversine formula for distance calculation
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }
    
    return totalDistance;
  };

  const distance = calculateDistance(filteredLocations);
  const duration = filteredLocations.length > 0 ? 
    new Date(filteredLocations[filteredLocations.length - 1].timestamp!).getTime() - 
    new Date(filteredLocations[0].timestamp!).getTime() : 0;

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}ч ${minutes}мин`;
    return `${minutes}мин`;
  };

  const getTimeRangeLabel = (range: string): string => {
    switch (range) {
      case '1h': return 'Последний час';
      case '2h': return 'Последние 2 часа';
      case '6h': return 'Последние 6 часов';
      case '12h': return 'Последние 12 часов';
      case '24h': return 'Последние 24 часа';
      case 'all': return 'Вся история';
      default: return 'Последние 2 часа';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Маршрут лошади: {horse.name}
          </DialogTitle>
          <DialogDescription>
            Интерактивная карта с детальным маршрутом перемещения лошади
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 gap-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Период:</span>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Последний час</SelectItem>
                  <SelectItem value="2h">Последние 2 часа</SelectItem>
                  <SelectItem value="6h">Последние 6 часов</SelectItem>
                  <SelectItem value="12h">Последние 12 часов</SelectItem>
                  <SelectItem value="24h">Последние 24 часа</SelectItem>
                  <SelectItem value="all">Вся история</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>Расстояние: {distance.toFixed(2)} км</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Длительность: {formatDuration(duration)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>Точек: {filteredLocations.length}</span>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
            <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '400px' }} />
            
            {filteredLocations.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Нет данных о маршруте</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    За {getTimeRangeLabel(timeRange).toLowerCase()} данных о перемещениях не найдено.
                    <br />
                    Попробуйте расширить период поиска.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          {filteredLocations.length > 0 && (
            <div className="flex items-center gap-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                <span>Начало маршрута</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-500 opacity-80"></div>
                <span>Путь лошади</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                <span>Текущее положение</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}