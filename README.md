# EasyChair-Style Backend Skeleton

Production-ready Node.js/Express + MongoDB starter with multi-tenant isolation (Org → Conference → Track), JWT auth, RBAC scaffolding, validation, logging, and health checks. Reviewer portal and business workflows are intentionally not implemented yet.

## Quick start
- Copy `.env.example` to `.env` and fill values (`MONGODB_URI`, `JWT_SECRET`, optional `SUPER_ADMIN_EMAILS` as comma-separated emails).
- Start MongoDB locally: `docker-compose up -d mongo`.
- Install deps (already run here): `npm install`.
- Run the API: `npm run dev` (or `npm start`).
- Health check: `GET http://localhost:3000/health` → `{ ok: true }`.

## Architecture
- `src/app.js`: Express app wiring (security, parsers, request ID, routing, error handler).
- `src/server.js`: Boots DB connection and HTTP server.
- `src/config/*`: Env config + pino logger.
- `src/database/mongoose.js`: Mongoose connection helper.
- `src/middleware/*`: Request ID, tenant resolver (`x-org-id` or JWT claim), auth/JWT verify, RBAC guard, Zod validation, error formatter.
- `src/models/*`: Mongoose schemas with timestamps, indexes, `isDeleted` soft-delete flag.
- `src/repositories/*`: Data access; tenant repositories enforce `orgId` on every query.
- `src/services/*`: Business logic for auth/orgs/conferences/tracks.
- `src/controllers/*`: HTTP handlers only.
- `src/routes/*`: Route definitions.
- `src/validation/*`: Zod schemas for body/query/params.

## Auth + RBAC
- `POST /auth/login` accepts `{ email, password?, name?, orgId? }` (stub: creates user if missing, checks password when stored).
- JWT payload includes user, memberships, optional orgId, and `globalRoles` (matches `SUPER_ADMIN_EMAILS` env).
- `requireRole` supports `SUPER_ADMIN`, `ADMIN`, `AUTHOR`; super admins can create orgs without `x-org-id`, other endpoints require tenant context.
- RBAC is evaluated per-tenant via `req.tenant.orgId` and membership roles.

## Tenancy model
- Tenant context resolved from `x-org-id` header (preferred) or JWT claim `orgId`. Must be a valid ObjectId.
- Repository layer (`TenantRepository`) always injects `orgId` + `isDeleted:false` into filters, so cross-org queries are blocked by design.
- Endpoints that touch conferences/tracks require `x-org-id`; requests without it are rejected unless explicitly SUPER_ADMIN-only.

## Implemented routes
- `GET /health` → `{ ok: true }`.
- `POST /auth/login` → `{ token, user }`.
- `POST /orgs` (SUPER_ADMIN) → create organization; also adds creator as ADMIN member.
- `GET /orgs/me` → orgs for current user (via memberships).
- `POST /orgs/:orgId/members` (ADMIN or SUPER_ADMIN) → add or update an org member's role within that org.
- `GET /orgs/:orgId/members` (ADMIN/AUTHOR/SUPER_ADMIN) → list members for the given org (requires membership unless super admin).
- `GET /users` (ADMIN or SUPER_ADMIN) → list users for admin selection (supports optional `search` query).
- `POST /conferences` (ADMIN or SUPER_ADMIN, requires `x-org-id`) → create conference in tenant.
- `GET /conferences` (ADMIN/AUTHOR/SUPER_ADMIN) → list conferences in tenant.
- `POST /tracks` (ADMIN or SUPER_ADMIN) → create track for a conference (tenant + conference scoped).
- `GET /tracks?conferenceId=...` (ADMIN/AUTHOR/SUPER_ADMIN) → list tracks for the given conference in tenant.

## Frontend integration notes
- Always send `Authorization: Bearer <jwt>` for protected routes.
- Include `x-org-id` header for any org-scoped action (all conferences/tracks). Without it, non-super-admins are rejected.
- Use the response `requestId` for tracing/logging client-side errors.
- Roles per org come from JWT `orgRoles`; super admins are defined via env and bypass org membership checks.
- Slugs must be lowercase alphanumeric + hyphen; enforced by validation and DB unique indexes.

## Testing checklist
- `docker-compose up -d mongo` then `npm run dev`.
- Exercise login, then org creation (with SUPER_ADMIN email), then conferences/tracks with `x-org-id`.
- Verify errors are shaped as `{ requestId, code, message, details }` and conference/track queries never return data from other orgs.

## Submission & Payments (step 2)
Implemented author workflows, payments stub, timelines, and admin decisions with strict org scoping.

