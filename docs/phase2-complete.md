# Phase 2: Auth + RBAC - Complete

## What was built

### Models
- **RefreshToken** model with token rotation and auto-expiry

### Services
- **AuthService** with:
  - `signup()` - Creates Organization + first User (OWNER) in one transaction
  - `login()` - Email/password auth, returns JWT tokens
  - `refresh()` - Rotates refresh token
  - `logout()` - Invalidates refresh token

### Middleware
- **requireAuth** - Validates JWT, injects userId/orgId/userRole into request
- **requireRole(...roles)** - RBAC enforcement

### Routes
- `POST /api/auth/signup` - Create org + first user
- `POST /api/auth/login` - Login (rate limited: 5 attempts per 15 min)
- `POST /api/auth/refresh` - Refresh tokens
- `POST /api/auth/logout` - Logout
- Test routes in `/api/test/*` demonstrating auth + RBAC + cross-org protection

### Security
- bcrypt password hashing (12 rounds)
- JWT access tokens (15min TTL) + refresh tokens (7 days, rotated on use)
- Refresh tokens stored hashed in DB
- Rate limiting on login endpoint
- Zod validation on all inputs
- Email unique per org (not globally)

## Testing

**Note:** MongoDB needs to run as a replica set for transactions. Update docker-compose.yml to include:
```yaml
command: mongod --replSet rs0
```

Then initialize the replica set:
```bash
docker exec -it tally-mongo mongosh --eval "rs.initiate()"
```

### Test suite (tests/phase2-auth.http)

1. Signup - creates "Acme Warehouse Co" org
2. Login - returns access + refresh tokens  
3. Login with wrong credentials - fails with 401
4. Login with wrong org slug - fails with 401
5. Refresh token - rotates and returns new tokens
6. Logout - invalidates refresh token
7. Protected routes - require valid JWT
8. RBAC routes - require specific roles

### Cross-org access protection

Every query MUST filter by `orgId` from `req.orgId` (set by `requireAuth` middleware). Test route `/api/test/cross-org-test/:warehouseId` demonstrates this pattern.

## Acceptance criteria

✅ Signup creates Organization + User in one transaction  
✅ Login returns JWT access + refresh tokens  
✅ Refresh token rotation works  
✅ Logout invalidates refresh token  
✅ Rate limiting on login (5 attempts per 15 min)  
✅ requireAuth middleware validates JWT and injects orgId  
✅ requireRole middleware enforces RBAC  
✅ Cross-org data access is prevented (queries scoped by orgId)  
✅ Email is unique per org (not globally)  
✅ TypeScript compiles with no errors

## Next: Phase 3

Stock ledger service + product catalog with concurrent transaction safety tests.
