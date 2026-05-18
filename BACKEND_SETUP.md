# Backend Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create `.env.local` in project root:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

**Optional**: Leave blank to use fallback mode (local JSON storage, dev-only).

### 3. Start Backend
```bash
npm run server
```
Server runs on `http://localhost:3001`

---

## Architecture

### Two Modes

**Mode 1: Supabase (Production)**
- Uses your Supabase PostgreSQL database
- JWT authentication via Supabase Auth
- Row-Level Security (RLS) policies enforce data isolation
- Requires all 3 env vars above

**Mode 2: Fallback (Development)**
- Uses local `src/data/journalData.json`
- No database connection needed
- JWT auth middleware secures endpoints
- Dev token generation at `POST /api/dev-token`
- Activates when env vars are missing

---

## API Endpoints

### Entries (Attendance Logs)

```
GET    /api/entries              Get all attendance logs (for current user)
POST   /api/entries              Create new attendance log
PUT    /api/entries/:id          Update existing log
DELETE /api/entries/:id          Delete log
```

**Headers Required (Fallback Mode)**:
```
Authorization: Bearer <JWT_TOKEN>
```

### Dev Token (Fallback Mode Only)

```
POST /api/dev-token
Body: { "userId": "user123", "email": "user@example.com" }
Response: { "token": "eyJ0eXAiOiJKV1QiLCJhbGc..." }
```

---

## Security Implementations

### Fix #2: Rate Limiting
- Global: 100 requests/15 min
- Write ops: 50 requests/15 min
- Dev token: 5 requests/hour
- Returns `429 Too Many Requests` when limit exceeded

### Fix #3: Fallback Auth
- When Supabase unavailable: Express requires JWT tokens
- Tokens verified via `authenticateToken` middleware (server/auth.ts)
- Prevents unauthorized data access in fallback mode

### Fix #5: Decimal Precision
- Floating-point math fixed (0.1 + 0.2 now = 0.3)
- All calculations use `decimal.js` library
- Hours calculations accurate to 2 decimal places
- No more hidden rounding errors

### Fix #1: Row-Level Security (Manual Setup)

**Only if using Supabase:**

1. Go to Supabase Dashboard → SQL Editor
2. Create tables with these columns:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  auth_id TEXT UNIQUE,
  is_admin BOOLEAN DEFAULT false,
  email TEXT
);

-- Interns table
CREATE TABLE interns (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  target_hours DECIMAL(10,2),
  start_date DATE,
  end_date DATE
);

-- Attendance logs table
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY,
  intern_id UUID REFERENCES interns(id),
  entry_date DATE,
  start_time TIME,
  end_time TIME,
  hours_worked DECIMAL(10,2),
  activity_description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name TEXT,
  contact_email TEXT
);
```

3. Enable RLS on each table:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE interns ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
```

4. Create helper functions:
```sql
CREATE FUNCTION is_admin_user(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM users WHERE id = user_id AND is_admin = true)
$$ LANGUAGE sql SECURITY DEFINER;

CREATE FUNCTION get_user_id() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text
$$ LANGUAGE sql SECURITY DEFINER;
```

5. Add policies (example for attendance_logs):
```sql
-- Users see only own logs
CREATE POLICY "Users see own logs" ON attendance_logs
  FOR SELECT USING (
    intern_id IN (
      SELECT id FROM interns 
      WHERE user_id = (SELECT id FROM users WHERE auth_id = current_user)
    )
  );

-- Admins see all logs
CREATE POLICY "Admins see all logs" ON attendance_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE is_admin = true)
  );
```

---

## Development

### Local Testing (Fallback Mode)

1. **Start server** (without env vars):
   ```bash
   npm run server
   ```

2. **Get dev token**:
   ```bash
   curl -X POST http://localhost:3001/api/dev-token \
     -H "Content-Type: application/json" \
     -d '{"userId":"user123","email":"test@example.com"}'
   ```
   Response: `{"token":"eyJ0..."}`

3. **Use token for requests**:
   ```bash
   curl http://localhost:3001/api/entries \
     -H "Authorization: Bearer eyJ0..."
   ```

4. **Test rate limiting** (should get 429 after 50):
   ```bash
   for ($i=1; $i -le 55; $i++) {
     curl -X POST http://localhost:3001/api/entries \
       -H "Authorization: Bearer eyJ0..." \
       -H "Content-Type: application/json" \
       -d '{"date":"2026-05-18","startTime":"09:00","endTime":"17:00","activity":"Work"}'
   }
   ```

### Production (Supabase)

1. Set all 3 environment variables in deployment platform
2. Backend automatically switches to Supabase mode
3. RLS policies enforce security at database level
4. Rate limiting still active

---

## Dependencies Added

- **express-rate-limit**: DoS prevention (Fix #2)
- **decimal.js**: Precise decimal math (Fix #5)
- **jsonwebtoken**: JWT generation/verification (Fix #3)
- **@types/jsonwebtoken**: TypeScript types

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot find module 'decimal.js'` | Run `npm install` |
| `ETARGET jsonwebtoken@9.1.2` | Already fixed in package.json (v9.0.2) |
| Server won't start | Check port 3001 not in use: `netstat -ano \| findstr :3001` |
| Entries endpoint returns empty | Check: env vars OR `src/data/journalData.json` exists |
| 429 Too Many Requests | Rate limit exceeded. Wait 15 minutes or restart server. |
| RLS policies not working | Verify: policy syntax correct, tables have RLS enabled, test with `current_user_id()` |

---

## Files

- `server/index.ts` - Express backend with rate limiting
- `server/auth.ts` - JWT middleware for fallback mode
- `src/utils/decimal-math.ts` - Decimal precision utilities
- `src/data/journalData.json` - Local fallback data
- `.env.local` - Environment variables (create this)

---

## Next Steps

- [ ] Configure Supabase (if production)
- [ ] Test locally: `npm run server`
- [ ] Deploy to Vercel/Railway/Fly.io
- [ ] Monitor rate limit violations
- [ ] Enable RLS policies in Supabase

