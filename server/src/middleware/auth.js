const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, RolePermission } = require('../models');
const { JWT_SECRET, IS_PRODUCTION } = require('../config/env');
const { CACHE_KEYS, getOrCompute } = require('../utils/cache');

function signAuthToken(user, staffVerified = true) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      shareholderId: user.shareholderId || null,
      companyId: user.companyId || 'COMP-NIA-01',
      sessionVersion: user.sessionVersion || 1,
      staffVerified,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function setAuthCookie(res, token) {
  res.cookie('apex_token', token, {
    httpOnly: true,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    secure: IS_PRODUCTION,
    maxAge: 12 * 60 * 60 * 1000 // 12 hours
  });
}

function clearAuthCookie(res) {
  res.clearCookie('apex_token', {
    httpOnly: true,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    secure: IS_PRODUCTION
  });
}

function safeCompare(a, b) {
  const strA = String(a || '');
  const strB = String(b || '');
  if (!strA || !strB || strA.length !== strB.length) return false;
  return crypto.timingSafeEqual(Buffer.from(strA, 'utf8'), Buffer.from(strB, 'utf8'));
}

async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies && req.cookies.apex_token) {
      token = req.cookies.apex_token;
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. Please sign in.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Prevent pre-auth 2FA tokens or unknown token types from being used as full session tokens
    if (decoded.step === 'staff-2fa' || decoded.type === 'pre-auth' || (decoded.type && decoded.type !== 'access')) {
      return res.status(401).json({
        message: 'Multi-factor staff verification is incomplete. Please enter your 6-digit verification code.'
      });
    }

    const user = await getOrCompute(`${CACHE_KEYS.AUTH_USER_PREFIX}${String(decoded.userId)}`, 5000, () =>
      User.findById(decoded.userId)
        .select('_id email fullName role status shareholderId companyId verificationEnabled sessionVersion lastLoginAt')
        .lean()
    );
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists.' });
    }

    if (user.status === 'Suspended' || user.status === 'Inactive') {
      clearAuthCookie(res);
      return res.status(403).json({
        message: `Your account is currently ${user.status.toLowerCase()}. Access and active sessions have been revoked.`
      });
    }

    if ((user.sessionVersion || 1) !== (decoded.sessionVersion || 1)) {
      clearAuthCookie(res);
      return res.status(401).json({
        message: 'Your session was revoked by security policy or administrator action. Please sign in again.'
      });
    }

    if (user.verificationEnabled && decoded.staffVerified !== true) {
      return res.status(403).json({
        message: 'Multi-factor verification required.'
      });
    }

    req.user = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      shareholderId: user.shareholderId || null,
      companyId: user.companyId || 'COMP-NIA-01',
      verificationEnabled: user.verificationEnabled !== false,
      staffVerified: decoded.staffVerified !== false,
      sessionVersion: user.sessionVersion || 1,
      lastLoginAt: user.lastLoginAt || null
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired or invalid token. Please sign in again.' });
  }
}

function requireStaff(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
  const staffRoles = ['Administrator', 'Data officer', 'Approver'];
  if (!staffRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: 'Permission denied. Administrative workspace is restricted to authorised staff roles.'
    });
  }
  next();
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Permission denied. Action requires one of: ${allowedRoles.join(', ')}. Your role is ${req.user.role}.`
      });
    }
    next();
  };
}

/**
 * Checks dynamic role permissions configured in Interface 15 (RolePermission collection)
 */
async function checkRolePermission(role, resourceKey, actionKey) {
  const allPerms = await getOrCompute(CACHE_KEYS.ROLE_PERMISSIONS, 30000, () =>
    RolePermission.find({}).lean()
  );
  const rp = allPerms.find((item) => item.role === role);
  if (!rp || !rp.permissions || !rp.permissions[resourceKey]) {
    return role === 'Administrator';
  }
  const val = rp.permissions[resourceKey][actionKey];
  return val === 'Yes' || val === 'Assigned' || val === 'If assigned' || val === 'Review if assigned';
}

function requirePermission(resourceKey, actionKey) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    const permitted = await checkRolePermission(req.user.role, resourceKey, actionKey);
    if (!permitted) {
      return res.status(403).json({
        message: `Access control: Role "${req.user.role}" does not have "${actionKey}" permission on "${resourceKey}".`
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
  safeCompare,
  authenticate,
  requireStaff,
  requireRoles,
  checkRolePermission,
  requirePermission
};
