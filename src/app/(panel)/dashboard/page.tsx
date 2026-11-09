import Link from "next/link";
import { requireUser, bolehKeuangan } from "@/lib/auth";
import { rows, row } from "@/lib/db";
import { rupiah, tgl, periode, bulanIni, tambahBulan, hariIni, tahunAjaran, namaTagihan, jam } from "@/lib/format";
import { daftarTunggakan } from "@/lib/pengingat";
import Kepala from "@/components/kepala";
import Pesan from "@/components/pesan";
import Ikon from "@/components/ikon";
import { Hias } from "@/components/pelangi";

export const metadata = { title: "Beranda" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const u = await requireUser();
  const keu = bolehKeuangan(u);
  const bln = bulanIni();
  const hari = hariIni();

  const tab = (await row<{ saldo: number; penabung: number; setor_minggu: number }>(
    `SELECT (SELECT COALESCE(SUM(saldo_tabungan),0) FROM siswa) saldo,
            (SELECT COUNT(*) FROM siswa WHERE saldo_tabungan > 0) penabung,
            (SELECT COALESCE(SUM(jumlah),0) FROM tabungan WHERE jenis='setor' AND tanggal >= ? - INTERVAL 6 DAY) setor_minggu`, [hari]))!;
  const siswaAktif = (await row<{ n: number }>("SELECT COUNT(*) n FROM siswa WHERE status='aktif'"))!.n;

  const sapa = `Halo, ${u.nama.split(/[ ,]/)[0] === "Hj." ? u.nama.split(" ")[1] : u.nama.split(/[ ,]/)[0]}`;

  if (!keu) {
    const kelasTab = await rows<{ nama: string; saldo: number; n: number }>(
      `SELECT k.nama, COALESCE(SUM(s.saldo_tabungan),0) saldo, COUNT(s.id) n FROM kelas k
       LEFT JOIN siswa s ON s.kelas_id = k.id AND s.status='aktif' GROUP BY k.id ORDER BY k.urutan`);
    return (
      <>
        <Kepala judul={sapa} sub={`Tahun ajaran ${tahunAjaran()} · ${siswaAktif} siswa aktif`}>
          <Link className="btn hijau" href="/tabungan/kolektif"><Ikon n="celengan" /> Setoran hari menabung</Link>
        </Kepala>
        <Pesan sp={sp} />
        <div className="grid g3">
          <div className="balok sage"><div className="lbl">Saldo tabungan siswa</div><div className="nil">{rupiah(tab.saldo)}</div><div className="sub">{tab.penabung} siswa menabung</div><Hias /></div>
          <div className="balok mustard"><div className="lbl">Setoran 7 hari terakhir</div><div className="nil">{rupiah(tab.setor_minggu)}</div><Hias c="rgba(255,255,255,.3)" /></div>
          <div className="balok biru"><div className="lbl">Siswa aktif</div><div className="nil">{siswaAktif}</div><Hias /></div>
        </div>
        <div className="kartu mt"><h3>Tabungan per kelas</h3>
          <div className="daftar">{kelasTab.map((k) => <div key={k.nama}><b style={{ flex: 1 }}>{k.nama}</b><span className="muted">{k.n} siswa</span><b className="angka">{rupiah(k.saldo)}</b></div>)}</div>
        </div>
      </>
    );
  }

  const terima = (await row<{ total: number; n: number }>(
    "SELECT COALESCE(SUM(total),0) total, COUNT(*) n FROM pembayaran WHERE batal = 0 AND DATE_FORMAT(tanggal, '%Y-%m') = ?", [bln]))!;
  const tung = (await row<{ total: number; siswa: number }>(
    `SELECT COALESCE(SUM(t.nominal - t.potongan - t.terbayar),0) total, COUNT(DISTINCT t.siswa_id) siswa
     FROM tagihan t JOIN siswa s ON s.id = t.siswa_id WHERE s.status='aktif' AND t.status IN ('belum','sebagian') AND t.jatuh_tempo < ?`, [hari]))!;
  const spp = (await row<{ total: number; lunas: number }>(
    "SELECT COUNT(*) total, SUM(status='lunas') lunas FROM tagihan WHERE jenis='SPP' AND periode = ?", [bln]))!;
  const persen = spp.total ? Math.round((Number(spp.lunas) / spp.total) * 100) : 0;

  const dari = tambahBulan(bln, -5);
  const per = await rows<{ p: string; total: number }>(
    `SELECT DATE_FORMAT(tanggal, '%Y-%m') p, SUM(total) total FROM pembayaran WHERE batal = 0 AND tanggal >= ? GROUP BY p`, [dari + "-01"]);
  const seri = Array.from({ length: 6 }, (_, i) => {
    const p = tambahBulan(dari, i);
    return { p, total: Number(per.find((x) => x.p === p)?.total || 0) };
  });
  const maks = Math.max(1, ...seri.map((s) => s.total));

  const nunggak = (await daftarTunggakan({ hanyaJatuhTempo: true })).slice(0, 6);
  const terbaru = await rows<{ id: number; no_kuitansi: string; tanggal: string; total: number; metode: string; nama: string; batal: number }>(
    `SELECT p.id, p.no_kuitansi, p.tanggal, p.total, p.metode, s.nama, p.batal FROM pembayaran p JOIN siswa s ON s.id = p.siswa_id
     ORDER BY p.tanggal DESC, p.id DESC LIMIT 6`);
  const jatuhTempoDekat = await rows<{ jenis: string; periode: string | null; jatuh_tempo: string; n: number; sisa: number }>(
    `SELECT jenis, periode, jatuh_tempo, COUNT(*) n, SUM(nominal - potongan - terbayar) sisa FROM tagihan
     WHERE status IN ('belum','sebagian') AND jatuh_tempo BETWEEN ? AND ? + INTERVAL 14 DAY GROUP BY jenis, periode, jatuh_tempo ORDER BY jatuh_tempo LIMIT 4`, [hari, hari]);

  return (
    <>
      <Kepala judul={sapa} sub={`Tahun ajaran ${tahunAjaran()} · ${siswaAktif} siswa aktif · ${tgl(hari, true)}`}>
        <Link className="btn terang" href="/pengingat"><Ikon n="lonceng" /> Kirim pengingat</Link>
        <Link className="btn" href="/siswa"><Ikon n="dompet" /> Terima pembayaran</Link>
      </Kepala>
      <Pesan sp={sp} />
      <div className="grid g4">
        <div className="balok sage"><div className="lbl">Penerimaan {periode(bln)}</div><div className="nil">{rupiah(terima.total)}</div><div className="sub">{terima.n} kuitansi</div><Hias /></div>
        <div className="balok terakota"><div className="lbl">Tunggakan lewat jatuh tempo</div><div className="nil">{rupiah(tung.total)}</div><div className="sub">{tung.siswa} siswa perlu diingatkan</div><Hias /></div>
        <div className="balok mustard"><div className="lbl">SPP {periode(bln)} lunas</div><div className="nil">{persen}%</div><div className="sub">{Number(spp.lunas || 0)} dari {spp.total} siswa</div><Hias c="rgba(255,255,255,.3)" /></div>
        <div className="balok biru"><div className="lbl">Saldo tabungan siswa</div><div className="nil">{rupiah(tab.saldo)}</div><div className="sub">{tab.penabung} penabung · +{rupiah(tab.setor_minggu)} minggu ini</div><Hias /></div>
      </div>

      <div className="grid g21 mt">
        <div className="kartu">
          <div className="kepala-kartu"><h3>Penerimaan 6 bulan terakhir</h3><Link className="kecil tebal" href="/laporan">Laporan lengkap</Link></div>
          <div className="batang" aria-label="Grafik penerimaan per bulan">
            {seri.map((s) => (
              <div className="kol" key={s.p}>
                <span className="v">{s.total ? (s.total / 1e6).toFixed(1).replace(".", ",") + " jt" : "0"}</span>
                <span className="isi" style={{ height: `${Math.max(3, (s.total / maks) * 100)}%` }} />
                <span className="ket">{periode(s.p, true)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="kartu">
          <h3>Segera jatuh tempo</h3>
          {jatuhTempoDekat.length ? (
            <div className="daftar">
              {jatuhTempoDekat.map((j, i) => (
                <div key={i}>
                  <span className="bulat" style={{ background: ["var(--terakota)", "var(--mustard)", "var(--sage)", "var(--biru)"][i % 4], width: 42, height: 42, fontSize: 14, borderRadius: 12, flexDirection: "column", lineHeight: 1 }}>
                    {Number(j.jatuh_tempo.slice(8, 10))}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}><b>{namaTagihan(j)}</b><div className="kecil muted">{j.n} siswa belum lunas · {tgl(j.jatuh_tempo)}</div></span>
                  <b className="angka kecil">{rupiah(j.sisa)}</b>
                </div>
              ))}
            </div>
          ) : <p className="muted">Tidak ada tagihan yang jatuh tempo dalam 2 minggu ke depan.</p>}
        </div>
      </div>

      <div className="grid g2 mt">
        <div className="kartu rata">
          <div className="kepala-kartu"><h3>Perlu diingatkan</h3><Link className="kecil tebal" href="/pengingat">Semua tunggakan</Link></div>
          {nunggak.length ? (
            <div className="tabel-wrap"><table className="tabel"><tbody>
              {nunggak.map((t) => (
                <tr key={t.siswa_id}>
                  <td><Link className="nama" href={`/siswa/${t.siswa_id}`}>{t.nama}</Link><div className="kecil muted">{t.kelas} · {t.jumlah} tagihan sejak {tgl(t.tertua)}</div></td>
                  <td className="kanan angka tebal">{rupiah(t.total)}</td>
                </tr>
              ))}
            </tbody></table></div>
          ) : <div className="kosong">Semua tagihan yang jatuh tempo sudah lunas.</div>}
        </div>
        <div className="kartu rata">
          <div className="kepala-kartu"><h3>Pembayaran terbaru</h3><Link className="kecil tebal" href="/pembayaran">Riwayat</Link></div>
          <div className="tabel-wrap"><table className="tabel"><tbody>
            {terbaru.map((p) => (
              <tr key={p.id}>
                <td><Link className="nama" href={`/kuitansi/${p.id}`}>{p.nama}</Link><div className="kecil muted">{p.no_kuitansi} · {tgl(p.tanggal)} {jam(p.tanggal)} · {p.metode}</div></td>
                <td className="kanan angka tebal">{p.batal ? <span className="chip merah">Batal</span> : rupiah(p.total)}</td>
              </tr>
            ))}
          </tbody></table></div>
        </div>
      </div>
    </>
  );
}
