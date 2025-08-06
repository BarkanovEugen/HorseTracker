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
    <Card className="h-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2 sm:pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
        <CardTitle className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 dark:text-white">
          📊 Статус
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-4">
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
              Всего
            </span>
            <span className="font-bold text-base sm:text-lg text-gray-900 dark:text-white" data-testid="total-horses">
              {stats.totalHorses}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
              Активные
            </span>
            <span className="font-bold text-base sm:text-lg text-green-600 dark:text-green-400" data-testid="active-horses">
              {stats.activeHorses}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
              Внимание
            </span>
            <span className="font-bold text-base sm:text-lg text-yellow-600 dark:text-yellow-400" data-testid="warning-horses">
              {stats.warningHorses}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
              Офлайн
            </span>
            <span className="font-bold text-base sm:text-lg text-gray-500 dark:text-gray-400" data-testid="offline-horses">
              {stats.offlineHorses}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
