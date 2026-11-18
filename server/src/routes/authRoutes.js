const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { User, Shareholder, RolePermission } = require('../models');
const { ensureCoreSystemConfig, logAuditEvent } = require('../utils/ledgerEngine');
const { IS_PRODUCTION } = require('../config/env');
const {
  CACHE_KEYS,
  del,
  getOrCompute,
  invalidateCompanyCaches,
  invalidateLedgerCaches,
  invalidateAuthUserCache
} = require('../utils/cache');
const {
  isPlainString,
  validatePasswordPolicy,
  sanitizePublicCompanySettings,
  sendSafeError
} = require('../utils/security');
const {
  JWT_SECRET,
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
  safeCompare,
  authenticate
} = require('../middleware/auth');

const router = express.Router();
const BCRYPT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// Short-lived cryptographic HMAC digest cache for verified credentials (prevents CPU event-loop
// saturation from repeated pure-JS bcryptjs comparisons under high concurrent login bursts).
// Never stores plaintext passwords; automatically invalidates if passwordHash changes.
const verifiedPasswordDigests = new Map();
const PASSWORD_DIGEST_TTL_MS = 5 * 60 * 1000;

async function verifyPasswordFast(userId, password, passwordHash) {
  if (!password || !passwordHash) return false;
  const digestKey = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${String(userId)}:${passwordHash}:${password}`)
    .digest('hex');
  const cachedExpiry = verifiedPasswordDigests.get(digestKey);
  if (cachedExpiry && cachedExpiry > Date.now()) {
    return true;
  }
  const isValid = await bcrypt.compare(password, passwordHash);
  if (isValid) {
    if (verifiedPasswordDigests.size >= 1000) {
      const oldestKey = verifiedPasswordDigests.keys().next().value;
      if (oldestKey) verifiedPasswordDigests.delete(oldestKey);
    }
    verifiedPasswordDigests.set(digestKey, Date.now() + PASSWORD_DIGEST_TTL_MS);
  }
  return isValid;
}

// Layered login rate limiting: protects individual accounts while allowing 1,500-3,000 users behind shared corporate/AGM NATs
const perAccountLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const id = String(req.body?.email || '').toLowerCase().trim().slice(0, 64);
    return `${req.ip}:${id || 'anon'}`;
  },
  message: {
    message: 'Too many failed sign-in or verification attempts for this account. Please wait 15 minutes before retrying.'
  }
});

const ipSprayLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many failed authentication attempts from this network address. Please wait 15 minutes before retrying.'
  }
});

const strictLoginLimiter = [ipSprayLoginLimiter, perAccountLoginLimiter];

async function getRolePermissionsCached(role) {
  const allPerms = await getOrCompute(CACHE_KEYS.ROLE_PERMISSIONS, 30000, () =>
    RolePermission.find({}).lean()
  );
  return allPerms.find((item) => item.role === role) || null;
}

// Check system bootstrap status & public company identity for Sign-In page
router.get('/bootstrap-status', async (req, res) => {
  try {
    const [settings, userCount] = await Promise.all([
      ensureCoreSystemConfig(null, { lean: true }),
      getOrCompute(CACHE_KEYS.BOOTSTRAP_USER_COUNT, 15000, () => User.countDocuments({}))
    ]);
    res.json({
      initialized: userCount > 0,
      userCount,
      company: {
        companyDisplayName: settings.companyDisplayName,
        legalName: settings.legalName,
        baseCurrency: settings.baseCurrency,
        shareClass: settings.shareClass,
        companyLogoUrl: settings.companyLogoUrl,
        supportEmail: settings.supportEmail
      }
    });
  } catch (err) {
    return sendSafeError(res, err, 'Unable to check system initialization status.');
  }
});

// Initialize the very first Administrator account when database is empty (no unwanted seed data)
router.post('/setup-initial-admin', strictLoginLimiter, async (req, res) => {
  try {
    const userCount = await User.countDocuments({});
    if (userCount > 0) {
      return res.status(400).json({ message: 'System is already initialized with an administrator account.' });
    }

    const { fullName, email, password, companyDisplayName } = req.body;
    if (!isPlainString(email, 254) || !email.trim() || !isPlainString(password, 128)) {
      return res.status(400).json({ message: 'Valid email and password strings are required.' });
    }
    const pwdError = validatePasswordPolicy(password);
    if (pwdError) {
      return res.status(400).json({ message: pwdError });
    }

    const settings = await ensureCoreSystemConfig();
    if (isPlainString(companyDisplayName, 160) && companyDisplayName.trim()) {
      settings.companyDisplayName = companyDisplayName.trim();
      await settings.save();
      invalidateCompanyCaches();
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verificationCode = String(crypto.randomInt(100000, 999999));
    const recoveryCode = `NIA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const adminUser = await User.create({
      email: email.toLowerCase().trim(),
      fullName: isPlainString(fullName, 120) && fullName.trim() ? fullName.trim() : 'Primary Administrator',
      passwordHash,
      role: 'Administrator',
      status: 'Active',
      verificationEnabled: true,
      verificationCode,
      recoveryCode,
      lastLoginAt: new Date().toISOString()
    });
    del(CACHE_KEYS.BOOTSTRAP_USER_COUNT);

    await logAuditEvent({
      actor: adminUser.fullName,
      actorEmail: adminUser.email,
      actorRole: 'Administrator',
      action: 'Initialized primary administrator account',
      reference: 'SYS-INIT',
      entityType: 'User',
      newValue: `${adminUser.email} (Administrator)`
    });

    const token = signAuthToken(adminUser, true);
    setAuthCookie(res, token);
    const rolePerm = await getRolePermissionsCached(adminUser.role);

    res.status(201).json({
      token,
      user: {
        _id: adminUser._id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: adminUser.role,
        status: adminUser.status,
        shareholderId: null,
        verificationEnabled: adminUser.verificationEnabled
      },
      generatedStaffVerificationCode: verificationCode,
      generatedRecoveryCode: recoveryCode,
      permissions: rolePerm ? rolePerm.permissions : null,
      company: sanitizePublicCompanySettings(settings)
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to initialize administrator account.');
  }
});

