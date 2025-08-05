import { Horse, GpsLocation } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HorseMarkerProps {
  horse: Horse;
  location: GpsLocation;
  style: React.CSSProperties;
}

export default function HorseMarker({ horse, location, style }: HorseMarkerProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч назад`;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div 
      className="absolute horse-marker cursor-pointer z-10" 
      style={style}
      data-testid={`horse-marker-${horse.id}`}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <div className={`w-6 h-6 ${getStatusColor(horse.status)} rounded-full border-2 border-white shadow-lg flex items-center justify-center`}>
              <span className="text-white text-xs">🐎</span>
            </div>
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {horse.name}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <div className="font-semibold">{horse.name}</div>
            <div className="text-sm">
              <div>Порода: {horse.breed}</div>
              <div>Возраст: {horse.age} лет</div>
              <div>Устройство: {horse.deviceId}</div>
              {location.batteryLevel && (
                <div>Батарея: {location.batteryLevel}%</div>
              )}
              <div>Обновлено: {formatTime(location.timestamp!)}</div>
              <div className="text-xs text-gray-500">
                Координаты: {parseFloat(location.latitude).toFixed(4)}, {parseFloat(location.longitude).toFixed(4)}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
