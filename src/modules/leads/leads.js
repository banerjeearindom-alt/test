'use strict';

/** Leads / inquiries module — a buyer contacts a property owner. */

const express = require('express');
const { db } = require('../../config/db');
const { asyncHandler, ok, required, toInt, ApiError } = require('../../lib/http');
const { attachUser, requireAuth } = require('../../middleware/auth');

const router = express.Router();

// Submit an inquiry for a property. Works for logged-in and anonymous users.
router.post('/', attachUser, asyncHandler((req, res) => {
  const b = req.body;
  required(b, ['property_id', 'name', 'email', 'phone']);
  const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(toInt(b.property_id));
  if (!property) throw new ApiError(404, 'Property not found');

  const info = db
    .prepare('INSERT INTO leads (property_id, user_id, name, email, phone, message) VALUES (?,?,?,?,?,?)')
    .run(property.id, req.user?.id || null, b.name, b.email, b.phone, b.message || null);

  ok(res, { lead: db.prepare('SELECT * FROM leads WHERE id = ?').get(info.lastInsertRowid) }, 201);
}));

// Inquiries received across all of the current user's listings (seller inbox).
router.get('/received', requireAuth, asyncHandler((req, res) => {
  const rows = db
    .prepare(
      `SELECT l.*, p.title AS property_title FROM leads l
       JOIN properties p ON p.id = l.property_id
       WHERE p.owner_id = ? ORDER BY l.created_at DESC`
    )
    .all(req.user.id);
  ok(res, { items: rows });
}));

// Update the status of a lead on one of the user's own listings.
router.patch('/:id', requireAuth, asyncHandler((req, res) => {
  const lead = db
    .prepare(
      `SELECT l.* FROM leads l JOIN properties p ON p.id = l.property_id
       WHERE l.id = ? AND (p.owner_id = ? OR ? = 'admin')`
    )
    .get(toInt(req.params.id), req.user.id, req.user.role);
  if (!lead) throw new ApiError(404, 'Lead not found');
  const status = req.body.status;
  if (!['new', 'contacted', 'closed'].includes(status)) throw new ApiError(400, 'Invalid status');
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, lead.id);
  ok(res, { lead: db.prepare('SELECT * FROM leads WHERE id = ?').get(lead.id) });
}));

module.exports = router;
