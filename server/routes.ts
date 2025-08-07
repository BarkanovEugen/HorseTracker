import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import passport from "./auth";
import { storage } from "./storage";
import { insertHorseSchema, insertAlertSchema, insertGeofenceSchema, insertDeviceSchema, insertGpsLocationSchema, insertLessonSchema, apiLessonSchema, insertInstructorSchema } from "@shared/schema";
import { z } from "zod";
import type { User } from "@shared/schema";

// Import authentication middleware
import { requireAuth, requireAdmin, requireViewer, requireInstructor, getUserPermissions } from "./middleware/auth";

// Global type declarations for development mode
declare global {
  var telegramRecipients: Array<{
    id: string;
    chatId: string;
    name: string;
    createdAt: string;
  }>;
  var devUserTelegramNotifications: boolean;
  var devUserTelegramChatId: string | null;
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

  // Auth user endpoint moved to end of file

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

  // User permissions endpoint
  // Auth permissions endpoint moved to end of file

  // Admin only: User management
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });



  // Horses API - View access for all authenticated users
  app.get("/api/horses", requireViewer, async (req, res) => {
    try {
      const horses = await storage.getHorses();
      res.json(horses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch horses" });
    }
  });

  app.get("/api/horses/:id", requireViewer, async (req, res) => {
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

  // Admin only: Horse management
  app.post("/api/horses", requireAdmin, async (req, res) => {
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

  app.put("/api/horses/:id", requireAdmin, async (req, res) => {
    try {
      console.log(`Updating horse ${req.params.id} with data:`, req.body);
      const validatedData = insertHorseSchema.partial().parse(req.body);
      console.log(`Validated data:`, validatedData);
      const horse = await storage.updateHorse(req.params.id, validatedData);
      if (!horse) {
        return res.status(404).json({ message: "Horse not found" });
      }
      console.log(`Updated horse result:`, horse);
      res.json(horse);
    } catch (error) {
      console.error(`Error updating horse ${req.params.id}:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid horse data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update horse" });
    }
  });

  app.delete("/api/horses/:id", requireAdmin, async (req, res) => {
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

  // Alerts API - View access for all authenticated users
  app.get("/api/alerts", requireViewer, async (req, res) => {
    try {
      // Check and escalate old alerts before returning
      await storage.escalateOldAlerts();
      const alerts = await storage.getSortedActiveAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  // Admin only: Alert management
  app.post("/api/alerts/:id/dismiss", requireAdmin, async (req, res) => {
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

  // Locations API - View access for all authenticated users
  app.get("/api/locations", requireViewer, async (req, res) => {
    try {
      const locations = await storage.getRecentLocations(100);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get("/api/horses/:id/locations", requireViewer, async (req, res) => {
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

  // Geofences API - View access for all authenticated users
  app.get("/api/geofences", requireViewer, async (req, res) => {
    try {
      const geofences = await storage.getGeofences();
      res.json(geofences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch geofences" });
    }
  });

  // Admin only: Geofence management
  app.post("/api/geofences", requireAdmin, async (req, res) => {
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

  app.delete("/api/geofences/:id", requireAdmin, async (req, res) => {
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

  // Devices API - View access for all authenticated users
  app.get("/api/devices", requireViewer, async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  // Admin only: Device management
  app.post("/api/devices", requireAdmin, async (req, res) => {
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

  app.delete("/api/devices/:id", requireAdmin, async (req, res) => {
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

  // Settings API endpoints
  app.get("/api/settings", requireViewer, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.get("/api/settings/:key", requireViewer, async (req, res) => {
    try {
      const value = await storage.getSetting(req.params.key);
      if (value === null) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json({ key: req.params.key, value });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.put("/api/settings/:key", requireAdmin, async (req, res) => {
    try {
      const { value, description, type } = req.body;
      if (!value) {
        return res.status(400).json({ message: "Value is required" });
      }
      
      const setting = await storage.setSetting(req.params.key, value, description, type);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Lessons API endpoints
  app.get("/api/lessons", requireViewer, async (req, res) => {
    try {
      const lessons = await storage.getLessons();
      res.json(lessons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.get("/api/lessons/:id", requireViewer, async (req, res) => {
    try {
      const lesson = await storage.getLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lesson" });
    }
  });

  app.post("/api/lessons", requireInstructor, async (req, res) => {
    try {
      const validation = apiLessonSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid lesson data",
          errors: validation.error.errors 
        });
      }

      const lesson = await storage.createLesson(validation.data);
      res.status(201).json(lesson);
    } catch (error) {
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  app.put("/api/lessons/:id", requireInstructor, async (req, res) => {
    try {
      const validation = apiLessonSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid lesson data",
          errors: validation.error.errors 
        });
      }

      const lesson = await storage.updateLesson(req.params.id, validation.data);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      res.status(500).json({ message: "Failed to update lesson" });
    }
  });

  app.delete("/api/lessons/:id", requireInstructor, async (req, res) => {
    try {
      const success = await storage.deleteLesson(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });

  // Additional lesson endpoints for date range and horse queries
  app.get("/api/lessons/range/:startDate/:endDate", requireViewer, async (req, res) => {
    try {
      const { startDate, endDate } = req.params;
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const lessons = await storage.getLessonsByDateRange(start, end);
      res.json(lessons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lessons by date range" });
    }
  });

  app.get("/api/lessons/horse/:horseId", requireViewer, async (req, res) => {
    try {
      const lessons = await storage.getLessonsByHorse(req.params.horseId);
      res.json(lessons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lessons for horse" });
    }
  });

  // Instructors API endpoints
  app.get("/api/instructors", requireViewer, async (req, res) => {
    try {
      const instructors = await storage.getInstructors();
      res.json(instructors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch instructors" });
    }
  });

  app.get("/api/instructors/:id", requireViewer, async (req, res) => {
    try {
      const instructor = await storage.getInstructor(req.params.id);
      if (!instructor) {
        return res.status(404).json({ message: "Instructor not found" });
      }
      res.json(instructor);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch instructor" });
    }
  });

  app.post("/api/instructors", requireAdmin, async (req, res) => {
    try {
      const validation = insertInstructorSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid instructor data",
          errors: validation.error.errors 
        });
      }

      const instructor = await storage.createInstructor(validation.data);
      res.status(201).json(instructor);
    } catch (error) {
      res.status(500).json({ message: "Failed to create instructor" });
    }
  });

  app.put("/api/instructors/:id", requireAdmin, async (req, res) => {
    try {
      const validation = insertInstructorSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid instructor data",
          errors: validation.error.errors 
        });
      }

      const instructor = await storage.updateInstructor(req.params.id, validation.data);
      if (!instructor) {
        return res.status(404).json({ message: "Instructor not found" });
      }
      res.json(instructor);
    } catch (error) {
      res.status(500).json({ message: "Failed to update instructor" });
    }
  });

  app.delete("/api/instructors/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteInstructor(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Instructor not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete instructor" });
    }
  });

  app.get("/api/instructors/:id/stats", requireViewer, async (req, res) => {
    try {
      const stats = await storage.getInstructorStats(req.params.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch instructor stats" });
    }
  });

  // Device monitoring API - Admin only
  app.post("/api/alerts/check-devices", requireAdmin, async (req, res) => {
    try {
      await storage.checkDeviceConnectivity();
      res.json({ success: true, message: "Device connectivity check completed" });
    } catch (error) {
      console.error('Device connectivity check failed:', error);
      res.status(500).json({ message: "Failed to check device connectivity" });
    }
  });

  // Test geofence alert API - Admin only (for testing auto-dismissal)
  app.post("/api/alerts/test-geofence/:horseId", requireAdmin, async (req, res) => {
    try {
      const { horseId } = req.params;
      const horse = await storage.getHorse(horseId);
      
      if (!horse) {
        return res.status(404).json({ message: "Horse not found" });
      }
      
      // Create a test geofence alert
      const alert = await storage.createAlert({
        horseId: horseId,
        type: 'geofence',
        severity: 'warning',
        title: `${horse.name} покинул безопасную зону (ТЕСТ)`,
        description: `Тестовый алерт • Переместите лошадь в геозону для автозакрытия`,
        isActive: true,
        geofenceId: null,
        escalated: false,
        escalatedAt: null,
        pushSent: false,
      });
      
      console.log(`🧪 TEST: Создан тестовый геозонный алерт для ${horse.name}`);
      res.json({ success: true, alert, message: "Test geofence alert created" });
    } catch (error) {
      console.error('Failed to create test geofence alert:', error);
      res.status(500).json({ message: "Failed to create test alert" });
    }
  });

  // User management API - Admin only
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/users/:userId/role", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'instructor', 'viewer'].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'admin', 'instructor', or 'viewer'" });
      }
      
      const updatedUser = await storage.updateUserRole(userId, role);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Initialize Telegram recipients list in memory
  if (!global.telegramRecipients) {
    global.telegramRecipients = [];
  }

  // Get Telegram recipients list
  app.get("/api/telegram/recipients", (req, res) => {
    console.log('🔓 Development mode: bypassing authentication for Telegram recipients');
    res.json(global.telegramRecipients || []);
  });

  // Add Telegram recipient
  app.post("/api/telegram/recipients", (req, res) => {
    console.log('🔓 Development mode: bypassing authentication for adding Telegram recipient');
    
    const { chatId, name } = req.body;
    
    if (!chatId || !name) {
      return res.status(400).json({ error: "Chat ID and name are required" });
    }

    try {
      const newRecipient = {
        id: Date.now().toString(),
        chatId: chatId.trim(),
        name: name.trim(),
        createdAt: new Date().toISOString()
      };

      // Check if chat ID already exists
      const existingRecipient = global.telegramRecipients.find(r => r.chatId === newRecipient.chatId);
      if (existingRecipient) {
        return res.status(400).json({ error: "This chat ID is already added" });
      }

      global.telegramRecipients.push(newRecipient);
      console.log('📱 Added Telegram recipient:', newRecipient);
      res.json(newRecipient);
    } catch (error) {
      console.error("Error adding Telegram recipient:", error);
      res.status(500).json({ error: "Failed to add Telegram recipient" });
    }
  });

  // Remove Telegram recipient
  app.delete("/api/telegram/recipients/:id", (req, res) => {
    console.log('🔓 Development mode: bypassing authentication for removing Telegram recipient');
    
    const { id } = req.params;
    
    try {
      const initialLength = global.telegramRecipients.length;
      global.telegramRecipients = global.telegramRecipients.filter(r => r.id !== id);
      
      if (global.telegramRecipients.length < initialLength) {
        console.log('📱 Removed Telegram recipient:', id);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Recipient not found" });
      }
    } catch (error) {
      console.error("Error removing Telegram recipient:", error);
      res.status(500).json({ error: "Failed to remove Telegram recipient" });
    }
  });

  // Legacy endpoint for backward compatibility
  app.patch("/api/user/telegram", (req, res) => {
    console.log('🔓 Development mode: bypassing authentication for Telegram settings');
    
    const userId = 'dev-user';
    const { telegramChatId, telegramNotifications } = req.body;

    try {
      const updates: any = {};
      
      if (typeof telegramNotifications === 'boolean') {
        updates.telegramNotifications = telegramNotifications;
        global.devUserTelegramNotifications = telegramNotifications;
      }
      
      if (typeof telegramChatId === 'string') {
        updates.telegramChatId = telegramChatId.trim() || null;
        global.devUserTelegramChatId = updates.telegramChatId;
      }
      
      const updatedUser = {
        id: userId,
        role: 'admin',
        firstName: 'Development',
        lastName: 'User',
        isActive: true,
        telegramChatId: global.devUserTelegramChatId || null,
        telegramNotifications: global.devUserTelegramNotifications || false
      };
      
      console.log('📱 Telegram settings updated for dev user:', updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating Telegram settings:", error);
      res.status(500).json({ error: "Failed to update Telegram settings" });
    }
  });

  app.get("/api/telegram/status", (req, res) => {
    // Always bypass authentication in development mode for Telegram status
    console.log('🔓 Development mode: bypassing authentication for Telegram status');
    
    try {
      res.json({
        enabled: process.env.TELEGRAM_BOT_TOKEN ? true : false,
        configured: process.env.TELEGRAM_BOT_TOKEN ? true : false
      });
    } catch (error) {
      console.error("Error checking Telegram status:", error);
      res.status(500).json({ error: "Failed to check Telegram status" });
    }
  });

  // Permissions endpoint for frontend
  app.get("/api/auth/permissions", (req, res) => {
    // Debug environment variables
    console.log('VK_CLIENT_ID:', process.env.VK_CLIENT_ID ? 'SET' : 'NOT_SET');
    console.log('VK_CLIENT_SECRET:', process.env.VK_CLIENT_SECRET ? 'SET' : 'NOT_SET');
    
    // Always bypass in development for now
    console.log('🔓 Development mode: bypassing authentication for permissions');
    return res.json({
      canEdit: true,
      canView: true,
      canManageUsers: true,
      role: 'admin'
    });
    
    // Original logic (commented out for now)
    /*
    const hasVkKeys = process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET && 
                      process.env.VK_CLIENT_ID.trim() !== '' && process.env.VK_CLIENT_SECRET.trim() !== '';
    
    if (!hasVkKeys) {
      console.log('🔓 Development mode: bypassing authentication for permissions');
      return res.json({
        canEdit: true,
        canView: true,
        canManageUsers: true,
        role: 'admin'
      });
    }
    */
    
    // Production code - require authentication
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const user = req.user as any;
      const permissions = {
        canEdit: user.role === 'admin',
        canView: true, // All authenticated users can view
        canManageUsers: user.role === 'admin',
        role: user.role || 'admin'
      };
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // Auth user endpoint for frontend
  app.get("/api/auth/user", (req, res) => {
    // Always bypass in development for now
    console.log('🔓 Development mode: bypassing authentication for user');
    return res.json({ 
      id: 'dev-user', 
      role: 'admin', 
      firstName: 'Development',
      lastName: 'User',
      isActive: true,
      telegramChatId: global.devUserTelegramChatId || null,
      telegramNotifications: global.devUserTelegramNotifications || false
    });
    
    // Original logic (commented out for now)
    /*
    const hasVkKeys = process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET && 
                      process.env.VK_CLIENT_ID.trim() !== '' && process.env.VK_CLIENT_SECRET.trim() !== '';
    
    if (!hasVkKeys) {
      console.log('🔓 Development mode: bypassing authentication for user');
      return res.json({ 
        id: 'dev-user', 
        role: 'admin', 
        firstName: 'Development',
        lastName: 'User',
        isActive: true
      });
    }
    */
    
    if (req.isAuthenticated() && req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
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

    // Alert escalation check - every 30 seconds
    setInterval(async () => {
      try {
        const escalatedAlerts = await storage.escalateOldAlerts();
        if (escalatedAlerts.length > 0) {
          console.log(`🚨 Escalated ${escalatedAlerts.length} alerts`);
          // Broadcast escalated alerts via WebSocket
          for (const alert of escalatedAlerts) {
            broadcast(JSON.stringify({
              type: 'alert_escalated',
              data: alert
            }));
          }
        }
      } catch (error) {
        console.error('❌ Error checking for alert escalation:', error);
      }
    }, 30000); // Every 30 seconds
  }

  return httpServer;
}
