import { useQuery } from "@tanstack/react-query";
import { Horse, Device } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function BatteryStatus() {
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
      <Card>
        <CardHeader>
          <CardTitle>Состояние Батарей</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Состояние Батарей</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {horsesBatteryData.map((horse) => (
            <div 
              key={horse.id} 
              className="flex items-center justify-between"
              data-testid={`battery-${horse.id}`}
            >
              <span className="text-sm font-medium">{horse.name}</span>
              <div className="flex items-center space-x-2">
                <div className="w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${getBatteryColor(horse.batteryLevel)}`}
                    style={{ width: `${horse.batteryLevel}%` }}
                  ></div>
                </div>
                <span 
                  className={`text-xs font-semibold ${getBatteryTextColor(horse.batteryLevel)}`}
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
