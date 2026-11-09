import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { rows, row } from "@/lib/db";
import Kepala from "@/components/kepala";
import Ikon from "@/components/ikon";
import FormSiswa from "../../form";

export const metadata = { title: "Ubah siswa" };

export default async function UbahSiswa({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin", "bendahara");
  const { id } = await params;
  const s = await row<Record<string, string | number | null>>("SELECT * FROM siswa WHERE id = ?", [Number(id) || 0]);
  if (!s) notFound();
  const kelas = await rows<{ id: number; nama: string; tarif_spp: number }>("SELECT id, nama, tarif_spp FROM kelas ORDER BY urutan");
  return (
    <>
      <Kepala judul={`Ubah data ${s.nama}`}><Link className="btn terang" href={`/siswa/${id}`}><Ikon n="kiri" /> Kembali</Link></Kepala>
      <FormSiswa kelas={kelas} s={s} />
    </>
  );
}
