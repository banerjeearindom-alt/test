# Acreo — a 99acres-style real estate portal

A full-stack property marketplace (buy / rent / list) built **module by module**.
Backend is **Express + Node 22's built-in `node:sqlite`** (no external DB, no native
compilation). Auth is **zero-dependency** (scrypt + HMAC JWT via `node:crypto`).
Frontend is a **no-build vanilla-JS SPA** served statically.

> The only runtime dependency is `express`.

## Quick start

```bash
npm install
npm run seed      # create + populate data/acreo.db with demo listings
npm start         # http://localhost:3000
```

Demo accounts (created by the seed):

| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | `admin@acreo.in`    | `admin123`|
| User  | `priya@example.com` | `password`|

## Features

- **Search & filters** — purpose (buy/rent), type, city, locality, BHK, budget, sort, pagination
- **Property detail** — gallery, specs, amenities, price/sqft, owner card
- **Post / edit / delete** listings (owner-scoped)
- **Shortlist** (favorites) and **enquiries** (leads → seller inbox)
- **Dashboards** — my listings, shortlist, received enquiries
- **Admin console** — platform stats, moderation, feature toggling
- **Auth** — register/login with roles (`user`, `admin`) and seller types (`owner`, `dealer`, `builder`)

## Project layout

```
server.js                 # entrypoint
src/
  app.js                  # express wiring, static + SPA fallback, error handler
  config/db.js            # node:sqlite connection + schema (migrate)
  lib/
    auth.js               # scrypt password hashing + HMAC token sign/verify
    http.js               # asyncHandler, ApiError, response + validation helpers
  middleware/auth.js      # attachUser / requireAuth / requireRole
  modules/
    auth/                 # register, login, me
    users/                # profile, public agent page
    properties/           # CRUD + repo (hydrate + filtered search)
    search/               # filter metadata + typeahead
    favorites/            # shortlist
    leads/                # enquiries + seller inbox
    admin/                # stats + moderation
public/                   # SPA (index.html, css/, js/)
scripts/seed.js           # demo data
```

See [`DESIGN.md`](./DESIGN.md) for the architecture, data model, API surface, and
the module-by-module build order.

## API (summary)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register` \| `/login` | – | get a token |
| GET  | `/api/auth/me` | ✔ | current user |
| GET  | `/api/properties` | – | search/list (filters + pagination) |
| GET  | `/api/properties/:id` | – | detail |
| POST/PUT/DELETE | `/api/properties[/:id]` | ✔ | create / update / delete |
| GET  | `/api/properties/mine` | ✔ | my listings |
| GET  | `/api/search/meta` \| `/suggest` | – | filter options / typeahead |
| GET/POST/DELETE | `/api/favorites[/:id]` | ✔ | shortlist |
| POST | `/api/leads` | – | send enquiry |
| GET  | `/api/leads/received`, PATCH `/api/leads/:id` | ✔ | seller inbox |
| GET  | `/api/users/:id`, PUT `/api/users/me` | –/✔ | profile |
| GET  | `/api/admin/stats` \| `/users`, PATCH `/admin/properties/:id` | admin | moderation |
