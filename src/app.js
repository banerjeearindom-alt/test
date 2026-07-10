'use strict';

const path = require('node:path');
const express = require('express');

const { attachUser } = require('./middleware/auth');
const { fail } = require('./lib/http');

const authRoutes = require('./modules/auth/auth.routes');
const propertyRoutes = require('./modules/properties/properties.routes');
const searchRoutes = require('./modules/search/search');
const favoriteRoutes = require('./modules/favorites/favorites');
const leadRoutes = require('./modules/leads/leads');
const userRoutes = require('./modules/users/users');
const adminRoutes = require('./modules/admin/admin');

const app = express();

app.use(express.json({ limit: '2mb' }));

// Attach req.user (if a valid token is present) to every API request.
app.use('/api', attachUser);

app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok', time: new Date().toISOString() } }));

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Static frontend.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Unknown API route -> JSON 404 (so the SPA fallback doesn't swallow it).
app.use('/api', (_req, res) => fail(res, 404, 'Endpoint not found'));

// SPA fallback: serve index.html for any non-API GET.
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Central error handler.
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  fail(res, status, err.message || 'Internal server error', err.details);
});

module.exports = app;
