import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSetting, appUrl } from "@/lib/setting";
import { ambilKuitansi } from "@/lib/kuitansi";
import { rupiah, waLink } from "@/lib/format";
import Kuitansi from "@/components/kuitansi";
import Pesan from "@/components/pesan";
import Ikon from "@/components/ikon";
import TombolCetak from "@/components/tombol-cetak";
import { batalkanKuitansi } from "../../siswa/actions";

export const metadata = { title: "Kuitansi" };

export default async function HalKuitansi({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requireUser("admin", "bendahara");
  const d = await ambilKuitansi(Number(id) || 0);
  if (!d) notFound();
  const s = await getSetting();
  const link = `${appUrl()}/wali/${d.p.token_wali}/kuitansi/${d.p.id}`;
  const pesan = `Terima kasih Bapak/Ibu ${d.p.nama_wali}, pembayaran ananda ${d.p.nama} sebesar ${rupiah(d.p.total)} sudah kami terima (${d.p.no_kuitansi}). Kuitansi: ${link}\n\n${s.nama_sekolah}`;
  return (
    <>
      <div className="alat-cetak no-print" style={{ flexWrap: "wrap" }}>
        <Link className="btn terang" href={`/siswa/${d.p.siswa_id}`}><Ikon n="kiri" /> Ke data siswa</Link>
        <TombolCetak />
        {d.p.no_wa && !d.p.batal && <a className="btn hijau" target="_blank" rel="noopener" href={waLink(d.p.no_wa, pesan)}><Ikon n="wa" /> Kirim ke wali</a>}
      </div>
      <div className="no-print" style={{ maxWidth: 820, margin: "0 auto" }}><Pesan sp={sp} /></div>
      <Kuitansi d={d} s={s} />
      {!d.p.batal && (
        <form action={batalkanKuitansi} className="alat-cetak no-print kecil" style={{ alignItems: "center" }}>
          <input type="hidden" name="id" value={d.p.id} />
          <span className="muted">Salah catat?</span>
          <input className="input" name="alasan" placeholder="Alasan pembatalan" required maxLength={80} style={{ maxWidth: 260, minHeight: 36 }} />
          <button className="tautan merah">Batalkan kuitansi</button>
        </form>
      )}
    </>
  );
}
