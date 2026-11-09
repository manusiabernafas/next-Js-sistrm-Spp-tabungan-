import Link from "next/link";
import { notFound } from "next/navigation";
import { getSetting } from "@/lib/setting";
import { siswaDariToken } from "@/lib/wali";
import { ambilKuitansi } from "@/lib/kuitansi";
import Kuitansi from "@/components/kuitansi";
import TombolCetak from "@/components/tombol-cetak";
import Ikon from "@/components/ikon";

export const metadata = { title: "Kuitansi", robots: { index: false, follow: false } };

export default async function KuitansiWali({ params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const s = await siswaDariToken(token);
  if (!s) notFound();
  // Kuitansi hanya bisa dibuka bila memang milik siswa dari token ini
  const d = await ambilKuitansi(Number(id) || 0, s.id);
  if (!d) notFound();
  return (
    <main style={{ padding: "10px 12px 40px" }}>
      <div className="alat-cetak no-print">
        <Link className="btn terang" href={`/wali/${token}`}><Ikon n="kiri" /> Kembali</Link>
        <TombolCetak label="Cetak / simpan PDF" />
      </div>
      <Kuitansi d={d} s={await getSetting()} />
    </main>
  );
}
