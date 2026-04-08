import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { badRequest, internalError } from '../utils/http.js';
import {
  createAuthToken,
  hashPassword,
  isValidPasswordPolicy,
  verifyPassword
} from '../utils/auth.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { sendOtpEmail } from '../utils/email.js';

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const uploadsDir = path.resolve('uploads/profile-images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname || '.png');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 }
});

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  const parts = [
    `auth_token=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'Max-Age=604800',
    'SameSite=Lax'
  ];
  if (isProduction) {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production';
  const parts = [
    'auth_token=',
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax'
  ];
  if (isProduction) {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return badRequest(res, 'Email and password are required', 'MISSING_CREDENTIALS');
    }
    if (!EMAIL_REGEX.test(email)) {
      return badRequest(res, 'Please provide a valid email address', 'INVALID_EMAIL');
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    }
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email first', code: 'EMAIL_NOT_VERIFIED' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Your account is suspended. Please contact us for support.',
        code: 'USER_SUSPENDED'
      });
    }
    if (user.status === 'frozen') {
      return res.status(403).json({
        error: 'Your account is frozen. Please contact us for support.',
        code: 'USER_FROZEN'
      });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    }

    const token = createAuthToken({ userId: user.id, role: user.role, email: user.email });
    setAuthCookie(res, token);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage || null
      }
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.post('/signup', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!name || !email || !password) {
      return badRequest(res, 'Name, email and password are required', 'MISSING_CREDENTIALS');
    }
    if (!EMAIL_REGEX.test(email)) {
      return badRequest(res, 'Please provide a valid email address', 'INVALID_EMAIL');
    }
    if (!isValidPasswordPolicy(password)) {
      return badRequest(
        res,
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
        'WEAK_PASSWORD'
      );
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return badRequest(res, 'User with this email already exists', 'EMAIL_EXISTS');
    }

    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const verificationCodeExpiresAt = Date.now() + 10 * 60 * 1000;
    const passwordHash = await hashPassword(password);
    await User.create({
      name,
      email,
      passwordHash,
      role: 'customer',
      status: 'active',
      isVerified: false,
      verificationCode,
      verificationCodeExpiresAt
    });

    await sendOtpEmail(email, verificationCode);
    return res.status(201).json({ message: 'Verification code sent to your email' });
  } catch (error) {
    if (String(error?.message) === 'SMTP_NOT_CONFIGURED') {
      return badRequest(
        res,
        'Email verification is not configured on server. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.',
        'SMTP_NOT_CONFIGURED'
      );
    }
    return internalError(res, error);
  }
});

router.post('/verify-signup', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    if (!email || !code) {
      return badRequest(res, 'Email and OTP code are required', 'MISSING_OTP_FIELDS');
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return badRequest(res, 'Account not found', 'USER_NOT_FOUND');
    }
    if (user.isVerified) {
      return res.json({ message: 'Email already verified' });
    }
    if (!user.verificationCode || user.verificationCode !== code) {
      return badRequest(res, 'Invalid verification code', 'INVALID_OTP');
    }
    if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < Date.now()) {
      return badRequest(res, 'Verification code expired', 'OTP_EXPIRED');
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;
    await user.save();

    const token = createAuthToken({ userId: user.id, role: user.role, email: user.email });
    setAuthCookie(res, token);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage || null
      }
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.post('/google', async (req, res) => {
  try {
    const token = String(req.body?.credential || '');
    if (!token) {
      return badRequest(res, 'Google credential is required', 'MISSING_GOOGLE_CREDENTIAL');
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return badRequest(res, 'Google auth is not configured on the server', 'GOOGLE_NOT_CONFIGURED');
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = String(payload?.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return badRequest(res, 'Google account email is invalid', 'INVALID_EMAIL');
    }

    let user = await User.findOne({ where: { email } });
    if (!user) {
      const generatedPassword = `G!${Math.random().toString(36).slice(2)}A9`;
      const passwordHash = await hashPassword(generatedPassword);
      const name = String(payload?.name || email.split('@')[0] || 'Customer');
      user = await User.create({ name, email, passwordHash, role: 'customer', isVerified: true });
    }

    const authToken = createAuthToken({ userId: user.id, role: user.role, email: user.email });
    setAuthCookie(res, authToken);
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage || null
      }
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      profileImage: req.user.profileImage || null
    }
  });
});

router.get('/profile', requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      profileImage: req.user.profileImage || null
    }
  });
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return badRequest(res, 'Name is required', 'MISSING_NAME');
    }
    req.user.name = name;
    await req.user.save();
    return res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status,
        profileImage: req.user.profileImage || null
      }
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.post('/profile/image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return badRequest(res, 'Image file is required', 'MISSING_IMAGE');
    }
    req.user.profileImage = `/uploads/profile-images/${req.file.filename}`;
    await req.user.save();
    return res.json({
      profileImage: req.user.profileImage
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return badRequest(res, 'Please provide a valid email address', 'INVALID_EMAIL');
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ message: 'If an account exists, a reset code has been sent.' });
    }

    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const verificationCodeExpiresAt = Date.now() + 10 * 60 * 1000;
    user.verificationCode = verificationCode;
    user.verificationCodeExpiresAt = verificationCodeExpiresAt;
    await user.save();

    await sendOtpEmail(email, verificationCode);
    return res.json({ message: 'If an account exists, a reset code has been sent.' });
  } catch (error) {
    if (String(error?.message) === 'SMTP_NOT_CONFIGURED') {
      return badRequest(
        res,
        'Email sending is not configured on server. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.',
        'SMTP_NOT_CONFIGURED'
      );
    }
    return internalError(res, error);
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!email || !code || !newPassword) {
      return badRequest(res, 'Email, code and newPassword are required', 'MISSING_RESET_FIELDS');
    }
    if (!isValidPasswordPolicy(newPassword)) {
      return badRequest(
        res,
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
        'WEAK_PASSWORD'
      );
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return badRequest(res, 'Account not found', 'USER_NOT_FOUND');
    }
    if (!user.verificationCode || user.verificationCode !== code) {
      return badRequest(res, 'Invalid reset code', 'INVALID_RESET_CODE');
    }
    if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < Date.now()) {
      return badRequest(res, 'Reset code expired', 'RESET_CODE_EXPIRED');
    }

    user.passwordHash = await hashPassword(newPassword);
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;
    await user.save();

    return res.json({ message: 'Password reset successful' });
  } catch (error) {
    return internalError(res, error);
  }
});

router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'status', 'isVerified', 'profileImage', 'createdAt']
    });
    return res.json({ users });
  } catch (error) {
    return internalError(res, error);
  }
});

router.post('/admin/users', requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = req.body?.role === 'admin' ? 'admin' : 'customer';

    if (!name || !email || !password) {
      return badRequest(res, 'Name, email and password are required', 'MISSING_FIELDS');
    }
    if (!isValidPasswordPolicy(password)) {
      return badRequest(
        res,
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
        'WEAK_PASSWORD'
      );
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return badRequest(res, 'User with this email already exists', 'EMAIL_EXISTS');
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash, role, status: 'active', isVerified: true });
    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.patch('/admin/users/:userId/role', requireAdmin, async (req, res) => {
  try {
    const role = req.body?.role === 'admin' ? 'admin' : 'customer';
    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    user.role = role;
    await user.save();
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.patch('/admin/users/:userId/status', requireAdmin, async (req, res) => {
  try {
    const status = String(req.body?.status || '');
    const allowed = ['active', 'suspended', 'frozen'];
    if (!allowed.includes(status)) {
      return badRequest(res, 'Status must be active, suspended or frozen', 'INVALID_STATUS');
    }

    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    user.status = status;
    await user.save();
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.put('/admin/users/:userId', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const name = req.body?.name;
    const email = req.body?.email;
    if (name !== undefined) user.name = String(name).trim() || user.name;
    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return badRequest(res, 'Please provide a valid email address', 'INVALID_EMAIL');
      }
      user.email = normalizedEmail;
    }

    await user.save();
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    return internalError(res, error);
  }
});

router.delete('/admin/users/:userId', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'ezinwaugochukw@gmail.com').toLowerCase();
    if (user.email === configuredAdminEmail) {
      return badRequest(res, 'Configured admin user cannot be deleted', 'PROTECTED_ADMIN');
    }

    await user.destroy();
    return res.status(204).send();
  } catch (error) {
    return internalError(res, error);
  }
});

router.patch('/admin/users/:userId/password', requireAdmin, async (req, res) => {
  try {
    const password = String(req.body?.password || '');
    if (!isValidPasswordPolicy(password)) {
      return badRequest(
        res,
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
        'WEAK_PASSWORD'
      );
    }

    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    user.passwordHash = await hashPassword(password);
    await user.save();
    return res.status(204).send();
  } catch (error) {
    return internalError(res, error);
  }
});

export default router;
