#!/usr/bin/env node

/**
 * OJTracker Development Quick Start Guide
 * 
 * This file documents the key architectural changes and how to use them
 */

// ─── Using Centralized Constants ──────────────────────────────────────────

// BEFORE ❌
const TARGET_HOURS = 500;
const HOURS_PER_DAY = 8;
const BREAK_HOURS = 1;

// AFTER ✅
import { HOURS_CONFIG, UI_CONFIG, VALIDATION_RULES } from '@/config/constants';

// Use like this:
const targetHours = HOURS_CONFIG.DEFAULT_TARGET_HOURS;
const standardHours = HOURS_CONFIG.STANDARD_HOURS_PER_DAY;
const validationMin = VALIDATION_RULES.MIN_START_HOUR;

// Benefits:
// - Change once, applies everywhere
// - Self-documenting code
// - Type-safe with TypeScript

// ─── Using Centralized Types ─────────────────────────────────────────────

// BEFORE ❌ (scattered across files)
// src/hooks/useHoursCalc.ts
export interface LogEntry { ... }
// src/components/traineeprofile.tsx  
export interface TraineeProfileData { ... }

// AFTER ✅
import type { 
  LogEntry, 
  TraineeProfileData, 
  HoursCalcResult,
  Toast,
  UseEntriesReturn 
} from '@/types';

// Benefits:
// - One source of truth
// - No circular imports
// - Easy to find all types

// ─── Using Utility Functions ─────────────────────────────────────────────

// BEFORE ❌ (duplicated in 3 different components)
function getInitials(name: string): string {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2);
}

// AFTER ✅
import { 
  getInitials, 
  formatDate, 
  calculateHours,
  highlight,
  isValidTimeRange,
  retryWithBackoff 
} from '@/utils';

// Use them:
const initials = getInitials("John Doe"); // "JD"
const formatted = formatDate("2026-04-30"); // "Apr 30, 2026"
const hours = calculateHours("08:00", "17:00"); // 9
const validation = isValidTimeRange("08:00", "17:00"); // { valid: true }

// Benefits:
// - No duplication
// - Consistent behavior
// - Easy to test
// - Type-safe

// ─── Using Toast Notifications ───────────────────────────────────────────

// BEFORE ❌ (scattered state in App.tsx)
const [toast, setToast] = useState(null);
const showToast = useCallback((msg, type) => {
  // 20+ lines of state management
}, []);

// AFTER ✅
import { useToast } from '@/components/UI/Toast';

function MyComponent() {
  const { showToast } = useToast();
  
  const handleSave = async () => {
    try {
      await api.save(data);
      showToast("Saved successfully!", "success");
    } catch (error) {
      showToast("Save failed: " + error.message, "error");
    }
  };
}

// Benefits:
// - Clean, simple API
// - Auto-dismissing toasts
// - Error toasts stay longer
// - Centralized state

// ─── Using Environment Configuration ─────────────────────────────────────

// BEFORE ❌ (raw env access)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true'; // error-prone

// AFTER ✅
import { getConfig, isSupabaseConfigured, isDebugMode } from '@/config/environment';

const config = getConfig();
const isSBConfigured = isSupabaseConfigured();
const isDebugging = isDebugMode();

// Benefits:
// - Type-safe
// - Validated at startup
// - Helpful warnings
// - Easy to extend

// ─── Using Error Boundary ────────────────────────────────────────────────

// BEFORE ❌ (no protection)
export default function App() {
  return (
    <div>
      <Charts /> {/* ← If this crashes, entire app is down */}
    </div>
  );
}

// AFTER ✅
import { ErrorBoundary } from '@/components/Layout/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <div>
        <Charts /> {/* ← Safely caught and handled */}
      </div>
    </ErrorBoundary>
  );
}

// Benefits:
// - Graceful error handling
// - User can recover
// - Development error details
// - Production-friendly

// ─── Folder Structure Reference ───────────────────────────────────────

/*
src/
├── config/
│   ├── constants.ts       ← Magic numbers, strings, configs
│   └── environment.ts     ← Env variable loading & validation
│
├── types/
│   └── index.ts           ← All TypeScript interfaces & types
│
├── utils/
│   └── index.ts           ← Reusable functions (40+)
│
├── components/
│   ├── Layout/            ← ErrorBoundary, page wrappers
│   ├── UI/                ← Toast, Modals, reusable UI
│   ├── Auth.tsx
│   ├── Charts.tsx
│   ├── LogForm.tsx
│   └── ... (feature components)
│
├── hooks/
│   ├── useEntries.ts      ← Data fetching
│   └── useHoursCalc.ts    ← Business logic
│
├── lib/
│   └── supabase.ts        ← Supabase client
│
├── App.tsx                ← Main app
└── Main.tsx               ← Entry point
*/

// ─── Common Patterns ────────────────────────────────────────────────────

// Pattern 1: Validate and handle errors
import { ValidationError } from '@/types';
import { isValidTimeRange, retryWithBackoff } from '@/utils';
import { ERROR_MESSAGES } from '@/config/constants';

try {
  const validation = isValidTimeRange(start, end);
  if (!validation.valid) {
    throw new ValidationError('time', validation.error!);
  }
  
  const result = await retryWithBackoff(
    () => api.saveEntry(data),
    3, // max retries
    1000 // base delay
  );
} catch (error) {
  if (error instanceof ValidationError) {
    showToast(error.message, "error");
  } else {
    showToast(ERROR_MESSAGES.NETWORK_ERROR, "error");
  }
}

// Pattern 2: Format data for display
import { formatDate, formatTime, formatPercent } from '@/utils';
import { DATE_CONFIG } from '@/config/constants';

const displayDate = formatDate(entry.date);      // "Apr 30, 2026"
const displayTime = formatTime(entry.startTime); // "08:00"
const percentage = formatPercent(stats.percentComplete, 1); // "75.5%"

// Pattern 3: Create reusable component with new structure
import type { LogEntry } from '@/types';
import { ERROR_MESSAGES } from '@/config/constants';
import { useToast } from '@/components/UI/Toast';

interface MyComponentProps {
  entry: LogEntry;
}

export function MyComponent({ entry }: MyComponentProps) {
  const { showToast } = useToast();
  
  const handleDelete = async () => {
    try {
      await api.deleteEntry(entry.id);
      showToast("Entry deleted", "success");
    } catch (error) {
      showToast(ERROR_MESSAGES.GENERIC_ERROR, "error");
    }
  };
  
  return <button onClick={handleDelete}>Delete</button>;
}

// ─── Environment Setup ──────────────────────────────────────────────────

/*
1. Copy .env.example to .env.local:
   cp .env.example .env.local

2. Add your Supabase credentials:
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key

3. Optional: Configure other variables:
   VITE_DEFAULT_TARGET_HOURS=500
   VITE_DEBUG_MODE=false
   VITE_ENABLE_OFFLINE_MODE=false

4. Never commit .env files!
*/

// ─── Running the App ───────────────────────────────────────────────────

/*
Terminal 1 - Frontend:
  npm run dev
  → http://localhost:5173

Terminal 2 - Backend (optional):
  npm run server
  → http://localhost:3001

Building:
  npm run build
  npm run preview

Linting:
  npm run lint
*/

// ─── Adding New Features ───────────────────────────────────────────────

/*
1. Define types in src/types/index.ts
2. Add constants to src/config/constants.ts if needed
3. Create utility functions in src/utils/index.ts
4. Create component in appropriate folder
5. Use Error Boundary for major features
6. Use Toast for user feedback
7. Test in multiple browsers
8. Update README if applicable
*/

console.log('✅ OJTracker development environment configured correctly!');
