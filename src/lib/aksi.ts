import "server-only";
import { redirect } from "next/navigation";
import { Gagal } from "./keuangan";

/** Arahkan kembali ke halaman dengan pesan sukses / gagal. */
export function ke(path: string, pesan: { ok?: string; err?: string } = {}): never {
  const q = new URLSearchParams();
  if (pesan.ok) q.set("ok", pesan.ok);
  if (pesan.err) q.set("err", pesan.err);
  const s = q.toString();
  redirect(s ? `${path}${path.includes("?") ? "&" : "?"}${s}` : path);
}

/** Ubah error menjadi pesan untuk pengguna; error tak terduga dicatat di log server. */
export function pesanGalat(e: unknown): string {
  if (e instanceof Gagal) return e.message;
  console.error(e);
  return "Terjadi kesalahan di server. Coba lagi.";
}