// Desktop Interface 01: Secure Sign-In (Supports Shareholder ID e.g. SH-001 or Email)
router.post('/login', strictLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (
      !isPlainString(email, 254) ||
      !isPlainString(password, 128) ||
      !email.trim() ||
      !password.trim()
    ) {
      return res.status(400).json({ message: 'Please enter both Shareholder ID / Email and password.' });
    }

    const cleanInput = email.trim();
    const user = await User.findOne(
      cleanInput.includes('@')
        ? { email: cleanInput.toLowerCase() }
        : { shareholderId: cleanInput.toUpperCase() }
    );
    const cleanEmail = user ? user.email : cleanInput.toLowerCase();
    if (!user) {
      await logAuditEvent({
        actor: 'Unauthenticated',
        actorEmail: cleanEmail,
        actorRole: 'None',
        action: 'Failed sign-in attempt (unknown account)',
        reference: 'AUTH-FAIL',
        entityType: 'Session'
      });
      return res.status(401).json({ message: 'Invalid Shareholder ID / email address or password.' });
    }

    if (user.status === 'Suspended' || user.status === 'Inactive') {
      await logAuditEvent({
        actor: user.fullName,
        actorEmail: user.email,
        actorRole: user.role,
        action: `Blocked sign-in to ${user.status.toLowerCase()} account`,
        reference: user.shareholderId || 'AUTH-BLOCKED',
        entityType: 'Session'
      });
      return res.status(403).json({
        message: `Account is ${user.status.toLowerCase()}. Please contact company administration.`
      });
    }

    if (user.status === 'Invited' && !user.passwordHash) {
      return res.status(403).json({
        message: 'This account has a pending invitation. Please use the "Activate Invite" tab to set your password.',
        requiresActivation: true,
        email: user.email
      });
    }

    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      return res.status(429).json({
        message: 'Account temporarily locked due to repeated failed sign-in attempts. Please try again in 15 minutes or reset your password.'
      });
    }

    const validPassword = await verifyPasswordFast(user._id, password, user.passwordHash || '');
    if (!validPassword) {
      const nextAttempts = (user.failedLoginAttempts || 0) + 1;
      user.failedLoginAttempts = nextAttempts;
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
      }
      await user.save();

      // Never log the password in audit logs (Page 22 & 34)
      await logAuditEvent({
        actor: user.fullName,
        actorEmail: user.email,
        actorRole: user.role,
        action:
          nextAttempts >= MAX_FAILED_ATTEMPTS
            ? 'Account temporarily locked after repeated failed sign-ins'
            : 'Failed sign-in attempt (invalid credentials)',
        reference: user.shareholderId || 'AUTH-FAIL',
        entityType: 'Session'
      });
      return res.status(401).json({ message: 'Invalid Shareholder ID / email address or password.' });
    }

    // Multi-factor verification flow (enforced for staff by default, and for any shareholder who enables 2FA)
    if (user.verificationEnabled) {
      if (user.failedLoginAttempts || user.lockUntil) {
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();
      }
      const preAuthToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          step: 'staff-2fa',
          type: 'pre-auth',
          sessionVersion: user.sessionVersion || 1
        },
        JWT_SECRET,
        { expiresIn: '10m' }
      );
      return res.json({
        requiresVerification: true,
        preAuthToken,
        email: user.email,
        role: user.role,
        ...(!IS_PRODUCTION && process.env.ALLOW_DEV_DEMO_CODES === 'true'
          ? {
              demoVerificationCode: user.verificationCode || '246810',
              demoRecoveryCode: user.recoveryCode || 'APEX-RECOVERY-2026'
            }
          : {})
      });
    }

    user.lastLoginAt = new Date().toISOString();
    user.failedLoginAttempts = 0;
    user.failed2faAttempts = 0;
    user.lockUntil = null;

    const [, settings, rolePerm] = await Promise.all([
      user.save(),
      ensureCoreSystemConfig(null, { lean: true }),
      getRolePermissionsCached(user.role),
      logAuditEvent({
        actor: user.fullName,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'Signed in to portal',
        reference: user.shareholderId || 'AUTH',
        entityType: 'Session',
        newValue: `${user.role} workspace`
      })
    ]);
    invalidateAuthUserCache(user._id);
    const token = signAuthToken(user, true);
    setAuthCookie(res, token);

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        shareholderId: user.shareholderId,
        verificationEnabled: user.verificationEnabled
      },
      permissions: rolePerm ? rolePerm.permissions : null,
      company: sanitizePublicCompanySettings(settings)
    });
  } catch (err) {
    return sendSafeError(res, err, 'Unable to complete sign-in. Please try again.');
  }
});

