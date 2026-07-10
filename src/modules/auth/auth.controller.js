'use strict';

/** Auth module — registration, login, and "who am I". */

const { db } = require('../../config/db');
const { hashPassword, verifyPassword, sign } = require('../../lib/auth');
const { ApiError, ok, required, oneOf } = require('../../lib/http');

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, user_type: u.user_type });

function register(req, res) {
  const { name, email, phone, password, user_type = 'owner' } = req.body;
  required(req.body, ['name', 'email', 'password']);
  oneOf(user_type, ['owner', 'dealer', 'builder'], 'user_type');

  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Invalid email address');
  if (String(password).length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) throw new ApiError(409, 'An account with this email already exists');

  const info = db
    .prepare('INSERT INTO users (name, email, phone, password_hash, user_type) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, phone || null, hashPassword(password), user_type);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = sign({ sub: user.id, role: user.role });
  ok(res, { token, user: publicUser(user) }, 201);
}

function login(req, res) {
  const { email, password } = req.body;
  required(req.body, ['email', 'password']);

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const token = sign({ sub: user.id, role: user.role });
  ok(res, { token, user: publicUser(user) });
}

function me(req, res) {
  ok(res, { user: publicUser(req.user) });
}

module.exports = { register, login, me };
