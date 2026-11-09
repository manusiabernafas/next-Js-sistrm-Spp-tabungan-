import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { rows } from "@/lib/db";
import { rupiah, tgl, jam, hariIni, namaTagihan } from "@/lib/format";
import Kepala from "@/components/kepala";
import Pesan from "@/components/pesan";
import Ikon from "@/components/ikon";

export const metadata = { title: "Pembayaran" };

export default async function Pembayaran({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireUser("admin", "bendahara");
  const h = hariIni();
  const ok = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const dari = ok(sp.dari) || h.slice(0, 8) + "01";
  const sampai = ok(sp.sampai) || h;
  const metode = ["tunai", "transfer", "tabungan"].includes(sp.metode) ? sp.metode : "";
  const p: string[] = [dari, sampai];
  if (metode) p.push(metode);
  const data = await rows<{ id: number; no_kuitansi: string; tanggal: string; total: number; metode: string; batal: number; nama: string; kelas: string | null;
    siswa_id: number; petugas: string | null; rincian: string }>(
    `SELECT p.id, p.no_kuitansi, p.tanggal, p.total, p.metode, p.batal, s.nama, s.id siswa_id, k.nama kelas, g.nama petugas,
            (SELECT GROUP_CONCAT(CONCAT(t.jenis, IF(t.periode IS NULL, '', CONCAT(' ', t.periode))) ORDER BY t.jatuh_tempo SEPARATOR ', ')
             FROM pembayaran_detail d JOIN tagihan t ON t.id = d.tagihan_id WHERE d.pembayaran_id = p.id) rincian
     FROM pembayaran p JOIN siswa s ON s.id = p.siswa_id LEFT JOIN kelas k ON k.id = s.kelas_id LEFT JOIN pengguna g ON g.id = p.dicatat_oleh
     WHERE DATE(p.tanggal) BETWEEN ? AND ? ${metode ? "AND p.metode = ?" : ""} ORDER BY p.tanggal DESC, p.id DESC LIMIT 500`, p);
  const sah = data.filter((x) => !x.batal);
  const sum = (m?: string) => sah.filter((x) => !m || x.metode === m).reduce((a, x) => a + x.total, 0);
  const rinci = (r: string) => (r || "").split(", ").map((x) => {
    const m = /^(.*) (\d{4}-\d{2})$/.exec(x);
    return m ? namaTagihan({ jenis: m[1], periode: m[2] }) : x;
  }).join(", ");
  return (
    <>
      <Kepala judul="Pembayaran" sub={`${tgl(dari)} sampai ${tgl(sampai)}`}>
        <a className="btn terang" href={`/laporan/csv?jenis=pembayaran&dari=${dari}&sampai=${sampai}`}><Ikon n="unduh" /> CSV</a>
        <Link className="btn" href="/siswa"><Ikon n="plus" /> Terima pembayaran</Link>
      </Kepala>
      <Pesan sp={sp} />
      <div className="grid g4">
        <div className="balok kertas"><div className="lbl muted">Total diterima</div><div className="nil">{rupiah(sum())}</div><div className="sub muted">{sah.length} kuitansi</div></div>
        <div className="balok kertas"><div className="lbl muted">Tunai</div><div className="nil">{rupiah(sum("tunai"))}</div></div>
        <div className="balok kertas"><div className="lbl muted">Transfer</div><div className="nil">{rupiah(sum("transfer"))}</div></div>
        <div className="balok kertas"><div className="lbl muted">Dari tabungan</div><div className="nil">{rupiah(sum("tabungan"))}</div></div>
      </div>
      <div className="kartu rata mt">
        <form className="kepala-kartu filter">
          <input className="input" type="date" name="dari" defaultValue={dari} aria-label="Dari tanggal" />
          <input className="input" type="date" name="sampai" defaultValue={sampai} aria-label="Sampai tanggal" />
          <select className="input" name="metode" defaultValue={metode}><option value="">Semua metode</option><option value="tunai">Tunai</option><option value="transfer">Transfer</option><option value="tabungan">Tabungan</option></select>
          <button className="btn terang kecil">Tampilkan</button>
        </form>
        <div className="tabel-wrap">
          <table className="tabel">
            <thead><tr><th>Kuitansi</th><th>Siswa</th><th>Rincian</th><th>Metode</th><th className="kanan">Jumlah</th></tr></thead>
            <tbody>
              {data.map((x) => (
                <tr key={x.id} style={x.batal ? { opacity: 0.55 } : undefined}>
                  <td><Link className="nama" href={`/kuitansi/${x.id}`}>{x.no_kuitansi}</Link><div className="kecil muted">{tgl(x.tanggal)} {jam(x.tanggal)}{x.petugas ? ` · ${x.petugas.split(",")[0]}` : ""}</div></td>
                  <td><Link className="nama" href={`/siswa/${x.siswa_id}`}>{x.nama}</Link><div className="kecil muted">{x.kelas}</div></td>
                  <td className="kecil" style={{ maxWidth: 300 }}>{rinci(x.rincian)}</td>
                  <td><span className={`chip ${x.metode === "tunai" ? "hijau" : x.metode === "transfer" ? "biru" : "ungu"}`}>{x.metode}</span></td>
                  <td className="kanan angka tebal">{x.batal ? <span className="chip merah">Batal</span> : rupiah(x.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.length && <div className="kosong">Belum ada pembayaran pada rentang ini.</div>}
        </div>
      </div>
    </>
  );
}
