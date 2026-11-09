"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { teks, angka, periode } from "@/lib/format";
import { terbitkanSPP, terbitkanTagihanLain } from "@/lib/keuangan";
import { ke, pesanGalat } from "@/lib/aksi";

export async function terbitSPP(fd: FormData) {
  await requireUser("admin", "bendahara");
  const p = teks(fd.get("periode"), 7);
  let n = 0;
  try {
    n = await terbitkanSPP(p, Number(fd.get("kelas") || 0) || null);
  } catch (e) {
    ke("/tagihan", { err: pesanGalat(e) });
  }
  revalidatePath("/", "layout");
  ke("/tagihan", n ? { ok: `Tagihan SPP ${periode(p)} diterbitkan untuk ${n} siswa.` } : { err: `Semua siswa aktif sudah punya tagihan SPP ${periode(p)}.` });
}

export async function terbitLain(fd: FormData) {
  await requireUser("admin", "bendahara");
  let n = 0;
  const jenis = teks(fd.get("jenis"), 40);
  try {
    n = await terbitkanTagihanLain(jenis, teks(fd.get("keterangan"), 160), angka(fd.get("nominal")), teks(fd.get("jatuh_tempo"), 10),
      Number(fd.get("kelas") || 0) || null);
  } catch (e) {
    ke("/tagihan", { err: pesanGalat(e) });
  }
  revalidatePath("/", "layout");
  ke("/tagihan", n ? { ok: `Tagihan ${jenis} diterbitkan untuk ${n} siswa.` } : { err: "Tidak ada siswa baru yang ditagih (semua sudah punya tagihan yang sama)." });
}
