/**
 * Central type definitions for OJTracker
 * All domain types should be defined here to avoid circular imports
 */

// ─── Log Entry Types ───────────────────────────────────────────────────────

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

export interface HoursCalcResult {
  totalRendered: number;
  remaining: number;
  percentComplete: number;
  estimatedCompletionDate: string;
  avgHoursPerDay: number;
  workingDaysLogged: number;
  holidayCount: number;
}

// ─── Profile Types ────────────────────────────────────────────────────────

export interface TraineeProfileData {
  name: string;
  companyName: string;
  startDate: string;
  totalRequiredHours: number;
  department?: string;
  supervisor?: string;
}

// ─── UI State Types ──────────────────────────────────────────────────────

export interface Toast {
  id: number;
  message: string;
  type: "success" | "edit" | "error";
  autoClose?: boolean; // true for success/edit (3s), false for error (persistent)
}

export interface ModalState {
  isOpen: boolean;
  mode: "add" | "edit";
  target: LogEntry | null;
}

export interface DeleteConfirmState {
  isOpen: boolean;
  target: LogEntry | null;
}

// ─── API Response Types ──────────────────────────────────────────────────

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

// ─── Error Types ───────────────────────────────────────────────────────

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

  constructor(
    message: string,
    statusCode?: number,
    retryable: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.name = "NetworkError";
  }
}