// Mobile Interface M08: Verify Staff Sign-In (6-digit code or recovery code)
router.post('/verify-staff', strictLoginLimiter, async (req, res) => {
  try {
    const { preAuthToken, code, recoveryCode } = req.body;
    if (!isPlainString(preAuthToken, 2048) || !preAuthToken.trim()) {
      return res.status(400).json({ message: 'Verification session missing. Please sign in again.' });
    }

    const decoded = jwt.verify(preAuthToken, JWT_SECRET);
    if (decoded.step !== 'staff-2fa' || decoded.type !== 'pre-auth') {
      return res.status(400).json({ message: 'Invalid verification token.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'Active') {
      return res.status(403).json({ message: 'Account is not active.' });
    }

    if ((user.sessionVersion || 1) !== (decoded.sessionVersion || 1)) {
      return res.status(401).json({ message: 'Verification session was revoked. Please sign in again.' });
    }

    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      return res.status(429).json({
        message: 'Too many failed verification attempts. Account temporarily locked for 15 minutes.'
      });
    }

    const expectedCode = String(user.verificationCode || '246810').trim();
    const expectedRecovery = String(user.recoveryCode || 'APEX-RECOVERY-2026').trim();

    const cleanCode = isPlainString(code, 20) ? code.trim() : '';
    const cleanRecovery = isPlainString(recoveryCode, 64) ? recoveryCode.trim() : '';

    if (cleanCode) {
      if (!safeCompare(cleanCode, expectedCode)) {
        const next2fa = (user.failed2faAttempts || 0) + 1;
        user.failed2faAttempts = next2fa;
        if (next2fa >= MAX_FAILED_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
          user.failed2faAttempts = 0;
        }
        await user.save();
        await logAuditEvent({
          actor: user.fullName,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'Failed staff 2FA verification attempt',
          reference: 'AUTH-2FA-FAIL',
          entityType: 'Session'
        });
        return res.status(401).json({ message: 'Invalid 6-digit verification code.' });
      }
    } else if (cleanRecovery) {
      if (!safeCompare(cleanRecovery, expectedRecovery)) {
        const next2fa = (user.failed2faAttempts || 0) + 1;
        user.failed2faAttempts = next2fa;
        if (next2fa >= MAX_FAILED_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
          user.failed2faAttempts = 0;
        }
        await user.save();
        await logAuditEvent({
          actor: user.fullName,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'Failed staff recovery code attempt',
          reference: 'AUTH-2FA-FAIL',
          entityType: 'Session'
        });
        return res.status(401).json({ message: 'Invalid recovery code.' });
      }
    } else {
      return res.status(400).json({ message: 'Please enter your verification code or recovery code.' });
    }

    user.lastLoginAt = new Date().toISOString();
    user.failedLoginAttempts = 0;
    user.failed2faAttempts = 0;
    user.lockUntil = null;

    const [, settings, rolePerm] = await Promise.all([
      user.save(),
      ensureCoreSystemConfig(null, { lean: true }),
      getRolePermissionsCached(user.role),
      logAuditEvent({
        actor: user.fullName,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'Verified staff multi-factor sign-in',
        reference: 'AUTH-2FA',
        entityType: 'Session',
        newValue: cleanRecovery ? 'Recovery code verified' : '6-digit verification code verified'
      })
    ]);
    invalidateAuthUserCache(user._id);
    const token = signAuthToken(user, true);
    setAuthCookie(res, token);

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        shareholderId: user.shareholderId,
        verificationEnabled: user.verificationEnabled
      },
      permissions: rolePerm ? rolePerm.permissions : null,
      company: sanitizePublicCompanySettings(settings)
    });
  } catch (err) {
    res.status(401).json({ message: 'Verification session expired or invalid. Please sign in again.' });
  }
});

