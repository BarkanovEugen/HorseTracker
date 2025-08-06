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

  private initializeMockData() {
    // Initialize some sample horses
    const horse1: Horse = {
      id: "horse-1",
      name: "Буран",
      breed: "Орловский рысак",
      age: "7",
      deviceId: "ESP32-001",
      imageUrl: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=400",
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

    // Initialize sample locations
    const locations = [
      {
        id: "loc-1",
        horseId: "horse-1",
        latitude: "55.7558",
        longitude: "37.6176",
        accuracy: "5",
        batteryLevel: "80",
        timestamp: new Date(),
      },
      {
        id: "loc-2",
        horseId: "horse-2",
        latitude: "55.7528",
        longitude: "37.6156",
        accuracy: "3",
        batteryLevel: "12",
        timestamp: new Date(),
      },
      {
        id: "loc-3",
        horseId: "horse-3",
        latitude: "55.7578",
        longitude: "37.6196",
        accuracy: "4",
        batteryLevel: "65",
        timestamp: new Date(),
      },
    ];

    locations.forEach(loc => this.locations.set(loc.id, loc));

    // Initialize sample alerts
    const alerts = [
      {
        id: "alert-1",
        horseId: "horse-1",
        type: "geofence_exit",
        severity: "urgent",
        title: "Буран покинул безопасную зону",
        description: "3 минуты назад • Пастбище Север",
        isActive: true,
        createdAt: new Date(),
      },
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

    alerts.forEach(alert => this.alerts.set(alert.id, alert));

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
      imageUrl: horse.imageUrl ?? null
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
    return newLocation;
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
      isActive: alert.isActive ?? true
    };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async dismissAlert(id: string): Promise<boolean> {
    const alert = this.alerts.get(id);
    if (!alert) return false;
    
    alert.isActive = false;
    this.alerts.set(id, alert);
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
      isActive: geofence.isActive ?? true
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
    const newDevice: Device = { ...device, id };
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
