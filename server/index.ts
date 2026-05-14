import express, { Express, Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const logEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/).optional(),
  hoursWorked: z.number().min(0).max(24).optional(),
  activity: z.string().min(3).max(500),
  isHoliday: z.boolean().optional().default(false),
  day: z.number().positive().optional(),
}).refine(
  (data) => data.isHoliday || (data.startTime && data.endTime && data.hoursWorked !== undefined),
  { message: "startTime, endTime, and hoursWorked required for non-holiday entries" }
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();
const PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3001;

const JOURNAL_PATH = path.join(__dirname, "../src/data/journalData.json");

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ─── Type Definitions ────────────────────────────────────────────────────────

/** A flat log entry as used by the frontend (camelCase) */
interface LogEntry {
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

/** A single day as stored in journalData.json */
interface JournalDay {
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

/** A week block as stored in journalData.json */
interface JournalWeek {
  week: number;
  period: string;
  days: JournalDay[];
  totalHours: number;
}

/** The full journalData.json structure */
interface JournalData {
  trainee: string;
  course: string;
  supervisor: string;
  weeks: JournalWeek[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read the full journalData.json file. Returns a safe default if missing. */
function readJournal(): JournalData {
  try {
    if (!fs.existsSync(JOURNAL_PATH)) {
      return { trainee: "", course: "", supervisor: "", weeks: [] };
    }
    const raw = fs.readFileSync(JOURNAL_PATH, "utf-8");
    return JSON.parse(raw) as JournalData;
  } catch (error) {
    console.error("❌ Error reading journal:", error);
    return { trainee: "", course: "", supervisor: "", weeks: [] };
  }
}

/** Overwrite journalData.json with nicely-formatted JSON. */
function writeJournal(data: JournalData): void {
  try {
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify(data, null, 4), "utf-8");
  } catch (error) {
    console.error("❌ Error writing journal:", error);
    throw error; // re-throw so the route handler can return 500
  }
}

/** Flatten weeks[].days[] into a single LogEntry array for the frontend. */
function flattenEntries(journal: JournalData): LogEntry[] {
  return journal.weeks.flatMap((week) =>
    week.days.map((day) => ({
      id: day.id ?? `day-${day.day}`,
      day: day.day,
      date: day.date,
      startTime: day.startTime,
      endTime: day.endTime,
      hoursWorked: day.hoursWorked,
      activity: Array.isArray(day.activities) ? day.activities.join("; ") : "",
      isHoliday: day.isHoliday ?? false,
      createdAt: day.createdAt,
    }))
  );
}

/** Find which week a day ID lives in, and return both indices. */
function findDay(journal: JournalData, id: string): { weekIdx: number; dayIdx: number } | null {
  for (let wi = 0; wi < journal.weeks.length; wi++) {
    const week = journal.weeks[wi];
    for (let di = 0; di < week.days.length; di++) {
      const day = week.days[di];
      if ((day.id ?? `day-${day.day}`) === id) {
        return { weekIdx: wi, dayIdx: di };
      }
    }
  }
  return null;
}

/**
 * Derive a week number + period string from a date.
 * We bin dates by ISO week number and create a human label like "May 6-7, 2026".
 * For simplicity, new entries are appended to the last week if within the same
 * calendar week, otherwise a brand-new week block is created.
 */
function getOrCreateWeekForDate(journal: JournalData, date: string): JournalWeek {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(y, m - 1, d);

  // Walk backwards to find a week block whose period overlaps target date
  for (let wi = journal.weeks.length - 1; wi >= 0; wi--) {
    const week = journal.weeks[wi];
    if (week.days.length === 0) continue;
    // Check if any existing day in this week is within 6 days of target
    for (const day of week.days) {
      const [dy, dm, dd] = day.date.split("-").map(Number);
      const diff = Math.abs(target.getTime() - new Date(dy, dm - 1, dd).getTime());
      const diffDays = diff / (1000 * 60 * 60 * 24);
      if (diffDays <= 6) return week; // same calendar week
    }
  }

  // Create a new week block
  const weekNum = journal.weeks.length > 0
    ? Math.max(...journal.weeks.map((w) => w.week)) + 1
    : 1;
  const label = target.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const newWeek: JournalWeek = {
    week: weekNum,
    period: label,
    days: [],
    totalHours: 0,
  };
  journal.weeks.push(newWeek);
  return newWeek;
}

/** Error response helper */
function sendError(res: Response, statusCode: number, errors: string[]) {
  res.status(statusCode).json({
    success: false,
    error: {
      code: `ERROR_${statusCode}`,
      message: errors.length === 1 ? errors[0] : "Validation failed",
      details: errors.length > 1 ? errors : undefined,
    },
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /health
 * Health check endpoint
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * GET /api/entries
 * Returns all log entries flattened from the week-based JSON structure.
 */
app.get("/api/entries", (_req: Request, res: Response) => {
  try {
    const journal = readJournal();
    const entries = flattenEntries(journal);
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error("Error fetching entries:", error);
    sendError(res, 500, ["Failed to fetch entries"]);
  }
});

/**
 * POST /api/entries
 * Adds a new entry to journalData.json.
 * Appends to the appropriate week block (or creates a new one).
 *
 * Body: { date, startTime, endTime, hoursWorked, activity, isHoliday, day? }
 */
app.post("/api/entries", (req: Request, res: Response) => {
  try {
    const parsed = logEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, parsed.error.issues.map((issue: z.ZodIssue) => issue.message));
    }

    const journal = readJournal();
    const allEntries = flattenEntries(journal);

    // Auto-assign day number
    const maxDay = allEntries.length > 0
      ? Math.max(...allEntries.map((e) => e.day))
      : 0;
    const dayNumber = (typeof req.body.day === "number" && req.body.day > 0)
      ? req.body.day
      : maxDay + 1;

    const id = `log-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const newDay: JournalDay = {
      id,
      day: dayNumber,
      date: req.body.date,
      startTime: req.body.startTime ?? "08:00",
      endTime: req.body.endTime ?? "17:00",
      hoursWorked: req.body.hoursWorked ?? 0,
      activities: [req.body.activity.trim()],
      isHoliday: Boolean(req.body.isHoliday),
      createdAt,
    };

    // Find or create the week block for this date
    const week = getOrCreateWeekForDate(journal, req.body.date);
    week.days.push(newDay);
    // Sort days within the week by date
    week.days.sort((a, b) => a.date.localeCompare(b.date));
    // Recompute week total
    week.totalHours = parseFloat(
      week.days.reduce((s, d) => s + (d.isHoliday ? 0 : d.hoursWorked), 0).toFixed(2)
    );

    writeJournal(journal);

    // Return the flat LogEntry shape the frontend expects
    const newEntry: LogEntry = {
      id,
      day: dayNumber,
      date: newDay.date,
      startTime: newDay.startTime,
      endTime: newDay.endTime,
      hoursWorked: newDay.hoursWorked,
      activity: req.body.activity.trim(),
      isHoliday: newDay.isHoliday ?? false,
      createdAt,
    };

    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    console.error("Error adding entry:", error);
    sendError(res, 500, ["Failed to add entry"]);
  }
});

/**
 * PUT /api/entries/:id
 * Updates an existing entry by ID.
 */
app.put("/api/entries/:id", (req: Request, res: Response) => {
  try {
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) return sendError(res, 400, ["Invalid entry ID"]);

    const journal = readJournal();
    const location = findDay(journal, id);
    if (!location) return sendError(res, 404, ["Entry not found"]);

    const { weekIdx, dayIdx } = location;
    const existing = journal.weeks[weekIdx].days[dayIdx];

    // Merge patch
    const patch = req.body as Partial<{
      date: string;
      startTime: string;
      endTime: string;
      hoursWorked: number;
      activity: string;
      isHoliday: boolean;
    }>;

    if (patch.date !== undefined) existing.date = patch.date;
    if (patch.startTime !== undefined) existing.startTime = patch.startTime;
    if (patch.endTime !== undefined) existing.endTime = patch.endTime;
    if (patch.hoursWorked !== undefined) existing.hoursWorked = patch.hoursWorked;
    if (patch.activity !== undefined) existing.activities = [patch.activity.trim()];
    if (patch.isHoliday !== undefined) existing.isHoliday = patch.isHoliday;

    // Recompute week total
    const week = journal.weeks[weekIdx];
    week.totalHours = parseFloat(
      week.days.reduce((s, d) => s + (d.isHoliday ? 0 : d.hoursWorked), 0).toFixed(2)
    );

    writeJournal(journal);

    const updated: LogEntry = {
      id: existing.id ?? id,
      day: existing.day,
      date: existing.date,
      startTime: existing.startTime,
      endTime: existing.endTime,
      hoursWorked: existing.hoursWorked,
      activity: existing.activities.join("; "),
      isHoliday: existing.isHoliday ?? false,
      createdAt: existing.createdAt,
    };

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating entry:", error);
    sendError(res, 500, ["Failed to update entry"]);
  }
});

/**
 * DELETE /api/entries/:id
 * Deletes an entry by ID.
 */
app.delete("/api/entries/:id", (req: Request, res: Response) => {
  try {
    const rawId = req.params["id"];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) return sendError(res, 400, ["Invalid entry ID"]);

    const journal = readJournal();
    const location = findDay(journal, id);
    if (!location) return sendError(res, 404, ["Entry not found"]);

    const { weekIdx, dayIdx } = location;
    const [deleted] = journal.weeks[weekIdx].days.splice(dayIdx, 1);

    // Recompute week total
    const week = journal.weeks[weekIdx];
    week.totalHours = parseFloat(
      week.days.reduce((s, d) => s + (d.isHoliday ? 0 : d.hoursWorked), 0).toFixed(2)
    );

    writeJournal(journal);

    res.json({
      success: true,
      data: {
        id: deleted.id ?? id,
        day: deleted.day,
        date: deleted.date,
        activity: deleted.activities?.join("; ") ?? "",
        hoursWorked: deleted.hoursWorked,
      },
    });
  } catch (error) {
    console.error("Error deleting entry:", error);
    sendError(res, 500, ["Failed to delete entry"]);
  }
});

/**
 * 404 fallback
 */
app.use((_req: Request, res: Response) => {
  sendError(res, 404, ["Endpoint not found"]);
});

// ─── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Journal file: ${JOURNAL_PATH}`);
  console.log(`🔌 Proxy: Vite dev server → /api/* → http://localhost:${PORT}`);
});
