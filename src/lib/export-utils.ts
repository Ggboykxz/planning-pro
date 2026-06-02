/**
 * Utility function to export data as CSV (French convention: semicolon separator, UTF-8 BOM)
 */

interface CSVColumn<T> {
  header: string;
  accessor: (item: T) => string | number | null;
}

/**
 * Export data to a CSV file and trigger download
 * @param data - Array of data objects
 * @param columns - Array of column definitions with header and accessor
 * @param filename - Name of the file to download (without extension)
 */
export function exportToCSV<T>(
  data: T[],
  columns: CSVColumn<T>[],
  filename: string
): void {
  // UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";

  // Build header row
  const headerRow = columns.map((col) => escapeCSVField(col.header)).join(";");

  // Build data rows
  const dataRows = data.map((item) =>
    columns
      .map((col) => escapeCSVField(String(col.accessor(item) ?? "")))
      .join(";")
  );

  // Combine all rows
  const csvContent = [headerRow, ...dataRows].join("\n");

  // Create blob and trigger download
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Escape a CSV field (handle semicolons, quotes, and newlines)
 */
function escapeCSVField(field: string): string {
  if (
    field.includes(";") ||
    field.includes('"') ||
    field.includes("\n") ||
    field.includes("\r")
  ) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
