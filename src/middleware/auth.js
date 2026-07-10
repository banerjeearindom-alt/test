'use strict';

const { verify } = require('../lib/auth');
const { db } = require('../config/db');
const { ApiError } = require('../lib/http');

/** Populate req.user from a Bearer token if present. Never throws — anonymous is allowed. */
function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verify(token) : null;
  if (payload) {
    const user = db.prepare('SELECT id, name, email, phone, role, user_type FROM users WHERE id = ?').get(payload.sub);
    if (user) req.user = user;
  }
  next();
}

/** Gate a route behind authentication. */
function requireAuth(req, _res, next) {
  if (!req.user) return next(new ApiError(401, 'Authentication required'));
  next();
}

/** Gate a route behind one or more roles (e.g. requireRole('admin')). */
const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'Authentication required'));
  if (!roles.includes(req.user.role)) return next(new ApiError(403, 'Insufficient permissions'));
  next();
};

module.exports = { attachUser, requireAuth, requireRole };
