import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MapLibreMap from "@/components/map/maplibre-map";

import { 
  MapPin, 
  Bell, 
  Cpu, 
  Plus, 
  Trash2, 
  Wifi, 
  WifiOff,
  Battery,
  MessageSquare,
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
  const [geofenceCreationMode, setGeofenceCreationMode] = useState<'map' | 'manual'>('map');
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
  
  // Telegram notification settings
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramName, setTelegramName] = useState('');
  const [telegramNotifications, setTelegramNotifications] = useState(false);
  
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

  // Get current user data with Telegram settings
  const { data: currentUser } = useQuery<{
    id: string;
    telegramChatId?: string;
    telegramNotifications?: boolean;
  }>({
    queryKey: ['/api/auth/user'],
  });

  // Get Telegram service status
  const { data: telegramStatus } = useQuery<{
    enabled: boolean;
    configured: boolean;
  }>({
    queryKey: ['/api/telegram/status'],
  });

  // Get Telegram recipients
  const { data: telegramRecipients = [] } = useQuery<Array<{
    id: string;
    chatId: string;
    name: string;
    createdAt: string;
  }>>({
    queryKey: ['/api/telegram/recipients'],
  });

  // Update local state when user data loads
  useEffect(() => {
    if (currentUser) {
      setTelegramChatId(currentUser.telegramChatId || '');
      setTelegramNotifications(currentUser.telegramNotifications || false);
    }
  }, [currentUser]);

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

  // Telegram recipients mutations
  const addTelegramRecipientMutation = useMutation({
    mutationFn: async (data: { chatId: string; name: string }) => {
      const response = await apiRequest('POST', '/api/telegram/recipients', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/recipients'] });
      setTelegramChatId('');
      setTelegramName('');
      toast({
        title: "Получатель добавлен",
        description: "Новый получатель Telegram уведомлений добавлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.error || "Не удалось добавить получателя",
        variant: "destructive",
      });
    },
  });

  const removeTelegramRecipientMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/telegram/recipients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/recipients'] });
      toast({
        title: "Получатель удален",
        description: "Получатель Telegram уведомлений удален",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить получателя",
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

  const handleAddTelegramRecipient = () => {
    if (!telegramChatId.trim() || !telegramName.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните имя и Chat ID",
        variant: "destructive",
      });
      return;
    }
    
    addTelegramRecipientMutation.mutate({
      chatId: telegramChatId.trim(),
      name: telegramName.trim()
    });
  };

  const handleRemoveTelegramRecipient = (id: string) => {
    if (confirm("Удалить этого получателя уведомлений?")) {
      removeTelegramRecipientMutation.mutate(id);
    }
  };

  const handleDeleteGeofence = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту геозону?")) {
      deleteGeofenceMutation.mutate(id);
    }
  };

  const handleAddGeofence = () => {
    setGeofenceCreationMode('map');
    setIsGeofenceDialogOpen(true);
  };

  const handleAddGeofenceManual = () => {
    setGeofenceCreationMode('manual');
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center" data-testid="settings-title">
          <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-primary" />
          Настройки Системы
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
          Управление геозонами, уведомлениями и устройствами
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Geofence Settings */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
              Геозоны
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3 sm:space-y-4 pt-0">
            {geofences.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Нет настроенных геозон
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button 
                  onClick={handleAddGeofence} 
                  data-testid="add-geofence-empty"
                  className="w-full sm:flex-1"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  <span className="text-sm sm:text-base">Создать на карте</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleAddGeofenceManual} 
                  data-testid="add-geofence-manual-empty"
                  className="w-full sm:flex-1"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  <span className="text-sm sm:text-base">Координаты</span>
                </Button>
              </div>
              </div>
            ) : (
              <>
                {geofences.map((geofence) => (
                  <div
                    key={geofence.id}
                    className="flex items-start justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg gap-3"
                    data-testid={`geofence-${geofence.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{geofence.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {geofence.description && (
                          <>
                            <span className="hidden sm:inline">{geofence.description} • </span>
                          </>
                        )}
                        Полигональная зона
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGeofence(geofence.id)}
                        data-testid={`delete-geofence-${geofence.id}`}
                        className="h-8 w-8 sm:h-9 sm:w-9"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button 
                    onClick={handleAddGeofence}
                    className="w-full sm:flex-1 bg-primary hover:bg-primary/90"
                    data-testid="add-geofence-button"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    <span className="text-sm sm:text-base">Создать на карте</span>
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleAddGeofenceManual}
                    className="w-full sm:flex-1"
                    data-testid="add-geofence-manual-button"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    <span className="text-sm sm:text-base">Координаты</span>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Telegram Notifications */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
              Telegram Уведомления
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4 sm:space-y-6 pt-0">
            {!telegramStatus?.configured ? (
              <div className="text-center py-4 sm:py-6 text-gray-600 dark:text-gray-400">
                <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 text-gray-400" />
                <p className="text-sm sm:text-base">
                  Telegram Bot не настроен
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-sm sm:text-base">Получатели уведомлений</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="hidden sm:inline">Управление списком получателей Telegram уведомлений</span>
                      <span className="sm:hidden">Получатели Telegram</span>
                    </p>
                  </div>
                  
                  {/* List of current recipients */}
                  {telegramRecipients.length > 0 && (
                    <div className="space-y-2">
                      {telegramRecipients.map((recipient) => (
                        <div key={recipient.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{recipient.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              Chat ID: {recipient.chatId}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveTelegramRecipient(recipient.id)}
                            disabled={removeTelegramRecipientMutation.isPending}
                            className="flex-shrink-0 ml-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add new recipient form */}
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-sm font-medium">
                      Добавить получателя
                    </Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Имя получателя"
                        value={telegramName}
                        onChange={(e) => setTelegramName(e.target.value)}
                        disabled={addTelegramRecipientMutation.isPending}
                        data-testid="telegram-name-input"
                      />
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Chat ID в Telegram"
                          value={telegramChatId}
                          onChange={(e) => setTelegramChatId(e.target.value)}
                          disabled={addTelegramRecipientMutation.isPending}
                          data-testid="telegram-chat-id-input"
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleAddTelegramRecipient}
                          disabled={!telegramChatId.trim() || !telegramName.trim() || addTelegramRecipientMutation.isPending}
                          data-testid="add-telegram-recipient"
                          className="w-full sm:w-auto"
                          size="sm"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Добавить
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Instruction text */}
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    💡 Для получения Chat ID напишите @userinfobot в Telegram
                  </div>
                  
                  {/* Active recipients info */}
                  {telegramRecipients.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                        <p className="text-sm text-green-800 dark:text-green-200">
                          Активных получателей: {telegramRecipients.length}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Device Management */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
              Управление Устройствами
            </CardTitle>
            <Button 
              onClick={() => setIsDeviceDialogOpen(true)}
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
              data-testid="add-device-button"
              size="sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              <span className="text-sm">Добавить устройство</span>
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {devices.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Cpu className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Нет устройств</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
                Добавьте устройства GPS для мониторинга лошадей
              </p>
              <Button 
                onClick={() => setIsDeviceDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <span className="text-sm">Добавить устройство</span>
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile cards view */}
              <div className="block sm:hidden space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3"
                  data-testid={`device-card-${device.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-sm font-medium">{device.deviceId}</span>
                    </div>
                    <Badge className={getDeviceStatusColor(device.isOnline)}>
                      <div className="flex items-center space-x-1">
                        {device.isOnline ? (
                          <Wifi className="w-3 h-3" />
                        ) : (
                          <WifiOff className="w-3 h-3" />
                        )}
                        <span className="text-xs">{getDeviceStatusText(device)}</span>
                      </div>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Лошадь</p>
                      <p className="font-medium">
                        {device.horseId ? `№${device.horseId.slice(-4)}` : 'Не назначено'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Батарея</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${getBatteryColor(device.batteryLevel || '0')}`}
                            style={{ width: `${device.batteryLevel || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">{device.batteryLevel || 0}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Последний сигнал</p>
                      <p className="text-xs">{formatLastSignal(device.lastSignal || undefined)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConfigureDevice(device)}
                      data-testid={`device-actions-mobile-${device.id}`}
                    >
                      Настроить
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto">
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Geofence Creator Dialog */}
      <Dialog open={isGeofenceDialogOpen} onOpenChange={setIsGeofenceDialogOpen}>
        <DialogContent className="z-[10000] w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {geofenceCreationMode === 'map' ? 'Создать геозону на карте' : 'Добавить геозону вручную'}
            </DialogTitle>
          </DialogHeader>
          
          {geofenceCreationMode === 'map' ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="h-[300px] sm:h-[500px] w-full border rounded-lg overflow-hidden">
                <MapLibreMap />
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <p>• <span className="hidden sm:inline">Нажмите кнопку "Добавить зону" на карте</span><span className="sm:hidden">Нажмите "Зона" на карте</span></p>
                <p>• <span className="hidden sm:inline">Кликните по карте, чтобы добавить точки полигона (минимум 3 точки)</span><span className="sm:hidden">Кликните для добавления точек (мин. 3)</span></p>
                <p>• <span className="hidden sm:inline">Нажмите "Завершить" для создания геозоны</span><span className="sm:hidden">Нажмите "Готово"</span></p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeofenceCreationMode('manual');
                  }}
                  data-testid="switch-to-manual-mode"
                  className="w-full sm:flex-1"
                >
                  <span className="hidden sm:inline">Переключиться на ручной ввод</span>
                  <span className="sm:hidden">Ручной ввод</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsGeofenceDialogOpen(false);
                    setGeofenceFormData({ name: '', description: '', coordinates: '' });
                  }}
                  data-testid="cancel-map-geofence"
                  className="w-full sm:flex-1"
                >
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitGeofence} className="space-y-3 sm:space-y-4">
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
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <Button
                  type="submit"
                  className="w-full sm:flex-1 bg-primary hover:bg-primary/90"
                  disabled={createGeofenceMutation.isPending}
                  data-testid="submit-geofence-form"
                >
                  {createGeofenceMutation.isPending ? "Создание..." : "Создать геозону"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setGeofenceCreationMode('map');
                  }}
                  disabled={createGeofenceMutation.isPending}
                  data-testid="switch-to-map-mode"
                  className="w-full sm:flex-1"
                >
                  <span className="hidden sm:inline">Переключиться на карту</span>
                  <span className="sm:hidden">Карта</span>
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
                  className="w-full sm:flex-1"
                >
                  Отмена
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Device Creation Dialog */}
      <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
        <DialogContent className="z-[10000] w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Добавить устройство</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitDevice} className="space-y-3 sm:space-y-4">
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