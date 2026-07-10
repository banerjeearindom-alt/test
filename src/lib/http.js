'use strict';

/** Small helpers for consistent API responses and input validation. */

/** Wrap an async route handler so thrown errors flow to Express error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Throw an HTTP error with a status code the error middleware understands. */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const ok = (res, data, status = 200) => res.status(status).json({ data });
const fail = (res, status, message, details) => res.status(status).json({ error: message, details });

// ---- Validation helpers -------------------------------------------------------

function required(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) throw new ApiError(400, `Missing required field(s): ${missing.join(', ')}`);
}

function oneOf(value, allowed, field) {
  if (value !== undefined && value !== null && value !== '' && !allowed.includes(value)) {
    throw new ApiError(400, `Invalid ${field}. Expected one of: ${allowed.join(', ')}`);
  }
}

const toInt = (v, def = undefined) => {
  if (v === undefined || v === null || v === '') return def;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? def : n;
};

module.exports = { asyncHandler, ApiError, ok, fail, required, oneOf, toInt };
