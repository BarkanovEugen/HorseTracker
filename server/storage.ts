import { 
  type Horse, 
  type InsertHorse,
  type GpsLocation,
  type InsertGpsLocation,
  type Alert,
  type InsertAlert,
  type Geofence,
  type InsertGeofence,
  type Device,
  type InsertDevice
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Horses
  getHorses(): Promise<Horse[]>;
  getHorse(id: string): Promise<Horse | undefined>;
  createHorse(horse: InsertHorse): Promise<Horse>;
  updateHorse(id: string, horse: Partial<InsertHorse>): Promise<Horse | undefined>;
  deleteHorse(id: string): Promise<boolean>;

  // GPS Locations
  getLocationsByHorse(horseId: string): Promise<GpsLocation[]>;
  getRecentLocations(limit?: number): Promise<GpsLocation[]>;
  createLocation(location: InsertGpsLocation): Promise<GpsLocation>;
  checkGeofenceViolations(horseId: string, latitude: number, longitude: number): Promise<void>;

  // Alerts
  getActiveAlerts(): Promise<Alert[]>;
  getAllAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  dismissAlert(id: string): Promise<boolean>;

  // Geofences
  getGeofences(): Promise<Geofence[]>;
  createGeofence(geofence: InsertGeofence): Promise<Geofence>;
  updateGeofence(id: string, geofence: Partial<InsertGeofence>): Promise<Geofence | undefined>;
  deleteGeofence(id: string): Promise<boolean>;

  // Devices
  getDevices(): Promise<Device[]>;
  getDeviceByDeviceId(deviceId: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private horses: Map<string, Horse>;
  private locations: Map<string, GpsLocation>;
  private alerts: Map<string, Alert>;
  private geofences: Map<string, Geofence>;
  private devices: Map<string, Device>;

  constructor() {
    this.horses = new Map();
    this.locations = new Map();
    this.alerts = new Map();
    this.geofences = new Map();
    this.devices = new Map();
    this.initializeMockData();
  }

  // Helper function to check if a point is inside a polygon using ray casting algorithm
  private isPointInPolygon(latitude: number, longitude: number, polygon: [number, number][]): boolean {
    let isInside = false;
    const x = longitude;
    const y = latitude;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][1]; // longitude
      const yi = polygon[i][0]; // latitude
      const xj = polygon[j][1]; // longitude
      const yj = polygon[j][0]; // latitude
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        isInside = !isInside;
      }
    }
    
    return isInside;
  }

  private initializeMockData() {
    // Initialize some sample horses
    const horse1: Horse = {
      id: "horse-1",
      name: "Буран",
      breed: "Орловский рысак",
      age: "7",
      deviceId: "ESP32-001",
      imageUrl: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400",
      markerColor: "#22c55e",
      status: "active",
      createdAt: new Date(),
    };

    const horse2: Horse = {
      id: "horse-2",
      name: "Молния",
      breed: "Арабская",
      age: "5",
      deviceId: "ESP32-002",
      imageUrl: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400",
      markerColor: "#3b82f6",
      status: "warning",
      createdAt: new Date(),
    };

    const horse3: Horse = {
      id: "horse-3",
      name: "Звездочка",
      breed: "Фризская",
      age: "9",
      deviceId: "ESP32-003",
      imageUrl: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400",
      markerColor: "#8b5cf6",
      status: "active",
      createdAt: new Date(),
    };

    this.horses.set(horse1.id, horse1);
    this.horses.set(horse2.id, horse2);
    this.horses.set(horse3.id, horse3);

    // Initialize sample devices
    const device1: Device = {
      id: "device-1",
      deviceId: "ESP32-001",
      horseId: "horse-1",
      batteryLevel: "80",
      isOnline: true,
      lastSignal: new Date(),
      firmwareVersion: "1.2.3",
    };

    const device2: Device = {
      id: "device-2",
      deviceId: "ESP32-002",
      horseId: "horse-2",
      batteryLevel: "12",
      isOnline: true,
      lastSignal: new Date(),
      firmwareVersion: "1.2.3",
    };

    const device3: Device = {
      id: "device-3",
      deviceId: "ESP32-003",
      horseId: "horse-3",
      batteryLevel: "65",
      isOnline: true,
      lastSignal: new Date(),
      firmwareVersion: "1.2.3",
    };

    this.devices.set(device1.id, device1);
    this.devices.set(device2.id, device2);
    this.devices.set(device3.id, device3);

    // Initialize sample locations with historical data
    const now = new Date();
    const locations = [
      // Current locations
      {
        id: "loc-1",
        horseId: "horse-1",
        latitude: "55.7558",
        longitude: "37.6176",
        accuracy: "5",
        batteryLevel: "80",
        timestamp: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
      },
      {
        id: "loc-2", 
        horseId: "horse-2",
        latitude: "55.7528",
        longitude: "37.6156",
        accuracy: "3",
        batteryLevel: "12",
        timestamp: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
      },
      {
        id: "loc-3",
        horseId: "horse-3", 
        latitude: "55.7578",
        longitude: "37.6196",
        accuracy: "4",
        batteryLevel: "65",
        timestamp: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
      },
      // Historical locations - yesterday
      {
        id: "loc-4",
        horseId: "horse-1",
        latitude: "55.7548",
        longitude: "37.6166",
        accuracy: "4",
        batteryLevel: "85",
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: "loc-5",
        horseId: "horse-1",
        latitude: "55.7538",
        longitude: "37.6156",
        accuracy: "3",
        batteryLevel: "82",
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000 - 60 * 60 * 1000), // 1 day 1 hour ago
      },
      {
        id: "loc-6",
        horseId: "horse-2",
        latitude: "55.7518",
        longitude: "37.6146",
        accuracy: "5",
        batteryLevel: "25",
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      // More historical locations - 2 days ago
      {
        id: "loc-7",
        horseId: "horse-3",
        latitude: "55.7588",
        longitude: "37.6206", 
        accuracy: "3",
        batteryLevel: "70",
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ];

    locations.forEach(loc => this.locations.set(loc.id, loc));

    // Initialize sample alerts - removed static geofence alerts as they will be generated dynamically
    const alerts = [
      {
        id: "alert-2",
        horseId: "horse-2",
        type: "low_battery",
        severity: "warning",
        title: "Низкий заряд батареи - Молния",
        description: "15 минут назад • 12% заряда",
        isActive: true,
        createdAt: new Date(),
      },
    ];

    // Add required fields to sample alerts
    const fullAlerts = alerts.map(alert => ({
      ...alert,
      geofenceId: null,
      escalated: false,
      escalatedAt: null,
      pushSent: false
    }));
    fullAlerts.forEach(alert => this.alerts.set(alert.id, alert));

    // Add a test geofence violation alert that's older than 2 minutes for escalation testing
    const oldGeofenceAlert: Alert = {
      id: randomUUID(),
      horseId: 'horse-1',
      type: 'geofence',
      severity: 'warning',
      title: 'Лошадь покинула безопасную зону',
      description: 'Буран покинул геозону "Пастбище Север"',
      isActive: true,
      geofenceId: 'geo-1',
      escalated: false,
      escalatedAt: null,
      pushSent: false,
      // Set creation time to 3 minutes ago to trigger escalation
      createdAt: new Date(Date.now() - 3 * 60 * 1000)
    };
    this.alerts.set(oldGeofenceAlert.id, oldGeofenceAlert);

    // Initialize sample geofences with polygon coordinates
    const geofences = [
      {
        id: "geo-1",
        name: "Пастбище Север",
        description: "Основная зона выпаса",
        // Polygon coordinates as JSON array of [lat, lng] pairs
        coordinates: JSON.stringify([
          [55.7568, 37.6186],
          [55.7548, 37.6206],
          [55.7538, 37.6166],
          [55.7558, 37.6146],
          [55.7568, 37.6186], // Close the polygon
        ]),
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "geo-2",
        name: "Водопой",
        description: "Зона водных ресурсов",
        coordinates: JSON.stringify([
          [55.7538, 37.6166],
          [55.7518, 37.6176],
          [55.7518, 37.6136],
          [55.7538, 37.6146],
          [55.7538, 37.6166], // Close the polygon
        ]),
        isActive: true,
        createdAt: new Date(),
      },
    ];

    geofences.forEach(geo => this.geofences.set(geo.id, geo));
  }

  // Horses
  async getHorses(): Promise<Horse[]> {
    return Array.from(this.horses.values());
  }

  async getHorse(id: string): Promise<Horse | undefined> {
    return this.horses.get(id);
  }

  async createHorse(horse: InsertHorse): Promise<Horse> {
    const id = randomUUID();
    const newHorse: Horse = { 
      ...horse, 
      id, 
      createdAt: new Date(),
      status: horse.status || "active",
      imageUrl: horse.imageUrl ?? null,
      markerColor: horse.markerColor ?? "#22c55e"
    };
    this.horses.set(id, newHorse);
    return newHorse;
  }

  async updateHorse(id: string, horse: Partial<InsertHorse>): Promise<Horse | undefined> {
    const existing = this.horses.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...horse };
    this.horses.set(id, updated);
    return updated;
  }

  async deleteHorse(id: string): Promise<boolean> {
    return this.horses.delete(id);
  }

  // GPS Locations
  async getLocationsByHorse(horseId: string): Promise<GpsLocation[]> {
    return Array.from(this.locations.values()).filter(loc => loc.horseId === horseId);
  }

  async getRecentLocations(limit: number = 50): Promise<GpsLocation[]> {
    return Array.from(this.locations.values())
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, limit);
  }

  async createLocation(location: InsertGpsLocation): Promise<GpsLocation> {
    const id = randomUUID();
    const newLocation: GpsLocation = { 
      ...location, 
      id, 
      timestamp: new Date(),
      accuracy: location.accuracy ?? null,
      batteryLevel: location.batteryLevel ?? null
    };
    this.locations.set(id, newLocation);
    
    // Check for geofence violations
    await this.checkGeofenceViolations(
      location.horseId, 
      parseFloat(location.latitude), 
      parseFloat(location.longitude)
    );
    
    return newLocation;
  }

  async checkGeofenceViolations(horseId: string, latitude: number, longitude: number): Promise<void> {
    const horse = await this.getHorse(horseId);
    if (!horse) return;

    const geofences = await this.getGeofences();
    const activeGeofences = geofences.filter(g => g.isActive);
    
    // Check if horse is inside any safe zone
    let isInSafeZone = false;
    
    for (const geofence of activeGeofences) {
      try {
        let coordinates: [number, number][];
        if (typeof geofence.coordinates === 'string') {
          coordinates = JSON.parse(geofence.coordinates);
        } else {
          coordinates = geofence.coordinates as [number, number][];
        }
        
        if (this.isPointInPolygon(latitude, longitude, coordinates)) {
          isInSafeZone = true;
          break;
        }
      } catch (error) {
        console.error('Error parsing geofence coordinates:', error, geofence.coordinates);
      }
    }

    // Check existing alerts for this horse
    const existingAlerts = Array.from(this.alerts.values()).filter(
      alert => alert.horseId === horseId && alert.isActive
    );

    const hasGeofenceAlert = existingAlerts.some(alert => alert.type === 'geofence');

    // Create or dismiss alerts based on current status
    if (!isInSafeZone && !hasGeofenceAlert) {
      // Horse is outside safe zone and no alert exists - create alert
      await this.createAlert({
        horseId: horseId,
        type: 'geofence',
        severity: 'warning', // Start with warning, will escalate to urgent after 2 minutes
        title: `${horse.name} покинул безопасную зону`,
        description: `Только что • За пределами геозон`,
        isActive: true,
        geofenceId: null, // Will be set to specific geofence if needed
        escalated: false,
        escalatedAt: null,
        pushSent: false,
      });
    } else if (isInSafeZone && hasGeofenceAlert) {
      // Horse is back in safe zone and alert exists - dismiss alert
      for (const alert of existingAlerts) {
        if (alert.type === 'geofence') {
          await this.dismissAlert(alert.id);
        }
      }
    }
  }

  // New method: Check and escalate alerts that have been active for more than 2 minutes
  async escalateOldAlerts(): Promise<Alert[]> {
    const escalatedAlerts: Alert[] = [];
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    for (const alert of Array.from(this.alerts.values())) {
      if (alert.isActive && 
          alert.type === 'geofence' && 
          !alert.escalated && 
          alert.createdAt && 
          alert.createdAt < twoMinutesAgo) {
        
        // Escalate the alert
        const escalatedAlert: Alert = {
          ...alert,
          severity: 'urgent',
          escalated: true,
          escalatedAt: new Date(),
          title: `🚨 КРИТИЧНО: ${alert.title.replace('покинул', 'находится вне зоны более 2 минут')}`,
          description: `Более 2 минут • Требуется немедленное внимание`,
        };
        
        this.alerts.set(alert.id, escalatedAlert);
        escalatedAlerts.push(escalatedAlert);
        
        // Trigger push notification if not sent yet
        if (!escalatedAlert.pushSent) {
          await this.sendPushNotification(escalatedAlert);
          escalatedAlert.pushSent = true;
          this.alerts.set(alert.id, escalatedAlert);
        }
        
        // Trigger WebSocket broadcast for escalation
        process.nextTick(() => {
          (process as any).emit('alertEscalated', escalatedAlert);
        });
      }
    }
    
    return escalatedAlerts;
  }

  // New method: Send push notification (placeholder implementation)
  private async sendPushNotification(alert: Alert): Promise<void> {
    // In a real implementation, this would send actual push notifications
    // For now, we'll just log and trigger a browser notification via WebSocket
    console.log(`🔔 PUSH NOTIFICATION: ${alert.title} - ${alert.description}`);
    
    process.nextTick(() => {
      (process as any).emit('pushNotification', {
        title: alert.title,
        body: alert.description,
        icon: '🐎',
        tag: alert.id,
        requireInteraction: true
      });
    });
  }

  // New method: Get sorted alerts (escalated ones first)
  async getSortedActiveAlerts(): Promise<Alert[]> {
    const alerts = Array.from(this.alerts.values()).filter(alert => alert.isActive);
    
    // Sort by: escalated alerts first, then by creation time (newest first)
    return alerts.sort((a, b) => {
      if (a.escalated && !b.escalated) return -1;
      if (!a.escalated && b.escalated) return 1;
      if (a.createdAt && b.createdAt) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return 0;
    });
  }

  // Alerts
  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.isActive);
  }

  async getAllAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const newAlert: Alert = { 
      ...alert, 
      id, 
      createdAt: new Date(),
      isActive: alert.isActive ?? true,
      geofenceId: alert.geofenceId ?? null,
      escalated: alert.escalated ?? false,
      escalatedAt: alert.escalatedAt ?? null,
      pushSent: alert.pushSent ?? false
    };
    this.alerts.set(id, newAlert);
    
    // Trigger WebSocket broadcast (will be handled in routes.ts)
    process.nextTick(() => {
      (process as any).emit('alertCreated', newAlert);
    });
    
    return newAlert;
  }

  async dismissAlert(id: string): Promise<boolean> {
    const alert = this.alerts.get(id);
    if (!alert) return false;
    
    alert.isActive = false;
    this.alerts.set(id, alert);
    
    // Trigger WebSocket broadcast (will be handled in routes.ts)
    process.nextTick(() => {
      (process as any).emit('alertDismissed', alert);
    });
    
    return true;
  }

  // Geofences
  async getGeofences(): Promise<Geofence[]> {
    return Array.from(this.geofences.values());
  }

  async createGeofence(geofence: InsertGeofence): Promise<Geofence> {
    const id = randomUUID();
    const newGeofence: Geofence = { 
      ...geofence, 
      id, 
      createdAt: new Date(),
      isActive: geofence.isActive ?? true,
      description: geofence.description ?? null
    };
    this.geofences.set(id, newGeofence);
    return newGeofence;
  }

  async updateGeofence(id: string, geofence: Partial<InsertGeofence>): Promise<Geofence | undefined> {
    const existing = this.geofences.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...geofence };
    this.geofences.set(id, updated);
    return updated;
  }

  async deleteGeofence(id: string): Promise<boolean> {
    return this.geofences.delete(id);
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    return Array.from(this.devices.values()).find(device => device.deviceId === deviceId);
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const id = randomUUID();
    const newDevice: Device = { 
      ...device, 
      id,
      horseId: device.horseId ?? null,
      batteryLevel: device.batteryLevel ?? null,
      isOnline: device.isOnline ?? false,
      lastSignal: device.lastSignal ?? null,
      firmwareVersion: device.firmwareVersion ?? null
    };
    this.devices.set(id, newDevice);
    return newDevice;
  }

  async updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device | undefined> {
    const existing = this.devices.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...device };
    this.devices.set(id, updated);
    return updated;
  }

  async deleteDevice(id: string): Promise<boolean> {
    return this.devices.delete(id);
  }
}

export const storage = new MemStorage();
