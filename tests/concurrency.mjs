// Run only against the disposable local PostgreSQL test database.
import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const connection = {
  host: "127.0.0.1",
  port: 55432,
  user: "postgres",
  database: "postgres",
};
const admin = new pg.Client(connection),
  a = new pg.Client(connection),
  b = new pg.Client(connection);
await Promise.all([admin.connect(), a.connect(), b.connect()]);
const uid = randomUUID();
let wedding;
try {
  await admin.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
    [uid, "concurrency@example.test"],
  );
  await admin.query("set role authenticated");
  await admin.query("select set_config('request.jwt.claim.sub',$1,false)", [
    uid,
  ]);
  wedding = (
    await admin.query("select public.create_wedding('Concurrent test') as id")
  ).rows[0].id;
  const ceremony = (
    await admin.query(
      "select id from public.ceremonies where wedding_id=$1 limit 1",
      [wedding],
    )
  ).rows[0].id;
  const expense = (
    await admin.query(
      "insert into public.expenses(wedding_id,ceremony_id,name,amount_minor) values($1,$2,'Test',10000) returning id",
      [wedding, ceremony],
    )
  ).rows[0].id;
  for (const client of [a, b]) {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
      uid,
    ]);
  }
  await a.query(
    "insert into public.payments(wedding_id,expense_id,amount_minor) values($1,$2,6000)",
    [wedding, expense],
  );
  const second = b
    .query(
      "insert into public.payments(wedding_id,expense_id,amount_minor) values($1,$2,6000)",
      [wedding, expense],
    )
    .then(
      () => ({ accepted: true }),
      (error) => ({ accepted: false, message: error.message }),
    );
  await new Promise((resolve) => setTimeout(resolve, 100));
  await a.query("commit");
  const result = await second;
  assert.equal(result.accepted, false, "Concurrent overpayment must fail");
  assert.match(result.message, /dépasse/);
  await b.query("rollback");
  const total = Number(
    (
      await admin.query(
        "select sum(amount_minor) as total from public.payments where expense_id=$1",
        [expense],
      )
    ).rows[0].total,
  );
  assert.equal(total, 6000);
  console.log("PASS: two concurrent deposits cannot exceed the expense");
  const category = (
    await admin.query(
      "insert into public.trousseau_categories(wedding_id,name) values($1,'Concurrent Jhaz') returning id",
      [wedding],
    )
  ).rows[0].id;
  const item = (
    await admin.query(
      "insert into public.trousseau_items(wedding_id,category_id,name,unit_minor) values($1,$2,'Article',15000) returning id",
      [wedding, category],
    )
  ).rows[0].id;
  for (const client of [a, b]) {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
      uid,
    ]);
  }
  const firstExpense = (
    await a.query("select public.engage_trousseau($1,$2) as id", [
      item,
      ceremony,
    ])
  ).rows[0].id;
  const concurrent = b.query("select public.engage_trousseau($1,$2) as id", [
    item,
    ceremony,
  ]);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await a.query("commit");
  const concurrentExpense = (await concurrent).rows[0].id;
  await b.query("commit");
  assert.equal(firstExpense, concurrentExpense);
  assert.equal(
    (
      await admin.query(
        "select count(*)::integer as n from public.expenses where wedding_id=$1",
        [wedding],
      )
    ).rows[0].n,
    2,
  );
  console.log("PASS: concurrent Jhaz engagements return one shared expense");
} finally {
  await Promise.allSettled([a.query("rollback"), b.query("rollback")]);
  await admin.query("reset role");
  if (wedding)
    await admin.query("delete from public.weddings where id=$1", [wedding]);
  await admin.query("delete from auth.users where id=$1", [uid]);
  await Promise.all([admin.end(), a.end(), b.end()]);
}
