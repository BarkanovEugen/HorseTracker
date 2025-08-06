import React, { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import maplibregl from "maplibre-gl";
import { GpsLocation, Horse, Geofence, InsertGeofence } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createHorseMarkerElement } from "./horse-marker";
import { Crosshair, MapIcon, Plus, Save, X, CheckCircle, XCircle, Maximize2 } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

interface GeofenceFormData {
  name: string;
  description: string;
}

// MapLibre style with OpenStreetMap
const MAP_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap Contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster" as const,
      source: "osm",
    },
  ],
};

// Control component for drawing
function MapControls({ 
  isDrawing,
  onToggleDrawing,
  onCompletePolygon,
  onCancelDrawing,
  canComplete 
}: {
  isDrawing: boolean;
  onToggleDrawing: () => void;
  onCompletePolygon: () => void;
  onCancelDrawing: () => void;
  canComplete: boolean;
}) {
  return (
    <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 flex flex-col space-y-1 sm:space-y-2">
      {!isDrawing && (
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-xs sm:text-sm"
          onClick={() => {
            console.log('Toggling drawing mode to true');
            onToggleDrawing();
          }}
          data-testid="add-geofence-button"
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span className="hidden sm:inline">Добавить зону</span>
          <span className="sm:hidden">Зона</span>
        </Button>
      )}
      
      {isDrawing && (
        <div className="flex flex-col space-y-1 sm:space-y-2">
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg text-xs sm:text-sm"
            onClick={onCompletePolygon}
            disabled={!canComplete}
            data-testid="complete-polygon-button"
          >
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden sm:inline">Завершить (мин. 3 точки)</span>
            <span className="sm:hidden">Готово</span>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="shadow-lg text-xs sm:text-sm"
            onClick={onCancelDrawing}
            data-testid="cancel-drawing-button"
          >
            <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden sm:inline">Отмена</span>
            <span className="sm:hidden">×</span>
          </Button>
        </div>
      )}
    </div>
  );
}

interface MapLibreMapProps {
  zoom?: number;
  center?: [number, number];
  selectedHorse?: Horse | null;
  onHorseSelect?: (horse: Horse) => void;
  onResetView?: () => void;
}

