import { Request, Response, NextFunction } from 'express';

// Development role state (only for testing)
let devUserRole: 'admin' | 'instructor' | 'viewer' = 'admin';

// Function to change dev user role (only for development)
export function setDevUserRole(role: 'admin' | 'instructor' | 'viewer') {
  if (process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET) {
    throw new Error('Role switching is only available in development mode');
  }
  devUserRole = role;
}

export function getDevUserRole() {
  return devUserRole;
}

// Extend Express Request interface to include user with role
declare global {
  namespace Express {
    interface User {
      id: string;
      vkId?: string;
      firstName: string;
      lastName: string;
      username?: string;
      email?: string;
      photoUrl?: string;
      role: 'admin' | 'instructor' | 'viewer';
      isActive: boolean;
      lastLogin?: Date;
      createdAt?: Date;
    }
  }
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

// Middleware to check if user has admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Temporary bypass for development when VK auth is not configured
  if (!process.env.VK_CLIENT_ID || !process.env.VK_CLIENT_SECRET) {
    // Create a mock user for development with current dev role
    req.user = { 
      id: 'dev-user', 
      role: devUserRole, 
      firstName: 'Development',
      lastName: 'User',
      isActive: true
    } as Express.User;
    
    // Check if current dev role has admin access
    if (devUserRole !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    return next();
  }
  
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  next();
}

// Middleware to check if user has admin or viewer role (essentially just authenticated)
export function requireViewer(req: Request, res: Response, next: NextFunction) {
  // Temporary bypass for development when VK auth is not configured
  if (!process.env.VK_CLIENT_ID || !process.env.VK_CLIENT_SECRET) {
    // Create a mock user for development with current dev role
    req.user = { 
      id: 'dev-user', 
      role: devUserRole, 
      firstName: 'Development',
      lastName: 'User',
      isActive: true
    } as Express.User;
    return next();
  }
  
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  // Admin, instructor and viewer can access viewer-level content
  if (req.user.role === 'admin' || req.user.role === 'instructor' || req.user.role === 'viewer') {
    return next();
  }
  
  res.status(403).json({ error: "Access denied" });
}

// Middleware to check if user has instructor or admin role
export function requireInstructor(req: Request, res: Response, next: NextFunction) {
  // Temporary bypass for development when VK auth is not configured
  if (!process.env.VK_CLIENT_ID || !process.env.VK_CLIENT_SECRET) {
    // Create a mock user for development with current dev role
    req.user = { 
      id: 'dev-user', 
      role: devUserRole, 
      firstName: 'Development',
      lastName: 'User',
      isActive: true
    } as Express.User;
    
    // Check if current dev role has instructor+ access
    if (devUserRole !== 'admin' && devUserRole !== 'instructor') {
      return res.status(403).json({ error: "Instructor access required" });
    }
    return next();
  }
  
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
    return res.status(403).json({ error: "Instructor access required" });
  }
  
  next();
}

// Utility function to check if user can edit (admin only)
export function canEdit(user: Express.User | undefined): boolean {
  return user?.role === 'admin';
}

// Utility function to check if user can view (admin, instructor or viewer)
export function canView(user: Express.User | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'viewer';
}

// Utility function to check if user can edit lessons (admin or instructor)
export function canEditLessons(user: Express.User | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'instructor';
}

// Check user permissions and return them
export function getUserPermissions(user: Express.User | undefined) {
  const role = user?.role || 'guest';
  
  switch (role) {
    case 'admin':
      return {
        canEdit: true,
        canView: true,
        canManageUsers: true,
        canManageSettings: true,
        canManageDevices: true,
        canManageGeofences: true,
        canViewFinancialData: true,
        canEditLessons: true,
        canManageHorses: true,
        canManageInstructors: true,
        role
      };
    case 'instructor':
      return {
        canEdit: false, // General edit permission
        canView: true,
        canManageUsers: false,
        canManageSettings: false,
        canManageDevices: false,
        canManageGeofences: false,
        canViewFinancialData: true, // Instructors can see financial data
        canEditLessons: true, // Instructors can edit lessons
        canManageHorses: false, // Can view but not manage horses
        canManageInstructors: false, // Can view instructors list
        role
      };
    case 'viewer':
      return {
        canEdit: false,
        canView: true,
        canManageUsers: false,
        canManageSettings: false,
        canManageDevices: false,
        canManageGeofences: false,
        canViewFinancialData: false, // Viewers cannot see financial data
        canEditLessons: false,
        canManageHorses: false,
        canManageInstructors: false,
        role
      };
    default:
      return {
        canEdit: false,
        canView: false,
        canManageUsers: false,
        canManageSettings: false,
        canManageDevices: false,
        canManageGeofences: false,
        canViewFinancialData: false,
        canEditLessons: false,
        canManageHorses: false,
        canManageInstructors: false,
        role: 'guest'
      };
  }
}

