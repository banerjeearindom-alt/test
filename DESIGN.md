# Acreo — Design Document

A blueprint for building a 99acres-style real-estate marketplace. This documents
the product scope, architecture, data model, API, and the **module-by-module build
order** the code follows.

---

## 1. Product scope

A marketplace connecting **property seekers** with **owners / dealers / builders**.

Core user journeys:

1. **Discover** — search & filter listings by city, locality, purpose, type, budget, BHK.
2. **Evaluate** — view a rich property detail page (gallery, specs, amenities, price/sqft, seller).
3. **Act** — shortlist properties and send an enquiry to the seller.
4. **Supply** — sellers post, edit and manage listings and read enquiries.
5. **Govern** — admins see platform stats and moderate/feature listings.

Personas & roles:

| Persona | `role` | `user_type` |
|---------|--------|-------------|
| Seeker / seller | `user` | `owner` \| `dealer` \| `builder` |
| Platform admin | `admin` | – |

---

## 2. Architecture

```
Browser SPA  ──fetch──►  Express API  ──►  SQLite (node:sqlite, WAL)
(vanilla JS)             (modular routers)   file: data/acreo.db
```

Deliberate choices for a self-contained, runnable reference:

- **`node:sqlite`** (Node ≥ 22, built-in) — a real relational DB with zero install
  and zero native compilation. Swappable for Postgres by replacing `config/db.js`
  and the `db.prepare(...)` calls in the repos.
- **Zero-dependency auth** — scrypt password hashing and an HMAC-SHA256 JWT, both
  from `node:crypto`. No `bcrypt`/`jsonwebtoken`.
- **No frontend build step** — plain HTML/CSS/JS with a hash router, so the app runs
  by opening a port. Keeps the focus on modules, not tooling.
- **Modular monolith** — each feature is a folder under `src/modules/*` exposing an
  Express router. Trivial to split into services later.

### Layering

```
routes  ──►  controller  ──►  repo / db        (per module)
                 │
             lib/http (validation, ApiError, response envelope)
             lib/auth (crypto)
             middleware/auth (attachUser, requireAuth, requireRole)
```

Response envelope is uniform: success → `{ "data": ... }`, error → `{ "error", "details" }`.

---

## 3. Data model

```
users(id, name, email✦, phone, password_hash, role, user_type, created_at)
properties(id, owner_id→users, title, description, purpose, property_type,
           bhk, bathrooms, furnishing, price, area_sqft, city, locality, address,
           latitude, longitude, cover_image, status, featured, views, posted_at, updated_at)
property_images(id, property_id→properties, url, sort_order)
amenities(id, name✦)
property_amenities(property_id→properties, amenity_id→amenities)   [M:N]
favorites(user_id→users, property_id→properties, created_at)       [shortlist]
leads(id, property_id→properties, user_id→users?, name, email, phone, message, status, created_at)
```
(`✦` = unique. Foreign keys `ON DELETE CASCADE`; `leads.user_id` is `SET NULL` so
anonymous enquiries survive.)

Enumerations:

- `purpose`: `sale | rent`
- `property_type`: `apartment | villa | plot | office | shop | pg`
- `furnishing`: `unfurnished | semi | furnished`
- `property.status`: `active | pending | inactive | sold`
- `lead.status`: `new | contacted | closed`

Indexes on `city, purpose, property_type, price, owner_id` and `leads.property_id`
back the search and dashboard queries.

Price is stored as an integer in INR — an absolute amount for `sale`, a monthly
amount for `rent`. The UI formats it in the Indian lakh/crore system.

---

## 4. Module-by-module build order

The code was built (and can be read) in this dependency order:

1. **config/db** — connection + schema migration (idempotent).
2. **lib/auth** — password hashing + token sign/verify.
3. **lib/http** — async handler, `ApiError`, response + validation helpers.
4. **middleware/auth** — `attachUser`, `requireAuth`, `requireRole`.
5. **auth module** — register / login / me.
6. **properties module** — repo (`hydrate`, `search`) + CRUD controller + routes.
   This is the core; search, favorites, leads and admin all build on it.
7. **search module** — filter metadata + locality typeahead.
8. **favorites module** — shortlist add/remove/list.
9. **leads module** — enquiry create + seller inbox + status update.
10. **users module** — profile update + public agent page.
11. **admin module** — stats + moderation (role-gated).
12. **app.js / server.js** — wire routers, static SPA, SPA fallback, error handler.
13. **Frontend** — `api.js` (client) → `ui.js` (helpers) → `app.js` (router + views).
14. **seed** — demo users, amenities and listings.

Each backend module is independent: it owns its router and talks to the DB through
its own repo/controller, so a module can be modified or replaced in isolation.

---

## 5. Search design

`properties.repo.search(filters)` builds a parameterised SQL query (no string
interpolation of user input) from optional filters: `purpose, property_type, city,
locality, q (full-text-ish LIKE), bhk, min_price, max_price, furnishing, featured,
owner_id, status`. It returns `{ items, pagination }`. Sorting supports newest,
price asc/desc, largest, and most-viewed, with featured listings floated to the top.
Public searches are pinned to `status = 'active'`; owner-scoped and admin queries can
see any status.

---

## 6. Security notes (reference implementation)

Implemented: parameterised queries, scrypt hashing with per-user salt, constant-time
comparisons, role/ownership checks on every mutating route, HTML escaping in the SPA,
JSON body-size limit.

Out of scope for this demo (production would add): refresh-token rotation & server-side
revocation, rate limiting, email verification, CSRF hardening if cookie auth is used,
image upload + storage (currently image URLs), and moving secrets to a vault.

---

## 7. Extension ideas

Map/geo search (lat/long already stored), saved searches & alerts, real image
uploads (S3), payments for featured listings, reviews & ratings, chat between buyer
and seller, and a recommendation feed.
