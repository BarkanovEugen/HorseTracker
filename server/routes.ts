import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import passport from "./auth";
import { storage } from "./storage";
import { insertHorseSchema, insertAlertSchema, insertGeofenceSchema, insertDeviceSchema, insertGpsLocationSchema } from "@shared/schema";
import { z } from "zod";
import type { User } from "@shared/schema";

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // VK ID Authentication routes
  app.get('/auth/vk', (req, res) => {
    const { getVKAuthURL, isVKIDConfigured } = require('./auth');
    
    if (!isVKIDConfigured()) {
      return res.status(400).json({ error: "VK ID not configured" });
    }
    
    const authUrl = getVKAuthURL();
    res.redirect(authUrl);
  });
  
  app.get('/auth/vk/callback', async (req, res) => {
    try {
      const { handleVKCallback } = require('./auth');
      const { code, error } = req.query;
      
      if (error) {
        console.error('VK ID callback error:', error);
        return res.redirect('/login?error=vk_error');
      }
      
      if (!code) {
        return res.redirect('/login?error=no_code');
      }
      
      // Handle VK ID callback and get user
      const user = await handleVKCallback(code as string);
      
      // Log user in through passport session
      req.login(user, (err) => {
        if (err) {
          console.error('Session login error:', err);
          return res.redirect('/login?error=session_error');
        }
        
        // Successful authentication, redirect to dashboard
        res.redirect('/dashboard');
      });
      
    } catch (error) {
      console.error('VK ID authentication error:', error);
      res.redirect('/login?error=auth_failed');
    }
  });

  app.get('/auth/logout', (req, res) => {
    req.logout((err: any) => {
      if (err) { console.error('Logout error:', err); }
      res.redirect('/');
    });
  });

  app.get('/api/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.get('/api/auth/vk-config', (req, res) => {
    const { isVKIDConfigured } = require('./auth');
    res.json({ 
      configured: isVKIDConfigured(),
      available: true 
    });
  });

  // ESP32 Device Data Endpoint
  app.post("/api/device/data", async (req, res) => {
    try {
      const { id: deviceId, x: longitude, y: latitude, battery } = req.body;
      
      // Validate required fields
      if (!deviceId || longitude === undefined || latitude === undefined || battery === undefined) {
        return res.status(400).json({ 
          error: "Missing required fields: id, x (longitude), y (latitude), battery" 
        });
      }

      // Validate data types
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const batteryLevel = parseFloat(battery);

      if (isNaN(lat) || isNaN(lng) || isNaN(batteryLevel)) {
        return res.status(400).json({ 
          error: "Invalid data types: coordinates and battery must be numbers" 
        });
      }

      // Process device data
      const result = await storage.processDeviceData(deviceId, lat, lng, batteryLevel);
      
      console.log(`📡 ESP32 data received: ${deviceId} at [${lat}, ${lng}] battery: ${batteryLevel}%`);

      // Broadcast real-time update via WebSocket
      (req as any).wss?.clients.forEach((client: any) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'device_data',
            data: {
              deviceId,
              location: result.location,
              device: result.device
            }
          }));
        }
      });

      res.json({ 
        success: true, 
        message: "Device data processed",
        device: result.device,
        location: result.location
      });

    } catch (error) {
      console.error("Error processing device data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Horses API
  app.get("/api/horses", async (req, res) => {
    try {
      const horses = await storage.getHorses();
      res.json(horses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch horses" });
    }
  });

  app.get("/api/horses/:id", async (req, res) => {
    try {
      const horse = await storage.getHorse(req.params.id);
      if (!horse) {
        return res.status(404).json({ message: "Horse not found" });
      }
      res.json(horse);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch horse" });
    }
  });

  app.post("/api/horses", async (req, res) => {
    try {
      const validatedData = insertHorseSchema.parse(req.body);
      const horse = await storage.createHorse(validatedData);
      res.status(201).json(horse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid horse data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create horse" });
    }
  });

  app.put("/api/horses/:id", async (req, res) => {
    try {
      const validatedData = insertHorseSchema.partial().parse(req.body);
      const horse = await storage.updateHorse(req.params.id, validatedData);
      if (!horse) {
        return res.status(404).json({ message: "Horse not found" });
      }
      res.json(horse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid horse data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update horse" });
    }
  });

  app.delete("/api/horses/:id", async (req, res) => {
    try {
      const success = await storage.deleteHorse(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Horse not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete horse" });
    }
  });

  // Alerts API
  app.get("/api/alerts", async (req, res) => {
    try {
      // Check and escalate old alerts before returning
      await storage.escalateOldAlerts();
      const alerts = await storage.getSortedActiveAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts/:id/dismiss", async (req, res) => {
    try {
      const success = await storage.dismissAlert(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to dismiss alert" });
    }
  });

  // Locations API
  app.get("/api/locations", async (req, res) => {
    try {
      const locations = await storage.getRecentLocations(100);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get("/api/horses/:id/locations", async (req, res) => {
    try {
      const locations = await storage.getLocationsByHorse(req.params.id);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch horse locations" });
    }
  });

  // ESP32 GPS data endpoint
  app.post("/api/gps", async (req, res) => {
    try {
      const validatedData = insertGpsLocationSchema.parse(req.body);
      const location = await storage.createLocation(validatedData);
      
      // Broadcast to WebSocket clients
      broadcast(JSON.stringify({
        type: 'location_update',
        data: location
      }));
      
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid GPS data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save GPS location" });
    }
  });

  // Geofences API
  app.get("/api/geofences", async (req, res) => {
    try {
      const geofences = await storage.getGeofences();
      res.json(geofences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch geofences" });
    }
  });

  app.post("/api/geofences", async (req, res) => {
    try {
      const validatedData = insertGeofenceSchema.parse(req.body);
      const geofence = await storage.createGeofence(validatedData);
      res.status(201).json(geofence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid geofence data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create geofence" });
    }
  });

  app.delete("/api/geofences/:id", async (req, res) => {
    try {
      const success = await storage.deleteGeofence(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Geofence not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete geofence" });
    }
  });

  // Devices API
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.post("/api/devices", async (req, res) => {
    try {
      console.log("POST /api/devices - Request body:", req.body);
      const validatedData = insertDeviceSchema.parse(req.body);
      console.log("POST /api/devices - Validated data:", validatedData);
      

      
      const device = await storage.createDevice(validatedData);
      console.log("POST /api/devices - Created device:", device);
      res.status(201).json(device);
    } catch (error) {
      console.error("POST /api/devices - Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create device" });
    }
  });

  app.delete("/api/devices/:id", async (req, res) => {
    try {
      const success = await storage.deleteDevice(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connection established'
    }));
  });

  function broadcast(message: string) {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Listen for alert events and broadcast them via WebSocket
  process.on('alertCreated', (alert) => {
    broadcast(JSON.stringify({
      type: 'alert_created',
      data: alert
    }));
  });

  process.on('alertDismissed', (alert) => {
    broadcast(JSON.stringify({
      type: 'alert_dismissed',
      data: alert
    }));
  });

  process.on('alertEscalated', (alert) => {
    broadcast(JSON.stringify({
      type: 'alert_escalated',
      data: alert
    }));
  });

  process.on('pushNotification', (notification) => {
    broadcast(JSON.stringify({
      type: 'push_notification',
      data: notification
    }));
  });

  // Simulate GPS updates for development
  if (process.env.NODE_ENV === 'development') {
    setInterval(async () => {
      const horses = await storage.getHorses();
      for (const horse of horses) {
        // Simulate small GPS movements
        const baseLocation = await storage.getLocationsByHorse(horse.id);
        const lastLocation = baseLocation[baseLocation.length - 1];
        
        if (lastLocation) {
          const newLocation = await storage.createLocation({
            horseId: horse.id,
            latitude: (parseFloat(lastLocation.latitude) + (Math.random() - 0.5) * 0.001).toString(),
            longitude: (parseFloat(lastLocation.longitude) + (Math.random() - 0.5) * 0.001).toString(),
            accuracy: "5",
            batteryLevel: lastLocation.batteryLevel,
            timestamp: new Date(),
          });

          broadcast(JSON.stringify({
            type: 'location_update',
            data: newLocation
          }));
        }
      }
    }, 10000); // Every 10 seconds
  }

  return httpServer;
}
