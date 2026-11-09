import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { row, exec } from "./db";

export type Role = "admin" | "bendahara" | "guru";
export type User = { id: number; nama: string; username: string; role: Role };

const COOKIE = "spp_sesi";
const UMUR_SESI = 60 * 60 * 12; // 12 jam

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function buatSesi(penggunaId: number) {
  const token = randomBytes(32).toString("base64url");
  await exec("DELETE FROM sesi WHERE expires_at < NOW()");
  await exec("INSERT INTO sesi (token, pengguna_id, expires_at) VALUES (?, ?, NOW() + INTERVAL ? SECOND)", [sha(token), penggunaId, UMUR_SESI]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: UMUR_SESI,
    secure: process.env.NODE_ENV === "production" && (process.env.APP_URL || "").startsWith("https://"),
  });
}

export async function hapusSesi() {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (t) await exec("DELETE FROM sesi WHERE token = ?", [sha(t)]);
  c.delete(COOKIE);
}

/** Pengguna yang sedang masuk (dibaca ulang dari database tiap request, jadi penonaktifan langsung berlaku). */
export const getUser = cache(async (): Promise<User | null> => {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  return row<User>(
    `SELECT p.id, p.nama, p.username, p.role FROM sesi s JOIN pengguna p ON p.id = s.pengguna_id
     WHERE s.token = ? AND s.expires_at > NOW() AND p.aktif = 1`, [sha(t)]);
});

export async function requireUser(...roles: Role[]): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  if (roles.length && !roles.includes(u.role)) redirect("/dashboard?err=" + encodeURIComponent("Menu itu tidak tersedia untuk peran Anda."));
  return u;
}

export const LABEL_ROLE: Record<Role, string> = { admin: "Admin / Kepala Sekolah", bendahara: "Bendahara", guru: "Guru Kelas" };

/** Boleh mengelola keuangan (tagihan, pembayaran, pengingat). */
export const bolehKeuangan = (u: User) => u.role === "admin" || u.role === "bendahara";

// Pembatas percobaan sederhana di memori (cukup untuk satu server sekolah)
const g = globalThis as unknown as { __coba?: Map<string, { n: number; t: number }> };
const coba = (g.__coba ??= new Map());

export function batasCoba(kunci: string, maks = 5, detik = 600): boolean {
  const now = Date.now();
  const d = coba.get(kunci);
  if (!d || now - d.t > detik * 1000) { coba.set(kunci, { n: 1, t: now }); return true; }
  if (d.n >= maks) return false;
  d.n++;
  return true;
}

export function resetCoba(kunci: string) {
  coba.delete(kunci);
}
