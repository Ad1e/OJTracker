import express, { Express, Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();
const PORT = 3001;

const JOURNAL_PATH = path.join(__dirname, "../src/data/journalData.json");

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

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

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/entries
 * Returns all entries from the journal
 */
app.get("/api/entries", (_req: Request, res: Response) => {
  try {
    const journal = readJournal();
    res.json(journal.entries || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

/**
 * POST /api/entries
 * Adds a new entry to the journal
 */
app.post("/api/entries", (req: Request, res: Response) => {
  try {
    const journal = readJournal();
    const newEntry = req.body;

    // Auto-assign day number if not provided
    if (!newEntry.day) {
      const maxDay = journal.entries.length > 0
        ? Math.max(...journal.entries.map((e: any) => e.day || 0))
        : 0;
      newEntry.day = maxDay + 1;
    }

    journal.entries.push(newEntry);
    writeJournal(journal);

    res.json(newEntry);
  } catch (error) {
    console.error("Error adding entry:", error);
    res.status(500).json({ error: "Failed to add entry" });
  }
});

/**
 * PUT /api/entries/:id
 * Updates an existing entry by ID
 */
app.put("/api/entries/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const journal = readJournal();

    const entryIndex = journal.entries.findIndex((e: any) => `log-${e.day}` === id);

    if (entryIndex === -1) {
      return res.status(404).json({ error: "Entry not found" });
    }

    journal.entries[entryIndex] = { ...journal.entries[entryIndex], ...updateData };
    writeJournal(journal);

    res.json(journal.entries[entryIndex]);
  } catch (error) {
    console.error("Error updating entry:", error);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

/**
 * DELETE /api/entries/:id
 * Deletes an entry by ID
 */
app.delete("/api/entries/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const journal = readJournal();

    const entryIndex = journal.entries.findIndex((e: any) => `log-${e.day}` === id);

    if (entryIndex === -1) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const deleted = journal.entries.splice(entryIndex, 1);
    writeJournal(journal);

    res.json(deleted[0]);
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

// ─── Start server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Journal file: ${JOURNAL_PATH}`);
});
