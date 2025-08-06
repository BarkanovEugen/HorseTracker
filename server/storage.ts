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
  type InsertDevice,
  type User,
  type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { horses, gpsLocations, alerts, geofences, devices, users } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { telegramService } from "./telegram-bot";

// Global type declarations for development mode
declare global {
  var telegramRecipients: Array<{
    id: string;
    chatId: string;
    name: string;
    createdAt: string;
  }>;
}

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

  // Users
  getUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByVkId(vkId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRole(id: string, role: 'admin' | 'viewer'): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // ESP32 Integration
  processDeviceData(deviceId: string, latitude: number, longitude: number, batteryLevel: number): Promise<{device: Device, location: GpsLocation}>;
}

export class MemStorage {
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

  // ESP32 Integration
  async processDeviceData(deviceId: string, latitude: number, longitude: number, batteryLevel: number): Promise<{device: Device, location: GpsLocation}> {
    // Check if device exists, if not create it
    let device = await this.getDeviceByDeviceId(deviceId);
    
    if (!device) {
      // Auto-register new device
      device = await this.createDevice({
        deviceId: deviceId,
        horseId: null, // Will be assigned later when user creates horse
        batteryLevel: batteryLevel.toString(),
        isOnline: true,
        lastSignal: new Date(),
        firmwareVersion: "1.0.0",
      });
      
      console.log(`✓ Auto-registered new ESP32 device: ${deviceId}`);
    } else {
      // Update existing device status
      device = await this.updateDevice(device.id, {
        batteryLevel: batteryLevel.toString(),
        isOnline: true,
        lastSignal: new Date(),
      }) || device;
    }

    // Create location record
    const location = await this.createLocation({
      horseId: device.horseId || `device-${deviceId}`, // Use device ID as horseId if not assigned to horse
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      batteryLevel: batteryLevel.toString(),
      accuracy: null,
    });

    return { device, location };
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
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

  // Horses
  async getHorses(): Promise<Horse[]> {
    return await db.select().from(horses);
  }

  async getHorse(id: string): Promise<Horse | undefined> {
    const result = await db.select().from(horses).where(eq(horses.id, id));
    return result[0] || undefined;
  }

  async createHorse(horse: InsertHorse): Promise<Horse> {
    const result = await db.insert(horses).values(horse).returning();
    return result[0];
  }

  async updateHorse(id: string, horse: Partial<InsertHorse>): Promise<Horse | undefined> {
    // Get the current horse to check if deviceId is changing
    const currentHorse = await db.select().from(horses).where(eq(horses.id, id)).limit(1);
    if (currentHorse.length === 0) return undefined;
    
    const oldDeviceId = currentHorse[0].deviceId;
    const newDeviceId = horse.deviceId;
    
    // Update the horse record
    const result = await db.update(horses).set(horse).where(eq(horses.id, id)).returning();
    if (!result[0]) return undefined;
    
    // Handle device relationship changes
    if (oldDeviceId !== newDeviceId) {
      // Clear the old device's horse link if it exists
      if (oldDeviceId) {
        await db.update(devices)
          .set({ horseId: null })
          .where(eq(devices.deviceId, oldDeviceId));
      }
      
      // Set the new device's horse link if a new device is assigned
      if (newDeviceId) {
        await db.update(devices)
          .set({ horseId: id })
          .where(eq(devices.deviceId, newDeviceId));
      }
    }
    
    return result[0];
  }

  async deleteHorse(id: string): Promise<boolean> {
    const result = await db.delete(horses).where(eq(horses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // GPS Locations
  async getLocationsByHorse(horseId: string): Promise<GpsLocation[]> {
    return await db.select().from(gpsLocations).where(eq(gpsLocations.horseId, horseId)).orderBy(desc(gpsLocations.timestamp));
  }

  async getRecentLocations(limit: number = 50): Promise<GpsLocation[]> {
    return await db.select().from(gpsLocations).orderBy(desc(gpsLocations.timestamp)).limit(limit);
  }

  async createLocation(location: InsertGpsLocation): Promise<GpsLocation> {
    const result = await db.insert(gpsLocations).values(location).returning();
    const newLocation = result[0];
    
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

    const allGeofences = await this.getGeofences();
    const activeGeofences = allGeofences.filter(g => g.isActive);
    
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
    const existingAlerts = await db.select().from(alerts).where(
      and(eq(alerts.horseId, horseId), eq(alerts.isActive, true))
    );

    const hasGeofenceAlert = existingAlerts.some(alert => alert.type === 'geofence');

    // Create or dismiss alerts based on current status
    if (!isInSafeZone && !hasGeofenceAlert) {
      // Horse is outside safe zone and no alert exists - create alert
      console.log(`⚠️ GEOFENCE ALERT: ${horse.name} покинул безопасную зону`);
      await this.createAlert({
        horseId: horseId,
        type: 'geofence',
        severity: 'warning',
        title: `${horse.name} покинул безопасную зону`,
        description: `Только что • За пределами геозон`,
        isActive: true,
        geofenceId: null,
        escalated: false,
        escalatedAt: null,
        pushSent: false,
      });
    } else if (isInSafeZone && hasGeofenceAlert) {
      // Horse is back in safe zone and alert exists - dismiss alert
      console.log(`✅ GEOFENCE RESOLVED: ${horse.name} вернулся в безопасную зону, закрываем алерт`);
      for (const alert of existingAlerts) {
        if (alert.type === 'geofence') {
          await this.dismissAlert(alert.id);
          console.log(`✅ Закрыт алерт о геозоне для ${horse.name}: ${alert.title}`);
        }
      }
    }
  }

  // Alerts
  async getActiveAlerts(): Promise<Alert[]> {
    const result = await db.select().from(alerts).where(eq(alerts.isActive, true)).orderBy(desc(alerts.createdAt));
    
    // Sort by: escalated alerts first, then by creation time (newest first)
    return result.sort((a, b) => {
      if (a.escalated && !b.escalated) return -1;
      if (!a.escalated && b.escalated) return 1;
      return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
    });
  }

  async getAllAlerts(): Promise<Alert[]> {
    return await db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await db.insert(alerts).values(alert).returning();
    const createdAlert = result[0];
    
    // Notify WebSocket clients about new alert
    console.log(`📤 WebSocket: Alert created - ${createdAlert.id} (${createdAlert.title})`);
    (process as any).emit('alertCreated', createdAlert);
    
    // Send Telegram notifications to users with enabled notifications
    this.sendTelegramAlertNotifications(createdAlert);
    
    return createdAlert;
  }

  async dismissAlert(id: string): Promise<boolean> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    const result = await db.update(alerts).set({ isActive: false }).where(eq(alerts.id, id));
    const success = (result.rowCount ?? 0) > 0;
    
    if (success && alert) {
      // Notify WebSocket clients about alert dismissal
      console.log(`📤 WebSocket: Alert dismissed - ${id}`);
      (process as any).emit('alertDismissed', { ...alert, isActive: false });
      
      // Send Telegram dismissal notifications
      this.sendTelegramAlertDismissedNotifications(alert);
    }
    
    return success;
  }

  // Geofences
  async getGeofences(): Promise<Geofence[]> {
    return await db.select().from(geofences);
  }

  async createGeofence(geofence: InsertGeofence): Promise<Geofence> {
    const result = await db.insert(geofences).values(geofence).returning();
    return result[0];
  }

  async updateGeofence(id: string, geofence: Partial<InsertGeofence>): Promise<Geofence | undefined> {
    const result = await db.update(geofences).set(geofence).where(eq(geofences.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteGeofence(id: string): Promise<boolean> {
    const result = await db.delete(geofences).where(eq(geofences.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices);
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    const result = await db.select().from(devices).where(eq(devices.deviceId, deviceId));
    return result[0] || undefined;
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const result = await db.insert(devices).values(device).returning();
    return result[0];
  }

  async updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device | undefined> {
    const result = await db.update(devices).set(device).where(eq(devices.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteDevice(id: string): Promise<boolean> {
    const result = await db.delete(devices).where(eq(devices.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ESP32 Integration
  async processDeviceData(deviceId: string, latitude: number, longitude: number, batteryLevel: number): Promise<{device: Device, location: GpsLocation}> {
    // Check if device exists, if not create it
    let device = await this.getDeviceByDeviceId(deviceId);
    
    if (!device) {
      // Auto-register new device
      device = await this.createDevice({
        deviceId: deviceId,
        horseId: null, // Will be assigned later when user creates horse
        batteryLevel: batteryLevel.toString(),
        isOnline: true,
        lastSignal: new Date(),
        firmwareVersion: "1.0.0",
      });
      
      console.log(`✓ Auto-registered new ESP32 device: ${deviceId}`);
    } else {
      // Update existing device status
      device = await this.updateDevice(device.id, {
        batteryLevel: batteryLevel.toString(),
        isOnline: true,
        lastSignal: new Date(),
      }) || device;
    }

    // Create location record
    const location = await this.createLocation({
      horseId: device.horseId!, // Use device ID as horseId if not assigned to horse
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      batteryLevel: batteryLevel.toString(),
      accuracy: null,
    });

    return { device, location };
  }

  // New method: Check and escalate alerts that have been active for more than 2 minutes
  async escalateOldAlerts(): Promise<Alert[]> {
    const escalatedAlerts: Alert[] = [];
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    const oldAlerts = await db.select().from(alerts).where(
      and(
        eq(alerts.isActive, true),
        eq(alerts.type, 'geofence'),
        eq(alerts.escalated, false)
      )
    );

    for (const alert of oldAlerts) {
      if (alert.createdAt && alert.createdAt < twoMinutesAgo) {
        // Escalate the alert
        const escalatedAlert: Alert = {
          ...alert,
          severity: 'urgent',
          escalated: true,
          escalatedAt: new Date(),
          title: `🚨 КРИТИЧНО: ${alert.title.replace('покинул', 'находится вне зоны более 2 минут')}`,
          description: `Более 2 минут • Требуется немедленное внимание`,
        };
        
        await db.update(alerts).set(escalatedAlert).where(eq(alerts.id, alert.id));
        escalatedAlerts.push(escalatedAlert);
        
        console.log(`🔔 PUSH NOTIFICATION: ${escalatedAlert.title} - ${escalatedAlert.description}`);
      }
    }
    
    return escalatedAlerts;
  }

  // Check for device connectivity issues
  async checkDeviceConnectivity(): Promise<void> {
    console.log('🔍 STARTING device connectivity check...');
    
    try {
      const devices = await this.getDevices();
      const currentTime = new Date();
      
      console.log(`🔍 Checking connectivity for ${devices.length} devices at ${currentTime.toISOString()}...`);
    
    for (const device of devices) {
      console.log(`📱 Checking device ${device.deviceId}: horseId=${device.horseId}, lastSignal=${device.lastSignal}, battery=${device.batteryLevel}%`);
      
      if (!device.horseId || !device.lastSignal) {
        console.log(`⏭️ Skipping device ${device.deviceId}: no horse assigned or no signal recorded`);
        continue;
      }
      
      const lastSignalTime = new Date(device.lastSignal);
      const minutesSinceLastSignal = (currentTime.getTime() - lastSignalTime.getTime()) / (1000 * 60);
      
      console.log(`⏰ Device ${device.deviceId}: ${Math.round(minutesSinceLastSignal)} minutes since last signal`);
      
      // Check if device is offline for more than 10 minutes and had sufficient battery
      if (minutesSinceLastSignal > 10 && device.batteryLevel && parseFloat(device.batteryLevel) > 20) {
        console.log(`⚠️ Device ${device.deviceId} qualifies for offline alert: ${Math.round(minutesSinceLastSignal)} min offline, ${device.batteryLevel}% battery`);
        const horse = await this.getHorse(device.horseId);
        if (!horse) continue;
        
        // Check if device_offline alert already exists for this horse
        const existingAlerts = await db.select().from(alerts).where(
          and(
            eq(alerts.horseId, device.horseId),
            eq(alerts.type, 'device_offline'),
            eq(alerts.isActive, true)
          )
        );
        
        // Create alert if none exists
        if (existingAlerts.length === 0) {
          await this.createAlert({
            horseId: device.horseId,
            type: 'device_offline',
            severity: 'urgent',
            title: `Потеряна связь с ${horse.name}`,
            description: `Устройство ${device.deviceId} не отвечает ${Math.round(minutesSinceLastSignal)} мин • Батарея была ${device.batteryLevel}%`,
            isActive: true,
            geofenceId: null,
            escalated: true, // Device offline is immediately escalated
            escalatedAt: currentTime,
            pushSent: false,
          });
          
          console.log(`🚨 DEVICE OFFLINE ALERT: ${horse.name} (${device.deviceId}) - ${Math.round(minutesSinceLastSignal)} minutes offline`);
        }
      }
      
      // Dismiss device_offline alerts if device is back online (sent signal in last 5 minutes)
      if (minutesSinceLastSignal <= 5) {
        const existingAlerts = await db.select().from(alerts).where(
          and(
            eq(alerts.horseId, device.horseId),
            eq(alerts.type, 'device_offline'),
            eq(alerts.isActive, true)
          )
        );
        
        for (const alert of existingAlerts) {
          await this.dismissAlert(alert.id);
          console.log(`✅ Device back online: Dismissed offline alert for ${device.deviceId}`);
        }
      }
    }
    
    console.log('✅ Device connectivity check completed');
    } catch (error) {
      console.error('❌ Error during device connectivity check:', error);
      throw error;
    }
  }

  // New method: Get sorted alerts (escalated ones first) - alias for getActiveAlerts
  async getSortedActiveAlerts(): Promise<Alert[]> {
    return this.getActiveAlerts();
  }

  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByVkId(vkId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.vkId, vkId));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updatedUser || undefined;
  }

  async updateUserRole(id: string, role: 'admin' | 'viewer'): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set({ role }).where(eq(users.id, id)).returning();
    return updatedUser || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Telegram notification methods
  private async sendTelegramAlertNotifications(alert: Alert): Promise<void> {
    if (!telegramService.isEnabled()) {
      return;
    }

    try {
      // Check for development Telegram recipients first
      const telegramRecipients = global.telegramRecipients || [];
      
      if (telegramRecipients.length > 0) {
        console.log(`📱 Sending Telegram notification to ${telegramRecipients.length} recipients`);
        
        // Get the horse for the alert
        const [horse] = await db.select().from(horses).where(eq(horses.id, alert.horseId));
        if (!horse) {
          console.log('❌ Horse not found for alert:', alert.id);
          return;
        }
        
        // Send to all recipients
        for (const recipient of telegramRecipients) {
          try {
            if (alert.type === 'device_offline') {
              await telegramService.sendDeviceOfflineNotification(recipient.chatId, alert, horse);
            } else {
              await telegramService.sendAlertNotification(recipient.chatId, alert, horse);
            }
            console.log(`📤 Telegram уведомление отправлено ${recipient.name} (${recipient.chatId})`);
          } catch (error) {
            console.error(`❌ Failed to send Telegram notification to ${recipient.name}:`, error);
          }
        }
        return;
      }

      // Fallback to database users in production
      const telegramUsers = await db.select().from(users).where(
        and(
          eq(users.telegramNotifications, true),
          eq(users.isActive, true)
        )
      );

      if (telegramUsers.length === 0) {
        console.log('📱 No users with enabled Telegram notifications');
        return;
      }

      // Get the horse for the alert
      const [horse] = await db.select().from(horses).where(eq(horses.id, alert.horseId));
      if (!horse) {
        console.log('❌ Horse not found for alert:', alert.id);
        return;
      }

      // Send notification to each user
      for (const user of telegramUsers) {
        if (user.telegramChatId) {
          try {
            if (alert.type === 'device_offline') {
              await telegramService.sendDeviceOfflineNotification(user.telegramChatId, alert, horse);
            } else {
              await telegramService.sendAlertNotification(user.telegramChatId, alert, horse);
            }
          } catch (error) {
            console.error(`❌ Failed to send Telegram notification to ${user.firstName}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sending Telegram alert notifications:', error);
    }
  }

  private async sendTelegramAlertDismissedNotifications(alert: Alert): Promise<void> {
    if (!telegramService.isEnabled()) {
      return;
    }

    try {
      // Only send dismissal notifications for geofence alerts
      if (alert.type !== 'geofence') {
        return;
      }

      // Check for development Telegram recipients first
      const telegramRecipients = global.telegramRecipients || [];
      
      if (telegramRecipients.length > 0) {
        console.log(`📱 Sending Telegram dismissal notification to ${telegramRecipients.length} recipients`);
        
        // Get the horse for the alert
        const [horse] = await db.select().from(horses).where(eq(horses.id, alert.horseId));
        if (!horse) {
          return;
        }
        
        // Send dismissal notification to all recipients
        for (const recipient of telegramRecipients) {
          try {
            await telegramService.sendAlertResolved(recipient.chatId, alert, horse);
            console.log(`📤 Telegram уведомление о закрытии отправлено ${recipient.name} (${recipient.chatId})`);
          } catch (error) {
            console.error(`❌ Failed to send Telegram dismissal notification to ${recipient.name}:`, error);
          }
        }
        return;
      }

      // Fallback to database users in production
      const telegramUsers = await db.select().from(users).where(
        and(
          eq(users.telegramNotifications, true),
          eq(users.isActive, true)
        )
      );

      if (telegramUsers.length === 0) {
        return;
      }

      // Get the horse for the alert
      const [horse] = await db.select().from(horses).where(eq(horses.id, alert.horseId));
      if (!horse) {
        return;
      }

      // Send dismissal notification to each user
      for (const user of telegramUsers) {
        if (user.telegramChatId) {
          try {
            await telegramService.sendAlertResolved(user.telegramChatId, alert, horse);
          } catch (error) {
            console.error(`❌ Failed to send Telegram dismissal notification to ${user.firstName}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sending Telegram alert dismissal notifications:', error);
    }
  }
}

// Initialize database with sample data
async function initializeDatabase() {
  try {
    // Check if data already exists
    const existingHorses = await db.select().from(horses).limit(1);
    if (existingHorses.length > 0) {
      console.log("Database already initialized");
      return;
    }

    console.log("Initializing database with sample data...");

    // Create sample horses
    const sampleHorses = [
      {
        name: "Буран",
        breed: "Орловский рысак", 
        age: "7",
        deviceId: "ESP32-001",
        markerColor: "#22c55e",
        status: "active"
      },
      {
        name: "Молния",
        breed: "Арабская",
        age: "5", 
        deviceId: "ESP32-002",
        markerColor: "#3b82f6",
        status: "warning"
      },
      {
        name: "Звездочка",
        breed: "Фризская",
        age: "9",
        deviceId: "ESP32-003", 
        markerColor: "#8b5cf6",
        status: "active"
      }
    ];

    const createdHorses = await db.insert(horses).values(sampleHorses).returning();
    console.log(`✓ Created ${createdHorses.length} horses`);

    // Create sample geofences
    const sampleGeofences = [
      {
        name: "Пастбище Север",
        description: "Основная зона выпаса",
        coordinates: JSON.stringify([
          [55.7568, 37.6186],
          [55.7548, 37.6206],
          [55.7538, 37.6166],
          [55.7558, 37.6146],
          [55.7568, 37.6186]
        ]),
        isActive: true
      },
      {
        name: "Водопой",
        description: "Зона водных ресурсов",
        coordinates: JSON.stringify([
          [55.7538, 37.6166],
          [55.7518, 37.6176],
          [55.7518, 37.6136],
          [55.7538, 37.6146],
          [55.7538, 37.6166]
        ]),
        isActive: true
      }
    ];

    const createdGeofences = await db.insert(geofences).values(sampleGeofences).returning();
    console.log(`✓ Created ${createdGeofences.length} geofences`);

    // Create sample devices
    const sampleDevices = [
      {
        deviceId: "ESP32-001",
        horseId: createdHorses[0].id,
        batteryLevel: "80",
        isOnline: true,
        firmwareVersion: "1.2.3"
      },
      {
        deviceId: "ESP32-002", 
        horseId: createdHorses[1].id,
        batteryLevel: "12",
        isOnline: true,
        firmwareVersion: "1.2.3"
      },
      {
        deviceId: "ESP32-003",
        horseId: createdHorses[2].id,
        batteryLevel: "65", 
        isOnline: true,
        firmwareVersion: "1.2.3"
      }
    ];

    const createdDevices = await db.insert(devices).values(sampleDevices).returning();
    console.log(`✓ Created ${createdDevices.length} devices`);

    // Create sample locations
    const now = new Date();
    const sampleLocations = [
      {
        horseId: createdHorses[0].id,
        latitude: "55.7558",
        longitude: "37.6176",
        batteryLevel: "80",
        timestamp: new Date(now.getTime() - 5 * 60 * 1000)
      },
      {
        horseId: createdHorses[1].id,
        latitude: "55.7528", 
        longitude: "37.6156",
        batteryLevel: "12",
        timestamp: new Date(now.getTime() - 10 * 60 * 1000)
      },
      {
        horseId: createdHorses[2].id,
        latitude: "55.7578",
        longitude: "37.6196", 
        batteryLevel: "65",
        timestamp: new Date(now.getTime() - 2 * 60 * 1000)
      }
    ];

    const createdLocations = await db.insert(gpsLocations).values(sampleLocations).returning();
    console.log(`✓ Created ${createdLocations.length} locations`);

    console.log("✅ Database initialization completed!");

  } catch (error) {
    console.error("❌ Error initializing database:", error);
  }
}

export const storage = new DatabaseStorage();

// Initialize database on startup
initializeDatabase();
