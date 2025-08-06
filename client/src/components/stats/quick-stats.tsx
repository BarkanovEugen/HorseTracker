import { useQuery } from "@tanstack/react-query";
import { Horse, Device } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsData } from "@/lib/types";

export default function QuickStats() {
  const { data: horses = [], isLoading: horsesLoading } = useQuery<Horse[]>({
    queryKey: ['/api/horses'],
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  const isLoading = horsesLoading || devicesLoading;

  const stats: StatsData = {
    totalHorses: horses.length,
    activeHorses: horses.filter(h => h.status === 'active').length,
    warningHorses: horses.filter(h => h.status === 'warning').length,
    offlineHorses: horses.filter(h => h.status === 'offline').length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Статус Сейчас</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">Статус Сейчас</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Всего лошадей</span>
            <span className="font-semibold text-sm sm:text-base" data-testid="total-horses">
              {stats.totalHorses}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Активные</span>
            <span className="font-semibold text-green-600 text-sm sm:text-base" data-testid="active-horses">
              {stats.activeHorses}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Предупреждения</span>
            <span className="font-semibold text-yellow-600 text-sm sm:text-base" data-testid="warning-horses">
              {stats.warningHorses}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Офлайн</span>
            <span className="font-semibold text-gray-400 text-sm sm:text-base" data-testid="offline-horses">
              {stats.offlineHorses}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
