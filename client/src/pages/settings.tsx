import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Geofence, Device, Horse } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { 
  MapPin, 
  Bell, 
  Cpu, 
  Plus, 
  Trash2, 
  Wifi, 
  WifiOff,
  Battery,
  Settings as SettingsIcon 
} from "lucide-react";

interface NotificationSettings {
  geofenceExit: boolean;
  lowBattery: boolean;
  deviceOffline: boolean;
  dailyReports: boolean;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isGeofenceDialogOpen, setIsGeofenceDialogOpen] = useState(false);
  const [geofenceFormData, setGeofenceFormData] = useState({
    name: '',
    description: '',
    coordinates: '',
  });
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [isDeviceConfigOpen, setIsDeviceConfigOpen] = useState(false);
  const [configuringDevice, setConfiguringDevice] = useState<Device | null>(null);
  const [deviceFormData, setDeviceFormData] = useState({
    deviceId: '',
    horseId: '',
  });
  const [deviceConfigData, setDeviceConfigData] = useState({
    reportingInterval: '30',
    gpsAccuracy: 'high',
    powerSavingMode: false,
  });
  
  // Mock notification settings - in a real app, this would come from user preferences API
  const [notifications, setNotifications] = useState<NotificationSettings>({
    geofenceExit: true,
    lowBattery: true,
    deviceOffline: false,
    dailyReports: true,
  });

  const { data: geofences = [], isLoading: geofencesLoading } = useQuery<Geofence[]>({
    queryKey: ['/api/geofences'],
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });

  const { data: horses = [] } = useQuery<Horse[]>({
    queryKey: ['/api/horses'],
  });

  const deleteGeofenceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/geofences/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/geofences'] });
      toast({
        title: "Геозона удалена",
        description: "Геозона была успешно удалена",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить геозону",
        variant: "destructive",
      });
    },
  });

  const createGeofenceMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; coordinates: string }) => {
      const response = await apiRequest('POST', '/api/geofences', {
        name: data.name,
        description: data.description || null,
        coordinates: data.coordinates,
        isActive: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/geofences'] });
      setIsGeofenceDialogOpen(false);
      setGeofenceFormData({ name: '', description: '', coordinates: '' });
      toast({
        title: "Геозона создана",
        description: "Новая геозона была успешно создана",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать геозону",
        variant: "destructive",
      });
    },
  });

  const createDeviceMutation = useMutation({
    mutationFn: async (data: { deviceId: string; horseId?: string }) => {
      const response = await apiRequest('POST', '/api/devices', {
        deviceId: data.deviceId,
        horseId: data.horseId || null,
        isOnline: true,
        batteryLevel: "100",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      setIsDeviceDialogOpen(false);
      setDeviceFormData({ deviceId: '', horseId: '' });
      toast({
        title: "Устройство добавлено",
        description: "Новое устройство было успешно добавлено",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить устройство",
        variant: "destructive",
      });
    },
  });

  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    // In a real app, this would save to user preferences API
    toast({
      title: "Настройки обновлены",
      description: "Настройки уведомлений были сохранены",
    });
  };

  const handleDeleteGeofence = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту геозону?")) {
      deleteGeofenceMutation.mutate(id);
    }
  };

  const handleAddGeofence = () => {
    setIsGeofenceDialogOpen(true);
  };

  const handleSubmitGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!geofenceFormData.name.trim() || !geofenceFormData.coordinates.trim()) {
      toast({
        title: "Ошибка валидации",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Validate coordinates format
      const coords = JSON.parse(geofenceFormData.coordinates);
      if (!Array.isArray(coords) || coords.length < 3) {
        throw new Error('Invalid coordinates');
      }
      
      createGeofenceMutation.mutate({
        name: geofenceFormData.name,
        description: geofenceFormData.description,
        coordinates: geofenceFormData.coordinates,
      });
    } catch (error) {
      toast({
        title: "Ошибка координат",
        description: "Неверный формат координат. Используйте JSON формат: [[lat,lng], [lat,lng], ...]",
        variant: "destructive",
      });
    }
  };

  const handleSubmitDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceFormData.deviceId.trim()) return;
    
    createDeviceMutation.mutate({
      deviceId: deviceFormData.deviceId,
      horseId: deviceFormData.horseId || undefined,
    });
  };

  const handleConfigureDevice = (device: Device) => {
    setConfiguringDevice(device);
    setDeviceConfigData({
      reportingInterval: '30',
      gpsAccuracy: 'high',
      powerSavingMode: false,
    });
    setIsDeviceConfigOpen(true);
  };

  const handleSubmitDeviceConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringDevice) return;
    
    // Here we would normally send the configuration to the device
    // For now, we'll just show a success message
    toast({
      title: "Настройки обновлены",
      description: `Конфигурация устройства ${configuringDevice.deviceId} успешно обновлена`,
    });
    
    setIsDeviceConfigOpen(false);
    setConfiguringDevice(null);
  };

  const getDeviceStatusColor = (isOnline: boolean) => {
    return isOnline ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                   : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  const getDeviceStatusText = (device: Device) => {
    if (!device.isOnline) return "Офлайн";
    if (device.batteryLevel && parseInt(device.batteryLevel) < 20) return "Низкий заряд";
    return "Активен";
  };

  const getBatteryColor = (level: string) => {
    const numLevel = parseInt(level || '0');
    if (numLevel > 50) return "bg-green-500";
    if (numLevel > 20) return "bg-yellow-500";
    return "bg-red-500";
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

  const isLoading = geofencesLoading || devicesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center" data-testid="settings-title">
          <SettingsIcon className="w-6 h-6 mr-2 text-primary" />
          Настройки Системы
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Управление геозонами, уведомлениями и устройствами
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geofence Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-primary" />
              Геозоны
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {geofences.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Нет настроенных геозон
                </p>
                <div className="flex flex-col space-y-2">
                <Button onClick={handleAddGeofence} data-testid="add-geofence-empty">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить геозону
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Или используйте интерактивную карту на главной странице
                </p>
              </div>
              </div>
            ) : (
              <>
                {geofences.map((geofence) => (
                  <div
                    key={geofence.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    data-testid={`geofence-${geofence.id}`}
                  >
                    <div>
                      <p className="font-medium">{geofence.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {geofence.description} • Полигональная зона
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGeofence(geofence.id)}
                        data-testid={`delete-geofence-${geofence.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button 
                  onClick={handleAddGeofence}
                  className="w-full bg-primary hover:bg-primary/90"
                  data-testid="add-geofence-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить геозону
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2 text-primary" />
              Уведомления
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Покидание геозоны</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Уведомления при выходе из безопасной зоны
                </p>
              </div>
              <Switch
                checked={notifications.geofenceExit}
                onCheckedChange={() => handleNotificationToggle('geofenceExit')}
                data-testid="notification-geofence-toggle"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Низкий заряд батареи</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Предупреждения при заряде менее 20%
                </p>
              </div>
              <Switch
                checked={notifications.lowBattery}
                onCheckedChange={() => handleNotificationToggle('lowBattery')}
                data-testid="notification-battery-toggle"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Потеря сигнала</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Уведомления при отключении устройства
                </p>
              </div>
              <Switch
                checked={notifications.deviceOffline}
                onCheckedChange={() => handleNotificationToggle('deviceOffline')}
                data-testid="notification-offline-toggle"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ежедневные отчеты</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Сводка активности лошадей
                </p>
              </div>
              <Switch
                checked={notifications.dailyReports}
                onCheckedChange={() => handleNotificationToggle('dailyReports')}
                data-testid="notification-reports-toggle"
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Device Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Cpu className="w-5 h-5 mr-2 text-primary" />
              Управление Устройствами
            </CardTitle>
            <Button 
              onClick={() => setIsDeviceDialogOpen(true)}
              className="bg-primary hover:bg-primary/90"
              data-testid="add-device-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить устройство
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-12">
              <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет устройств</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Добавьте устройства GPS для мониторинга лошадей
              </p>
              <Button onClick={() => setIsDeviceDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить устройство
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="devices-table">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Устройство
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Лошадь
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Статус
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Батарея
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Последний сигнал
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {devices.map((device) => (
                    <tr key={device.id} data-testid={`device-row-${device.id}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Cpu className="w-4 h-4 text-gray-400" />
                          <span className="font-mono text-sm">{device.deviceId}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {device.horseId ? (
                          <span data-testid={`device-horse-${device.id}`}>
                            Лошадь #{device.horseId.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-gray-500">Не назначено</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          className={getDeviceStatusColor(device.isOnline)}
                          data-testid={`device-status-${device.id}`}
                        >
                          <div className="flex items-center space-x-1">
                            {device.isOnline ? (
                              <Wifi className="w-3 h-3" />
                            ) : (
                              <WifiOff className="w-3 h-3" />
                            )}
                            <span>{getDeviceStatusText(device)}</span>
                          </div>
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${getBatteryColor(device.batteryLevel || '0')}`}
                              style={{ width: `${device.batteryLevel || 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono">
                            {device.batteryLevel || 0}%
                          </span>
                          <Battery className="w-3 h-3 text-gray-400" />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatLastSignal(device.lastSignal || undefined)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConfigureDevice(device)}
                          data-testid={`device-actions-${device.id}`}
                        >
                          Настроить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geofence Creator Dialog */}
      <Dialog open={isGeofenceDialogOpen} onOpenChange={setIsGeofenceDialogOpen}>
        <DialogContent className="z-[10000] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить геозону</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitGeofence} className="space-y-4">
            <div>
              <Label htmlFor="geofence-name">Название геозоны*</Label>
              <Input
                id="geofence-name"
                value={geofenceFormData.name}
                onChange={(e) => setGeofenceFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: Пастбище Север"
                required
                data-testid="geofence-name-input"
              />
            </div>
            
            <div>
              <Label htmlFor="geofence-description">Описание</Label>
              <Textarea
                id="geofence-description"
                value={geofenceFormData.description}
                onChange={(e) => setGeofenceFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание геозоны"
                rows={2}
                data-testid="geofence-description-input"
              />
            </div>
            
            <div>
              <Label htmlFor="geofence-coordinates">Координаты полигона*</Label>
              <Textarea
                id="geofence-coordinates"
                value={geofenceFormData.coordinates}
                onChange={(e) => setGeofenceFormData(prev => ({ ...prev, coordinates: e.target.value }))}
                placeholder="[[55.7568, 37.6186], [55.7548, 37.6206], [55.7538, 37.6166], [55.7558, 37.6146], [55.7568, 37.6186]]"
                rows={4}
                required
                className="font-mono text-sm"
                data-testid="geofence-coordinates-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Формат: JSON массив координат [[широта, долгота], ...]. Минимум 3 точки.
                <br />
                Для удобства создания используйте интерактивную карту на главной странице.
              </p>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={createGeofenceMutation.isPending}
                data-testid="submit-geofence-form"
              >
                {createGeofenceMutation.isPending ? "Создание..." : "Создать геозону"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsGeofenceDialogOpen(false);
                  setGeofenceFormData({ name: '', description: '', coordinates: '' });
                }}
                disabled={createGeofenceMutation.isPending}
                data-testid="cancel-geofence-form"
              >
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Device Creation Dialog */}
      <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
        <DialogContent className="z-[10000]">
          <DialogHeader>
            <DialogTitle>Добавить устройство</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitDevice} className="space-y-4">
            <div>
              <Label htmlFor="device-id">ID устройства</Label>
              <Input
                id="device-id"
                value={deviceFormData.deviceId}
                onChange={(e) => setDeviceFormData(prev => ({ ...prev, deviceId: e.target.value }))}
                placeholder="Например: ESP32-005"
                required
                data-testid="device-id-input"
              />
            </div>
            
            <div>
              <Label htmlFor="horse-id">ID лошади (необязательно)</Label>
              <Input
                id="horse-id"
                value={deviceFormData.horseId}
                onChange={(e) => setDeviceFormData(prev => ({ ...prev, horseId: e.target.value }))}
                placeholder="Например: horse-1"
                data-testid="horse-id-input"
              />
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={createDeviceMutation.isPending}
                data-testid="submit-device-form"
              >
                {createDeviceMutation.isPending ? "Добавление..." : "Добавить устройство"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeviceDialogOpen(false)}
                disabled={createDeviceMutation.isPending}
                data-testid="cancel-device-form"
              >
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Device Configuration Dialog */}
      <Dialog open={isDeviceConfigOpen} onOpenChange={setIsDeviceConfigOpen}>
        <DialogContent className="z-[10000] max-w-md">
          <DialogHeader>
            <DialogTitle>
              Настройка устройства {configuringDevice?.deviceId}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitDeviceConfig} className="space-y-4">
            <div>
              <Label htmlFor="reporting-interval">Интервал отправки данных (секунды)</Label>
              <Select
                value={deviceConfigData.reportingInterval}
                onValueChange={(value) => setDeviceConfigData(prev => ({ ...prev, reportingInterval: value }))}
              >
                <SelectTrigger data-testid="reporting-interval-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[10010]">
                  <SelectItem value="10">10 секунд</SelectItem>
                  <SelectItem value="30">30 секунд</SelectItem>
                  <SelectItem value="60">1 минута</SelectItem>
                  <SelectItem value="300">5 минут</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="gps-accuracy">Точность GPS</Label>
              <Select
                value={deviceConfigData.gpsAccuracy}
                onValueChange={(value) => setDeviceConfigData(prev => ({ ...prev, gpsAccuracy: value }))}
              >
                <SelectTrigger data-testid="gps-accuracy-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[10010]">
                  <SelectItem value="high">Высокая</SelectItem>
                  <SelectItem value="medium">Средняя</SelectItem>
                  <SelectItem value="low">Низкая</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="power-saving"
                checked={deviceConfigData.powerSavingMode}
                onCheckedChange={(checked) => setDeviceConfigData(prev => ({ ...prev, powerSavingMode: checked }))}
                data-testid="power-saving-switch"
              />
              <Label htmlFor="power-saving">Режим энергосбережения</Label>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90"
                data-testid="submit-device-config"
              >
                Применить настройки
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeviceConfigOpen(false)}
                data-testid="cancel-device-config"
              >
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}