import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const horses = pgTable("horses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  breed: text("breed").notNull(),
  age: numeric("age").notNull(),
  deviceId: text("device_id").notNull().unique(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("active"), // active, warning, offline
  createdAt: timestamp("created_at").defaultNow(),
});

export const gpsLocations = pgTable("gps_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  horseId: varchar("horse_id").notNull().references(() => horses.id),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  accuracy: numeric("accuracy"),
  batteryLevel: numeric("battery_level"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  horseId: varchar("horse_id").notNull().references(() => horses.id),
  type: text("type").notNull(), // geofence_exit, low_battery, device_offline
  severity: text("severity").notNull(), // urgent, warning, info
  title: text("title").notNull(),
  description: text("description").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const geofences = pgTable("geofences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  // Polygon coordinates stored as JSON array of [lat, lng] pairs
  coordinates: text("coordinates").notNull(), // JSON string of [[lat, lng], [lat, lng], ...]
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: text("device_id").notNull().unique(),
  horseId: varchar("horse_id").references(() => horses.id),
  batteryLevel: numeric("battery_level"),
  isOnline: boolean("is_online").notNull().default(false),
  lastSignal: timestamp("last_signal"),
  firmwareVersion: text("firmware_version"),
});

// Insert schemas
export const insertHorseSchema = createInsertSchema(horses).omit({
  id: true,
  createdAt: true,
});

export const insertGpsLocationSchema = createInsertSchema(gpsLocations).omit({
  id: true,
  timestamp: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export const insertGeofenceSchema = createInsertSchema(geofences).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
});

// Types
export type Horse = typeof horses.$inferSelect;
export type InsertHorse = z.infer<typeof insertHorseSchema>;

export type GpsLocation = typeof gpsLocations.$inferSelect;
export type InsertGpsLocation = z.infer<typeof insertGpsLocationSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type Geofence = typeof geofences.$inferSelect;
export type InsertGeofence = z.infer<typeof insertGeofenceSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
