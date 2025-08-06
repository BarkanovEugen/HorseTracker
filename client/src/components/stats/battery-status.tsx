import { useQuery } from "@tanstack/react-query";
import { Horse, Device } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BatteryStatusProps {
  onHorseSelect?: (horse: Horse) => void;
}

export default function BatteryStatus({ onHorseSelect }: BatteryStatusProps) {
  const { data: horses = [], isLoading: horsesLoading } = useQuery<Horse[]>({
    queryKey: ['/api/horses'],
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  const isLoading = horsesLoading || devicesLoading;

  // Combine horse and device data
  const horsesBatteryData = horses.map(horse => {
    const device = devices.find(d => d.deviceId === horse.deviceId);
    return {
      ...horse,
      batteryLevel: device?.batteryLevel ? parseInt(device.batteryLevel) : 0,
      isOnline: device?.isOnline ?? false,
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
          <CardTitle className="text-base sm:text-lg">Батареи</CardTitle>
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
      <CardHeader className="pb-2 sm:pb-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800">
        <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 dark:text-white">
          🔋 Батареи
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-4">
        <div className="space-y-2 sm:space-y-2.5">
          {horsesBatteryData.map((horse) => (
            <div 
              key={horse.id} 
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all group"
              data-testid={`battery-${horse.id}`}
              onClick={() => onHorseSelect?.(horse)}
            >
              <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 truncate mr-2 group-hover:text-primary transition-colors">
                {horse.name}
              </span>
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
