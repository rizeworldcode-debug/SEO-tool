const jwt = require('jsonwebtoken');
const { decryptCredentials } = require('./encryption');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL SECURITY ERROR: JWT_SECRET environment variable is required and missing!\n' +
      'Please generate a secure key using "node scripts/generateKeys.js" and set it in server/.env'
    );
  }
  return secret;
}

function assertJwtConfigured() {
  getJwtSecret();
}

function generateToken(user) {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      username: user.username,
      role: user.role
    },
    secret,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized: User role not found' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Action requires one of roles [${allowedRoles.join(', ')}], but active role is '${req.user.role}'`
      });
    }

    next();
  };
}

/**
 * Sanitizes or decrypts offPageLogin field based on user role
 * @param {Object} projectDoc 
 * @param {string} role 
 * @returns {Object}
 */
function sanitizeProjectResponse(projectDoc, role) {
  const obj = projectDoc.toObject ? projectDoc.toObject() : { ...projectDoc };

  if (role === 'admin' || role === 'team_leader') {
    // Decrypt offPageLogin if present
    if (obj.offPageLogin) {
      const decrypted = decryptCredentials(obj.offPageLogin);
      obj.offPageLogin = decrypted || { email: '', password: '' };
    } else {
      obj.offPageLogin = { email: '', password: '' };
    }
  } else {
    // Redact for team_member and lower
    obj.offPageLogin = {
      email: '[REDACTED - Admin/TL Only]',
      isProtected: true
    };
  }

  return obj;
}

module.exports = {
  assertJwtConfigured,
  generateToken,
  authenticateToken,
  requireRole,
  sanitizeProjectResponse
};
