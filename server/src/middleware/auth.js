const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, RolePermission } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'apex_link_nia_group_shareholder_portal_secret_key_2026';

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
  const isProdOrVercel = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  res.cookie('apex_token', token, {
    httpOnly: true,
    sameSite: isProdOrVercel ? 'none' : 'lax',
    secure: isProdOrVercel,
    maxAge: 12 * 60 * 60 * 1000 // 12 hours
  });
}

function clearAuthCookie(res) {
  const isProdOrVercel = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  res.clearCookie('apex_token', {
    httpOnly: true,
    sameSite: isProdOrVercel ? 'none' : 'lax',
    secure: isProdOrVercel
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

    // Prevent pre-auth 2FA tokens from being used as full session tokens (Page 30 & 34)
    if (decoded.step === 'staff-2fa' || decoded.type === 'pre-auth') {
      return res.status(401).json({
        message: 'Multi-factor staff verification is incomplete. Please enter your 6-digit verification code.'
      });
    }

    const user = await User.findById(decoded.userId);
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

    const isStaff = ['Administrator', 'Data officer', 'Approver'].includes(user.role);
    if (isStaff && user.verificationEnabled && decoded.staffVerified !== true) {
      return res.status(403).json({
        message: 'Staff multi-factor verification required.'
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
      sessionVersion: user.sessionVersion || 1
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
  const rp = await RolePermission.findOne({ role });
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
