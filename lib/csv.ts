/**
 * Delimited-text parsing for batch uploads.
 *
 * Handles what people actually paste: CSV from a spreadsheet export, or
 * tab-separated data copied straight out of Excel or Sheets. Quoted fields and
 * escaped quotes are supported; anything more exotic belongs in a real CSV
 * library, which is not worth a dependency here.
 */

export interface ParsedTable {
  columns: string[];
  rows: Record<string, string>[];
}

/** Splits one line, honouring quoted fields containing the delimiter. */
function splitLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      // A doubled quote inside a quoted field is a literal quote.
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields.map((field) => field.trim());
}

function detectDelimiter(headerLine: string): string {
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semicolons = (headerLine.match(/;/g) ?? []).length;

  if (tabs >= commas && tabs >= semicolons && tabs > 0) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

export function parseDelimited(input: string): ParsedTable {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return { columns: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const columns = splitLine(lines[0], delimiter).filter(Boolean);

  if (columns.length === 0) return { columns: [], rows: [] };

  const rows: Record<string, string>[] = [];

  for (const line of lines.slice(1)) {
    const values = splitLine(line, delimiter);
    const row: Record<string, string> = {};
    let hasValue = false;

    columns.forEach((column, index) => {
      const value = values[index] ?? "";
      row[column] = value;
      if (value) hasValue = true;
    });

    // Skip trailing blank lines that a spreadsheet export often leaves behind.
    if (hasValue) rows.push(row);
  }

  return { columns, rows };
}
