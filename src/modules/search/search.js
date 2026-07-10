'use strict';

/** Search-support module — filter metadata and quick locality suggestions. */

const express = require('express');
const { db } = require('../../config/db');
const { asyncHandler, ok } = require('../../lib/http');
const { PURPOSES, TYPES, FURNISHING } = require('../properties/properties.controller');

const router = express.Router();

// Enum values + distinct cities/amenities to populate filter UI.
router.get('/meta', asyncHandler((_req, res) => {
  const cities = db.prepare("SELECT DISTINCT city FROM properties WHERE status = 'active' ORDER BY city").all().map((r) => r.city);
  const amenities = db.prepare('SELECT name FROM amenities ORDER BY name').all().map((r) => r.name);
  ok(res, {
    purposes: PURPOSES,
    property_types: TYPES,
    furnishing: FURNISHING,
    bhk_options: [1, 2, 3, 4, 5],
    cities,
    amenities,
  });
}));

// Typeahead for the city/locality search box.
router.get('/suggest', asyncHandler((req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  const rows = db
    .prepare(
      `SELECT DISTINCT locality, city FROM properties
       WHERE status = 'active' AND (LOWER(locality) LIKE LOWER(?) OR LOWER(city) LIKE LOWER(?))
       LIMIT 8`
    )
    .all(q, q);
  ok(res, { suggestions: rows.map((r) => ({ locality: r.locality, city: r.city, label: `${r.locality}, ${r.city}` })) });
}));

module.exports = router;
