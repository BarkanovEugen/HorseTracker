import { Horse, Device } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Wifi, WifiOff } from "lucide-react";
import { useCanEdit } from "@/hooks/use-permissions";

interface HorseCardProps {
  horse: Horse;
  device?: Device;
  onView: () => void;
  onEdit: () => void;
}

export default function HorseCard({ horse, device, onView, onEdit }: HorseCardProps) {
  const canEdit = useCanEdit();
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'offline':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активен';
      case 'warning':
        return 'Предупреждение';
      case 'offline':
        return 'Офлайн';
      default:
        return 'Неизвестно';
    }
  };

  const formatLastSignal = (lastSignal?: Date) => {
    if (!lastSignal) return 'Никогда';
    
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastSignal).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч назад`;
    return new Date(lastSignal).toLocaleDateString('ru-RU');
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`horse-card-${horse.id}`}>
      {/* Horse Image */}
      {horse.imageUrl && (
        <img 
          src={horse.imageUrl}
          alt={`${horse.name} - ${horse.breed}`}
          className="w-full h-48 object-cover"
          onError={(e) => {
            // Fallback to placeholder on image error
            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='%236b7280'%3E🐎 %3C/text%3E%3C/svg%3E";
          }}
        />
      )}
      
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold" data-testid={`horse-name-${horse.id}`}>
            {horse.name}
          </h3>
          <div className="flex items-center space-x-2">
            {device?.isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <Badge 
              className={getStatusColor(horse.status)}
              data-testid={`horse-status-${horse.id}`}
            >
              {getStatusText(horse.status)}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Порода:</span>
            <span data-testid={`horse-breed-${horse.id}`}>{horse.breed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Возраст:</span>
            <span data-testid={`horse-age-${horse.id}`}>{horse.age} лет</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">GPS ID:</span>
            <span className="font-mono text-xs" data-testid={`horse-device-${horse.id}`}>
              {horse.deviceId}
            </span>
          </div>
          {device && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Батарея:</span>
                <span 
                  className={`font-semibold ${
                    parseInt(device.batteryLevel || '0') > 20 ? 'text-green-600' : 'text-red-600'
                  }`}
                  data-testid={`horse-battery-${horse.id}`}
                >
                  {device.batteryLevel}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Последний сигнал:</span>
                <span data-testid={`horse-last-signal-${horse.id}`}>
                  {formatLastSignal(device.lastSignal)}
                </span>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onView}
            data-testid={`view-horse-${horse.id}`}
          >
            <Eye className="w-4 h-4 mr-1" />
            Детали
          </Button>
          {canEdit && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onEdit}
              data-testid={`edit-horse-${horse.id}`}
            >
              <Edit className="w-4 h-4 mr-1" />
              Изменить
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
