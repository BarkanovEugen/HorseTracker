# Overview

A GPS horse tracking application built with React frontend and Express backend. The system provides real-time monitoring of horses through GPS devices, geofencing capabilities, alert management, and battery status tracking. Features include a dashboard with live map visualization, horse management, location history, and settings configuration.

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
- **Relationships**: Foreign key constraints between horses and locations/alerts
- **Migrations**: Drizzle Kit for schema migrations and database management

## Real-time Communication
- **WebSocket Server**: Built into Express server for live location updates
- **Message Types**: location_update, alert_created, connected, error
- **Auto-reconnection**: Client-side reconnection logic with 3-second retry intervals
- **Query Invalidation**: Automatic cache invalidation based on WebSocket messages

## Component Organization
- **Layout Components**: Header with connection status, navigation bar, responsive design
- **Feature Components**: GPS map with horse markers, alert management, battery monitoring
- **UI Components**: Reusable Shadcn/ui components with consistent theming
- **Context Providers**: Theme, WebSocket, and query client contexts

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

## Planned Integrations
- **PostgreSQL Database**: Currently using in-memory storage, ready for PostgreSQL migration
- **Session Management**: connect-pg-simple for PostgreSQL session storage
- **Form Handling**: React Hook Form with Zod resolvers for validation