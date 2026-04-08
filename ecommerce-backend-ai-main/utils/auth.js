import crypto from 'crypto';

const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'dev-only-secret-change-me';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function b64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function b64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function isValidPasswordPolicy(password) {
  if (typeof password !== 'string') {
    return false;
  }

  const hasLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasLength && hasUppercase && hasLowercase && hasDigit && hasSpecial;
}

export function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        return reject(error);
      }

      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export function verifyPassword(password, passwordHash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = String(passwordHash).split(':');
    if (!salt || !key) {
      return resolve(false);
    }

    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        return reject(error);
      }

      const keyBuffer = Buffer.from(key, 'hex');
      if (keyBuffer.length !== derivedKey.length) {
        return resolve(false);
      }

      resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
    });
  });
}

export function createAuthToken(payload) {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const body = JSON.stringify({ ...payload, expiresAt });
  const encoded = b64UrlEncode(body);
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const [encoded, signature] = token.split('.');
  const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('base64url');
  if (signature !== expectedSignature) {
    return null;
  }

  const parsed = JSON.parse(b64UrlDecode(encoded));
  if (!parsed.expiresAt || parsed.expiresAt < Date.now()) {
    return null;
  }

  return parsed;
}

export function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const prefixedName = `${name}=`;
  const matched = cookies.find((cookie) => cookie.startsWith(prefixedName));
  if (!matched) {
    return null;
  }

  return decodeURIComponent(matched.slice(prefixedName.length));
}
