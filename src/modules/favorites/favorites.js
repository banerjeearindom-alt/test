'use strict';

/** Favorites (shortlist) module — combined controller + routes. */

const express = require('express');
const { db } = require('../../config/db');
const { asyncHandler, ok, toInt, ApiError } = require('../../lib/http');
const { requireAuth } = require('../../middleware/auth');
const { hydrate } = require('../properties/properties.repo');

const router = express.Router();

// List the current user's shortlisted properties.
router.get('/', requireAuth, asyncHandler((req, res) => {
  const rows = db
    .prepare(
      `SELECT p.* FROM properties p
       JOIN favorites f ON f.property_id = p.id
       WHERE f.user_id = ? ORDER BY f.created_at DESC`
    )
    .all(req.user.id);
  ok(res, { items: rows.map((r) => hydrate(r, req.user.id)) });
}));

// Add to shortlist.
router.post('/:propertyId', requireAuth, asyncHandler((req, res) => {
  const propertyId = toInt(req.params.propertyId);
  const exists = db.prepare('SELECT id FROM properties WHERE id = ?').get(propertyId);
  if (!exists) throw new ApiError(404, 'Property not found');
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, property_id) VALUES (?, ?)').run(req.user.id, propertyId);
  ok(res, { favorited: true, propertyId }, 201);
}));

// Remove from shortlist.
router.delete('/:propertyId', requireAuth, asyncHandler((req, res) => {
  const propertyId = toInt(req.params.propertyId);
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND property_id = ?').run(req.user.id, propertyId);
  ok(res, { favorited: false, propertyId });
}));

module.exports = router;
