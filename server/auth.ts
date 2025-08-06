import passport from "passport";
import { Strategy as VKontakteStrategy } from "passport-vkontakte";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// Configure VK strategy only if credentials are provided
if (process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET) {
  passport.use(new VKontakteStrategy({
      clientID: process.env.VK_CLIENT_ID,
      clientSecret: process.env.VK_CLIENT_SECRET,
      callbackURL: process.env.VK_CALLBACK_URL || "/auth/vkontakte/callback",
      profileFields: ['uid', 'first_name', 'last_name', 'screen_name', 'photo', 'email']
    },
    async (accessToken: string, refreshToken: string, params: any, profile: any, done: any) => {
      try {
        const vkId = profile.id.toString();
        
        // Check if user already exists
        let user = await storage.getUserByVkId(vkId);
        
        if (!user) {
          // Create new user
          user = await storage.createUser({
            vkId: vkId,
            firstName: profile.name.givenName || profile.displayName || '',
            lastName: profile.name.familyName || '',
            username: profile.username || profile.displayName || '',
            photoUrl: profile.photos?.[0]?.value || null,
            email: params.email || null,
            lastLogin: new Date()
          });
          
          console.log(`✓ New user registered via VK: ${user.firstName} ${user.lastName} (${user.vkId})`);
        } else {
          // Update last login
          user = await storage.updateUser(user.id, {
            lastLogin: new Date()
          }) || user;
          
          console.log(`✓ User logged in via VK: ${user.firstName} ${user.lastName} (${user.vkId})`);
        }
        
        return done(null, user);
      } catch (error) {
        console.error("VK authentication error:", error);
        return done(error, null);
      }
    }
  ));
  console.log("✓ VKontakte authentication strategy configured");
} else {
  console.log("⚠ VKontakte authentication disabled - VK_CLIENT_ID and VK_CLIENT_SECRET not provided");
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