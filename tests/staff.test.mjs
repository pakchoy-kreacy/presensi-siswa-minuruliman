import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_SERVICE_ROLE_KEY = "kunci-uji";
const { hashPin, pinMatches, sign, verify } = await import("../api/staff.js");

test("PIN benar cocok, PIN salah dan hash rusak tidak", () => {
  const h = hashPin("54321");
  assert.equal(pinMatches("54321", h), true);
  assert.equal(pinMatches("54320", h), false);
  assert.equal(pinMatches("54321", null), false);
  assert.equal(pinMatches("54321", "bukan-hash"), false);
});

test("token sah terbaca, token diubah/kedaluwarsa/rusak ditolak", () => {
  const t = sign({ role: "admin", exp: Date.now() + 60000 });
  assert.equal(verify(t).role, "admin");
  const [body, sig] = t.split(".");
  const palsu = Buffer.from(JSON.stringify({ role: "admin", exp: Date.now() + 9e9 })).toString("base64url");
  assert.equal(verify(palsu + "." + sig), null);
  assert.equal(verify(sign({ role: "admin", exp: Date.now() - 1 })), null);
  assert.equal(verify(body.slice(1) + "." + sig), null);
  assert.equal(verify("x." + sig), null);
  assert.equal(verify(""), null);
});