- **Models**: `ConferenceSettings`, `AuthorProfile`, `Submission`, `SubmissionFile`, `SubmissionTimelineEvent`, `PaymentIntent` (with required indexes).
- **Storage adapter**: `StorageProvider.putObject/getSignedUrl` stub (no real S3 calls) used by file endpoints.
- **State rules**: Author edits only in `DRAFT`; file upload allowed in `DRAFT|PAYMENT_PENDING`; submit requires paid intent when `requiredBeforeSubmit` in `ConferenceSettings`; no revisions after submit; optional admin final upload if allowed.
- **Timeline**: Every change writes `SubmissionTimelineEvent` (create, file upload, payment intent, payment confirm, status change, submit, decision).
- **Tenant isolation**: All repositories enforce `orgId`; submissions cannot be fetched across orgs.

### Headers to send
- Protected endpoints: `Authorization: Bearer <jwt>` and `x-org-id: <org ObjectId>`.
- Payment webhook: `x-shared-secret: <PAYMENT_WEBHOOK_SECRET>` (default `dev-shared-secret`).

### Author profile
- `POST /profile` upsert  
  Body: `{ "name": "...", "affiliation": "...", "orcid": "...", "phone": "optional" }`  
  Response: stored profile.
- `GET /profile` -> `{ name, affiliation, orcid, phone, ... }` (empty object if missing).

### Author submissions
- `POST /submissions` create draft  
  Body: `{ "conferenceId": "...", "trackId": "...", "metadata": { "title": "...", "abstract": "...", "keywords": [".."], "authors": [{ "name": "...", "affiliation": "...", "orcid": "...", "corresponding": true }] } }`  
  Response: submission with `status: "DRAFT"`.
- `PATCH /submissions/:id` update metadata (only when `status=DRAFT`)  
  Body: `{ "metadata": { ...same shape as above... } }` -> updated submission.
- `POST /submissions/:id/files` upload metadata (allowed in `DRAFT|PAYMENT_PENDING`)  
  Body: `{ "originalName": "paper.pdf", "mimeType": "application/pdf", "sizeBytes": 12345, "checksum": "optional" }`  
  Response: file record (`version: "v1"`, `storageKey` stub). File type/size checked against `ConferenceSettings.submissionRules`.
- `POST /submissions/:id/payment-intent` create payment intent, moves submission to `PAYMENT_PENDING`  
  Body: none. Response: `PaymentIntent` (`status: "CREATED"`, `amountCents`, `currency`, `providerRef`). Timeline updated.
- `POST /submissions/:id/submit` submit (requires paid intent when `requiredBeforeSubmit=true`)  
  Body: none. Response: submission with `status: "SUBMITTED"`. Timeline entry added.
- `GET /submissions` list my submissions -> `{ data: [ ... ] }` (scoped to `createdByUserId`).
- `GET /submissions/:id` details -> `{ submission, timeline, files }` (only author can view).

### Admin submissions (ADMIN/SUPER_ADMIN)
- `GET /admin/submissions` filter by `conferenceId`, `trackId`, `status` (query). Returns `{ data: [...] }` in org.
- `POST /admin/submissions/:id/decision` set decision + close submission  
  Body: `{ "status": "ACCEPT|REJECT|...", "notes": "optional" }` -> response submission with `status: "DECISION_MADE"`, timeline `DECISION_SET`.
- `POST /admin/submissions/:id/files/final` upload final on behalf (if `ConferenceSettings.submissionRules.allowAdminUploadFinal=true`)  
  Body: `{ "originalName": "...", "mimeType": "...", "sizeBytes": 12345, "checksum": "optional" }` -> `SubmissionFile` with `version: "final"`; timeline `FILE_UPLOADED`.

### Payment webhook (stub)
- `POST /webhooks/payment` (no auth, uses shared secret header)  
  Headers: `x-shared-secret: <PAYMENT_WEBHOOK_SECRET>`  
  Body: `{ "providerRef": "<from intent>", "orgId": "<org ObjectId>" }`  
  Effect: marks `PaymentIntent` as `PAID`, writes timeline `PAYMENT_CONFIRMED`. Response: `{ "ok": true, "status": "PAID" }`.

### Conference settings
- Persist a `ConferenceSettings` document per conference (unique per `conferenceId`) to drive rules: submission file limits, admin final upload toggle, payment required, decision statuses, AI flags, certificates, email templates. Operations will fail with `CONFERENCE_SETTINGS_NOT_FOUND` if missing.
