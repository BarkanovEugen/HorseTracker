import React, { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import { GpsLocation, Horse, Geofence, InsertGeofence } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import L from "leaflet";
import { Crosshair, MapIcon, Plus, Save, X } from "lucide-react";

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
  radius: number;
}

interface PendingGeofence {
  lat: number;
  lng: number;
  radius: number;
}

function GeofenceCreator({ 
  onGeofenceCreate 
}: { 
  onGeofenceCreate: (lat: number, lng: number, radius: number) => void 
}) {
  const [isDrawing, setIsDrawing] = useState(false);

  const map = useMap();

  // Use effect to listen for drawing mode changes
  React.useEffect(() => {
    const currentMode = (map as any)._drawingMode || false;
    if (currentMode !== isDrawing) {
      setIsDrawing(currentMode);
    }
  }, [map, isDrawing]);

  useMapEvents({
    click(e) {
      if (isDrawing) {
        const defaultRadius = 200; // 200 meters default
        onGeofenceCreate(e.latlng.lat, e.latlng.lng, defaultRadius);
        // Reset drawing mode
        (map as any)._drawingMode = false;
        map.getContainer().style.cursor = '';
        setIsDrawing(false);
      }
    },
  });

  return null;
}

function MapController() {
  const map = useMap();
  
  const centerMap = () => {
    // Default center to Moscow
    map.setView([55.7558, 37.6176], 13);
  };

  const toggleGeofenceCreation = () => {
    const currentMode = (map as any)._drawingMode;
    (map as any)._drawingMode = !currentMode;
    
    if (!currentMode) {
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.getContainer().style.cursor = '';
    }
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] flex space-x-2">
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
      <Button
        size="sm"
        variant="outline"
        className="bg-white dark:bg-gray-800 shadow-lg"
        onClick={toggleGeofenceCreation}
        data-testid="add-geofence-map-button"
      >
        <Plus className="w-4 h-4 mr-1" />
        Добавить зону
      </Button>
    </div>
  );
}

export default function LeafletMap() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mapRef = useRef<L.Map | null>(null);

  const [isGeofenceDialogOpen, setIsGeofenceDialogOpen] = useState(false);
  const [pendingGeofence, setPendingGeofence] = useState<{ lat: number; lng: number; radius: number } | null>(null);
  const [formData, setFormData] = useState<GeofenceFormData>({
    name: '',
    description: '',
    radius: 200,
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
      setPendingGeofence(null);
      setFormData({ name: '', description: '', radius: 200 });
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

  const handleGeofenceCreate = useCallback((lat: number, lng: number, radius: number) => {
    setPendingGeofence({ lat, lng, radius });
    setFormData(prev => ({ ...prev, radius }));
    setIsGeofenceDialogOpen(true);
  }, []);

  const handleSaveGeofence = () => {
    if (!pendingGeofence) return;

    createGeofenceMutation.mutate({
      name: formData.name,
      description: formData.description,
      centerLat: pendingGeofence.lat.toString(),
      centerLng: pendingGeofence.lng.toString(),
      radius: formData.radius.toString(),
      isActive: true,
    });
  };

  const handleCancelGeofence = () => {
    setIsGeofenceDialogOpen(false);
    setPendingGeofence(null);
    setFormData({ name: '', description: '', radius: 200 });
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
        </CardHeader>
        
        <CardContent>
          <div 
            className="h-96 relative rounded-lg overflow-hidden"
            data-testid="leaflet-map-container"
          >
            <MapContainer
              center={[55.7558, 37.6176]} // Moscow coordinates
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              <MapController />
              
              <GeofenceCreator onGeofenceCreate={handleGeofenceCreate} />
              
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
              {geofences.map((geofence) => (
                <Circle
                  key={geofence.id}
                  center={[parseFloat(geofence.centerLat), parseFloat(geofence.centerLng)]}
                  radius={parseFloat(geofence.radius)}
                  pathOptions={{
                    color: geofence.isActive ? '#3b82f6' : '#6b7280',
                    fillColor: geofence.isActive ? '#3b82f6' : '#6b7280',
                    fillOpacity: 0.1,
                    weight: 2,
                  }}
                />
              ))}
              
              {/* Pending Geofence */}
              {pendingGeofence && (
                <Circle
                  center={[pendingGeofence.lat, pendingGeofence.lng]}
                  radius={formData.radius}
                  pathOptions={{
                    color: '#22c55e',
                    fillColor: '#22c55e',
                    fillOpacity: 0.2,
                    weight: 2,
                    dashArray: '5,5',
                  }}
                />
              )}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Geofence Creation Dialog */}
      <Dialog open={isGeofenceDialogOpen} onOpenChange={setIsGeofenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать геозону</DialogTitle>
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
            
            <div>
              <Label htmlFor="geofence-radius">Радиус (метры)</Label>
              <Input
                id="geofence-radius"
                type="number"
                value={formData.radius}
                onChange={(e) => setFormData(prev => ({ ...prev, radius: parseInt(e.target.value) || 200 }))}
                min="10"
                max="5000"
                step="10"
                data-testid="geofence-radius-input"
              />
            </div>
            
            {pendingGeofence && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Координаты: {pendingGeofence.lat.toFixed(6)}, {pendingGeofence.lng.toFixed(6)}
                </p>
              </div>
            )}
            
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