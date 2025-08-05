import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertHorseSchema, insertAlertSchema, insertGeofenceSchema, insertDeviceSchema, insertGpsLocationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
      const alerts = await storage.getActiveAlerts();
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
