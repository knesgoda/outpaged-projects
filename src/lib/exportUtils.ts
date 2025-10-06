export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) {
    return "";
  }

  const headers = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  const escape = (value: unknown) => {
    if (value === null || value === undefined) {
      return "";
    }

    let stringValue: string;
    if (typeof value === "object") {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    const needsQuotes = /[",\n]/.test(stringValue);
    const escaped = stringValue.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const line = headers.map((header) => escape((row as Record<string, unknown>)[header])).join(",");
    lines.push(line);
  });

  return lines.join("\n");
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
