export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  const text = input.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("CSV invalide : guillemet non fermé.");
  row.push(field);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
export const csvCell = (s: string) =>
  '"' + (/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"';
export const duplicateKey = (name: string, household: string) =>
  `${name
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )}|${household.trim().toLocaleLowerCase("fr")}`;
