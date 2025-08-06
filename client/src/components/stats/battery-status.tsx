import { useQuery } from "@tanstack/react-query";
import { Horse, Device, GpsLocation, Geofence } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, ShieldAlert } from "lucide-react";

interface HorseStatusProps {
  onHorseSelect?: (horse: Horse) => void;
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

export default function HorseStatus({ onHorseSelect }: HorseStatusProps) {
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

  return (
    <div className="space-y-3">
      {horsesData.map((horse) => (
        <div 
          key={horse.id} 
          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
            horse.isInSafeZone 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
          data-testid={`horse-${horse.id}`}
          onClick={() => onHorseSelect?.(horse)}
        >
          <div className="space-y-3">
            {/* Horse name and zone status */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {horse.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Уровень батареи
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {horse.hasLocation && (
                  horse.isInSafeZone ? (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm font-medium">В зоне</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <ShieldAlert className="w-4 h-4" />
                      <span className="text-sm font-medium">Вне зоны</span>
                    </div>
                  )
                )}
              </div>
            </div>
            
            {/* Battery level with visual bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Батарея:</span>
                <span className={`font-bold text-lg ${getBatteryTextColor(horse.batteryLevel)}`}>
                  {horse.batteryLevel}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getBatteryColor(horse.batteryLevel)}`}
                  style={{ width: `${horse.batteryLevel}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
