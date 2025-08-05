export type HorseStatus = 'active' | 'warning' | 'offline';
export type AlertSeverity = 'urgent' | 'warning' | 'info';
export type AlertType = 'geofence_exit' | 'low_battery' | 'device_offline';

export interface HorseWithLocation {
  id: string;
  name: string;
  breed: string;
  age: string;
  deviceId: string;
  imageUrl?: string;
  status: HorseStatus;
  lastLocation?: {
    latitude: string;
    longitude: string;
    timestamp: Date;
    batteryLevel?: string;
  };
  device?: {
    batteryLevel: string;
    isOnline: boolean;
    lastSignal?: Date;
  };
}

export interface StatsData {
  totalHorses: number;
  activeHorses: number;
  warningHorses: number;
  offlineHorses: number;
}
