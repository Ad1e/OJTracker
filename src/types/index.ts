// ─── src/types/index.ts ───────────────────────────────────────────────────────
// Single source of truth for ALL shared domain types.
// Local-only types (e.g. SortState inside a table component) stay in their file.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Core domain ──────────────────────────────────────────────────────────────

export interface LogEntry {
  id: string;
  day: number;
  date: string;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  activity: string;
  isHoliday: boolean;
  createdAt?: string;
}

/** Raw shape of a row returned by supabase.from("log_entries").select("*"). */
export interface LogEntryRow {
  id: string;
  day: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  hours_worked: number | string;
  activity: string;
  is_holiday: boolean | null;
  created_at?: string | null;
}

export interface HoursCalcResult {
  totalRendered: number;
  remaining: number;
  percentComplete: number;
  estimatedCompletionDate: string;
  avgHoursPerDay: number;
  workingDaysLogged: number;
  holidayCount: number;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface TraineeProfileData {
  name: string;
  department: string;
  supervisor: string;
  school: string;
  totalRequiredHours: number;
  avatarDataUrl: string | null;
  startDate: string;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export type FormMode = "add" | "edit";

// ─── UI state ─────────────────────────────────────────────────────────────────

export interface Toast {
  id: number;
  message: string;
  type: "success" | "edit" | "error";
}

export interface ModalState {
  isOpen: boolean;
  mode: FormMode;
  target: LogEntry | null;
}

export interface DeleteConfirmState {
  isOpen: boolean;
  target: LogEntry | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface UseEntriesReturn {
  entries: LogEntry[];
  loading: boolean;
  error: string | null;
  addEntry: (entry: Omit<LogEntry, "id" | "createdAt">) => Promise<LogEntry | null>;
  updateEntry: (id: string, patch: Partial<Omit<LogEntry, "id" | "createdAt">>) => Promise<LogEntry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export interface AppError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export class ValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
    this.name = "ValidationError";
  }
}

export class NetworkError extends Error {
  statusCode?: number;
  retryable: boolean;
  constructor(message: string, statusCode?: number, retryable = true) {
    super(message);
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.name = "NetworkError";
  }
}

// ─── Journal (local JSON shape — used by HoursSummary and server) ─────────────

export interface JournalDay {
  day: number;
  date: string;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  activities: string[];
  isHoliday?: boolean;
  id?: string;
  createdAt?: string;
}

export interface JournalWeek {
  week: number;
  period: string;
  days: JournalDay[];
  totalHours: number;
}

export interface JournalData {
  trainee: string;
  course: string;
  supervisor: string;
  weeks: JournalWeek[];
}
