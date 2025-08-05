import { useQuery } from "@tanstack/react-query";
import { GpsLocation, Horse } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ZoomIn, ZoomOut, Crosshair, MapIcon } from "lucide-react";
import HorseMarker from "./horse-marker";

export default function GpsMap() {
  const { data: locations = [], isLoading: locationsLoading } = useQuery<GpsLocation[]>({
    queryKey: ['/api/locations'],
  });

  const { data: horses = [], isLoading: horsesLoading } = useQuery<Horse[]>({
    queryKey: ['/api/horses'],
  });

  const isLoading = locationsLoading || horsesLoading;

  // Group locations by horse
  const horseLocations = horses.map(horse => {
    const horseLocationData = locations.filter(loc => loc.horseId === horse.id);
    const lastLocation = horseLocationData.sort((a, b) => 
      new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
    )[0];
    
    return {
      horse,
      lastLocation,
      allLocations: horseLocationData
    };
  });

  const handleCenterMap = () => {
    // TODO: Implement map centering logic
    console.log("Centering map...");
  };

  const handleToggleGeofence = () => {
    // TODO: Implement geofence toggle logic
    console.log("Toggling geofences...");
  };

  const handleZoomIn = () => {
    // TODO: Implement zoom in logic
    console.log("Zooming in...");
  };

  const handleZoomOut = () => {
    // TODO: Implement zoom out logic
    console.log("Zooming out...");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>GPS Карта в Реальном Времени</span>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" disabled>
                <Crosshair className="w-4 h-4 mr-1" />
                Центрировать
              </Button>
              <Button size="sm" variant="outline" disabled>
                <MapIcon className="w-4 h-4 mr-1" />
                Геозоны
              </Button>
            </div>
          </CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>GPS Карта в Реальном Времени</span>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCenterMap}
              data-testid="center-map-button"
            >
              <Crosshair className="w-4 h-4 mr-1" />
              Центрировать
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleToggleGeofence}
              data-testid="geofence-toggle-button"
            >
              <MapIcon className="w-4 h-4 mr-1" />
              Геозоны
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Mock Map Interface */}
        <div 
          className="map-container h-96 relative bg-gradient-to-br from-green-200 to-green-300 dark:from-green-800 dark:to-green-900 rounded-lg overflow-hidden"
          data-testid="gps-map-container"
        >
          {/* Grid pattern to simulate map */}
          <div className="absolute inset-0 opacity-30">
            <svg width="100%" height="100%" className="absolute inset-0">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          
          {/* Horse Markers */}
          {horseLocations.map(({ horse, lastLocation }, index) => {
            if (!lastLocation) return null;
            
            // Position markers in a grid pattern for demonstration
            const positions = [
              { top: '25%', left: '20%' },
              { top: '60%', right: '30%' },
              { bottom: '25%', left: '50%' },
              { top: '40%', right: '20%' },
              { bottom: '40%', left: '25%' }
            ];
            
            const position = positions[index % positions.length];
            
            return (
              <HorseMarker
                key={horse.id}
                horse={horse}
                location={lastLocation}
                style={position}
              />
            );
          })}
          
          {/* Mock Geofence Areas */}
          <div className="absolute inset-0 pointer-events-none">
            <svg width="100%" height="100%">
              <circle 
                cx="25%" 
                cy="40%" 
                r="60" 
                fill="rgba(34, 197, 94, 0.2)" 
                stroke="rgba(34, 197, 94, 0.6)" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              />
              <circle 
                cx="70%" 
                cy="65%" 
                r="80" 
                fill="rgba(59, 130, 246, 0.2)" 
                stroke="rgba(59, 130, 246, 0.6)" 
                strokeWidth="2" 
                strokeDasharray="5,5"
              />
            </svg>
          </div>
          
          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <Button
              size="icon"
              variant="outline"
              className="bg-white dark:bg-gray-800 shadow-lg"
              onClick={handleZoomIn}
              data-testid="zoom-in-button"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="bg-white dark:bg-gray-800 shadow-lg"
              onClick={handleZoomOut}
              data-testid="zoom-out-button"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3">
            <div className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Легенда:
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">Активные</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">Предупреждения</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-green-500 rounded-full bg-transparent"></div>
                <span className="text-gray-600 dark:text-gray-400">Безопасные зоны</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