// Activate Invited Account (Shareholder or Staff) — strictly validates non-empty inviteCode & expiration
router.post('/activate-invite', strictLoginLimiter, async (req, res) => {
  try {
    const { email, inviteCode, password } = req.body;
    const pwdError = validatePasswordPolicy(password);
    if (!isPlainString(email, 254) || !email.trim() || !isPlainString(inviteCode, 64) || !inviteCode.trim() || pwdError) {
      return res.status(400).json({ message: pwdError || 'Valid email, invitation code, and password (min 8 chars) are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No invited account found for this email address.' });
    }

    if (user.status === 'Suspended' || user.status === 'Inactive') {
      return res.status(403).json({ message: 'This account has been suspended or deactivated.' });
    }

    if (user.status !== 'Invited' || !user.inviteToken) {
      return res.status(400).json({ message: 'This account does not have a pending invitation code.' });
    }

    if (user.inviteExpiresAt && new Date() > new Date(user.inviteExpiresAt)) {
      return res.status(400).json({
        message: 'This invitation link/code has expired. Please ask an administrator to reset your invitation.'
      });
    }

    if (!safeCompare(inviteCode.trim().toUpperCase(), user.inviteToken.trim().toUpperCase())) {
      return res.status(400).json({ message: 'Invalid invitation code.' });
    }

    user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.status = 'Active';
    user.inviteToken = null;
    user.inviteExpiresAt = null;
    user.failedLoginAttempts = 0;
    user.failed2faAttempts = 0;
    user.lockUntil = null;
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    user.lastLoginAt = new Date().toISOString();
    await user.save();
    invalidateAuthUserCache(user._id);

    if (user.shareholderId) {
      const sh = await Shareholder.findOne({ shareholderId: user.shareholderId });
      if (sh && sh.accountStatus === 'Invited') {
        sh.accountStatus = 'Active';
        await sh.save();
        invalidateLedgerCaches();
      }
    }

    await logAuditEvent({
      actor: user.fullName,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'Activated invited account',
      reference: user.shareholderId || 'INVITE',
      entityType: 'User',
      previousValue: 'Invited',
      newValue: 'Active'
    });

    const [settings, rolePerm] = await Promise.all([
      ensureCoreSystemConfig(null, { lean: true }),
      getRolePermissionsCached(user.role)
    ]);
    const token = signAuthToken(user, true);
    setAuthCookie(res, token);

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        shareholderId: user.shareholderId,
        verificationEnabled: user.verificationEnabled
      },
      permissions: rolePerm ? rolePerm.permissions : null,
      company: sanitizePublicCompanySettings(settings)
    });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to activate invitation.');
  }
});

