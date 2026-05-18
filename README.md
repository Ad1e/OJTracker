# OJTracker - On-the-Job Training Hours Tracker

A simple, accurate time tracking application for on-the-job training programs. Log hours worked, visualize progress, and get completion estimates.

**Tech**: React 19 + TypeScript + Vite + Tailwind CSS + Express + Supabase (optional)

---

## Quick Start

### 1. Clone & Install
```bash
git clone <repo-url>
cd OJTracker
npm install
```

### 2. Create `.env.local` (optional)
```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```
**Skip this** to use local development mode (works offline).

### 3. Start the App
```bash
# Start frontend + backend together
npm run dev:all

# OR separately:
npm run server    # Terminal 1: Backend on :3001
npm run dev       # Terminal 2: Frontend on :5173
```

Open `http://localhost:5173`

---

## Features

? Log hours with date, start/end times, activity description  
?? View charts: hours worked, progress to target, completion estimate  
?? Manage trainee profile with target hours  
?? Cloud sync with Supabase (or offline mode)  
?? Secure authentication & data isolation  
?? Responsive mobile design  

---

## How It Works

**Development Mode** (no Supabase)
- Uses local JSON file
- No database needed
- Perfect for testing

**Production Mode** (with Supabase)
- PostgreSQL database
- Real authentication
- Row-Level Security for data isolation

---

## Setup Guide

**For Backend / Database Setup**: See [BACKEND_SETUP.md](BACKEND_SETUP.md)

Includes:
- Environment variable configuration
- API endpoint reference
- Security features (rate limiting, encryption, precision math)
- Supabase RLS policies
- Local development testing
- Troubleshooting

---

## Deploy

### Vercel (Recommended)
```bash
# Frontend auto-deploys
# Backend: Add env vars in Vercel dashboard
```

### Railway / Fly.io
```bash
# Connect your repo
# Add 3 env vars
# Deploy (auto)
```

### Self-Hosted
```bash
npm install
npm run build
npm run server   # Start backend
npm run preview  # Serve frontend
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS, PostCSS |
| Charts | Recharts |
| Backend | Express 5, Node.js |
| Database | Supabase PostgreSQL (optional) |
| Auth | Supabase Auth + JWT |
| Form Validation | Zod |

---

## Security

- ? Rate limiting on API endpoints
- ? Precise decimal math (no floating-point errors)
- ? JWT authentication in fallback mode
- ? Row-Level Security policies in Supabase
- ? CORS configured

See [BACKEND_SETUP.md](BACKEND_SETUP.md) for details.

---

## Development

```bash
# Lint
npm run lint

# Build
npm run build

# Type check
tsc -b
```

---

## Project Structure

```
OJTracker/
+-- src/
¦   +-- components/          # React components
¦   +-- hooks/               # Custom React hooks
¦   +-- utils/               # Utility functions (decimal math, etc)
¦   +-- pages/               # Page components
¦   +-- context/             # React Context (auth)
¦   +-- config/              # Constants, environment
¦   +-- App.tsx              # Main component
+-- server/
¦   +-- index.ts             # Express backend
¦   +-- auth.ts              # JWT middleware
+-- prisma/
¦   +-- schema.prisma        # Database schema
+-- public/                  # Static files
+-- BACKEND_SETUP.md         # Backend/Database guide
```

---

## FAQ

**Q: Do I need Supabase?**  
A: No. App works offline with local JSON. Supabase optional for production.

**Q: How do I add a new database table?**  
A: Edit `prisma/schema.prisma` and run `npx prisma migrate dev`

**Q: How do I fix floating-point math errors?**  
A: Already fixed! Uses decimal.js for accurate calculations.

**Q: How do I prevent other users from seeing my data?**  
A: RLS policies in Supabase + JWT auth in fallback mode. See BACKEND_SETUP.md.

**Q: What if rate limit blocks my requests?**  
A: Limits are generous (100 reads/15min, 50 writes/15min). Contact admin if needed.

---

## License

MIT

---

**Need help?** Check [BACKEND_SETUP.md](BACKEND_SETUP.md) for detailed setup, API reference, and troubleshooting.
