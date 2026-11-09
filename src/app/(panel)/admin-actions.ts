"use server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { row, exec } from "@/lib/db";
import { teks, angka } from "@/lib/format";
import { ke } from "@/lib/aksi";

const WARNA = ["terakota", "mustard", "sage", "biru", "plum"];

export async function simpanKelas(fd: FormData) {
  await requireUser("admin");
  const id = Number(fd.get("id") || 0);
  const nama = teks(fd.get("nama"), 60), wali = teks(fd.get("wali_kelas"), 100), tarif = angka(fd.get("tarif_spp"));
  const warna = WARNA.includes(String(fd.get("warna"))) ? String(fd.get("warna")) : "sage";
  const urutan = Math.min(99, angka(fd.get("urutan")));
  if (nama.length < 2) ke("/kelas", { err: "Isi nama kelas." });
  if (tarif > 10_000_000) ke("/kelas", { err: "Tarif SPP tidak wajar." });
  if (id) await exec("UPDATE kelas SET nama=?, wali_kelas=?, tarif_spp=?, warna=?, urutan=? WHERE id=?", [nama, wali, tarif, warna, urutan, id]);
  else await exec("INSERT INTO kelas (nama, wali_kelas, tarif_spp, warna, urutan) VALUES (?,?,?,?,?)", [nama, wali, tarif, warna, urutan]);
  revalidatePath("/kelas");
  ke("/kelas", { ok: id ? `Kelas ${nama} diperbarui. Tarif baru berlaku untuk tagihan SPP berikutnya.` : `Kelas ${nama} ditambahkan.` });
}

export async function hapusKelas(fd: FormData) {
  await requireUser("admin");
  const id = Number(fd.get("id"));
  const n = await row<{ n: number }>("SELECT COUNT(*) n FROM siswa WHERE kelas_id = ? AND status = 'aktif'", [id]);
  if (n && n.n > 0) ke("/kelas", { err: "Kelas masih punya siswa aktif. Pindahkan siswanya dulu." });
  await exec("DELETE FROM kelas WHERE id = ?", [id]);
  ke("/kelas", { ok: "Kelas dihapus." });
}

export async function naikKelas(fd: FormData) {
  await requireUser("admin");
  const dari = Number(fd.get("dari")), ke_ = fd.get("ke") === "lulus" ? "lulus" : Number(fd.get("ke"));
  if (!dari || !ke_ || ke_ === dari) ke("/kelas", { err: "Pilih kelas asal dan tujuan yang berbeda." });
  const r = ke_ === "lulus"
    ? await exec("UPDATE siswa SET status = 'lulus' WHERE kelas_id = ? AND status = 'aktif'", [dari])
    : await exec("UPDATE siswa SET kelas_id = ? WHERE kelas_id = ? AND status = 'aktif'", [ke_, dari]);
  ke("/kelas", { ok: `${r.affectedRows} siswa ${ke_ === "lulus" ? "ditandai lulus" : "dipindahkan"}.` });
}

export async function simpanPengguna(fd: FormData) {
  const u = await requireUser("admin");
  const id = Number(fd.get("id") || 0);
  const nama = teks(fd.get("nama"), 100), username = teks(fd.get("username"), 40).toLowerCase();
  const role = ["admin", "bendahara", "guru"].includes(String(fd.get("role"))) ? String(fd.get("role")) : "guru";
  const sandi = String(fd.get("password") || "");
  if (nama.length < 3) ke("/pengguna", { err: "Isi nama pengguna." });
  if (!/^[a-z0-9._]{3,40}$/.test(username)) ke("/pengguna", { err: "Username 3-40 karakter: huruf kecil, angka, titik, garis bawah." });
  if ((!id || sandi) && sandi.length < 8) ke("/pengguna", { err: "Kata sandi minimal 8 karakter." });
  if (await row("SELECT id FROM pengguna WHERE username = ? AND id <> ?", [username, id])) ke("/pengguna", { err: "Username sudah dipakai." });
  if (id === u.id && role !== "admin") ke("/pengguna", { err: "Anda tidak bisa menurunkan peran akun sendiri." });
  if (id) {
    await exec("UPDATE pengguna SET nama=?, username=?, role=? WHERE id=?", [nama, username, role, id]);
    if (sandi) {
      await exec("UPDATE pengguna SET password=? WHERE id=?", [await bcrypt.hash(sandi, 10), id]);
      await exec("DELETE FROM sesi WHERE pengguna_id = ?", [id]);
    }
  } else {
    await exec("INSERT INTO pengguna (nama, username, password, role, aktif, created_at) VALUES (?,?,?,?,1,NOW())", [nama, username, await bcrypt.hash(sandi, 10), role]);
  }
  ke("/pengguna", { ok: id ? "Pengguna diperbarui." : `Pengguna ${username} ditambahkan.` });
}