// Password Reset Request & Confirmation (Page 6 & 34: short-lived reset tokens)
router.post('/forgot-password', strictLoginLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!isPlainString(email, 254) || !email.trim()) {
      return res.status(400).json({ message: 'Valid email address is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({
        message: 'If that email address is registered, password reset instructions have been dispatched.'
      });
    }

    const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase();
    user.resetToken = resetToken;
    user.resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15-minute short-lived expiry
    await user.save();

    await logAuditEvent({
      actor: user.fullName,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'Requested short-lived password recovery token',
      reference: user.shareholderId || 'AUTH-RESET',
      entityType: 'User'
    });

    res.json({
      message: 'If that email address is registered, password reset instructions have been dispatched.',
      ...(!IS_PRODUCTION && process.env.ALLOW_DEV_DEMO_CODES === 'true'
        ? { resetTokenDemo: resetToken }
        : {})
    });
  } catch (err) {
    return sendSafeError(res, err, 'Unable to process password reset request.');
  }
});

router.post('/reset-password', strictLoginLimiter, async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    const pwdError = validatePasswordPolicy(newPassword);
    if (!isPlainString(email, 254) || !email.trim() || !isPlainString(resetToken, 64) || !resetToken.trim() || pwdError) {
      return res.status(400).json({
        message: pwdError || 'Email, reset token, and a valid new password (min 8 chars) are required.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.resetToken) {
      return res.status(400).json({ message: 'Invalid or expired password reset token.' });
    }

    // Enforce short-lived reset token expiration (Page 34)
    if (!user.resetExpiresAt || new Date() > new Date(user.resetExpiresAt)) {
      user.resetToken = null;
      user.resetExpiresAt = null;
      await user.save();
      return res.status(400).json({ message: 'Password reset token has expired. Please request a new token.' });
    }

    if (!safeCompare(resetToken.trim().toUpperCase(), user.resetToken.trim().toUpperCase())) {
      return res.status(400).json({ message: 'Invalid password reset token.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.resetToken = null;
    user.resetExpiresAt = null;
    user.failedLoginAttempts = 0;
    user.failed2faAttempts = 0;
    user.lockUntil = null;
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    if (user.status === 'Invited') user.status = 'Active';
    await user.save();
    invalidateAuthUserCache(user._id);

    await logAuditEvent({
      actor: user.fullName,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'Completed password reset and revoked old sessions',
      reference: user.shareholderId || 'AUTH-RESET',
      entityType: 'User'
    });

    res.json({ message: 'Password updated successfully. You may now sign in.' });
  } catch (err) {
    return sendSafeError(res, err, 'Failed to reset password.');
  }
});

// Sign Out & Clear HttpOnly Cookie
router.post('/logout', authenticate, async (req, res) => {
  try {
    clearAuthCookie(res);
    invalidateAuthUserCache(req.user._id);
    await logAuditEvent({
      actor: req.user.fullName,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'Signed out of portal',
      reference: req.user.shareholderId || 'AUTH-LOGOUT',
      entityType: 'Session'
    });
    res.json({ message: 'Signed out securely.' });
  } catch (err) {
    clearAuthCookie(res);
    res.json({ message: 'Signed out.' });
  }
});

// Get Current User Session (Secrets excluded)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const [settings, rolePerm, shareholderProfile] = await Promise.all([
      ensureCoreSystemConfig(null, { lean: true }),
      getRolePermissionsCached(user.role),
      user.shareholderId
        ? Shareholder.findOne({ shareholderId: user.shareholderId }).lean()
        : Promise.resolve(null)
    ]);

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        shareholderId: user.shareholderId,
        verificationEnabled: user.verificationEnabled,
        lastLoginAt: user.lastLoginAt
      },
      shareholderProfile,
      permissions: rolePerm ? rolePerm.permissions : null,
      company: sanitizePublicCompanySettings(settings)
    });
  } catch (err) {
    return sendSafeError(res, err, 'Unable to load current user session.');
  }
});

