import { test } from "node:test";
import assert from "node:assert/strict";
import { bacaTanggal, bacaNisn } from "../src/lib/baca-excel.ts";

test("tanggal lahir dari berbagai format Excel", () => {
  assert.equal(bacaTanggal("12/05/2018"), "2018-05-12"); // hari/bulan/tahun
  assert.equal(bacaTanggal("30-07-2016"), "2016-07-30");
  assert.equal(bacaTanggal("2018-05-12"), "2018-05-12");
  assert.equal(bacaTanggal("5 Januari 2017"), "2017-01-05");
  assert.equal(bacaTanggal(43232), "2018-05-12"); // angka seri tanggal Excel
  assert.equal(bacaTanggal(""), undefined);
  assert.equal(bacaTanggal("besok"), undefined);
});

test("NISN angka mendapat nol di depan, teks dibiarkan", () => {
  assert.equal(bacaNisn(123456789), "0123456789");
  assert.equal(bacaNisn("0123456789"), "0123456789");
  assert.equal(bacaNisn(""), undefined);
});
