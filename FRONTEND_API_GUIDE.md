# Frontend Integration Guide - Role-Based Access Control API

This guide documents all APIs for the new role hierarchy system:
**Super Admin > Admin > Manager > Sub-manager**

---

## Table of Contents

1. [Authentication](#authentication)
2. [Role System Overview](#role-system-overview)
3. [JWT Token Structure](#jwt-token-structure)
4. [Public Conference Signup](#public-conference-signup)
5. [Organization Member APIs](#organization-member-apis)
6. [Conference Member APIs](#conference-member-apis)
7. [Track Member APIs](#track-member-apis)
8. [Conference Management APIs](#conference-management-apis)

---

## Authentication

### Standard Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",        // Optional, used for new users
  "orgId": "org_object_id"   // Optional, set active org context
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["SUPER_ADMIN"],      // Global roles
    "orgRoles": [
      { "orgId": "org_id", "role": "ADMIN" }
    ],
    "conferenceRoles": [
      { "conferenceId": "conf_id", "orgId": "org_id", "role": "MANAGER", "managesFullConference": true }
    ],
    "trackRoles": [
      { "trackId": "track_id", "conferenceId": "conf_id", "role": "SUB_MANAGER" }
    ]
  }
}
```

---

## Role System Overview

| Role | Scope | Can Create | Can Manage |
|------|-------|------------|------------|
| **SUPER_ADMIN** | Global | ADMIN, MANAGER | All organizations |
| **ADMIN** | Organization | MANAGER, SUB_MANAGER | Org's conferences, tracks |
| **MANAGER** | Conference(s) | SUB_MANAGER | Assigned conferences, tracks |
| **SUB_MANAGER** | Track(s) / Conference | - | Assigned tracks or full conference |
| **AUTHOR** | Conference | - | Own submissions only |

### Required Headers

All protected endpoints require:

```http
Authorization: Bearer <jwt_token>
x-org-id: <organization_object_id>
```

---

## JWT Token Structure

After login, the JWT contains:

```javascript
{
  "sub": "user_id",
  "email": "user@example.com",
  "orgId": "active_org_id",
  
  // Global roles (SUPER_ADMIN only)
  "globalRoles": ["SUPER_ADMIN"],
  
  // Organization-level roles
  "orgRoles": [
    { "orgId": "org_id", "role": "ADMIN" }
  ],
  
  // Conference-level roles (MANAGER, SUB_MANAGER, AUTHOR)
  "conferenceRoles": [
    {
      "conferenceId": "conf_id",
      "orgId": "org_id",
      "role": "MANAGER",
      "managesFullConference": false
    }
  ],
  
  // Track-level roles (SUB_MANAGER only)
  "trackRoles": [
    {
      "trackId": "track_id",
      "conferenceId": "conf_id",
      "role": "SUB_MANAGER"
    }
  ]
}
```

---

## Public Conference Signup

**This is how AUTHORS join a conference via a unique link.**

### Get Conference Info (Public)

```http
GET /conference/join/:accessToken
```

**Response:**
```json
{
  "id": "conference_id",
  "name": "AI Conference 2026",
  "slug": "ai-conference-2026",
  "status": "ACTIVE",
  "startDate": "2026-03-01T00:00:00.000Z",
  "endDate": "2026-03-05T00:00:00.000Z",
  "orgId": "org_id"
}
```

### Sign Up/Sign In via Conference Link (Public)

```http
POST /conference/join/:accessToken
Content-Type: application/json

{
  "email": "author@example.com",
  "password": "securepassword",
  "name": "Jane Author"
}
```

**Response (201 for new user, 200 for existing):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "author@example.com",
    "name": "Jane Author",
    "roles": [],
    "orgRoles": [],
    "conferenceRoles": [
      { "conferenceId": "conf_id", "orgId": "org_id", "role": "AUTHOR", "managesFullConference": false }
    ],
    "trackRoles": []
  },
  "conference": {
    "id": "conference_id",
    "name": "AI Conference 2026",
    "slug": "ai-conference-2026"
  },
  "isNewUser": true
}
```

> **Note:** If the user already has a role (ADMIN, MANAGER, etc.) in this conference or organization, they retain that role and a new AUTHOR role is NOT created.

---

## Organization Member APIs

### Create Organization (SUPER_ADMIN only)

```http
POST /orgs
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Organization",
  "slug": "my-org"
}
```

### List My Organizations

```http
GET /orgs/me
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "org_id",
    "name": "My Organization",
    "slug": "my-org",
    "status": "ACTIVE"
  }
]
```

### Add Member to Organization (ADMIN/SUPER_ADMIN)

```http
POST /orgs/:orgId/members
Authorization: Bearer <token>
x-org-id: <orgId>
Content-Type: application/json

{
  "userId": "user_object_id",
  "role": "ADMIN" | "MANAGER"
}
```

> **Note:** AUTHOR cannot be assigned at org level. Authors sign up via conference links.

**Response:**
```json
{
  "member": {
    "orgId": "org_id",
    "userId": "user_id",
    "role": "MANAGER",
    "status": "ACTIVE"
  },
  "created": true
}
```

### List Organization Members

```http
GET /orgs/:orgId/members
Authorization: Bearer <token>
x-org-id: <orgId>
```

**Response:**
```json
[
  {
    "orgId": "org_id",
    "userId": "user_id",
    "role": "ADMIN",
    "status": "ACTIVE",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
]
```

---

## Conference Member APIs

### Assign Manager/Sub-manager to Conference (ADMIN/MANAGER)

```http
POST /conferences/:conferenceId/members
Authorization: Bearer <token>
x-org-id: <orgId>
Content-Type: application/json

{
  "userId": "user_object_id",
  "role": "MANAGER" | "SUB_MANAGER",
  "managesFullConference": true  // Optional, for SUB_MANAGER only
}
```

> **Note:** AUTHOR cannot be assigned via this endpoint. Use conference access link.

**Response:**
```json
{
  "member": {
    "conferenceId": "conf_id",
    "userId": "user_id",
    "role": "MANAGER",
    "status": "ACTIVE",
    "managesFullConference": false
  },
  "created": true
}
```

### List Conference Members

```http
GET /conferences/:conferenceId/members
Authorization: Bearer <token>
x-org-id: <orgId>
```

**Response:**
```json
{
  "data": [
    {
      "conferenceId": "conf_id",
      "userId": "user_id",
      "role": "MANAGER",
      "status": "ACTIVE",
      "managesFullConference": false,
      "user": {
        "id": "user_id",
        "name": "Conference Manager",
        "email": "manager@example.com"
      }
    },
    {
      "conferenceId": "conf_id",
      "userId": "author_id",
      "role": "AUTHOR",
      "status": "ACTIVE",
      "user": {
        "id": "author_id",
        "name": "Paper Author",
        "email": "author@example.com"
      }
    }
  ]
}
```

### List Conference Members by Role

```http
GET /conferences/:conferenceId/members/role/:role
Authorization: Bearer <token>
x-org-id: <orgId>
```

Example: `GET /conferences/conf123/members/role/AUTHOR`

### Remove Member from Conference (ADMIN only)

```http
DELETE /conferences/:conferenceId/members/:userId
Authorization: Bearer <token>
x-org-id: <orgId>
```

Optional query param: `?role=MANAGER` to remove specific role only.

---

## Track Member APIs

### Assign Sub-manager to Track (ADMIN/MANAGER)

```http
POST /tracks/:trackId/members
Authorization: Bearer <token>
x-org-id: <orgId>
Content-Type: application/json

{
  "userId": "user_object_id"
}
```

> **Note:** Only SUB_MANAGER role can be assigned at track level.

**Response:**
```json
{
  "member": {
    "trackId": "track_id",
    "conferenceId": "conf_id",
    "userId": "user_id",
    "role": "SUB_MANAGER",
    "status": "ACTIVE"
  },
  "created": true
}
```

### List Track Members

```http
GET /tracks/:trackId/members
Authorization: Bearer <token>
x-org-id: <orgId>
```

**Response:**
```json
{
  "data": [
    {
      "trackId": "track_id",
      "conferenceId": "conf_id",
      "userId": "user_id",
      "role": "SUB_MANAGER",
      "status": "ACTIVE",
      "user": {
        "id": "user_id",
        "name": "Track Manager",
        "email": "track-mgr@example.com"
      }
    }
  ]
}
```

### List All Track Assignments for a Conference

```http
GET /tracks/conference/:conferenceId/members
Authorization: Bearer <token>
x-org-id: <orgId>
```

**Response:**
```json
{
  "data": [
    {
      "trackId": "track_id",
      "track": {
        "name": "Machine Learning Track",
        "code": "ML"
      },
      "userId": "user_id",
      "role": "SUB_MANAGER",
      "user": {
        "id": "user_id",
        "name": "Track Manager",
        "email": "track-mgr@example.com"
      }
    }
  ]
}
```

### Remove Sub-manager from Track (ADMIN/MANAGER)

```http
DELETE /tracks/:trackId/members/:userId
Authorization: Bearer <token>
x-org-id: <orgId>
```

---

## Conference Management APIs

### Create Conference (ADMIN/SUPER_ADMIN)

```http
POST /conferences
Authorization: Bearer <token>
x-org-id: <orgId>
Content-Type: application/json

{
  "name": "AI Conference 2026",
  "slug": "ai-conference-2026",
  "status": "ACTIVE",
  "startDate": "2026-03-01",
  "endDate": "2026-03-05"
}
```

**Response includes accessLink:**
```json
{
  "_id": "conference_id",
  "orgId": "org_id",
  "name": "AI Conference 2026",
  "slug": "ai-conference-2026",
  "accessToken": "abc123def456...",
  "accessLink": "/conference/join/abc123def456...",
  "status": "ACTIVE",
  "startDate": "2026-03-01T00:00:00.000Z",
  "endDate": "2026-03-05T00:00:00.000Z"
}
```

> **Important:** The `accessLink` is the public URL for author signup. Distribute this link to potential authors.

### List Conferences

```http
GET /conferences
Authorization: Bearer <token>
x-org-id: <orgId>
```

### Create Track (ADMIN/SUPER_ADMIN)

```http
POST /tracks
Authorization: Bearer <token>
x-org-id: <orgId>
Content-Type: application/json

{
  "conferenceId": "conference_object_id",
  "name": "Machine Learning",
  "code": "ML"
}
```

### List Tracks

```http
GET /tracks?conferenceId=<conference_id>
Authorization: Bearer <token>
x-org-id: <orgId>
```

---

## Search Users (for Role Assignment)

```http
GET /users?search=john
Authorization: Bearer <token>
x-org-id: <orgId>
```

**Response:**
```json
{
  "data": [
    {
      "id": "user_id",
      "email": "john@example.com",
      "name": "John Doe"
    }
  ]
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "requestId": "uuid",
  "code": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}  // Optional additional info
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `ORG_REQUIRED` | 400 | Missing `x-org-id` header |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_ROLE` | 400 | Role cannot be assigned at this level |

---

## Frontend Implementation Tips

### 1. Role-Based UI Rendering

```javascript
function getUserHighestRole(user) {
  if (user.roles?.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
  if (user.orgRoles?.some(r => r.role === 'ADMIN')) return 'ADMIN';
  if (user.orgRoles?.some(r => r.role === 'MANAGER')) return 'MANAGER';
  if (user.conferenceRoles?.some(r => r.role === 'MANAGER')) return 'MANAGER';
  if (user.conferenceRoles?.some(r => r.role === 'SUB_MANAGER')) return 'SUB_MANAGER';
  if (user.trackRoles?.some(r => r.role === 'SUB_MANAGER')) return 'SUB_MANAGER';
  if (user.conferenceRoles?.some(r => r.role === 'AUTHOR')) return 'AUTHOR';
  return null;
}
```

### 2. Conference Access Link Flow

```javascript
async function handleConferenceJoin(accessToken, userData) {
  const response = await fetch(`/conference/join/${accessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  
  // Store token
  localStorage.setItem('token', data.token);
  
  // Redirect based on role
  const role = data.user.conferenceRoles[0]?.role;
  if (role === 'AUTHOR') {
    window.location.href = '/author/dashboard';
  } else {
    window.location.href = '/admin/dashboard';
  }
}
```

### 3. Check User Permissions

```javascript
function canManageConference(user, conferenceId) {
  // Super admin can manage everything
  if (user.roles?.includes('SUPER_ADMIN')) return true;
  
  // Check org-level ADMIN
  const orgRole = user.orgRoles?.find(r => r.role === 'ADMIN');
  if (orgRole) return true;
  
  // Check conference-level MANAGER
  const confRole = user.conferenceRoles?.find(
    r => r.conferenceId === conferenceId && r.role === 'MANAGER'
  );
  return !!confRole;
}

function canManageTrack(user, trackId, conferenceId) {
  if (canManageConference(user, conferenceId)) return true;
  
  // Check conference-level SUB_MANAGER with full conference access
  const confSubManager = user.conferenceRoles?.find(
    r => r.conferenceId === conferenceId && 
         r.role === 'SUB_MANAGER' && 
         r.managesFullConference
  );
  if (confSubManager) return true;
  
  // Check track-level SUB_MANAGER
  const trackRole = user.trackRoles?.find(r => r.trackId === trackId);
  return !!trackRole;
}
```

---

## Quick Reference: All Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | ❌ | Standard login |
| `GET` | `/conference/join/:token` | ❌ | Get conference info (public) |
| `POST` | `/conference/join/:token` | ❌ | Author signup via link |
| `POST` | `/orgs` | SUPER_ADMIN | Create organization |
| `GET` | `/orgs/me` | ✅ | List my organizations |
| `POST` | `/orgs/:id/members` | ADMIN | Add org member |
| `GET` | `/orgs/:id/members` | ✅ | List org members |
| `POST` | `/conferences` | ADMIN | Create conference |
| `GET` | `/conferences` | ✅ | List conferences |
| `POST` | `/conferences/:id/members` | ADMIN/MANAGER | Add conference member |
| `GET` | `/conferences/:id/members` | ✅ | List conference members |
| `GET` | `/conferences/:id/members/role/:role` | ✅ | List by role |
| `DELETE` | `/conferences/:id/members/:userId` | ADMIN | Remove member |
| `POST` | `/tracks` | ADMIN | Create track |
| `GET` | `/tracks` | ✅ | List tracks |
| `POST` | `/tracks/:id/members` | ADMIN/MANAGER | Add track sub-manager |
| `GET` | `/tracks/:id/members` | ✅ | List track members |
| `GET` | `/tracks/conference/:id/members` | ✅ | List all track assignments |
| `DELETE` | `/tracks/:id/members/:userId` | ADMIN/MANAGER | Remove sub-manager |
| `GET` | `/users` | ADMIN | Search users |
