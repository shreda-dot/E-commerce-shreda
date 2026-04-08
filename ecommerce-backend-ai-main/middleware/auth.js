import { User } from '../models/User.js';
import { getCookieValue, verifyAuthToken } from '../utils/auth.js';

export async function getAuthUser(req) {
  const token = getCookieValue(req.headers.cookie, 'auth_token');
  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return null;
  }

  const user = await User.findByPk(payload.userId);
  return user || null;
}

export async function requireAuth(req, res, next) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Something went wrong!', code: 'INTERNAL_ERROR' });
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Something went wrong!', code: 'INTERNAL_ERROR' });
  }
}
