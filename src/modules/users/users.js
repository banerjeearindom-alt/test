'use strict';

/** Users module — profile view and update, plus public agent profile. */

const express = require('express');
const { db } = require('../../config/db');
const { asyncHandler, ok, toInt, ApiError } = require('../../lib/http');
const { requireAuth } = require('../../middleware/auth');
const { hydrate } = require('../properties/properties.repo');

const router = express.Router();

// Update own profile (name / phone / user_type).
router.put('/me', requireAuth, asyncHandler((req, res) => {
  const { name, phone, user_type } = req.body;
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (phone !== undefined) { sets.push('phone = ?'); params.push(phone); }
  if (user_type !== undefined) {
    if (!['owner', 'dealer', 'builder'].includes(user_type)) throw new ApiError(400, 'Invalid user_type');
    sets.push('user_type = ?'); params.push(user_type);
  }
  if (sets.length) db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params, req.user.id);
  const u = db.prepare('SELECT id, name, email, phone, role, user_type FROM users WHERE id = ?').get(req.user.id);
  ok(res, { user: u });
}));

// Public profile of a seller/agent plus their active listings.
router.get('/:id', asyncHandler((req, res) => {
  const u = db.prepare('SELECT id, name, user_type, created_at FROM users WHERE id = ?').get(toInt(req.params.id));
  if (!u) throw new ApiError(404, 'User not found');
  const rows = db.prepare("SELECT * FROM properties WHERE owner_id = ? AND status = 'active' ORDER BY posted_at DESC").all(u.id);
  ok(res, { user: u, listings: rows.map((r) => hydrate(r)) });
}));

module.exports = router;
