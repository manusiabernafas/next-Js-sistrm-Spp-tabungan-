import { requireUser } from "@/lib/auth";
import { rows, row } from "@/lib/db";
import { rupiah, tgl, periode, hariIni, tahunAjaran } from "@/lib/format";
import Kepala from "@/components/kepala";
import Ikon from "@/components/ikon";
import TombolCetak from "@/components/tombol-cetak";

export const metadata = { title: "Laporan" };

export default async function Laporan({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireUser("admin", "bendahara");
  const h = hariIni();
  const ta = tahunAjaran(h);
  const ok = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const dari = ok(sp.dari) || `${ta.slice(0, 4)}-07-01`;
  const sampai = ok(sp.sampai) || h;
  const r = [dari, sampai];

  const perJenis = await rows<{ jenis: string; total: number; n: number }>(
    `SELECT t.jenis, SUM(d.jumlah) total, COUNT(DISTINCT p.id) n FROM pembayaran p JOIN pembayaran_detail d ON d.pembayaran_id = p.id
     JOIN tagihan t ON t.id = d.tagihan_id WHERE p.batal = 0 AND DATE(p.tanggal) BETWEEN ? AND ? GROUP BY t.jenis ORDER BY total DESC`, r);
  const perBulan = await rows<{ p: string; tunai: number; transfer: number; tabungan: number }>(
    `SELECT DATE_FORMAT(tanggal, '%Y-%m') p, SUM(IF(metode='tunai', total, 0)) tunai, SUM(IF(metode='transfer', total, 0)) transfer,
            SUM(IF(metode='tabungan', total, 0)) tabungan FROM pembayaran WHERE batal = 0 AND DATE(tanggal) BETWEEN ? AND ? GROUP BY p ORDER BY p`, r);
  const perKelas = await rows<{ nama: string; siswa: number; tagihan: number; terkumpul: number; sisa: number; nunggak: number }>(
    `SELECT k.nama, COUNT(DISTINCT s.id) siswa, COALESCE(SUM(t.nominal - t.potongan), 0) tagihan, COALESCE(SUM(t.terbayar), 0) terkumpul,
            COALESCE(SUM(IF(t.status IN ('belum','sebagian') AND t.jatuh_tempo < ?, t.nominal - t.potongan - t.terbayar, 0)), 0) sisa,
            COUNT(DISTINCT IF(t.status IN ('belum','sebagian') AND t.jatuh_tempo < ?, s.id, NULL)) nunggak
     FROM kelas k LEFT JOIN siswa s ON s.kelas_id = k.id AND s.status = 'aktif'
     LEFT JOIN tagihan t ON t.siswa_id = s.id AND t.status <> 'batal' AND t.jatuh_tempo BETWEEN ? AND ?
     GROUP BY k.id ORDER BY k.urutan`, [h, h, ...r]);
  const tab = (await row<{ setor: number; tarik: number; saldo: number; bayar: number }>(
    `SELECT COALESCE(SUM(IF(jenis='setor', jumlah, 0)), 0) setor, COALESCE(SUM(IF(jenis='tarik' AND pembayaran_id IS NULL, jumlah, 0)), 0) tarik,
            COALESCE(SUM(IF(jenis='tarik' AND pembayaran_id IS NOT NULL, jumlah, 0)), 0) bayar,
            (SELECT COALESCE(SUM(saldo_tabungan), 0) FROM siswa) saldo FROM tabungan WHERE DATE(tanggal) BETWEEN ? AND ?`, r))!;
  const totalMasuk = perJenis.reduce((a, x) => a + Number(x.total), 0);
  const maks = Math.max(1, ...perBulan.map((b) => Number(b.tunai) + Number(b.transfer) + Number(b.tabungan)));
  const csv = (j: string) => `/laporan/csv?jenis=${j}&dari=${dari}&sampai=${sampai}`;

  return (
    <>
      <Kepala judul="Laporan keuangan" sub={`${tgl(dari, true)} sampai ${tgl(sampai, true)}`}>
        <TombolCetak />
      </Kepala>
      <form className="kartu filter no-print" style={{ marginBottom: 16 }}>
        <input className="input" type="date" name="dari" defaultValue={dari} aria-label="Dari" />
        <input className="input" type="date" name="sampai" defaultValue={sampai} aria-label="Sampai" />
        <button className="btn terang kecil">Tampilkan</button>
        <span style={{ flex: 1 }} />
        <a className="btn terang kecil" href={csv("pembayaran")}><Ikon n="unduh" s={15} /> Pembayaran</a>
        <a className="btn terang kecil" href={csv("tunggakan")}><Ikon n="unduh" s={15} /> Tunggakan</a>
        <a className="btn terang kecil" href={csv("mutasi")}><Ikon n="unduh" s={15} /> Mutasi tabungan</a>
      </form>
      <div className="grid g4">
        <div className="balok sage"><div className="lbl">Total penerimaan</div><div className="nil">{rupiah(totalMasuk)}</div></div>
        <div className="balok terakota"><div className="lbl">Tunggakan saat ini</div><div className="nil">{rupiah(perKelas.reduce((a, k) => a + Number(k.sisa), 0))}</div></div>
        <div className="balok mustard"><div className="lbl">Setoran tabungan</div><div className="nil">{rupiah(tab.setor)}</div><div className="sub">ditarik {rupiah(tab.tarik)} · untuk bayar {rupiah(tab.bayar)}</div></div>
        <div className="balok biru"><div className="lbl">Saldo tabungan kini</div><div className="nil">{rupiah(tab.saldo)}</div></div>
      </div>
      <div className="grid g21 mt">
        <div className="kartu">
          <h3>Penerimaan per bulan</h3>
          <div className="batang" style={{ height: 220 }}>
            {perBulan.map((b) => {
              const t = Number(b.tunai) + Number(b.transfer) + Number(b.tabungan);
              return (
                <div className="kol" key={b.p} title={`Tunai ${rupiah(b.tunai)} · Transfer ${rupiah(b.transfer)} · Tabungan ${rupiah(b.tabungan)}`}>
                  <span className="v">{(t / 1e6).toFixed(1).replace(".", ",")} jt</span>
                  <span style={{ display: "flex", flexDirection: "column-reverse", width: "100%", maxWidth: 46, height: `${(t / maks) * 100}%`, borderRadius: "10px 10px 4px 4px", overflow: "hidden" }}>
                    <i style={{ flex: Number(b.tunai), background: "var(--sage)" }} /><i style={{ flex: Number(b.transfer), background: "var(--biru)" }} /><i style={{ flex: Number(b.tabungan), background: "var(--mustard)" }} />
                  </span>
                  <span className="ket">{periode(b.p, true)}</span>
                </div>
              );
            })}
          </div>
          <div className="baris kecil mt2"><span className="chip hijau">Tunai</span><span className="chip biru">Transfer</span><span className="chip kuning">Potong tabungan</span></div>
        </div>
        <div className="kartu">
          <h3>Per jenis tagihan</h3>
          <div className="daftar">{perJenis.map((j) => (
            <div key={j.jenis}><span style={{ flex: 1 }}><b>{j.jenis}</b><div className="kecil muted">{j.n} kuitansi</div></span><b className="angka">{rupiah(j.total)}</b></div>
          ))}{!perJenis.length && <span className="muted">Belum ada penerimaan.</span>}</div>
        </div>
      </div>
      <div className="kartu rata mt">
        <div className="kepala-kartu"><h3>Rekap per kelas</h3><span className="kecil muted">Tagihan jatuh tempo dalam rentang tanggal</span></div>
        <div className="tabel-wrap"><table className="tabel">
          <thead><tr><th>Kelas</th><th className="kanan">Siswa</th><th className="kanan">Total tagihan</th><th className="kanan">Terkumpul</th><th className="kanan">Tunggakan</th><th className="kanan">Siswa menunggak</th><th style={{ width: 150 }}>Kolektibilitas</th></tr></thead>
          <tbody>{perKelas.map((k) => {
            const pct = k.tagihan ? Math.round((Number(k.terkumpul) / Number(k.tagihan)) * 100) : 0;
            return (
              <tr key={k.nama}><td className="tebal">{k.nama}</td><td className="kanan">{k.siswa}</td><td className="kanan angka">{rupiah(k.tagihan)}</td>
                <td className="kanan angka">{rupiah(k.terkumpul)}</td><td className="kanan angka">{rupiah(k.sisa)}</td><td className="kanan">{k.nunggak}</td>
                <td><div className="baris" style={{ flexWrap: "nowrap" }}><div className="progres" style={{ flex: 1 }}><i style={{ width: pct + "%" }} /></div><b className="kecil">{pct}%</b></div></td></tr>
            );
          })}</tbody>
        </table></div>
      </div>
    </>
  );
}
