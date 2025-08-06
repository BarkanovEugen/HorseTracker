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
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Лошади</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 sm:space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 sm:w-20"></div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-8 sm:w-12 h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-6 sm:w-8"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2 sm:pb-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800">
        <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 dark:text-white">
          🐎 Лошади
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-4">
        <div className="space-y-2 sm:space-y-2.5">
          {horsesData.map((horse) => (
            <div 
              key={horse.id} 
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all group"
              data-testid={`horse-${horse.id}`}
              onClick={() => onHorseSelect?.(horse)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 truncate group-hover:text-primary transition-colors">
                  {horse.name}
                </span>
                {horse.hasLocation && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {horse.isInSafeZone ? (
                      <Shield className="w-3 h-3 text-green-600 dark:text-green-400" />
                    ) : (
                      <ShieldAlert className="w-3 h-3 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className="w-12 sm:w-16 h-2 sm:h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full transition-all duration-500 ${getBatteryColor(horse.batteryLevel)} shadow-sm`}
                    style={{ width: `${horse.batteryLevel}%` }}
                  />
                </div>
                <span 
                  className={`text-[10px] sm:text-xs font-bold ${getBatteryTextColor(horse.batteryLevel)} min-w-[28px] sm:min-w-[32px] text-right`}
                  data-testid={`battery-percentage-${horse.id}`}
                >
                  {horse.batteryLevel}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
