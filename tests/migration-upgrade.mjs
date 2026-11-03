import pg from "pg";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const connection = {
  host: "127.0.0.1",
  port: 55432,
  user: "postgres",
  database: "postgres",
};
const admin = new pg.Client(connection);
await admin.connect();
const name = "wedding_upgrade_" + Date.now();
let client;
try {
  await admin.query(`create database ${name}`);
  client = new pg.Client({ ...connection, database: name });
  await client.connect();
  const bootstrap = readFileSync("tests/postgres-bootstrap.sql", "utf8")
    .replace("create role anon nologin;", "")
    .replace("create role authenticated nologin;", "");
  await client.query(bootstrap);
  for (const file of ["001_initial.sql", "002_decisions.sql", "003_media.sql"])
    await client.query(readFileSync("supabase/migrations/" + file, "utf8"));
  const uid = randomUUID();
  await client.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
    [uid, "upgrade@example.test"],
  );
  await client.query("set role authenticated");
  await client.query("select set_config('request.jwt.claim.sub',$1,false)", [
    uid,
  ]);
  const w = (
    await client.query("select public.create_wedding('Legacy wedding') as id")
  ).rows[0].id;
  const provider = (
    await client.query(
      "insert into public.providers(wedding_id,name,city) values($1,'Legacy provider','Rabat') returning *",
      [w],
    )
  ).rows[0];
  const idea = (
    await client.query(
      "insert into public.inspirations(wedding_id,name,tags) values($1,'Legacy inspiration',array['ivoire']) returning *",
      [w],
    )
  ).rows[0];
  const attachment = (
    await client.query(
      "insert into public.attachments(wedding_id,inspiration_id,path,caption) values($1,$2,$3,'Legacy photo') returning *",
      [w, idea.id, w + "/old.webp"],
    )
  ).rows[0];
  await client.query("reset role");
  await client.query(
    readFileSync("supabase/migrations/004_wedding_extensions.sql", "utf8"),
  );
  assert.deepEqual(
    (
      await client.query("select * from public.providers where id=$1", [
        provider.id,
      ])
    ).rows[0],
    provider,
  );
  const after = (
    await client.query("select * from public.inspirations where id=$1", [
      idea.id,
    ])
  ).rows[0];
  for (const key of Object.keys(idea)) assert.deepEqual(after[key], idea[key]);
  assert.equal(after.moodboard_id, null);
  const media = (
    await client.query("select * from public.attachments where id=$1", [
      attachment.id,
    ])
  ).rows[0];
  for (const key of Object.keys(attachment))
    assert.deepEqual(media[key], attachment[key]);
  assert.equal(
    (
      await client.query(
        "select count(*)::integer as n from public.categories where wedding_id=$1 and kind in ('makeup','hair','vehicle')",
        [w],
      )
    ).rows[0].n,
    3,
  );
  console.log(
    "PASS additive upgrade preserves existing providers, inspirations and private photo metadata",
  );
} finally {
  if (client) await client.end();
  await admin.query(`drop database if exists ${name}`);
  await admin.end();
}
