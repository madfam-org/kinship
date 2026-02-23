const jwt = require('jsonwebtoken');

/**
 * Kinship API Auth Middleware (Phase 5)
 *
 * Validates a signed Bearer JWT on every request except:
 *   - GET /          (Enclii healthcheck probe)
 *   - POST /v1/users (public-key registration — must work before a token exists)
 *
 * Currently uses HS256 + API_JWT_SECRET for local/staging environments.
 * Phase 11 will replace `verifyToken` with RS256 JWKS validation against the
 * Janua OIDC discovery endpoint — the req.user interface stays identical.
 */

const UNAUTHENTICATED_ROUTES = [
  { method: 'GET',  path: '/' },
  { method: 'POST', path: '/v1/users' },
];

function isPublicRoute(req) {
  return UNAUTHENTICATED_ROUTES.some(
    (r) => r.method === req.method && r.path === req.path
  );
}

function verifyToken(token) {
  const secret = process.env.API_JWT_SECRET;
  if (!secret) {
    throw new Error('API_JWT_SECRET is not configured — set it in .env');
  }
  // Phase 11: replace this block with JWKS RS256 verification against Janua
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

function authMiddleware(req, res, next) {
  if (isPublicRoute(req)) return next();

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Authorization header missing or malformed' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = verifyToken(token);
    // Attach a normalised identity to req for downstream route handlers
    req.user = {
      id:    decoded.sub  || decoded.id,
      email: decoded.email || null,
    };
    next();
  } catch (err) {
    return res.status(401).send({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
