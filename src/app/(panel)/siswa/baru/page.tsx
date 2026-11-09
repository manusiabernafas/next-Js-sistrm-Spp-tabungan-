import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { rows, val } from "@/lib/db";
import { hariIni } from "@/lib/format";
import Kepala from "@/components/kepala";
import Ikon from "@/components/ikon";
import FormSiswa from "../form";

export const metadata = { title: "Tambah siswa" };

export default async function SiswaBaru() {
  await requireUser("admin", "bendahara");
  const kelas = await rows<{ id: number; nama: string; tarif_spp: number }>("SELECT id, nama, tarif_spp FROM kelas ORDER BY urutan");
  // Saran NIS berikutnya: tahun masuk 2 digit + urutan
  const th = hariIni().slice(2, 4);
  const n = Number(await val("SELECT COUNT(*) FROM siswa WHERE nis LIKE ?", [`${th}%`])) + 1;
  return (
    <>
      <Kepala judul="Tambah siswa"><Link className="btn terang" href="/siswa"><Ikon n="kiri" /> Kembali</Link></Kepala>
      <FormSiswa kelas={kelas} s={{ nis: `${th}0${String(n).padStart(3, "0")}`, tgl_masuk: hariIni(), status: "aktif", potongan: 0 }} />
    </>
  );
}
