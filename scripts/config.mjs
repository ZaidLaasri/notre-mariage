import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
// Local overrides are ignored by Git; Vercel/terminal variables take precedence.
const fileEnv = {};
for (const file of [".env", ".env.local"]) {
  if (existsSync(file))
    Object.assign(fileEnv, parseEnv(readFileSync(file, "utf8")));
}
const url = process.env.SUPABASE_URL ?? fileEnv.SUPABASE_URL ?? "";
const key =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  fileEnv.SUPABASE_PUBLISHABLE_KEY ??
  "";
if (process.env.VERCEL === "1" && (!url || !key))
  throw new Error(
    "Déploiement annulé : définir SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY dans Vercel.",
  );
if (Boolean(url) !== Boolean(key))
  throw new Error(
    "SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY doivent être définies ensemble.",
  );
if (key.startsWith("sb_secret_") || key.includes("service_role"))
  throw new Error("Server secret forbidden");
if (key.split(".").length === 3) {
  const payload = JSON.parse(
    Buffer.from(key.split(".")[1], "base64url").toString(),
  );
  if (payload.role !== "anon")
    throw new Error("Only anon/publishable key allowed");
}
if (url || !existsSync("src/runtime-config.json"))
  writeFileSync(
    "src/runtime-config.json",
    JSON.stringify({ supabaseUrl: url, supabaseKey: key }),
  );
