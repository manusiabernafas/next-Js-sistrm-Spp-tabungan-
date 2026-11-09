"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { row } from "@/lib/db";
import { batasCoba } from "@/lib/auth";

export async function cariAnak(_: string | null, fd: FormData): Promise<string | null> {
  const nis = String(fd.get("nis") || "").trim().slice(0, 20);
  const lahir = String(fd.get("tgl_lahir") || "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] || "lokal";
  if (!batasCoba(`cek:${ip}`, 8, 900)) return "Terlalu banyak percobaan. Coba lagi 15 menit lagi.";
  if (!nis || !/^\d{4}-\d{2}-\d{2}$/.test(lahir)) return "Isi NIS dan tanggal lahir ananda.";
  const s = await row<{ token_wali: string }>("SELECT token_wali FROM siswa WHERE nis = ? AND tgl_lahir = ?", [nis, lahir]);
  if (!s) return "Data tidak ditemukan. Periksa NIS dan tanggal lahir, atau hubungi sekolah.";
  redirect(`/wali/${s.token_wali}`);
}
