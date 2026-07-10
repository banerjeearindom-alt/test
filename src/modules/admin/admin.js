'use strict';

/** Admin module — moderation and platform stats. Requires role = admin. */

const express = require('express');
const { db } = require('../../config/db');
const { asyncHandler, ok, toInt, ApiError } = require('../../lib/http');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireRole('admin'));

// Dashboard counters.
router.get('/stats', asyncHandler((_req, res) => {
  const one = (sql) => db.prepare(sql).get().c;
  ok(res, {
    users: one('SELECT COUNT(*) c FROM users'),
    properties: one('SELECT COUNT(*) c FROM properties'),
    active: one("SELECT COUNT(*) c FROM properties WHERE status = 'active'"),
    pending: one("SELECT COUNT(*) c FROM properties WHERE status = 'pending'"),
    leads: one('SELECT COUNT(*) c FROM leads'),
    by_city: db.prepare('SELECT city, COUNT(*) c FROM properties GROUP BY city ORDER BY c DESC LIMIT 10').all(),
  });
}));

// Moderate a listing: approve, feature, or take down.
router.patch('/properties/:id', asyncHandler((req, res) => {
  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(toInt(req.params.id));
  if (!row) throw new ApiError(404, 'Property not found');
  const { status, featured } = req.body;
  if (status !== undefined) {
    if (!['active', 'sold', 'inactive', 'pending'].includes(status)) throw new ApiError(400, 'Invalid status');
    db.prepare('UPDATE properties SET status = ? WHERE id = ?').run(status, row.id);
  }
  if (featured !== undefined) db.prepare('UPDATE properties SET featured = ? WHERE id = ?').run(featured ? 1 : 0, row.id);
  ok(res, { property: db.prepare('SELECT * FROM properties WHERE id = ?').get(row.id) });
}));

// List users for administration.
router.get('/users', asyncHandler((_req, res) => {
  ok(res, { items: db.prepare('SELECT id, name, email, phone, role, user_type, created_at FROM users ORDER BY id DESC').all() });
}));

module.exports = router;
