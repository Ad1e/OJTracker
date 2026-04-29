import type { LogEntry } from "./useHoursCalc";

const API_URL = "http://localhost:3001/api";

/**
 * Fetch all entries from the server
 */
export async function fetchEntries(): Promise<LogEntry[]> {
  try {
    const response = await fetch(`${API_URL}/entries`);
    if (!response.ok) throw new Error("Failed to fetch entries");
    return await response.json();
  } catch (error) {
    console.error("Error fetching entries:", error);
    return [];
  }
}

/**
 * Add a new entry to the server
 */
export async function addEntry(
  entry: Omit<LogEntry, "id">
): Promise<LogEntry | null> {
  try {
    const response = await fetch(`${API_URL}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error("Failed to add entry");
    return await response.json();
  } catch (error) {
    console.error("Error adding entry:", error);
    return null;
  }
}

/**
 * Update an existing entry on the server
 */
export async function updateEntry(
  id: string,
  entry: Partial<LogEntry>
): Promise<LogEntry | null> {
  try {
    const response = await fetch(`${API_URL}/entries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error("Failed to update entry");
    return await response.json();
  } catch (error) {
    console.error("Error updating entry:", error);
    return null;
  }
}

/**
 * Delete an entry from the server
 */
export async function deleteEntry(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/entries/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete entry");
    return true;
  } catch (error) {
    console.error("Error deleting entry:", error);
    return false;
  }
}