export async function aturAktif(fd: FormData) {
  const u = await requireUser("admin");
  const id = Number(fd.get("id"));
  if (id === u.id) ke("/pengguna", { err: "Anda tidak bisa menonaktifkan akun sendiri." });
  const aktif = fd.get("aktif") === "1" ? 1 : 0;
  await exec("UPDATE pengguna SET aktif = ? WHERE id = ?", [aktif, id]);
  if (!aktif) await exec("DELETE FROM sesi WHERE pengguna_id = ?", [id]);
  ke("/pengguna", { ok: aktif ? "Pengguna diaktifkan." : "Pengguna dinonaktifkan dan langsung keluar dari aplikasi." });
}

export type HasilSetting = { err?: Record<string, string>; ok?: string; nilai?: Record<string, string>; t?: number } | null;

export async function simpanPengaturan(_: HasilSetting, fd: FormData): Promise<HasilSetting> {
  await requireUser("admin");
  const d = {
    nama_sekolah: teks(fd.get("nama_sekolah"), 120), alamat: teks(fd.get("alamat"), 255), telepon: teks(fd.get("telepon"), 30),
    whatsapp: teks(fd.get("whatsapp"), 20), kepala_sekolah: teks(fd.get("kepala_sekolah"), 100), bendahara: teks(fd.get("bendahara"), 100),
    rekening: teks(fd.get("rekening"), 160), jatuh_tempo: angka(fd.get("jatuh_tempo")),
    template_pengingat: String(fd.get("template_pengingat") || "").trim().slice(0, 2000),
    fonnte_token: teks(fd.get("fonnte_token"), 120), pengingat_otomatis: fd.get("pengingat_otomatis") ? 1 : 0,
    hari_pengingat: teks(fd.get("hari_pengingat"), 40).replace(/\s/g, ""),
  };
  const err: Record<string, string> = {};
  if (d.nama_sekolah.length < 4) err.nama_sekolah = "Isi nama sekolah.";
  if (d.jatuh_tempo < 1 || d.jatuh_tempo > 28) err.jatuh_tempo = "Tanggal jatuh tempo 1 - 28.";
  if (d.template_pengingat.length < 20) err.template_pengingat = "Template pesan terlalu pendek.";
  if (!/^-?\d{1,2}(,-?\d{1,2})*$/.test(d.hari_pengingat)) err.hari_pengingat = "Format contoh: -3,0,7 (angka dipisah koma).";
  if (d.pengingat_otomatis && !d.fonnte_token) err.fonnte_token = "Pengingat otomatis butuh token Fonnte.";
  if (Object.keys(err).length) return { err, nilai: Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$")).map(([k, v]) => [k, String(v)])), t: Date.now() };
  await exec(`UPDATE pengaturan SET nama_sekolah=?, alamat=?, telepon=?, whatsapp=?, kepala_sekolah=?, bendahara=?, rekening=?, jatuh_tempo=?,
              template_pengingat=?, fonnte_token=?, pengingat_otomatis=?, hari_pengingat=? WHERE id = 1`, Object.values(d) as (string | number)[]);
  if (fd.get("ganti_kunci")) await exec("UPDATE pengaturan SET cron_key = ? WHERE id = 1", [randomBytes(16).toString("hex")]);
  revalidatePath("/", "layout");
  return { ok: "Pengaturan disimpan.", t: Date.now() };
}

export type HasilSandi = { err?: string; ok?: string } | null;

export async function gantiSandi(_: HasilSandi, fd: FormData): Promise<HasilSandi> {
  const u = await requireUser();
  const lama = String(fd.get("lama") || ""), baru = String(fd.get("baru") || ""), ulang = String(fd.get("ulang") || "");
  const p = await row<{ password: string }>("SELECT password FROM pengguna WHERE id = ?", [u.id]);
  if (!p || !(await bcrypt.compare(lama, p.password))) return { err: "Kata sandi lama salah." };
  if (baru.length < 8 || !/[A-Za-z]/.test(baru) || !/\d/.test(baru)) return { err: "Kata sandi baru minimal 8 karakter berisi huruf dan angka." };
  if (baru !== ulang) return { err: "Ulangi kata sandi baru dengan isian yang sama." };
  await exec("UPDATE pengguna SET password = ? WHERE id = ?", [await bcrypt.hash(baru, 10), u.id]);
  return { ok: "Kata sandi berhasil diganti." };
}
