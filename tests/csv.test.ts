import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, csvCell, duplicateKey } from "../src/app/core/csv";
test("CSV accepts quoted commas newlines escaped quotes and BOM", () => {
  assert.deepEqual(
    parseCsv(
      '\uFEFFnom,foyer\r\n"Salma, A.","Famille ""A"""\r\n"Deux\nlignes",B',
    ),
    [
      ["nom", "foyer"],
      ["Salma, A.", 'Famille "A"'],
      ["Deux\nlignes", "B"],
    ],
  );
  assert.throws(() => parseCsv('"unfinished'));
});
test("exports neutralize spreadsheet formulas", () => {
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell('A "B"'), '"A ""B"""');
});
test("duplicate detection ignores accents case and padding", () => {
  assert.equal(
    duplicateKey(" Amélie ", "Foyer"),
    duplicateKey("amelie", " foyer "),
  );
});
