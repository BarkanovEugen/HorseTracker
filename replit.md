# Overview

A GPS horse tracking application built with React frontend and Express backend. The system provides real-time monitoring of horses through GPS devices, polygon-based geofencing capabilities, intelligent alert management with escalation, and battery status tracking. Features include a dashboard with live OpenStreetMap visualization using Leaflet, horse management, location history, and settings configuration. Users can create custom polygon geozones by clicking points directly on the interactive map.

## Recent Updates (August 2025)
- **PostgreSQL Database Integration**: Complete migration from in-memory storage to PostgreSQL with Drizzle ORM
- **ESP32 Device API**: Added `/api/device/data` endpoint for ESP32 devices to send GPS data (POST with id, x, y, battery fields)
- **Automatic Device Registration**: New ESP32 devices are automatically registered on first signal transmission
- **Database Schema**: Full schema with horses, devices, GPS locations, geofences, and alerts tables with proper relationships
- **Real-time Device Processing**: ESP32 data processing with automatic horse assignment and location tracking
- **Intelligent Alert System**: Completed full implementation of smart alert management with automatic escalation after 2 minutes outside geofences
- **Visual Escalation**: Escalated alerts display with red styling, custom red border pulse animation, and priority sorting
- **Auto-Dismissal**: Alerts automatically close when horses return to safe zones using ray-casting polygon detection
- **Push Notifications**: Browser push notifications with permission requests for critical escalated alerts
- **Real-time Updates**: Enhanced WebSocket communication for alert escalation and dismissal events
- **Mobile Optimization**: Comprehensive mobile-first responsive design with touch-friendly interfaces and compact navigation
- **Modern Design Overhaul**: Complete redesign with gradient headers, card-based layouts, improved typography, and no text truncation
- **Responsive Map**: Fixed black map issue on mobile devices with proper container sizing and MapLibre GL initialization fixes
- **Bottom Navigation**: Modern bottom navigation bar for mobile devices replacing header navigation
- **Horse Status Enhancement**: Renamed "Батареи" to "Лошади" with zone status indicators (safe/outside) alongside battery levels
- **Mobile Layout Optimization**: Reorganized layout with horses section positioned directly under map on mobile devices
- **VK ID Authentication**: Modern VK ID integration with OAuth2 flow, user profile management, and session handling
- **Role-Based Access Control**: Complete permissions system with admin/viewer roles, protected API endpoints, conditional UI rendering
- **MapLibre Stability**: Fixed critical map crashes with proper error handling and null checks, suppressed tile loading warnings
- **Development Authentication**: Temporary auth bypass for testing when VK keys not provided, all users have admin access for development
- **Trail Visualization**: Interactive trail viewer modal with MapLibre map showing horse routes with time range selection (1h-24h), distance calculation, and GPS point details
- **Dashboard Trail Display**: 10-minute horse trail display when clicking on horse markers on main map with automatic trail switching between horses
- **Marker Color Fix**: Fixed critical issue where custom horse marker colors were overridden by status colors - now always uses user-selected colors with status indication via border color

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite build system
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS styling
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **Real-time Updates**: WebSocket connection for live GPS location updates and alerts
- **Theme System**: Custom theme provider supporting light/dark modes with system preference detection

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with WebSocket support for real-time features
- **Data Layer**: In-memory storage with interface-based design for easy database migration
- **Validation**: Zod schemas for request/response validation
- **Development**: Hot reload with Vite middleware in development mode

## Database Design
- **Schema**: Drizzle ORM with PostgreSQL dialect configuration
- **Tables**: horses, gps_locations, alerts, geofences, devices
- **Geofences**: Polygon-based zones stored as JSON coordinate arrays
- **Relationships**: Foreign key constraints between horses and locations/alerts
- **Migrations**: Drizzle Kit for schema migrations and database management

## Real-time Communication
- **WebSocket Server**: Built into Express server for live location updates and alert management
- **Message Types**: location_update, alert_created, alert_dismissed, alert_escalated, push_notification, connected, error
- **Auto-reconnection**: Client-side reconnection logic with 3-second retry intervals
- **Query Invalidation**: Automatic cache invalidation based on WebSocket messages
- **Push Notifications**: Browser notifications for escalated alerts with permission handling

## Alert Management System
- **Intelligent Escalation**: Automatic escalation to critical status after 2 minutes outside geofences
- **Visual Indicators**: Red border pulse animation for escalated alerts without size changes
- **Auto-Dismissal**: Ray-casting algorithm detects when horses return to safe zones
- **Priority Sorting**: Escalated alerts appear first in dashboard with timestamp indicators
- **Real-time Updates**: WebSocket broadcasts for all alert state changes

## Component Organization
- **Layout Components**: Mobile-optimized header with compact connection status, responsive navigation with icons, touch-friendly design
- **Feature Components**: GPS map with mobile-friendly controls, compact alert management, optimized battery monitoring
- **UI Components**: Reusable Shadcn/ui components with mobile-responsive sizing and touch targets
- **Context Providers**: Theme, WebSocket, and query client contexts
- **Mobile Features**: Icon-based navigation, stacked layouts on small screens, optimized text sizes, touch-friendly buttons

# External Dependencies

## Core Dependencies
- **@neondatabase/serverless**: Neon serverless PostgreSQL driver
- **drizzle-orm**: Type-safe ORM with PostgreSQL support
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React routing library
- **ws**: WebSocket library for real-time communication
- **zod**: Schema validation for TypeScript
- **date-fns**: Date manipulation utilities

## UI and Styling
- **@radix-ui/***: Headless UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant styling
- **lucide-react**: Icon library
- **embla-carousel-react**: Carousel component

## Development Tools
- **vite**: Build tool and development server
- **typescript**: Type system
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Replit-specific development tooling

## Authentication System
- **VK ID Integration**: Modern VK ID OAuth2 authentication with @vkid/sdk package
- **Backend Routes**: `/auth/vk`, `/auth/vk/callback`, `/auth/logout`, `/api/auth/user`, `/api/auth/vk-config`
- **Frontend Components**: Login page with VK ID button, user profile dropdown in header
- **Session Management**: Passport.js with PostgreSQL session storage using connect-pg-simple
- **User Management**: Automatic user creation/update with VK profile data
- **Authentication Hooks**: `useAuth`, `useAuthGuard`, `useLoginRedirect` for state management
- **Security**: OAuth2 flow with state parameter, secure session management, proper error handling

## Environment Variables
- **VK_CLIENT_ID**: VK application client ID (required for VK authentication)
- **VK_CLIENT_SECRET**: VK application client secret (required for VK authentication)  
- **VK_REDIRECT_URI**: OAuth callback URL (defaults to /auth/vk/callback)
- **SESSION_SECRET**: Session encryption key for secure cookie management
- **DATABASE_URL**: PostgreSQL connection string

## Production Deployment
When deploying to production:
1. Add VK_CLIENT_ID and VK_CLIENT_SECRET to environment variables
2. Set VK_REDIRECT_URI to your production domain callback URL
3. Authentication bypass will automatically disable when VK keys are present
4. All users will need to authenticate through VK ID before accessing the system
5. Default admin user will need to be assigned admin role after first VK login