# API Documentation

Nestly exposes a RESTful JSON API. All endpoints (except Auth Login/Register and Health) require a valid JWT passed in the `Authorization: Bearer <token>` header.

## Global Headers
- `Authorization: Bearer <JWT>`
- `Content-Type: application/json`

---

## Health

### `GET /health`
- **Auth Required**: No
- **Summary**: Returns system health status.

---

## Authentication

### `POST /auth/register`
- **Auth Required**: No
- **Roles**: None
- **Body**: `{ "email": "...", "password": "...", "name": "...", "role": "OWNER" | "TENANT" }`
- **Summary**: Registers a new user and returns a JWT.

### `POST /auth/login`
- **Auth Required**: No
- **Roles**: None
- **Body**: `{ "email": "...", "password": "..." }`
- **Summary**: Authenticates a user and returns a JWT.

### `GET /auth/me`
- **Auth Required**: Yes
- **Roles**: Any
- **Summary**: Returns the authenticated user's profile.

---

## Properties

### `POST /properties`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Body**: `{ "name": "...", "address": "..." }`
- **Summary**: Creates a new property.
- **Authorization**: Automatically assigns ownership to the requesting `OWNER`.

### `GET /properties`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Summary**: Retrieves a list of properties owned by the requesting user.

### `GET /properties/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Summary**: Retrieves property details.
- **Authorization**: Must be owned by the user.

### `PATCH /properties/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Body**: `{ "name"?: "...", "address"?: "..." }`
- **Summary**: Updates a property.
- **Authorization**: Must be owned by the user.

### `DELETE /properties/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Summary**: Deletes a property.
- **Authorization**: Must be owned by the user.

---

## Units

*Note: Units are nested under properties for creation/listing to ensure clear context.*

### `POST /properties/:propertyId/units`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Body**: `{ "unitNo": 101, "floor": "1st" }`
- **Summary**: Creates a unit within a specific property.
- **Authorization**: User must own `propertyId`.

### `GET /properties/:propertyId/units`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Summary**: Lists all units for a given property.

### `GET /units/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Summary**: Retrieves a specific unit's details.

### `PATCH /units/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Body**: `{ "status"?: "VACANT" | "OCCUPIED" | "MAINTENANCE" }`
- **Summary**: Updates unit status or details.

### `DELETE /units/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Summary**: Deletes a unit.

---

## Tenants

### `POST /tenants`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Body**: `{ "email": "...", "name": "...", "password": "..." }`
- **Summary**: Creates a tenant user account and the associated tenant profile.
- **Authorization**: Profile is linked to the requesting `OWNER`.

### `GET /tenants`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Summary**: Lists tenants created by the requesting owner.

### `GET /tenants/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Summary**: Retrieves specific tenant profile details.

### `PATCH /tenants/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Body**: `{ "name"?: "..." }`
- **Summary**: Updates tenant profile data.

---

## Leases

### `POST /leases`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Body**: `{ "tenantId": 1, "unitId": 2, "startDate": "...", "endDate": "...", "rentAmount": 1500000 }`
- **Summary**: Creates a new lease agreement.

### `GET /leases`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `TENANT`, `ADMIN`
- **Summary**: Retrieves leases. Owners see leases for their properties; Tenants see their own leases.

### `GET /leases/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `TENANT`, `ADMIN`
- **Summary**: Retrieves a specific lease.

### `PATCH /leases/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Body**: `{ "rentAmount"?: 1600000 }`
- **Summary**: Updates lease parameters.

### `POST /leases/:id/activate`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Summary**: Transitions a `PENDING` lease to `ACTIVE`.

### `POST /leases/:id/terminate`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Summary**: Transitions a lease to `TERMINATED`.

---

## Payments

### `POST /payments`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `TENANT`, `ADMIN`
- **Body**: `{ "leaseId": 1, "amount": 1500000, "method": "CARD" }`
- **Summary**: Records a rent payment.

### `GET /payments`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `TENANT`, `ADMIN`
- **Summary**: Lists payments relevant to the user (owner or tenant).

### `GET /payments/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `TENANT`, `ADMIN`
- **Summary**: Retrieves specific payment details.

### `PATCH /payments/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Body**: `{ "status": "PAID" | "FAILED" }`
- **Summary**: Updates payment status (typically used by owners to verify cash/transfer receipts).

---

## Maintenance

### `POST /maintenance`
- **Auth Required**: Yes
- **Roles**: `TENANT`, `OWNER`, `ADMIN`
- **Body**: `{ "unitId": 1, "title": "...", "description": "...", "category": "Plumbing" }`
- **Summary**: Reports a maintenance issue for a unit.

### `GET /maintenance`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `TENANT`, `ADMIN`
- **Summary**: Retrieves maintenance issues relevant to the user.

### `GET /maintenance/:id`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `TENANT`, `ADMIN`
- **Summary**: Retrieves specific maintenance issue details.

### `PATCH /maintenance/:id/status`
- **Auth Required**: Yes
- **Roles**: `OWNER`, `ADMIN`
- **Body**: `{ "status": "IN_PROGRESS" | "RESOLVED" | "CLOSED" }`
- **Summary**: Updates the status of a maintenance ticket.

---

## Dashboard

### `GET /dashboard/owner`
- **Auth Required**: Yes
- **Roles**: `OWNER`
- **Summary**: Returns aggregated data (total properties, active units, total tenants, recent payments) for the owner's dashboard.

### `GET /dashboard/tenant`
- **Auth Required**: Yes
- **Roles**: `TENANT`
- **Summary**: Returns aggregated data (active lease, unpaid rent, recent maintenance) for the tenant's dashboard.

### `GET /dashboard/admin`
- **Auth Required**: Yes
- **Roles**: `ADMIN`
- **Summary**: Returns platform-wide aggregated analytics.
