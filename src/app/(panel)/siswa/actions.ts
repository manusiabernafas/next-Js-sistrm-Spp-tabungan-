"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { row, exec } from "@/lib/db";
import { teks, angka } from "@/lib/format";
import { bayar, batalBayar, type Metode } from "@/lib/keuangan";
import { ke, pesanGalat } from "@/lib/aksi";

export type HasilForm = { err?: Record<string, string>; umum?: string; nilai?: Record<string, string>; t?: number } | null;

const nilaiForm = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$")).map(([k, v]) => [k, String(v)]));

export async function simpanSiswa(_: HasilForm, fd: FormData): Promise<HasilForm> {
  await requireUser("admin", "bendahara");
  const id = Number(fd.get("id") || 0);
  const d = {
    nis: teks(fd.get("nis"), 20), nama: teks(fd.get("nama"), 100), panggilan: teks(fd.get("panggilan"), 30),
    jk: fd.get("jk") === "P" ? "P" : "L", tgl_lahir: teks(fd.get("tgl_lahir"), 10), kelas_id: Number(fd.get("kelas_id") || 0) || null,
    nama_wali: teks(fd.get("nama_wali"), 100), hubungan: teks(fd.get("hubungan"), 20) || "Ibu", no_wa: teks(fd.get("no_wa"), 20),
    alamat: teks(fd.get("alamat"), 255), potongan: angka(fd.get("potongan")), ket_potongan: teks(fd.get("ket_potongan"), 80),
    status: ["aktif", "lulus", "keluar"].includes(String(fd.get("status"))) ? String(fd.get("status")) : "aktif",
    tgl_masuk: teks(fd.get("tgl_masuk"), 10),
  };
  const err: Record<string, string> = {};
  if (!/^[A-Za-z0-9.\-/]{3,20}$/.test(d.nis)) err.nis = "NIS 3-20 karakter (huruf, angka, titik, strip).";
  if (d.nama.length < 3) err.nama = "Isi nama lengkap siswa.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.tgl_lahir)) err.tgl_lahir = "Isi tanggal lahir.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.tgl_masuk)) err.tgl_masuk = "Isi tanggal masuk.";
  if (d.nama_wali.length < 3) err.nama_wali = "Isi nama orang tua / wali.";
  if (d.no_wa && !/^(\+62|62|0)8[0-9]{7,12}$/.test(d.no_wa.replace(/[\s-]/g, ""))) err.no_wa = "Nomor WhatsApp tidak valid (contoh 081234567890).";
  if (d.status === "aktif" && !d.kelas_id) err.kelas_id = "Pilih kelas.";
  if (d.kelas_id) {
    const k = await row<{ tarif_spp: number }>("SELECT tarif_spp FROM kelas WHERE id = ?", [d.kelas_id]);
    if (!k) err.kelas_id = "Kelas tidak ditemukan.";
    else if (d.potongan > k.tarif_spp) err.potongan = "Potongan tidak boleh melebihi tarif SPP kelas.";
  }
  if (await row("SELECT id FROM siswa WHERE nis = ? AND id <> ?", [d.nis, id])) err.nis = "NIS sudah dipakai siswa lain.";
  if (Object.keys(err).length) return { err, nilai: nilaiForm(fd), t: Date.now() };
  d.no_wa = d.no_wa.replace(/[\s-]/g, "");

  let sid = id;
  const p = [d.nis, d.nama, d.panggilan || d.nama.split(" ")[0], d.jk, d.tgl_lahir, d.kelas_id, d.nama_wali, d.hubungan, d.no_wa,
    d.alamat, d.potongan, d.potongan ? d.ket_potongan : "", d.status, d.tgl_masuk];
  if (id) {
    const r = await exec(`UPDATE siswa SET nis=?, nama=?, panggilan=?, jk=?, tgl_lahir=?, kelas_id=?, nama_wali=?, hubungan=?, no_wa=?,
                          alamat=?, potongan=?, ket_potongan=?, status=?, tgl_masuk=? WHERE id=?`, [...p, id]);
    if (!r.affectedRows) return { umum: "Siswa tidak ditemukan.", nilai: nilaiForm(fd), t: Date.now() };
  } else {
    const r = await exec(`INSERT INTO siswa (nis, nama, panggilan, jk, tgl_lahir, kelas_id, nama_wali, hubungan, no_wa, alamat, potongan,
                          ket_potongan, status, tgl_masuk, token_wali, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
      [...p, randomBytes(12).toString("hex")]);
    sid = r.insertId;
  }
  revalidatePath("/siswa");
  ke(`/siswa/${sid}`, { ok: id ? "Data siswa diperbarui." : "Siswa ditambahkan. Terbitkan tagihan SPP-nya di menu Tagihan." });
}

export async function terimaBayar(fd: FormData) {
  const u = await requireUser("admin", "bendahara");
  const sid = Number(fd.get("siswa_id"));
  const ids = fd.getAll("tagihan").map(Number).filter(Boolean);
  const metode = (["tunai", "transfer", "tabungan"].includes(String(fd.get("metode"))) ? fd.get("metode") : "tunai") as Metode;
  let pid = 0;
  try {
    pid = await bayar(sid, ids, angka(fd.get("jumlah")), metode, teks(fd.get("catatan"), 160), u.id);
  } catch (e) {
    ke(`/siswa/${sid}`, { err: pesanGalat(e) });
  }
  revalidatePath(`/siswa/${sid}`);
  ke(`/kuitansi/${pid}`, { ok: "Pembayaran dicatat. Kuitansi siap dicetak." });
}

export async function batalkanKuitansi(fd: FormData) {
  const u = await requireUser("admin", "bendahara");
  const pid = Number(fd.get("id"));
  const balik = String(fd.get("kembali") || `/kuitansi/${pid}`);
  const aman = balik.startsWith("/") && !balik.startsWith("//") ? balik : "/pembayaran";
  try {
    await batalBayar(pid, u.id, teks(fd.get("alasan"), 80));
  } catch (e) {
    ke(aman, { err: pesanGalat(e) });
  }
  ke(aman, { ok: "Kuitansi dibatalkan dan sisa tagihan dikembalikan." });
}

export async function batalkanTagihan(fd: FormData) {
  await requireUser("admin", "bendahara");
  const id = Number(fd.get("id"));
  const t = await row<{ siswa_id: number; terbayar: number; status: string }>("SELECT siswa_id, terbayar, status FROM tagihan WHERE id = ?", [id]);
  if (!t) ke("/tagihan", { err: "Tagihan tidak ditemukan." });
  if (t.terbayar > 0) ke(`/siswa/${t.siswa_id}`, { err: "Tagihan yang sudah dibayar sebagian tidak bisa dibatalkan. Batalkan kuitansinya dulu." });
  await exec("UPDATE tagihan SET status = 'batal' WHERE id = ? AND terbayar = 0", [id]);
  ke(`/siswa/${t.siswa_id}`, { ok: "Tagihan dibatalkan." });
}

export async function gantiTokenWali(fd: FormData) {
  await requireUser("admin", "bendahara");
  const id = Number(fd.get("id"));
  await exec("UPDATE siswa SET token_wali = ? WHERE id = ?", [randomBytes(12).toString("hex"), id]);
  ke(`/siswa/${id}`, { ok: "Tautan portal wali diganti. Tautan lama tidak berlaku lagi." });
}
