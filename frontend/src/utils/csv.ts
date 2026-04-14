/**
 * Parse a single CSV line, handling quoted fields.
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse CSV text into recipient objects.
 * Expects a header row with 'email' column and optional 'name' column.
 */
export function parseCsvRecipients(
  text: string
): { recipients: { email: string; name?: string }[]; error?: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { recipients: [], error: "CSV must have a header row and at least one data row" };

  const header = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
  const emailIdx = header.findIndex(
    (h) => h === "email" || h === "e-mail" || h === "email address"
  );
  const nameIdx = header.findIndex(
    (h) => h === "name" || h === "full name" || h === "recipient"
  );

  if (emailIdx < 0) return { recipients: [], error: "CSV must have an 'email' column in the header row" };

  const recipients: { email: string; name?: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const email = cols[emailIdx]?.trim();
    if (!email || !email.includes("@")) continue;
    const name = nameIdx >= 0 ? cols[nameIdx]?.trim() : undefined;
    recipients.push({ email, name: name || undefined });
  }
  return { recipients };
}
