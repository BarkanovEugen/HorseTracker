import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Polygon, Polyline, useMapEvents, useMap } from "react-leaflet";
import { InsertGeofence } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import L from "leaflet";
import { Crosshair, Plus, Save, X, CheckCircle, XCircle } from "lucide-react";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface GeofenceCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GeofenceFormData {
  name: string;
  description: string;
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
            data-testid="start-drawing-button"
          >
            <Plus className="w-4 h-4 mr-1" />
            Рисовать зону
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
            Завершить
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

export default function GeofenceCreatorDialog({ open, onOpenChange }: GeofenceCreatorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'map' | 'form'>('map');
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [formData, setFormData] = useState<GeofenceFormData>({
    name: '',
    description: '',
  });

  const createGeofenceMutation = useMutation({
    mutationFn: async (data: InsertGeofence) => {
      const response = await apiRequest('POST', '/api/geofences', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/geofences'] });
      handleClose();
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

  const handleClose = () => {
    setStep('map');
    setIsDrawingMode(false);
    setDrawingPoints([]);
    setFormData({ name: '', description: '' });
    onOpenChange(false);
  };

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
      setStep('form');
      setIsDrawingMode(false);
    }
  };

  const handleCancelDrawing = () => {
    setIsDrawingMode(false);
    setDrawingPoints([]);
  };

  const handleBackToMap = () => {
    setStep('map');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[10000] max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'map' ? 'Создать геозону - Выбор области' : 'Создать геозону - Информация'}
          </DialogTitle>
          <DialogDescription>
            {step === 'map' 
              ? 'Кликните на карте, чтобы добавить точки многоугольника. Минимум 3 точки для создания зоны.'
              : 'Заполните информацию о новой геозоне для выбранной области.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'map' && (
          <div className="flex-1 relative">
            <div 
              className="h-full rounded-lg overflow-hidden"
              data-testid="geofence-map-container"
            >
              <MapContainer
                center={[55.7558, 37.6176]} // Moscow coordinates
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
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
              </MapContainer>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex justify-between">
              <Button
                variant="outline"
                onClick={handleClose}
                data-testid="close-dialog-button"
              >
                <X className="w-4 h-4 mr-2" />
                Отмена
              </Button>
              
              {drawingPoints.length > 0 && (
                <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg">
                  <span className="text-sm">
                    Точек: {drawingPoints.length} {drawingPoints.length >= 3 ? '✓' : '(мин. 3)'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="flex-1 space-y-4">
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
            
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={handleBackToMap}
                data-testid="back-to-map-button"
              >
                Назад к карте
              </Button>
              <Button
                onClick={handleSaveGeofence}
                disabled={!formData.name.trim() || createGeofenceMutation.isPending}
                className="flex-1"
                data-testid="save-geofence-button"
              >
                <Save className="w-4 h-4 mr-2" />
                {createGeofenceMutation.isPending ? 'Сохранение...' : 'Создать геозону'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}