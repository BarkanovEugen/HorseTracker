import React, { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMapEvents, useMap } from "react-leaflet";
import { GpsLocation, Horse, Geofence, InsertGeofence } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import L from "leaflet";
import { Crosshair, MapIcon, Plus, Save, X, CheckCircle, XCircle } from "lucide-react";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface GeofenceFormData {
  name: string;
  description: string;
}

// Component for auto-fitting map bounds
function MapBoundsController({ bounds }: { bounds: [[number, number], [number, number]] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && map) {
      try {
        map.fitBounds(bounds, { padding: [20, 20] });
      } catch (error) {
        console.warn('Failed to fit bounds:', error);
      }
    }
  }, [bounds, map]);
  
  return null;
}

// Component for handling polygon drawing
function PolygonDrawer({ 
  isDrawing, 
  onPointAdded,
  drawingPoints
}: { 
  isDrawing: boolean;
  onPointAdded: (point: [number, number]) => void;
  drawingPoints: [number, number][];
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onPointAdded([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  if (!isDrawing || drawingPoints.length === 0) return null;

  // Show the polygon being drawn
  if (drawingPoints.length > 2) {
    return (
      <>
        <Polygon
          positions={drawingPoints}
          pathOptions={{
            color: '#22c55e',
            fillColor: '#22c55e',
            fillOpacity: 0.2,
            weight: 2,
            dashArray: '5,5',
          }}
        />
        {/* Show markers at each vertex */}
        {drawingPoints.map((point, index) => (
          <Marker
            key={index}
            position={point}
            icon={L.divIcon({
              html: `<div style="
                background-color: #22c55e;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
              className: 'vertex-marker',
            })}
          />
        ))}
      </>
    );
  } else if (drawingPoints.length > 0) {
    // Show a line for less than 3 points
    return (
      <>
        <Polyline
          positions={drawingPoints}
          pathOptions={{
            color: '#22c55e',
            weight: 2,
            dashArray: '5,5',
          }}
        />
        {drawingPoints.map((point, index) => (
          <Marker
            key={index}
            position={point}
            icon={L.divIcon({
              html: `<div style="
                background-color: #22c55e;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
              className: 'vertex-marker',
            })}
          />
        ))}
      </>
    );
  }

  return null;
}

// Map controls component
function MapController({ 
  onToggleDrawing, 
  isDrawing,
  onCompletePolygon,
  onCancelDrawing,
  canComplete
}: { 
  onToggleDrawing: () => void;
  isDrawing: boolean;
  onCompletePolygon: () => void;
  onCancelDrawing: () => void;
  canComplete: boolean;
}) {
  const map = useMap();
  
  const centerMap = () => {
    // Default center to Moscow
    map.setView([55.7558, 37.6176], 13);
  };

  React.useEffect(() => {
    if (isDrawing) {
      map.getContainer().style.cursor = 'crosshair';
      map.getContainer().classList.add('drawing-mode');
    } else {
      map.getContainer().style.cursor = '';
      map.getContainer().classList.remove('drawing-mode');
    }
  }, [isDrawing, map]);

  return (
    <div className="absolute top-4 left-4 z-[1000] flex flex-col space-y-2">
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="outline"
          className="bg-white dark:bg-gray-800 shadow-lg"
          onClick={centerMap}
          data-testid="center-map-button"
        >
          <Crosshair className="w-4 h-4 mr-1" />
          Центрировать
        </Button>
        {!isDrawing && (
          <Button
            size="sm"
            variant="outline"
            className="bg-white dark:bg-gray-800 shadow-lg"
            onClick={onToggleDrawing}
            data-testid="add-geofence-map-button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Добавить зону
          </Button>
        )}
      </div>
      
      {isDrawing && (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
            onClick={onCompletePolygon}
            disabled={!canComplete}
            data-testid="complete-polygon-button"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Завершить (мин. 3 точки)
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="shadow-lg"
            onClick={onCancelDrawing}
            data-testid="cancel-drawing-button"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Отмена
          </Button>
        </div>
      )}
    </div>
  );
}

export default function LeafletMapPolygon() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mapRef = useRef<L.Map | null>(null);

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

  // Calculate map bounds to fit all horses
  const getMapBounds = (): [[number, number], [number, number]] | null => {
    if (horseLocations.length === 0) return null;
    
    const lats = horseLocations.map(hl => parseFloat(hl.lastLocation.latitude));
    const lngs = horseLocations.map(hl => parseFloat(hl.lastLocation.longitude));
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Add padding
    const latPadding = (maxLat - minLat) * 0.1 || 0.01;
    const lngPadding = (maxLng - minLng) * 0.1 || 0.01;
    
    return [
      [minLat - latPadding, minLng - lngPadding],
      [maxLat + latPadding, maxLng + lngPadding]
    ];
  };

  const mapBounds = getMapBounds();
  const defaultCenter: [number, number] = horseLocations.length > 0 
    ? [parseFloat(horseLocations[0].lastLocation.latitude), parseFloat(horseLocations[0].lastLocation.longitude)]
    : [55.7558, 37.6176]; // Moscow coordinates

  const toggleDrawingMode = () => {
    if (isDrawingMode) {
      setIsDrawingMode(false);
      setDrawingPoints([]);
    } else {
      setIsDrawingMode(true);
      setDrawingPoints([]);
    }
  };

  const handlePointAdded = (point: [number, number]) => {
    setDrawingPoints(prev => [...prev, point]);
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

    // Close the polygon by adding the first point at the end if not already closed
    const polygonCoords = [...drawingPoints];
    if (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
        polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]) {
      polygonCoords.push(polygonCoords[0]);
    }

    createGeofenceMutation.mutate({
      name: formData.name,
      description: formData.description || null,
      coordinates: JSON.stringify(polygonCoords),
      isActive: true,
    });
  };

  const handleCancelGeofence = () => {
    setIsGeofenceDialogOpen(false);
    setDrawingPoints([]);
    setFormData({ name: '', description: '' });
  };

  const createHorseIcon = (horse: Horse) => {
    const color = horse.status === 'active' ? '#22c55e' : 
                  horse.status === 'warning' ? '#eab308' : '#ef4444';
    
    return L.divIcon({
      html: `
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        ">
          🐎
        </div>
        <div style="
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
        ">
          ${horse.name}
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: 'horse-marker',
    });
  };

  // Parse geofence coordinates
  const parseGeofenceCoordinates = (coordinates: string): [number, number][] => {
    try {
      return JSON.parse(coordinates);
    } catch {
      return [];
    }
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
      <Card>
        <CardHeader>
          <CardTitle>GPS Карта в Реальном Времени</CardTitle>
          {isDrawingMode && (
            <p className="text-sm text-muted-foreground">
              Кликните на карте, чтобы добавить точки многоугольника. Минимум 3 точки для создания зоны.
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          <div 
            className="h-96 relative rounded-lg overflow-hidden"
            data-testid="leaflet-map-container"
          >
            <MapContainer
              center={defaultCenter}
              zoom={mapBounds ? 13 : 13}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              <MapBoundsController bounds={mapBounds} />
              
              <MapController 
                onToggleDrawing={toggleDrawingMode}
                isDrawing={isDrawingMode}
                onCompletePolygon={handleCompletePolygon}
                onCancelDrawing={handleCancelDrawing}
                canComplete={drawingPoints.length >= 3}
              />
              
              <PolygonDrawer 
                isDrawing={isDrawingMode}
                onPointAdded={handlePointAdded}
                drawingPoints={drawingPoints}
              />
              
              {/* Horse Markers */}
              {horseLocations.map(({ horse, lastLocation }) => (
                <Marker
                  key={horse.id}
                  position={[parseFloat(lastLocation.latitude), parseFloat(lastLocation.longitude)]}
                  icon={createHorseIcon(horse)}
                  data-testid={`horse-marker-${horse.id}`}
                >
                </Marker>
              ))}
              
              {/* Existing Geofences */}
              {geofences.map((geofence) => {
                const coords = parseGeofenceCoordinates(geofence.coordinates);
                if (coords.length === 0) return null;
                
                return (
                  <Polygon
                    key={geofence.id}
                    positions={coords}
                    pathOptions={{
                      color: geofence.isActive ? '#3b82f6' : '#6b7280',
                      fillColor: geofence.isActive ? '#3b82f6' : '#6b7280',
                      fillOpacity: 0.1,
                      weight: 2,
                    }}
                  />
                );
              })}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Geofence Creation Dialog */}
      <Dialog open={isGeofenceDialogOpen} onOpenChange={setIsGeofenceDialogOpen}>
        <DialogContent className="z-[10000]">
          <DialogHeader>
            <DialogTitle>Создать геозону</DialogTitle>
            <DialogDescription>
              Заполните информацию о новой геозоне для выбранной области.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="geofence-name">Название геозоны</Label>
              <Input
                id="geofence-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: Пастбище Север"
                data-testid="geofence-name-input"
              />
            </div>
            
            <div>
              <Label htmlFor="geofence-description">Описание</Label>
              <Textarea
                id="geofence-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание геозоны..."
                rows={3}
                data-testid="geofence-description-input"
              />
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Количество точек: {drawingPoints.length}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={handleSaveGeofence}
                disabled={!formData.name.trim() || createGeofenceMutation.isPending}
                className="flex-1"
                data-testid="save-geofence-button"
              >
                <Save className="w-4 h-4 mr-2" />
                {createGeofenceMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelGeofence}
                disabled={createGeofenceMutation.isPending}
                data-testid="cancel-geofence-button"
              >
                <X className="w-4 h-4 mr-2" />
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}