export default function MapLibreMap({
  zoom = 15,
  center,
  selectedHorse,
  onHorseSelect,
  onResetView,
}: MapLibreMapProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const layerPrefix = 'horses-' + Date.now(); // Unique prefix to avoid conflicts
  const [mapLoaded, setMapLoaded] = useState(false);

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [isGeofenceDialogOpen, setIsGeofenceDialogOpen] = useState(false);
  const [formData, setFormData] = useState<GeofenceFormData>({
    name: '',
    description: '',
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery<GpsLocation[]>({
    queryKey: ['/api/locations'],
  });

  const { data: horses = [], isLoading: horsesLoading } = useQuery<Horse[]>({
    queryKey: ['/api/horses'],
  });

  const { data: geofences = [], isLoading: geofencesLoading } = useQuery<Geofence[]>({
    queryKey: ['/api/geofences'],
  });

  const createGeofenceMutation = useMutation({
    mutationFn: async (data: InsertGeofence) => {
      const response = await apiRequest('POST', '/api/geofences', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/geofences'] });
      setIsGeofenceDialogOpen(false);
      setDrawingPoints([]);
      setFormData({ name: '', description: '' });
      toast({
        title: "Геозона создана",
        description: "Новая геозона была успешно создана",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать геозону",
        variant: "destructive",
      });
    },
  });

  const isLoading = locationsLoading || horsesLoading || geofencesLoading;

  // Group locations by horse to get latest position
  const horseLocations = horses.map(horse => {
    const horseLocationData = locations.filter(loc => loc.horseId === horse.id);
    const lastLocation = horseLocationData.sort((a, b) => 
      new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
    )[0];
    
    return {
      horse,
      lastLocation,
    };
  }).filter(item => item.lastLocation);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || isLoading) return;

    // Ensure container has proper height before initializing
    const container = mapContainer.current;
    const containerRect = container.getBoundingClientRect();
    
    // Force container to have height if it doesn't
    if (containerRect.height === 0) {
      container.style.height = '300px';
    }

    // Calculate initial bounds
    let center: [number, number] = [37.6176, 55.7558]; // Moscow
    let zoom = 13;

    if (horseLocations.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      horseLocations.forEach(hl => {
        bounds.extend([
          parseFloat(hl.lastLocation.longitude), 
          parseFloat(hl.lastLocation.latitude)
        ]);
      });
      
      if (!bounds.isEmpty()) {
        const boundsArray = bounds.toArray();
        center = [
          (boundsArray[0][0] + boundsArray[1][0]) / 2,
          (boundsArray[0][1] + boundsArray[1][1]) / 2,
        ];
      }
    }

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: JSON.parse(JSON.stringify(MAP_STYLE)), // Deep clone the style
        center: center,
        zoom: zoom,
        attributionControl: false, // Disable attribution for faster loading
        logoPosition: 'bottom-right',
      });

      // Wait for style to load before marking as loaded
      map.current.on('load', () => {
        console.log('MapLibre: Map loaded successfully');
        setMapLoaded(true);
        
        // Force resize after loading to fix mobile display issues
        setTimeout(() => {
          if (map.current) {
            map.current.resize();
          }
        }, 100);
      });

      // Add error handling
      map.current.on('error', (e) => {
        console.error('MapLibre: Map error', e.error);
        setMapLoaded(true); // Still show the map container
      });
      
      // Add navigation control
      map.current.addControl(new maplibregl.NavigationControl());

    } catch (error) {
      console.error('MapLibre: Failed to initialize map', error);
      setMapLoaded(true); // Still show the map container
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isLoading]);

  // Handle map click events for drawing
  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (isDrawingMode) {
        e.preventDefault();
        const newPoint: [number, number] = [e.lngLat.lat, e.lngLat.lng];
        setDrawingPoints(prev => [...prev, newPoint]);
        console.log('Added point:', newPoint, 'Total points:', drawingPoints.length + 1);
      }
    };

    map.current.on('click', handleMapClick);

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick);
      }
    };
  }, [isDrawingMode]); // Only depend on isDrawingMode, not drawingPoints

  // Update horse markers
  useEffect(() => {
    if (!map.current) return;

    // Update or create markers for each horse
    horseLocations.forEach(({ horse, lastLocation }) => {
      const existingMarker = markersRef.current.get(horse.id);
      const newPosition: [number, number] = [parseFloat(lastLocation.longitude), parseFloat(lastLocation.latitude)];

      if (existingMarker) {
        // Update existing marker position
        existingMarker.setLngLat(newPosition);
      } else {
        // Create new marker

        
        const el = createHorseMarkerElement(horse, 40);
        
        // Add click handler
        el.addEventListener('click', () => {
          onHorseSelect?.(horse);
          toast({
            title: horse.name,
            description: `${horse.breed} • Статус: ${
              horse.status === 'active' ? 'Активен' :
              horse.status === 'warning' ? 'Предупреждение' : 'Не в сети'
            }`,
          });
        });

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center'
        })
          .setLngLat(newPosition)
          .addTo(map.current!);

        markersRef.current.set(horse.id, marker);
      }
    });

    // Remove markers for horses that no longer exist
    const currentHorseIds = new Set(horseLocations.map(hl => hl.horse.id));
    markersRef.current.forEach((marker, horseId) => {
      if (!currentHorseIds.has(horseId)) {
        marker.remove();
        markersRef.current.delete(horseId);
      }
    });

  }, [horseLocations]);

  // Center map on selected horse or fit all horses
  useEffect(() => {
    if (!map.current) return;

    if (selectedHorse) {
      // Find the location of the selected horse
      const selectedLocation = horseLocations.find(hl => hl.horse.id === selectedHorse.id);
      if (selectedLocation) {
        const position: [number, number] = [
          parseFloat(selectedLocation.lastLocation.longitude), 
          parseFloat(selectedLocation.lastLocation.latitude)
        ];

        // Center map on selected horse with smooth animation
        map.current.easeTo({
          center: position,
          zoom: Math.max(map.current.getZoom() || 16, 16),
          duration: 1000
        });
      }
    } else if (horseLocations.length > 0) {
      // Fit all horses in view with padding
      const bounds = new maplibregl.LngLatBounds();
      horseLocations.forEach(hl => {
        bounds.extend([
          parseFloat(hl.lastLocation.longitude), 
          parseFloat(hl.lastLocation.latitude)
        ]);
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { 
          padding: 80, 
          duration: 1000,
          maxZoom: 16 
        });
      }
    }
  }, [selectedHorse, horseLocations]);

  // Auto-fit bounds only on initial load, not on every update
  useEffect(() => {
    if (!map.current || horseLocations.length === 0) return;

    // Only fit bounds if this is the first time we're seeing horses
    const isFirstLoad = markersRef.current.size === 0;
    
    if (isFirstLoad) {
      const bounds = new maplibregl.LngLatBounds();
      horseLocations.forEach(hl => {
        bounds.extend([
          parseFloat(hl.lastLocation.longitude), 
          parseFloat(hl.lastLocation.latitude)
        ]);
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
      }
    }
  }, [horseLocations.length > 0]);

  // Update geofences with delay to ensure map is ready
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    try {
      // Clear all existing geofence layers first
      const style = map.current.getStyle();
      if (!style) return;
      
      const existingLayers = style.layers || [];
      const existingSources = Object.keys(style.sources || {});
      
      // Remove existing geofence layers and sources
      existingLayers.forEach(layer => {
        if (layer && layer.id && layer.id.startsWith('geofence-')) {
          try {
            map.current!.removeLayer(layer.id);
          } catch (e) {
            // Layer might not exist, ignore
          }
        }
      });
      
      existingSources.forEach(sourceId => {
        if (sourceId && sourceId.startsWith('geofence-source-')) {
          try {
            map.current!.removeSource(sourceId);
          } catch (e) {
            // Source might not exist, ignore
          }
        }
      });
    } catch (error) {
      console.error('Error clearing geofence layers:', error);
      return;
    }

    // Add new geofence layers if we have geofences
    if (geofences.length > 0) {
      console.log(`Adding ${geofences.length} geofences to map...`);
      
      geofences.forEach((geofence, index) => {
        try {
          console.log(`Processing geofence ${index}:`, geofence);
          let coordinates;
          if (typeof geofence.coordinates === 'string') {
            coordinates = JSON.parse(geofence.coordinates);
          } else {
            coordinates = geofence.coordinates;
          }
          
          console.log(`Parsed coordinates for geofence ${index}:`, coordinates);
          
          if (Array.isArray(coordinates) && coordinates.length >= 3) {
            // Convert lat,lng to lng,lat for GeoJSON and close the polygon
            const geoJsonCoords = [
              ...coordinates.map((coord: [number, number]) => [coord[1], coord[0]]),
              [coordinates[0][1], coordinates[0][0]] // Close the polygon
            ];
            
            console.log(`GeoJSON coordinates for geofence ${index}:`, geoJsonCoords);
            
            const sourceId = `geofence-source-${index}`;
            const layerId = `geofence-${index}`;
            const borderLayerId = `geofence-${index}-border`;

            // Add source
            map.current!.addSource(sourceId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [geoJsonCoords],
                },
                properties: {
                  name: geofence.name,
                  description: geofence.description
                },
              },
            });

            // Add fill layer
            map.current!.addLayer({
              id: layerId,
              type: 'fill',
              source: sourceId,
              paint: {
                'fill-color': '#10b981',
                'fill-opacity': 0.3,
              },
            });

            // Add border layer
            map.current!.addLayer({
              id: borderLayerId,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': '#059669',
                'line-width': 3,
                'line-opacity': 1.0,
              },
            });

            console.log(`✓ Successfully added geofence layer ${layerId}`);
          } else {
            console.warn(`Invalid coordinates for geofence ${index}:`, coordinates);
          }
        } catch (error) {
          console.error('Error adding geofence:', error, geofence);
        }
      });
    } else {
      console.log('No geofences to display');
    }
  }, [geofences, mapLoaded]);

  // Drawing polygon visualization
  useEffect(() => {
    if (!map.current) return;

    const drawingSourceId = 'drawing-polygon';
    const drawingLayerId = 'drawing-polygon-layer';
    const pointsSourceId = 'drawing-points';
    const pointsLayerId = 'drawing-points-layer';

    // Remove existing drawing layers
    [drawingLayerId, `${drawingLayerId}-border`, pointsLayerId].forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
    });
    [drawingSourceId, pointsSourceId].forEach(sourceId => {
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
    });

    if (isDrawingMode && drawingPoints.length > 0) {
      // Show individual points
      const pointFeatures = drawingPoints.map((point, index) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [point[1], point[0]], // lng, lat
        },
        properties: {
          index: index
        }
      }));

      map.current.addSource(pointsSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: pointFeatures,
        },
      });

      map.current.addLayer({
        id: pointsLayerId,
        type: 'circle',
        source: pointsSourceId,
        paint: {
          'circle-color': '#10b981',
          'circle-radius': 7,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Show polygon if we have enough points
      if (drawingPoints.length >= 3) {
        const geoJsonCoords = [...drawingPoints.map(point => [point[1], point[0]]), [drawingPoints[0][1], drawingPoints[0][0]]];

        map.current.addSource(drawingSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [geoJsonCoords],
            },
            properties: {},
          },
        });

        map.current.addLayer({
          id: drawingLayerId,
          type: 'fill',
          source: drawingSourceId,
          paint: {
            'fill-color': '#10b981',
            'fill-opacity': 0.35,
          },
        });

        // Add border for drawing polygon
        map.current.addLayer({
          id: `${drawingLayerId}-border`,
          type: 'line',
          source: drawingSourceId,
          paint: {
            'line-color': '#059669',
            'line-width': 3,
            'line-dasharray': [2, 2],
          },
        });
      }
    }
  }, [drawingPoints, isDrawingMode]);

  const toggleDrawingMode = () => {
    console.log('Toggle drawing mode called. Current mode:', isDrawingMode);
    if (isDrawingMode) {
      setIsDrawingMode(false);
      setDrawingPoints([]);
      console.log('Drawing mode disabled');
    } else {
      setIsDrawingMode(true);
      setDrawingPoints([]);
      console.log('Drawing mode enabled');
    }
  };

  const handleCompletePolygon = () => {
    if (drawingPoints.length >= 3) {
      setIsGeofenceDialogOpen(true);
      setIsDrawingMode(false);
    }
  };

  const handleCancelDrawing = () => {
    setIsDrawingMode(false);
    setDrawingPoints([]);
  };

  const handleSaveGeofence = () => {
    if (drawingPoints.length < 3) return;

    const geofenceData: InsertGeofence = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      coordinates: JSON.stringify(drawingPoints),
      isActive: true,
    };

    createGeofenceMutation.mutate(geofenceData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GPS Карта в Реальном Времени</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-gray-500">Загрузка карты...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full shadow-lg">
        <CardHeader className="py-2 sm:py-3 px-3 sm:px-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
              <MapIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              <span>GPS Карта</span>
            </CardTitle>
            {isDrawingMode && (
              <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full">
                Точек: {drawingPoints.length}/3
              </span>
            )}
          </div>
          {isDrawingMode && (
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
              Нажмите на карте для добавления точек
            </p>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          <div 
            className="h-full w-full relative rounded-b-lg overflow-hidden"
            data-testid="maplibre-map-container"
          >
            <div ref={mapContainer} className="w-full h-full min-h-[250px]" />
            
            {!mapLoaded && (
              <div className="absolute inset-0 bg-muted rounded-md flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Загрузка карты...</p>
                </div>
              </div>
            )}
            
            {/* Reset View Button */}
            {selectedHorse && onResetView && (
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/95 hover:bg-white text-gray-700 shadow-lg border text-xs sm:text-sm"
                  onClick={onResetView}
                  data-testid="reset-view-button"
                >
                  <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Показать всех</span>
                  <span className="sm:hidden">Все</span>
                </Button>
              </div>
            )}
            
            <MapControls 
              isDrawing={isDrawingMode}
              onToggleDrawing={toggleDrawingMode}
              onCompletePolygon={handleCompletePolygon}
              onCancelDrawing={handleCancelDrawing}
              canComplete={drawingPoints.length >= 3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Geofence Creation Dialog */}
      <Dialog open={isGeofenceDialogOpen} onOpenChange={setIsGeofenceDialogOpen}>
        <DialogContent data-testid="geofence-dialog">
          <DialogHeader>
            <DialogTitle>Создать Геозону</DialogTitle>
            <DialogDescription>
              Заполните информацию о новой геозоне
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="geofence-name">Название зоны</Label>
              <Input
                id="geofence-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: Пастбище Север"
                data-testid="geofence-name-input"
              />
            </div>
            
            <div>
              <Label htmlFor="geofence-description">Описание (необязательно)</Label>
              <Textarea
                id="geofence-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Дополнительная информация о зоне"
                data-testid="geofence-description-input"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsGeofenceDialogOpen(false)}
              data-testid="cancel-geofence-button"
            >
              <X className="w-4 h-4 mr-1" />
              Отмена
            </Button>
            <Button
              onClick={handleSaveGeofence}
              disabled={!formData.name.trim() || createGeofenceMutation.isPending}
              data-testid="save-geofence-button"
            >
              <Save className="w-4 h-4 mr-1" />
              {createGeofenceMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}