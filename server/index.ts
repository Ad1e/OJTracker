import express, { Express, Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();
const PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3001;

const JOURNAL_PATH = path.join(__dirname, "../src/data/journalData.json");

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: "1mb" })); // Prevent large payloads

// ─── Type Definitions ────────────────────────────────────────────────────────

interface LogEntry {
  id?: string;
  day: number;
  date: string;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  activity: string;
  isHoliday: boolean;
  createdAt?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate time format (HH:mm)
 */
function isValidTimeFormat(time: string): boolean {
  return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

/**
 * Validate log entry structure and values
 */
function validateLogEntry(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Entry must be an object"] };
  }

  const entry = data as Record<string, unknown>;

  // Validate required fields
  if (typeof entry.day !== "number" || entry.day < 1) {
    errors.push("day must be a positive number");
  }

  if (typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    errors.push("date must be in YYYY-MM-DD format");
  }

  if (!isValidTimeFormat(entry.startTime as string)) {
    errors.push("startTime must be in HH:mm format");
  }

  if (!isValidTimeFormat(entry.endTime as string)) {
    errors.push("endTime must be in HH:mm format");
  }

  if (typeof entry.hoursWorked !== "number" || entry.hoursWorked < 0 || entry.hoursWorked > 24) {
    errors.push("hoursWorked must be a number between 0 and 24");
  }

  if (typeof entry.activity !== "string" || entry.activity.length < 3 || entry.activity.length > 500) {
    errors.push("activity must be a string between 3 and 500 characters");
  }

  if (typeof entry.isHoliday !== "boolean") {
    errors.push("isHoliday must be a boolean");
  }

  return { valid: errors.length === 0, errors };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJournal(): any {
  try {
    const data = fs.readFileSync(JOURNAL_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading journal:", error);
    return { config: {}, entries: [] };
  }
}

function writeJournal(data: any): void {
  try {
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify(data, null, 4), "utf-8");
  } catch (error) {
    console.error("Error writing journal:", error);
  }
}

/**
 * Error response helper
 */
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
 * Returns all entries from the journal
 */
app.get("/api/entries", (_req: Request, res: Response) => {
  try {
    const journal = readJournal();
    res.json({
      success: true,
      data: journal.entries || [],
    });
  } catch (error) {
    console.error("Error fetching entries:", error);
    sendError(res, 500, ["Failed to fetch entries"]);
  }
});

/**
 * POST /api/entries
 * Adds a new entry to the journal
 * @body {LogEntry} entry - The entry to add
 */
app.post("/api/entries", (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = validateLogEntry(req.body);
    if (!validation.valid) {
      return sendError(res, 400, validation.errors);
    }

    const journal = readJournal();
    const newEntry: LogEntry = {
      id: `log-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    // Auto-assign day number if not provided
    if (!newEntry.day) {
      const maxDay = journal.entries.length > 0
        ? Math.max(...journal.entries.map((e: LogEntry) => e.day || 0))
        : 0;
      newEntry.day = maxDay + 1;
    }

    journal.entries.push(newEntry);
    writeJournal(journal);

    res.status(201).json({
      success: true,
      data: newEntry,
    });
  } catch (error) {
    console.error("Error adding entry:", error);
    sendError(res, 500, ["Failed to add entry"]);
  }
});

/**
 * PUT /api/entries/:id
 * Updates an existing entry by ID
 * @param {string} id - The entry ID
 * @body {Partial<LogEntry>} updates - Fields to update
 */
app.put("/api/entries/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendError(res, 400, ["Invalid entry ID"]);
    }

    // Validate only provided fields
    if (Object.keys(req.body).length > 0) {
      const validation = validateLogEntry(req.body);
      if (!validation.valid) {
        return sendError(res, 400, validation.errors);
      }
    }

    const journal = readJournal();
    const entryIndex = journal.entries.findIndex((e: LogEntry) => e.id === id);

    if (entryIndex === -1) {
      return sendError(res, 404, ["Entry not found"]);
    }

    const updatedEntry = {
      ...journal.entries[entryIndex],
      ...req.body,
      id: journal.entries[entryIndex].id, // Prevent ID modification
      createdAt: journal.entries[entryIndex].createdAt, // Preserve creation time
    };

    journal.entries[entryIndex] = updatedEntry;
    writeJournal(journal);

    res.json({
      success: true,
      data: updatedEntry,
    });
  } catch (error) {
    console.error("Error updating entry:", error);
    sendError(res, 500, ["Failed to update entry"]);
  }
});

/**
 * DELETE /api/entries/:id
 * Deletes an entry by ID
 * @param {string} id - The entry ID
 */
app.delete("/api/entries/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendError(res, 400, ["Invalid entry ID"]);
    }

    const journal = readJournal();
    const entryIndex = journal.entries.findIndex((e: LogEntry) => e.id === id);

    if (entryIndex === -1) {
      return sendError(res, 404, ["Entry not found"]);
    }

    const [deleted] = journal.entries.splice(entryIndex, 1);
    writeJournal(journal);

    res.json({
      success: true,
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting entry:", error);
    sendError(res, 500, ["Failed to delete entry"]);
  }
});

/**
 * Error handler for 404
 */
app.use((_req: Request, res: Response) => {
  sendError(res, 404, ["Endpoint not found"]);
});

// ─── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Journal file: ${JOURNAL_PATH}`);
});
