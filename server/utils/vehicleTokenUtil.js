const crypto = require('crypto');

const PORTAL_SECRET = process.env.PORTAL_TOKEN_SECRET || process.env.JWT_SECRET;
const TOKEN_VERSION = 'v1';

/**
 * Generates a tamper-proof, URL-safe vehicle portal token.
 * Payload: { regNo, issuedAt }
 * Format: base64url(payload).<hmac-signature>
 *
 * No expiry by default — portal tokens are permanent links for vehicle owners.
 * If expiry is needed in future, add `expiresAt` to payload and verify here.
 */
const signVehicleToken = (regNo) => {
  const payload = Buffer.from(
    JSON.stringify({ v: TOKEN_VERSION, regNo, issuedAt: Date.now() })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', PORTAL_SECRET)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
};

/**
 * Verifies a portal token and returns the decoded payload.
 * Throws an error with statusCode 401 if the token is invalid or tampered.
 */
const verifyVehicleToken = (token) => {
  if (!token || !token.includes('.')) {
    const error = new Error('Invalid or malformed portal token.');
    error.statusCode = 401;
    throw error;
  }

  const [payload, providedSignature] = token.split('.');

  const expectedSignature = crypto
    .createHmac('sha256', PORTAL_SECRET)
    .update(payload)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuffer   = Buffer.from(providedSignature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuf)
  ) {
    const error = new Error('Portal token signature is invalid.');
    error.statusCode = 401;
    throw error;
  }

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    const error = new Error('Portal token payload is corrupted.');
    error.statusCode = 401;
    throw error;
  }
};

module.exports = { signVehicleToken, verifyVehicleToken };
