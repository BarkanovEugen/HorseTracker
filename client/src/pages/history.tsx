import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GpsLocation, Horse } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Clock, TrendingUp } from "lucide-react";

export default function History() {
  const [selectedHorse, setSelectedHorse] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const { data: horses = [], isLoading: horsesLoading } = useQuery<Horse[]>({
    queryKey: ['/api/horses'],
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery<GpsLocation[]>({
    queryKey: ['/api/locations'],
  });

  const isLoading = horsesLoading || locationsLoading;

  // Filter and group locations by horse and date
  const filteredLocations = locations.filter(location => {
    if (selectedHorse && location.horseId !== selectedHorse) return false;
    if (fromDate && new Date(location.timestamp!) < new Date(fromDate)) return false;
    if (toDate && new Date(location.timestamp!) > new Date(toDate)) return false;
    return true;
  });

  // Group locations by date and horse
  const groupedHistory = filteredLocations.reduce((acc, location) => {
    const horse = horses.find(h => h.id === location.horseId);
    if (!horse) return acc;

    const date = new Date(location.timestamp!).toLocaleDateString('ru-RU');
    const key = `${date}-${horse.id}`;
    
    if (!acc[key]) {
      acc[key] = {
        date,
        horse,
        locations: [],
        totalDistance: 0,
        duration: 0,
      };
    }
    
    acc[key].locations.push(location);
    return acc;
  }, {} as Record<string, any>);

  const historyEntries = Object.values(groupedHistory).sort((a: any, b: any) => {
    return new Date(b.locations[0].timestamp).getTime() - new Date(a.locations[0].timestamp).getTime();
  });

  const handleApplyFilter = () => {
    // Filters are applied automatically via state changes
    console.log("Applying filters...", { selectedHorse, fromDate, toDate });
  };

  const handleViewTrail = (entry: any) => {
    console.log("Viewing trail for:", entry.horse.name, entry.locations);
    // TODO: Implement trail visualization
  };

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч назад`;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date >= today) {
      return `Сегодня, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date >= yesterday) {
      return `Вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString('ru-RU');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold" data-testid="history-title">
          История Перемещений
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Просмотр маршрутов и истории местоположений
        </p>
      </div>
      
      {/* History Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="horse-select">Лошадь</Label>
              <Select value={selectedHorse} onValueChange={setSelectedHorse}>
                <SelectTrigger id="horse-select" data-testid="filter-horse-select">
                  <SelectValue placeholder="Все лошади" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все лошади</SelectItem>
                  {horses.map(horse => (
                    <SelectItem key={horse.id} value={horse.id}>
                      {horse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="from-date">Дата от</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                data-testid="filter-from-date"
              />
            </div>
            
            <div>
              <Label htmlFor="to-date">Дата до</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                data-testid="filter-to-date"
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleApplyFilter}
                className="w-full bg-primary hover:bg-primary/90"
                data-testid="apply-filter-button"
              >
                <Search className="w-4 h-4 mr-2" />
                Применить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Последние перемещения</CardTitle>
        </CardHeader>
        
        <CardContent>
          {historyEntries.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет данных о перемещениях</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {selectedHorse || fromDate || toDate 
                  ? "Попробуйте изменить фильтры для отображения данных"
                  : "Данные о перемещениях появятся здесь после получения GPS-сигналов"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {historyEntries.map((entry: any, index) => {
                const lastLocation = entry.locations[entry.locations.length - 1];
                const distance = (Math.random() * 3 + 0.5).toFixed(1); // Mock distance calculation
                const duration = Math.floor(Math.random() * 120 + 15); // Mock duration
                
                return (
                  <div 
                    key={`${entry.horse.id}-${entry.date}-${index}`} 
                    className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid={`history-entry-${index}`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        entry.horse.status === 'active' 
                          ? 'bg-green-100 dark:bg-green-900' 
                          : entry.horse.status === 'warning'
                          ? 'bg-yellow-100 dark:bg-yellow-900'
                          : 'bg-red-100 dark:bg-red-900'
                      }`}>
                        <span className="text-lg">🐎</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {entry.horse.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTime(lastLocation.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Активность в течение дня • {entry.locations.length} GPS-точек
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Расстояние: {distance} км
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Активность: {Math.floor(duration / 60)}ч {duration % 60}мин
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-primary hover:text-primary/80 p-0 h-auto"
                          onClick={() => handleViewTrail(entry)}
                          data-testid={`view-trail-${index}`}
                        >
                          Посмотреть маршрут
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Load More */}
              <div className="text-center mt-8">
                <Button 
                  variant="outline"
                  className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  data-testid="load-more-button"
                >
                  Загрузить еще
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
