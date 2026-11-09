"use server";
import { revalidatePath } from "next/cache";
import { requireUser, bolehKeuangan } from "@/lib/auth";
import { teks, angka } from "@/lib/format";
import { transaksiTabungan, setorKolektif } from "@/lib/keuangan";
import { ke, pesanGalat } from "@/lib/aksi";

function aman(p: FormDataEntryValue | null, cadangan: string) {
  const s = String(p || "");
  return s.startsWith("/") && !s.startsWith("//") ? s : cadangan;
}

export async function transaksiTab(fd: FormData) {
  const u = await requireUser();
  const sid = Number(fd.get("siswa_id"));
  const jenis = fd.get("jenis") === "tarik" ? "tarik" : "setor";
  const balik = aman(fd.get("kembali"), `/tabungan/${sid}`);
  // Guru kelas boleh menerima setoran; penarikan hanya admin & bendahara
  if (jenis === "tarik" && !bolehKeuangan(u)) ke(balik, { err: "Penarikan tabungan hanya bisa dilakukan bendahara atau admin." });
  let saldo = 0;
  try {
    saldo = await transaksiTabungan(sid, jenis, angka(fd.get("jumlah")), teks(fd.get("keterangan"), 160), u.id);
  } catch (e) {
    ke(balik, { err: pesanGalat(e) });
  }
  revalidatePath("/tabungan");
  ke(balik, { ok: `${jenis === "setor" ? "Setoran" : "Penarikan"} dicatat. Saldo sekarang Rp${saldo.toLocaleString("id-ID")}.` });
}

export async function setorKelas(fd: FormData) {
  const u = await requireUser();
  const kelas = Number(fd.get("kelas") || 0);
  const data: { siswaId: number; jumlah: number }[] = [];
  for (const [k, v] of fd.entries()) {
    const m = /^setor_(\d+)$/.exec(k);
    if (m) data.push({ siswaId: Number(m[1]), jumlah: angka(v) });
  }
  let hasil = { jumlah: 0, total: 0 };
  try {
    hasil = await setorKolektif(data, teks(fd.get("keterangan"), 160), u.id);
  } catch (e) {
    ke(`/tabungan/kolektif?kelas=${kelas}`, { err: pesanGalat(e) });
  }
  revalidatePath("/tabungan");
  ke(`/tabungan?kelas=${kelas}`, { ok: `Setoran ${hasil.jumlah} siswa sebesar Rp${hasil.total.toLocaleString("id-ID")} dicatat.` });
}
