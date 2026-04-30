# OJTracker - On-the-Job Tracker Application

A comprehensive time tracking and analytics application for on-the-job training programs, built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- ✅ Time entry logging with date, start/end times, and activity descriptions
- 📊 Interactive charts and analytics showing hours worked, progress, and completion estimates
- 👤 Trainee profile management with configurable target hours
- 📅 Support for holidays and weekend tracking
- ☁️ Cloud-based data storage with Supabase
- 🔐 User authentication
- 📱 Responsive design with Tailwind CSS
- ♿ Accessibility-first UI

## Technology Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + PostCSS
- **Charts:** Recharts
- **Backend:** Express (Node.js) with file-based JSON storage
- **Database:** Supabase (with offline fallback)
- **Package Manager:** npm

## Prerequisites

- Node.js 16+ and npm
- A Supabase account (optional - app works offline)

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd OJTracker
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and update with your values:

```bash
cp .env.example .env.local
```

**Required variables:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous public key

Get these from [Supabase Dashboard](https://app.supabase.com) → Project Settings → API

**Optional variables:**
- `VITE_API_BASE_URL` - Backend API URL (default: `http://localhost:3001`)
- `VITE_DEFAULT_TARGET_HOURS` - Default hours target (default: `500`)
- `VITE_ENABLE_OFFLINE_MODE` - Enable offline mode with fallback data (default: `false`)
- `VITE_DEBUG_MODE` - Enable console debugging (default: `false`)

### 3. Database Setup (Supabase)

If using Supabase, create the required table:

```sql
-- Create log_entries table
CREATE TABLE log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  day INTEGER NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL DEFAULT '08:00',
  end_time TEXT NOT NULL DEFAULT '17:00',
  hours_worked NUMERIC NOT NULL DEFAULT 0,
  activity TEXT NOT NULL,
  is_holiday BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create index for faster queries
CREATE INDEX idx_log_entries_user_date ON log_entries(user_id, date DESC);
```

## Running the Application

### Development Mode

**Terminal 1 - Frontend:**
```bash
npm run dev
```
App will be available at `http://localhost:5173`

**Terminal 2 - Backend Server (optional):**
```bash
npm run server
```
Server will run at `http://localhost:3001`

### Production Build

```bash
npm run build
```

Output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Layout/          # Error Boundary, Layout wrappers
│   ├── UI/              # Reusable UI components (Toast, Modals)
│   └── ...              # Feature components
├── config/
│   ├── constants.ts     # Application-wide constants
│   └── environment.ts   # Environment configuration loader
├── types/
│   └── index.ts         # Central type definitions
├── utils/
│   └── index.ts         # Shared utility functions
├── hooks/
│   ├── useEntries.ts    # Data fetching hook
│   └── useHoursCalc.ts  # Hours calculation logic
├── lib/
│   └── supabase.ts      # Supabase client
├── App.tsx              # Main app component
└── Main.tsx             # Entry point

server/
└── index.ts             # Express backend with API routes
```

## Development Guidelines

### Code Quality

- **Linting:** `npm run lint`
- **TypeScript Check:** `npm run build` (includes type checking)

### Git Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit
3. Push to repository
4. Create pull request

### Styling

- Use Tailwind CSS utility classes
- Follow the design tokens in `src/config/constants.ts`
- Avoid inline styles

### Component Development

- Functional components with hooks
- Proper TypeScript typing (avoid `any`)
- Extract reusable logic into custom hooks or utils
- Use constants from `src/config/constants.ts`

### Error Handling

- Wrap app with `ErrorBoundary` (already done in Main.tsx)
- Use `useToast` hook for user feedback
- Handle async errors with try-catch
- Log errors appropriately

## API Endpoints

### Entries Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | Fetch all entries |
| POST | `/api/entries` | Create new entry |
| PUT | `/api/entries/:id` | Update entry |
| DELETE | `/api/entries/:id` | Delete entry |

### Request/Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_400",
    "message": "Validation failed",
    "details": ["error1", "error2"]
  }
}
```

## Troubleshooting

### Supabase Not Connecting

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
- Check Supabase project status at dashboard
- Enable offline mode: `VITE_ENABLE_OFFLINE_MODE=true`

### Port Already in Use

- Change port in `package.json` script or environment variable
- Kill process on port: `lsof -ti:3001 | xargs kill -9` (macOS/Linux)

### Build Fails

- Clear node_modules: `rm -rf node_modules && npm install`
- Clear TypeScript cache: `tsc --version` or restart IDE
- Check Node version: `node --version` (should be 16+)

## Performance Optimization

- Charts memoized with `useMemo`
- Table virtualization for large datasets
- Debounced search and filters
- Lazy loading of routes (future enhancement)
- Build optimization with Vite

## Security Notes

- Never commit `.env` files with real credentials
- Use `.env.local` for development secrets
- Supabase anonymous keys are safe to expose (row-level security)
- Always validate input on server
- Use HTTPS in production

## Contributing

1. Follow the project structure and coding guidelines
2. Write descriptive commit messages
3. Test changes thoroughly
4. Update README if adding features
5. Keep dependencies up to date

## License

This project is private. See LICENSE file for details.

## Support

For issues or questions:
1. Check existing issues/documentation
2. Create a new GitHub issue with detailed description
3. Contact the development team

---

**Last Updated:** April 2026
**Version:** 1.0.0

import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
