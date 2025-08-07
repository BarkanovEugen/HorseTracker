import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Horse, Device, GpsLocation, Geofence } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, ShieldAlert, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCanEdit } from "@/hooks/use-permissions";
import HorseForm from "@/components/horses/horse-form";

interface HorseStatusProps {
  onHorseSelect?: (horse: Horse) => void;
  selectedHorse?: Horse | null;
}

// Ray casting algorithm for point-in-polygon test
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

export default function HorseStatus({ onHorseSelect, selectedHorse }: HorseStatusProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingHorse, setEditingHorse] = useState<Horse | null>(null);
  const canEdit = useCanEdit();
  const { data: horses = [], isLoading: horsesLoading } = useQuery<Horse[]>({
    queryKey: ['/api/horses'],
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery<GpsLocation[]>({
    queryKey: ['/api/locations'],
  });

  const { data: geofences = [], isLoading: geofencesLoading } = useQuery<Geofence[]>({
    queryKey: ['/api/geofences'],
  });

  const isLoading = horsesLoading || devicesLoading || locationsLoading || geofencesLoading;

  // Combine horse, device, location, and geofence data
  const horsesData = horses.map(horse => {
    const device = devices.find(d => d.deviceId === horse.deviceId);
    const horseLocations = locations.filter(loc => loc.horseId === horse.id);
    const lastLocation = horseLocations.sort((a, b) => 
      new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
    )[0];

    // Check if horse is in any geofence
    let isInSafeZone = false;
    if (lastLocation) {
      const horsePoint: [number, number] = [
        parseFloat(lastLocation.latitude),
        parseFloat(lastLocation.longitude)
      ];

      isInSafeZone = geofences.some(geofence => {
        try {
          let coordinates;
          if (typeof geofence.coordinates === 'string') {
            coordinates = JSON.parse(geofence.coordinates);
          } else {
            coordinates = geofence.coordinates;
          }
          
          if (Array.isArray(coordinates) && coordinates.length >= 3) {
            return isPointInPolygon(horsePoint, coordinates);
          }
        } catch (error) {
          console.error('Error parsing geofence coordinates:', error);
        }
        return false;
      });
    }

    return {
      ...horse,
      batteryLevel: device?.batteryLevel ? parseInt(device.batteryLevel) : 0,
      isOnline: device?.isOnline ?? false,
      isInSafeZone,
      hasLocation: !!lastLocation,
    };
  });

  const getBatteryColor = (level: number) => {
    if (level > 50) return "bg-green-500";
    if (level > 20) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getBatteryTextColor = (level: number) => {
    if (level > 50) return "text-green-600";
    if (level > 20) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-gray-200 dark:bg-gray-700">
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const handleEdit = (horse: Horse, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingHorse(horse);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header with add button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900 dark:text-white">Статус лошадей</span>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="h-8"
              data-testid="add-horse-button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Добавить
            </Button>
          )}
        </div>

        {/* Horses list */}
        <div className="space-y-2">
          {horsesData.map((horse) => (
            <div 
              key={horse.id} 
              className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm hover:scale-[1.01] ${
                selectedHorse?.id === horse.id 
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 shadow-lg ring-2 ring-blue-400 dark:ring-blue-600'
                  : horse.isInSafeZone 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
              data-testid={`horse-${horse.id}`}
              onClick={() => onHorseSelect?.(horse)}
            >
              {/* Edit button */}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1.5 right-1.5 h-7 w-7 p-0 opacity-60 hover:opacity-100"
                  onClick={(e) => handleEdit(horse, e)}
                  data-testid={`edit-horse-${horse.id}`}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              )}

              <div className="space-y-2">
                {/* Horse name - compact single line */}
                <div className="flex items-center justify-between pr-8">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {horse.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {horse.hasLocation && (
                      horse.isInSafeZone ? (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <Shield className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">В зоне</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Вне зоны</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
                
                {/* Battery level - compact */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Батарея:</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${getBatteryColor(horse.batteryLevel)}`}
                        style={{ width: `${horse.batteryLevel}%` }}
                      />
                    </div>
                    <span className={`font-semibold text-xs ${getBatteryTextColor(horse.batteryLevel)} min-w-[30px] text-right`}>
                      {horse.batteryLevel}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Horse Form Dialogs */}
      {showAddDialog && (
        <HorseForm
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => setShowAddDialog(false)}
        />
      )}

      {editingHorse && (
        <HorseForm
          open={!!editingHorse}
          horse={editingHorse}
          onClose={() => setEditingHorse(null)}
          onSuccess={() => setEditingHorse(null)}
        />
      )}
    </>
  );
}
