import { Request, Response, NextFunction } from 'express';

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
      role: 'admin' | 'viewer';
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
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  // Both admin and viewer can access viewer-level content
  if (req.user.role === 'admin' || req.user.role === 'viewer') {
    return next();
  }
  
  res.status(403).json({ error: "Access denied" });
}

// Utility function to check if user can edit (admin only)
export function canEdit(user: Express.User | undefined): boolean {
  return user?.role === 'admin';
}

// Utility function to check if user can view (admin or viewer)
export function canView(user: Express.User | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'viewer';
}

// Check user permissions and return them
export function getUserPermissions(user: Express.User | undefined) {
  return {
    canEdit: canEdit(user),
    canView: canView(user),
    canManageUsers: user?.role === 'admin',
    role: user?.role || 'guest'
  };
}