import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// Login sekolah. Semua perangkat memakai satu akun cloud sekolah.
// Admin: PIN (hash di school_settings) atau kode email ke admin_email. Guru: PIN (hash di school_staff).
const SCHOOL_EMAIL = (process.env.SCHOOL_ACCOUNT_EMAIL || "akun-sekolah@presensi-minuruliman.app").toLowerCase();
const PIN_RE = /^\d{4,6}$/;
const DAY = 86400000;

function supabaseUrl() {
  return process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

function getSupabase() {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

const secret = () => crypto.createHash("sha256").update("staff-token:" + process.env.SUPABASE_SERVICE_ROLE_KEY).digest();

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return body + "." + crypto.createHmac("sha256", secret()).update(body).digest("base64url");
}

function verify(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const want = crypto.createHmac("sha256", secret()).update(body).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  const p = JSON.parse(Buffer.from(body, "base64url").toString());
  return p.exp > Date.now() ? p : null;
}

function hashPin(pin) {
  const salt = crypto.randomBytes(16);
  return salt.toString("hex") + ":" + crypto.scryptSync(pin, salt, 32).toString("hex");
}

function pinMatches(pin, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const got = crypto.scryptSync(pin, Buffer.from(salt, "hex"), 32);
  const want = Buffer.from(hash, "hex");
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

async function limited(supabase, key, max, windowS) {
  const { data, error } = await supabase.rpc("rate_hit", { p_key: key, p_max: max, p_window_s: windowS });
  return !error && data === true;
}

// Sesi Supabase untuk akun sekolah, tanpa mengirim email.
async function schoolSession(supabase) {
  await supabase.auth.admin.createUser({ email: SCHOOL_EMAIL, email_confirm: true }).catch(() => {});
  let lastError;
  // Link baru membatalkan link sebelumnya; kalau dua HP masuk bersamaan, ulangi sekali.
  for (let i = 0; i < 3; i++) {
    const { data, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email: SCHOOL_EMAIL });
    if (error) { lastError = error; continue; }
    const client = createClient(supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: v, error: e2 } = await client.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: "email" });
    if (!e2 && v.session) return { access_token: v.session.access_token, refresh_token: v.session.refresh_token };
    lastError = e2;
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 700));
  }
  throw lastError || new Error("No session");
}

async function getSetting(supabase, key) {
  const { data } = await supabase.from("school_settings").select("value").eq("key", key).maybeSingle();
  return data?.value || null;
}

