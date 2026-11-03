import { writeFileSync, existsSync } from "node:fs";
const url = process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_PUBLISHABLE_KEY || "";
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
