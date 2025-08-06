import passport from "passport";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// VK ID configuration
interface VKIDConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export const vkidConfig: VKIDConfig = {
  clientId: process.env.VK_CLIENT_ID || '',
  clientSecret: process.env.VK_CLIENT_SECRET || '',
  redirectUri: process.env.VK_REDIRECT_URI || `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/auth/vk/callback`,
  scope: ['email', 'phone']
};

// VK ID OAuth endpoints
export const VK_OAUTH_URL = 'https://id.vk.com/oauth2/auth';
export const VK_TOKEN_URL = 'https://id.vk.com/oauth2/access_token';
export const VK_USER_INFO_URL = 'https://id.vk.com/oauth2/user_info';

// VK ID authentication helper functions
export function getVKAuthURL(state?: string): string {
  const params = new URLSearchParams({
    client_id: vkidConfig.clientId,
    redirect_uri: vkidConfig.redirectUri,
    response_type: 'code',
    scope: vkidConfig.scope.join(' '),
    ...(state && { state })
  });
  
  return `${VK_OAUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<any> {
  const response = await fetch(VK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: vkidConfig.clientId,
      client_secret: vkidConfig.clientSecret,
      redirect_uri: vkidConfig.redirectUri,
      code: code,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getVKUserInfo(accessToken: string): Promise<any> {
  const response = await fetch(VK_USER_INFO_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`User info request failed: ${response.statusText}`);
  }

  return response.json();
}

export async function handleVKCallback(code: string): Promise<User> {
  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);
    
    // Get user information
    const userData = await getVKUserInfo(tokenData.access_token);
    
    const vkId = userData.user.user_id.toString();
    
    // Check if user already exists
    let user = await storage.getUserByVkId(vkId);
    
    if (!user) {
      // Create new user
      user = await storage.createUser({
        vkId: vkId,
        firstName: userData.user.first_name || '',
        lastName: userData.user.last_name || '',
        username: userData.user.first_name + ' ' + userData.user.last_name || `user_${vkId}`,
        photoUrl: userData.user.avatar || null,
        email: userData.user.email || null,
        lastLogin: new Date()
      });
      
      console.log(`✓ New user registered via VK ID: ${user.firstName} ${user.lastName} (${user.vkId})`);
    } else {
      // Update last login
      user = await storage.updateUser(user.id, {
        lastLogin: new Date()
      }) || user;
      
      console.log(`✓ User logged in via VK ID: ${user.firstName} ${user.lastName} (${user.vkId})`);
    }
    
    return user;
  } catch (error) {
    console.error("VK ID authentication error:", error);
    throw error;
  }
}

// Check if VK ID is configured
export const isVKIDConfigured = (): boolean => {
  return !!(vkidConfig.clientId && vkidConfig.clientSecret);
};

if (isVKIDConfigured()) {
  console.log("✓ VK ID authentication configured");
} else {
  console.log("⚠ VK ID authentication disabled - VK_CLIENT_ID and VK_CLIENT_SECRET not provided");
}

// Serialize/deserialize user for sessions
passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done: (err: any, user?: any) => void) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;