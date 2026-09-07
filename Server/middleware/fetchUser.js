import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Ensure dotenv is loaded
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_production_123456';

console.log('🔐 JWT_SECRET loaded in fetchUser middleware:', !!JWT_SECRET);

const fetchUser = (req, res, next) => {
  console.log('FetchUser middleware called for:', req.url);
  console.log('Headers present:', Object.keys(req.headers));

  const token = req.header('auth-token') || req.header('authorization')?.replace('Bearer ', '') || req.header('token');
  console.log('Token received:', token ? 'YES' : 'NO');
  
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ error: "Access denied: No token provided." });
  }

  // Additional check to ensure JWT_SECRET is available
  if (!JWT_SECRET) {
    console.error("❌ JWT_SECRET is undefined during token verification");
    return res.status(500).json({ error: "Server configuration error: JWT_SECRET not found." });
  }

  try {
    console.log('🔍 Verifying token with JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');
    const data = jwt.verify(token, JWT_SECRET);
    console.log("🔍 Decoded token data:", data);
    
    // Handle different token structures with enhanced role handling
    const userId = data.user?.id || data.id;
    let userRole = data.role || data.user?.role || 'single';
    const teamId = data.teamId || data.user?.teamId || null;
    const globalId = data.globalId || data.user?.globalId || null;
    const userName = data.name || data.username || data.user?.name || 'Unknown';
    const userEmail = data.email || data.user?.email || null;

    if (!userId) {
      console.log("❌ No user ID found in token");
      return res.status(401).json({ error: "Invalid token: No user ID found." });
    }

    // Validate and normalize role
    const validRoles = ['single', 'team', 'global', 'superadmin', 'admin'];
    if (!validRoles.includes(userRole)) {
      console.log(`⚠️ Invalid role detected: ${userRole}, defaulting to 'single'`);
      userRole = 'single';
    }

    // Role-specific validations
    if (userRole === 'team' && !teamId) {
      console.log("⚠️ Team role detected but no teamId found, defaulting to 'single'");
      userRole = 'single';
    }

    if (userRole === 'global' && !globalId && !teamId) {
      console.log("⚠️ Global role detected but no globalId/teamId found, setting default globalId");
    }

    // Attach normalized and enhanced user info to request
    req.user = {
      id: userId,
      role: userRole,
      isSuperAdmin: Boolean(data.isSuperAdmin || data.user?.isSuperAdmin || userRole === 'superadmin'),
      teamId: teamId,
      globalId: globalId || (userRole === 'global' ? 'Global123' : null),
      name: userName,
      email: userEmail,
      
      // Additional convenience methods
      isSingle: () => userRole === 'single',
      isTeam: () => userRole === 'team',
      isGlobal: () => userRole === 'global',
      
      // Permission checks
      canAccessTeam: (targetTeamId) => {
        return userRole === 'global' || (userRole === 'team' && teamId === targetTeamId);
      },
      
      canAccessGlobal: () => {
        return userRole === 'global';
      },
      
      canAccessUser: (targetUserId) => {
        return userId === targetUserId || userRole === 'global';
      },
      
      // Scope determination for queries
      getQueryScope: () => {
        switch (userRole) {
          case 'single':
            return { user: userId, scope: 'single' };
          case 'team':
            return { 
              $or: [
                { teamId: teamId, scope: 'team' },
                { user: userId, scope: 'single' }
              ]
            };
          case 'global':
            return {
              $or: [
                { scope: 'global' },
                { globalId: globalId || 'Global123' },
                { user: userId, scope: 'single' }
              ]
            };
          default:
            return { user: userId, scope: 'single' };
        }
      },
      
      // Original data for backward compatibility
      originalData: data
    };

    console.log("✅ User authenticated and enhanced:", {
      id: req.user.id,
      role: req.user.role,
      teamId: req.user.teamId,
      globalId: req.user.globalId,
      name: req.user.name,
      email: req.user.email
    });

    next();
  } catch (error) {
    console.error("❌ JWT verification error:", error);
    
    // Enhanced error handling
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: "Token expired. Please log in again.",
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: "Invalid token format. Please log in again.",
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({ 
        error: "Token not active yet. Please try again later.",
        code: 'TOKEN_NOT_ACTIVE'
      });
    }
    
    return res.status(401).json({ 
      error: "Invalid token. Please log in again.",
      code: 'TOKEN_INVALID'
    });
  }
};

// Enhanced middleware for admin-only routes
export const requireGlobalRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  
  if (req.user.role !== 'global') {
    return res.status(403).json({ 
      error: "Global administrator access required.",
      userRole: req.user.role 
    });
  }
  
  next();
};

// Enhanced middleware for team lead or admin routes
export const requireTeamOrGlobalRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  
  if (!['team', 'global'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: "Team or Global access required.",
      userRole: req.user.role 
    });
  }
  
  next();
};

// Middleware for resource ownership validation
export const requireOwnershipOrAdmin = (resourceUserField = 'user') => {
  return (req, res, next) => {
    // This middleware should be used after fetching the resource
    // The resource should be attached to req.resource
    if (!req.resource) {
      return res.status(500).json({ error: "Resource not found for ownership check." });
    }
    
    const resourceUserId = req.resource[resourceUserField];
    const isOwner = resourceUserId && resourceUserId.toString() === req.user.id;
    const isAdmin = req.user.role === 'global';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        error: "You don't have permission to access this resource.",
        required: "Resource ownership or Global admin role"
      });
    }
    
    next();
  };
};

export default fetchUser;