async function setSetting(supabase, key, value) {
  const { error } = await supabase.from("school_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

const ADMIN = { role: "admin", staffId: null, nama: "Admin", kelasId: null };

async function loginResult(supabase, who) {
  const ttl = who.role === "admin" ? DAY : 365 * DAY;
  const token = sign({ role: who.role, sid: who.staffId, exp: Date.now() + ttl });
  return { ok: true, ...who, token, email: SCHOOL_EMAIL, session: await schoolSession(supabase) };
}

const clean = (v, n) => String(v ?? "").trim().slice(0, n);
const toStaff = (r) => ({ id: r.id, nama: r.nama, kelasId: r.kelas_id, aktif: r.aktif });

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = req.body || {};

  try {
    const supabase = getSupabase();

    // Daftar nama guru untuk layar masuk (tanpa PIN).
    if (body.action === "list") {
      const { data, error } = await supabase.from("school_staff").select("id, nama, kelas_id, aktif").eq("aktif", true).order("nama");
      if (error) throw error;
      return res.status(200).json({ staff: data.map(toStaff) });
    }

    if (body.action === "login") {
      const pin = clean(body.pin, 6);
      const target = body.who === "admin" ? "admin" : Number(body.who);
      if (!PIN_RE.test(pin) || (target !== "admin" && !Number.isFinite(target))) return res.status(400).json({ error: "PIN harus 4–6 angka." });
      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
      if ((await limited(supabase, "pin-ip:" + ip, 30, 900)) || (await limited(supabase, "pin:" + target, 8, 900))) {
        return res.status(429).json({ error: "Terlalu banyak percobaan. Tunggu 15 menit." });
      }

      let who;
      if (target === "admin") {
        // PIN admin sekolah, atau PIN admin cadangan (pengembang) untuk bantuan bila ada kendala.
        if (pinMatches(pin, await getSetting(supabase, "admin_pin_hash"))) who = ADMIN;
        else if (pinMatches(pin, await getSetting(supabase, "backup_admin_pin_hash"))) who = { ...ADMIN, nama: "Admin (cadangan)" };
        else return res.status(401).json({ error: "PIN salah." });
      } else {
        const { data: s } = await supabase.from("school_staff").select("*").eq("id", target).eq("aktif", true).maybeSingle();
        if (!s || !pinMatches(pin, s.pin_hash)) return res.status(401).json({ error: "PIN salah." });
        who = { role: "guru", staffId: s.id, nama: s.nama, kelasId: s.kelas_id };
      }
      return res.status(200).json(await loginResult(supabase, who));
    }

    // Admin lewat kode email: kirim kode hanya ke email admin yang terdaftar.
    if (body.action === "admin_otp_send") {
      const email = clean(body.email, 254).toLowerCase();
      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
      if ((await limited(supabase, "otp-ip:" + ip, 10, 3600)) || (await limited(supabase, "otp-admin", 5, 3600))) {
        return res.status(429).json({ error: "Terlalu sering minta kode. Coba lagi nanti." });
      }
      if (!email || email !== (await getSetting(supabase, "admin_email"))) return res.status(403).json({ error: "Email ini bukan email admin sekolah." });
      await supabase.auth.admin.createUser({ email, email_confirm: true }).catch(() => {});
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) {
        console.error("admin otp send:", error);
        return res.status(502).json({ error: "Gagal mengirim kode. Coba lagi beberapa menit lagi." });
      }
      return res.status(200).json({ ok: true });
    }

    // Kode email sudah diverifikasi di HP (sesi Supabase email admin): tukar dengan sesi sekolah.
    if (body.action === "admin_otp_login") {
      const jwt = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const { data: u } = await supabase.auth.getUser(jwt);
      const email = u?.user?.email?.toLowerCase();
      if (!email || email !== (await getSetting(supabase, "admin_email"))) return res.status(401).json({ error: "Verifikasi email admin gagal." });
      return res.status(200).json(await loginResult(supabase, ADMIN));
    }

    // Kelola guru: hanya admin.
    const me = verify(req.headers["x-staff-token"]);
    if (!me || me.role !== "admin") return res.status(401).json({ error: "Masuk sebagai admin dulu." });

    if (body.action === "staff_list") {
      const { data, error } = await supabase.from("school_staff").select("id, nama, kelas_id, aktif").order("nama");
      if (error) throw error;
      return res.status(200).json({ staff: data.map(toStaff) });
    }

    if (body.action === "staff_save") {
      const nama = clean(body.nama, 100);
      const pin = clean(body.pin, 6);
      const kelasId = body.kelasId == null || body.kelasId === "" ? null : Number(body.kelasId);
      const id = body.id == null ? null : Number(body.id);
      if (!nama) return res.status(400).json({ error: "Nama guru wajib diisi." });
      if ((!id || pin) && !PIN_RE.test(pin)) return res.status(400).json({ error: "PIN harus 4–6 angka." });
      const row = { nama, kelas_id: kelasId, updated_at: new Date().toISOString() };
      if (pin) row.pin_hash = hashPin(pin);
      const q = id ? supabase.from("school_staff").update(row).eq("id", id) : supabase.from("school_staff").insert(row);
      const { error } = await q;
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (body.action === "admin_set_pin") {
      const pin = clean(body.pin, 6);
      if (!PIN_RE.test(pin)) return res.status(400).json({ error: "PIN harus 4–6 angka." });
      await setSetting(supabase, "admin_pin_hash", hashPin(pin));
      return res.status(200).json({ ok: true });
    }

    if (body.action === "staff_delete") {
      const { error } = await supabase.from("school_staff").delete().eq("id", Number(body.id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Action tidak dikenal" });
  } catch (e) {
    console.error("staff error:", e);
    return res.status(500).json({ error: "Terjadi kesalahan di server. Coba lagi." });
  }
}