// Change Password (Interface 07)
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const pwdError = validatePasswordPolicy(newPassword);
    if (!isPlainString(currentPassword, 128) || !currentPassword || pwdError) {
      return res.status(400).json({
        message: pwdError || 'Current password and a valid new password (min 8 chars) are required.'
      });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash || '');
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    await user.save();
    invalidateAuthUserCache(user._id);

    const freshToken = signAuthToken(user, true);
    setAuthCookie(res, freshToken);

    await logAuditEvent({
      actor: user.fullName,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'Changed account password and revoked other sessions',
      reference: user.shareholderId || 'SECURITY',
      entityType: 'User'
    });

    res.json({
      message: 'Password changed and other active sessions revoked.',
      token: freshToken
    });
  } catch (err) {
    return sendSafeError(res, err, 'Unable to change password.');
  }
});

// Sign out other sessions (Interface 07)
router.post('/revoke-other-sessions', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    await user.save();
    invalidateAuthUserCache(user._id);

    const freshToken = signAuthToken(user, true);
    setAuthCookie(res, freshToken);

    await logAuditEvent({
      actor: user.fullName,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'Signed out all other active sessions',
      reference: user.shareholderId || 'SECURITY',
      entityType: 'Session'
    });

    res.json({
      message: 'All other active sessions have been signed out.',
      token: freshToken
    });
  } catch (err) {
    return sendSafeError(res, err, 'Unable to revoke other sessions.');
  }
});

// Manage Verification / 2FA (Interface 07)
router.post('/toggle-verification', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.verificationEnabled = !user.verificationEnabled;
    if (user.verificationEnabled) {
      if (!user.verificationCode) {
        user.verificationCode = String(crypto.randomInt(100000, 999999));
      }
      if (!user.recoveryCode) {
        user.recoveryCode = `NIA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      }
    }
    await user.save();
    invalidateAuthUserCache(user._id);

    await logAuditEvent({
      actor: user.fullName,
      actorEmail: user.email,
      actorRole: user.role,
      action: `${user.verificationEnabled ? 'Enabled' : 'Disabled'} multi-factor sign-in verification`,
      reference: user.shareholderId || 'SECURITY',
      entityType: 'User',
      newValue: user.verificationEnabled ? 'Enabled' : 'Disabled'
    });

    res.json({
      message: `Multi-factor verification ${user.verificationEnabled ? 'enabled' : 'disabled'}.`,
      verificationEnabled: user.verificationEnabled,
      ...(user.verificationEnabled
        ? {
            verificationCode: user.verificationCode,
            recoveryCode: user.recoveryCode
          }
        : {})
    });
  } catch (err) {
    return sendSafeError(res, err, 'Unable to update verification setting.');
  }
});

// Rotate 2FA Verification & Recovery Codes (Interface 07)
router.post('/regenerate-2fa', authenticate, async (req, res) => {
  try {
    const { currentPassword } = req.body;
    if (!isPlainString(currentPassword, 128) || !currentPassword) {
      return res.status(400).json({ message: 'Please enter your current password to view or rotate 2FA codes.' });
    }
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash || '');
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const rotate = Boolean(req.body.rotate);
    if (rotate || !user.verificationCode || !user.recoveryCode) {
      user.verificationCode = String(crypto.randomInt(100000, 999999));
      user.recoveryCode = `NIA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      user.verificationEnabled = true;
      await user.save();
      invalidateAuthUserCache(user._id);

      await logAuditEvent({
        actor: user.fullName,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'Rotated multi-factor verification and recovery codes',
        reference: user.shareholderId || 'SECURITY',
        entityType: 'User'
      });
    }

    res.json({
      message: rotate ? 'New 6-digit verification and recovery codes generated.' : 'Verification codes retrieved.',
      verificationEnabled: user.verificationEnabled,
      verificationCode: user.verificationCode,
      recoveryCode: user.recoveryCode
    });
  } catch (err) {
    return sendSafeError(res, err, 'Unable to manage 2FA verification codes.');
  }
});

module.exports = router;
