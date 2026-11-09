"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { row } from "@/lib/db";
import { buatSesi, hapusSesi, batasCoba, resetCoba } from "@/lib/auth";

export async function masuk(_: string | null, fd: FormData): Promise<string | null> {
  const username = String(fd.get("username") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] || "lokal";
  if (!batasCoba(`login:${ip}:${username}`, 5, 600)) return "Terlalu banyak percobaan masuk. Coba lagi 10 menit lagi.";
  const u = await row<{ id: number; password: string; aktif: number }>("SELECT id, password, aktif FROM pengguna WHERE username = ?", [username]);
  if (!u || !(await bcrypt.compare(password, u.password))) return "Username atau kata sandi salah.";
  if (!u.aktif) return "Akun ini dinonaktifkan. Hubungi admin sekolah.";
  resetCoba(`login:${ip}:${username}`);
  await buatSesi(u.id);
  redirect("/dashboard");
}

export async function keluar() {
  await hapusSesi();
  redirect("/login");
}
