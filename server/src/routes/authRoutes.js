const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { User, Shareholder, RolePermission } = require('../models');
const { ensureCoreSystemConfig, logAuditEvent } = require('../utils/ledgerEngine');
const { IS_PRODUCTION } = require('../config/env');
const {
  JWT_SECRET,
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
  safeCompare,
  authenticate
} = require('../middleware/auth');

const router = express.Router();

// Dedicated strict rate limiter for credential & verification endpoints (Page 34: sign-in rate limiting)
const strictLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many sign-in or verification attempts from this address. Please wait 15 minutes before retrying.'
  }
});

function validatePasswordPolicy(password) {
  if (!password || typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  return null;
}

// Check system bootstrap status & public company identity for Sign-In page
router.get('/bootstrap-status', async (req, res) => {
  try {
    const [settings, userCount] = await Promise.all([
      ensureCoreSystemConfig(),
      User.countDocuments({})
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
    res.status(500).json({ message: err.message });
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
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Valid email and password strings are required.' });
    }
    const pwdError = validatePasswordPolicy(password);
    if (pwdError) {
      return res.status(400).json({ message: pwdError });
    }

    const settings = await ensureCoreSystemConfig();
    if (companyDisplayName && companyDisplayName.trim()) {
      settings.companyDisplayName = companyDisplayName.trim();
      await settings.save();
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const adminUser = await User.create({
      email: email.toLowerCase().trim(),
      fullName: (fullName || 'Primary Administrator').trim(),
      passwordHash,
      role: 'Administrator',
      status: 'Active',
      verificationEnabled: true,
      verificationCode: '246810',
      recoveryCode: 'APEX-RECOVERY-2026',
      lastLoginAt: new Date().toISOString()
    });

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
    const rolePerm = await RolePermission.findOne({ role: adminUser.role });

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
      permissions: rolePerm ? rolePerm.permissions : null,
      company: settings
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Desktop Interface 01: Secure Sign-In (Supports Shareholder ID e.g. SH-001 or Email)
router.post('/login', strictLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (
      !email ||
      !password ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password.trim()
    ) {
      return res.status(400).json({ message: 'Please enter both Shareholder ID / Email and password.' });
    }

    const cleanInput = email.trim();
    const user = await User.findOne(
      cleanInput.includes('@')
        ? { email: cleanInput.toLowerCase() }
        : {
            $or: [
              { email: cleanInput.toLowerCase() },
              { shareholderId: cleanInput.toUpperCase() }
            ]
          }
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

    const validPassword = await bcrypt.compare(password, user.passwordHash || '');
    if (!validPassword) {
      // Never log the password in audit logs (Page 22 & 34)
      await logAuditEvent({
        actor: user.fullName,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'Failed sign-in attempt (invalid credentials)',
        reference: user.shareholderId || 'AUTH-FAIL',
        entityType: 'Session'
      });
      return res.status(401).json({ message: 'Invalid email address or password.' });
    }

    const isStaff = ['Administrator', 'Data officer', 'Approver'].includes(user.role);

    // Staff verification flow (Interface M08 & D01: "Additional verification required for staff")
    if (isStaff && user.verificationEnabled) {
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

    const [, settings, rolePerm] = await Promise.all([
      user.save(),
      ensureCoreSystemConfig(),
      RolePermission.findOne({ role: user.role }),
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
      company: settings
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mobile Interface M08: Verify Staff Sign-In (6-digit code or recovery code)
router.post('/verify-staff', strictLoginLimiter, async (req, res) => {
  try {
    const { preAuthToken, code, recoveryCode } = req.body;
    if (!preAuthToken) {
      return res.status(400).json({ message: 'Verification session missing. Please sign in again.' });
    }

    const decoded = jwt.verify(preAuthToken, JWT_SECRET);
    if (decoded.step !== 'staff-2fa') {
      return res.status(400).json({ message: 'Invalid verification token.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'Active') {
      return res.status(403).json({ message: 'Account is not active.' });
    }

    const expectedCode = String(user.verificationCode || '246810').trim();
    const expectedRecovery = String(user.recoveryCode || 'APEX-RECOVERY-2026').trim();

    const cleanCode = String(code || '').trim();
    const cleanRecovery = String(recoveryCode || '').trim();

    if (cleanCode) {
      if (!safeCompare(cleanCode, expectedCode)) {
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

    const [, settings, rolePerm] = await Promise.all([
      user.save(),
      ensureCoreSystemConfig(),
      RolePermission.findOne({ role: user.role }),
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
      company: settings
    });
  } catch (err) {
    res.status(401).json({ message: 'Verification session expired or invalid. Please sign in again.' });
  }
});

// Activate Invited Account (Shareholder or Staff) — enforces expiring invitation (Page 6 & 31)
router.post('/activate-invite', strictLoginLimiter, async (req, res) => {
  try {
    const { email, inviteCode, password } = req.body;
    const pwdError = validatePasswordPolicy(password);
    if (!email || pwdError) {
      return res.status(400).json({ message: pwdError || 'Valid email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No invited account found for this email address.' });
    }

    if (user.status === 'Suspended' || user.status === 'Inactive') {
      return res.status(403).json({ message: 'This account has been suspended or deactivated.' });
    }

    if (user.inviteExpiresAt && new Date() > new Date(user.inviteExpiresAt)) {
      return res.status(400).json({
        message: 'This invitation link/code has expired. Please ask an administrator to reset your invitation.'
      });
    }

    if (user.inviteToken && inviteCode && !safeCompare(inviteCode.trim().toUpperCase(), user.inviteToken.trim().toUpperCase())) {
      return res.status(400).json({ message: 'Invalid invitation code.' });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.status = 'Active';
    user.inviteToken = null;
    user.inviteExpiresAt = null;
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    user.lastLoginAt = new Date().toISOString();
    await user.save();

    if (user.shareholderId) {
      const sh = await Shareholder.findOne({ shareholderId: user.shareholderId });
      if (sh && sh.accountStatus === 'Invited') {
        sh.accountStatus = 'Active';
        await sh.save();
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

    const settings = await ensureCoreSystemConfig();
    const rolePerm = await RolePermission.findOne({ role: user.role });
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
      company: settings
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Password Reset Request & Confirmation (Page 6 & 34: short-lived reset tokens)
router.post('/forgot-password', strictLoginLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Valid email address is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({
        message: 'If that email address is registered, password reset instructions have been dispatched.'
      });
    }

    const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase();
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
    res.status(500).json({ message: err.message });
  }
});

router.post('/reset-password', strictLoginLimiter, async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    const pwdError = validatePasswordPolicy(newPassword);
    if (!email || !resetToken || pwdError) {
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

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetToken = null;
    user.resetExpiresAt = null;
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    if (user.status === 'Invited') user.status = 'Active';
    await user.save();

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
    res.status(500).json({ message: err.message });
  }
});

// Sign Out & Clear HttpOnly Cookie
router.post('/logout', authenticate, async (req, res) => {
  try {
    clearAuthCookie(res);
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
      ensureCoreSystemConfig(),
      RolePermission.findOne({ role: user.role }),
      user.shareholderId
        ? Shareholder.findOne({ shareholderId: user.shareholderId })
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
      company: settings
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change Password (Interface 07)
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const pwdError = validatePasswordPolicy(newPassword);
    if (!currentPassword || pwdError) {
      return res.status(400).json({
        message: pwdError || 'Current password and a valid new password (min 8 chars) are required.'
      });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash || '');
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    await user.save();

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
    res.status(500).json({ message: err.message });
  }
});

// Sign out other sessions (Interface 07)
router.post('/revoke-other-sessions', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    await user.save();

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
    res.status(500).json({ message: err.message });
  }
});

// Manage Verification / 2FA (Interface 07)
router.post('/toggle-verification', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.verificationEnabled = !user.verificationEnabled;
    await user.save();

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
      verificationEnabled: user.verificationEnabled
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
