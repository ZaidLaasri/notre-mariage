import { test } from "node:test";
import assert from "node:assert/strict";
import { minor, convert, checkPayment, balance } from "../src/app/core/money";
import { demoData } from "../src/app/core/demo";
test("decimal entry remains exact and rejects ambiguous input", () => {
  assert.equal(minor("0,10") + minor("0.20"), 30);
  assert.equal(minor("1234.56"), 123456);
  for (const x of ["-1", "NaN", "1.001", "1e4", "", "1 000"])
    assert.throws(() => minor(x));
});
test("manual rational conversion rounds half up with integer arithmetic", () => {
  assert.equal(convert(100, "EUR", 108, 10), 1080);
  assert.equal(convert(1, "EUR", 105, 10), 11);
  assert.equal(convert(123, "MAD", 108, 10), 123);
  assert.throws(() => convert(100, "EUR", 10, 0));
});
test("payments never exceed committed expense and offers remain unrelated", () => {
  const d = demoData();
  const e = d.expenses[0];
  assert.equal(balance(e, d.payments), 1700000);
  assert.throws(() => checkPayment(e, d.payments, 1700001));
  assert.throws(() => checkPayment(e, d.payments, 0));
  assert.doesNotThrow(() => checkPayment(e, d.payments, 1700000));
  const committed = d.expenses.reduce((n, e) => n + e.amount_minor, 0);
  d.provider_offers[0].amount_minor = 999999999;
  assert.equal(
    d.expenses.reduce((n, e) => n + e.amount_minor, 0),
    committed,
  );
});
