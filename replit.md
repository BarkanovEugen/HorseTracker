# Overview

A GPS horse tracking application providing real-time monitoring, polygon-based geofencing, intelligent alert management with escalation, and battery status tracking. Key capabilities include a dashboard with live OpenStreetMap visualization, horse management, location history, and custom polygon geozone creation. The system also supports comprehensive lesson booking with calendar management, client and instructor tracking, payment status, and role-based access control. The vision is to offer a robust and user-friendly platform for equine management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS.
- **State Management**: TanStack Query for server state management.
- **Routing**: Wouter for client-side routing.
- **Real-time Updates**: WebSocket connection for live GPS location and alerts.
- **Theme System**: Custom theme provider supporting light/dark modes.
- **Mobile Optimization**: Comprehensive mobile-first responsive design, touch-friendly interfaces, and modern bottom navigation.

## Backend Architecture
- **Runtime**: Node.js with Express.js framework.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API with WebSocket support.
- **Validation**: Zod schemas for request/response validation.

## Database Design
- **ORM**: Drizzle ORM with PostgreSQL.
- **Schema**: Tables for horses, GPS locations, alerts, geofences, devices, and lessons.
- **Geofences**: Polygon-based zones stored as JSON coordinate arrays.
- **Migrations**: Drizzle Kit for schema management.

## Real-time Communication
- **WebSocket Server**: Integrated into Express for live updates.
- **Key Events**: Location updates, alert creation, dismissal, escalation, push notifications.
- **Client-side**: Auto-reconnection logic and automatic cache invalidation.
- **Push Notifications**: Browser notifications for escalated alerts.

## Alert Management System
- **Intelligent Escalation**: Automatic escalation to critical status (e.g., after 2 minutes outside geofences).
- **Visual Indicators**: Red border pulse animation for escalated alerts.
- **Auto-Dismissal**: Ray-casting algorithm detects when horses return to safe zones.
- **Priority Sorting**: Escalated alerts appear first.
- **Real-time Updates**: WebSocket broadcasts for all alert state changes.
- **Device Offline Monitoring**: Alerts for devices offline (configurable duration) with auto-dismissal.
- **Configurable Settings**: User-configurable escalation timing for geofence and device alerts.

## Lesson Booking System
- **Functionality**: Calendar interface for scheduling lessons (various types), client tracking, horse assignment, pricing, and status management.
- **Instructor Management**: CRUD operations for instructors with historical data preservation.
- **Statistics**: Enhanced statistics with flexible period selection for analytics.
- **Payment Tracking**: Status tracking for lessons with indicators and detailed breakdowns.

## Role-Based Access Control
- **Role System**: Three-tier system (Administrator, Instructor, Observer) with granular permissions.
- **UI Rendering**: Conditional interface rendering based on user roles and permissions.
- **Navigation**: Dynamic navigation filtering based on role permissions.
- **Financial Data Security**: Protection system hiding sensitive data from unauthorized roles.

## Authentication System
- **Provider**: VK ID OAuth2 authentication.
- **Backend**: Passport.js with PostgreSQL session storage.
- **User Management**: Automatic user creation/update with VK profile data.

# External Dependencies

## Core Dependencies
- **@neondatabase/serverless**: Neon serverless PostgreSQL driver.
- **drizzle-orm**: Type-safe ORM for PostgreSQL.
- **@tanstack/react-query**: Server state management.
- **wouter**: Lightweight React routing.
- **ws**: WebSocket library.
- **zod**: Schema validation.
- **date-fns**: Date manipulation.

## UI and Styling
- **@radix-ui/***: Headless UI components.
- **tailwindcss**: Utility-first CSS framework.
- **lucide-react**: Icon library.
- **embla-carousel-react**: Carousel component.

## Authentication
- **@vkid/sdk**: VK ID OAuth2 integration.

## Communication
- **Telegram Bot API**: For notifications via `TELEGRAM_BOT_TOKEN`.

## Environment Variables
- **VK_CLIENT_ID**: VK application client ID.
- **VK_CLIENT_SECRET**: VK application client secret.
- **VK_REDIRECT_URI**: OAuth callback URL.
- **SESSION_SECRET**: Session encryption key.
- **DATABASE_URL**: PostgreSQL connection string.
- **TELEGRAM_BOT_TOKEN**: Telegram Bot API token.