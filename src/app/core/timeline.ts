import { TimelineEvent } from "./models";
export function timeMinute(time: string, day = 0): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || ![0, 1].includes(day))
    throw new Error("Heure invalide.");
  const [h, m] = time.split(":").map(Number);
  return day * 1440 + h * 60 + m;
}
export function formatTime(minute: number): string {
  return `${String(Math.floor((minute % 1440) / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}${minute >= 1440 ? ` (+${Math.floor(minute / 1440)}j)` : ""}`;
}
export function validateInterval(start: number, end: number): void {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end > 2880 ||
    end <= start
  )
    throw new Error(
      "La fin doit suivre le début ; indiquez J+1 pour une fin après minuit.",
    );
}
export function overlaps(events: TimelineEvent[]): Set<string> {
  const ids = new Set<string>();
  const active = events.filter((e) => e.status !== "Annulé");
  for (let i = 0; i < active.length; i++)
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i],
        b = active[j];
      if (
        a.ceremony_id === b.ceremony_id &&
        a.start_minute < b.end_minute &&
        b.start_minute < a.end_minute
      ) {
        ids.add(a.id);
        ids.add(b.id);
      }
    }
  return ids;
}
export function reordered(
  ids: string[],
  moved: string,
  before: string,
): string[] {
  if (!ids.includes(moved) || !ids.includes(before))
    throw new Error("Étape inconnue.");
  if (moved === before) return [...ids];
  const result = ids.filter((id) => id !== moved);
  result.splice(result.indexOf(before), 0, moved);
  return result;
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function publicProgram(
  ceremonyName: string,
  date: string | null,
  events: TimelineEvent[],
): string {
  // Explicit whitelist: no object spread, internal notes, providers, contacts or signed URLs.
  const rows = events
    .filter((e) => e.status !== "Annulé")
    .sort((a, b) => a.start_minute - b.start_minute || a.position - b.position)
    .map(
      (e) =>
        `<article><time>${formatTime(e.start_minute)} – ${formatTime(e.end_minute)}</time><h2>${escape(e.title)}</h2>${e.location ? `<p>${escape(e.location)}</p>` : ""}${e.public_note ? `<p>${escape(e.public_note)}</p>` : ""}</article>`,
    )
    .join("");
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Programme · ${escape(ceremonyName)}</title><style>body{max-width:760px;margin:40px auto;padding:0 24px;color:#29372f;font:16px Arial}h1,h2{font-family:Georgia;font-weight:400}h1{font-size:32px}h2{font-size:22px;margin:8px 0}article{border-left:2px solid #b99b78;padding:0 0 24px 22px;margin:22px 0}time{font-size:14px;color:#526c5a}p{white-space:pre-wrap;line-height:1.6}@media print{body{margin:0}article{break-inside:avoid}}</style><h1>${escape(ceremonyName)}</h1><p>${escape(date ?? "Date à confirmer")}</p>${rows}<footer>Programme à jour au ${escape(new Date().toLocaleDateString("fr-FR"))}. Horaires susceptibles d’être ajustés.</footer></html>`;
}
