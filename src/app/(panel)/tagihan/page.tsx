import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { rows } from "@/lib/db";
import { getSetting } from "@/lib/setting";
import { rupiah, tgl, periode, bulanIni, tambahBulan, hariIni, namaTagihan } from "@/lib/format";
import Kepala from "@/components/kepala";
import Pesan from "@/components/pesan";
import Ikon from "@/components/ikon";
import { terbitSPP, terbitLain } from "./actions";

export const metadata = { title: "Tagihan" };

type Grup = { jenis: string; periode: string | null; keterangan: string; jatuh_tempo: string; n: number; total: number; terbayar: number; lunas: number };

export default async function Tagihan({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireUser("admin", "bendahara");
  const st = await getSetting();
  const kelas = await rows<{ id: number; nama: string; tarif_spp: number }>("SELECT id, nama, tarif_spp FROM kelas ORDER BY urutan");
  const grup = await rows<Grup>(
    `SELECT jenis, periode, IF(periode IS NULL, keterangan, '') keterangan, MIN(jatuh_tempo) jatuh_tempo, COUNT(*) n,
            SUM(nominal - potongan) total, SUM(terbayar) terbayar, SUM(status = 'lunas') lunas
     FROM tagihan WHERE status <> 'batal' GROUP BY jenis, periode, IF(periode IS NULL, keterangan, '') ORDER BY jatuh_tempo DESC LIMIT 40`);

  // Detail satu kelompok tagihan
  const gj = sp.jenis || "", gp = sp.periode || "", gk = sp.ket || "";
  const fs = ["belum", "sebagian", "lunas"].includes(sp.status) ? sp.status : "";
  const detail = gj ? await rows<{ id: number; siswa_id: number; nama: string; kelas: string | null; total: number; terbayar: number; status: string; jatuh_tempo: string }>(
    `SELECT t.id, s.id siswa_id, s.nama, k.nama kelas, t.nominal - t.potongan total, t.terbayar, t.status, t.jatuh_tempo
     FROM tagihan t JOIN siswa s ON s.id = t.siswa_id LEFT JOIN kelas k ON k.id = s.kelas_id
     WHERE t.jenis = ? AND ${gp ? "t.periode = ?" : "t.periode IS NULL AND t.keterangan = ?"} AND t.status <> 'batal' ${fs ? "AND t.status = ?" : ""}
     ORDER BY FIELD(t.status, 'belum', 'sebagian', 'lunas'), k.urutan, s.nama`, fs ? [gj, gp || gk, fs] : [gj, gp || gk]) : [];

  const bln = bulanIni();
  const saranSPP = grup.some((g) => g.jenis === "SPP" && g.periode === bln) ? tambahBulan(bln, 1) : bln;
  const STATUS: Record<string, [string, string]> = { belum: ["Belum", "merah"], sebagian: ["Dicicil", "kuning"], lunas: ["Lunas", "hijau"] };
  const qs = (o: Record<string, string>) => "/tagihan?" + new URLSearchParams({ jenis: gj, ...(gp ? { periode: gp } : { ket: gk }), ...o }).toString();

  return (
    <>
      <Kepala judul="Tagihan" sub="Terbitkan SPP bulanan dan tagihan lain, lalu pantau pelunasannya" />
      <Pesan sp={sp} />
      <div className="grid g2">
        <form action={terbitSPP} className="kartu">
          <h3>Terbitkan SPP bulanan</h3>
          <p className="kecil muted" style={{ marginTop: -6 }}>Tarif mengikuti kelas, potongan mengikuti data siswa. Jatuh tempo tanggal {st.jatuh_tempo} (atur di Pengaturan). Aman diklik ulang: siswa yang sudah ditagih dilewati.</p>
          <div className="grid g2">
            <label className="f"><span>Bulan</span><input type="month" name="periode" defaultValue={saranSPP} required /></label>
            <label className="f"><span>Kelas</span><select name="kelas"><option value="">Semua kelas</option>{kelas.map((k) => <option key={k.id} value={k.id}>{k.nama} ({rupiah(k.tarif_spp)})</option>)}</select></label>
          </div>
          <button className="btn hijau"><Ikon n="tagihan" /> Terbitkan SPP</button>
        </form>
        <form action={terbitLain} className="kartu">
          <h3>Tagihan lain</h3>
          <div className="grid g2">
            <label className="f"><span>Nama tagihan</span><input name="jenis" list="jenis-tagihan" required placeholder="Uang Kegiatan" maxLength={40} />
              <datalist id="jenis-tagihan">{["Uang Kegiatan", "Seragam", "Buku & APE", "Uang Pangkal", "Wisuda", "Outing Class", "Katering"].map((j) => <option key={j} value={j} />)}</datalist></label>
            <label className="f"><span>Nominal per siswa</span><input name="nominal" inputMode="numeric" required placeholder="250000" /></label>
          </div>
          <label className="f"><span>Keterangan</span><input name="keterangan" required maxLength={160} placeholder="Outing class ke Kebun Buah Mangunan" /></label>
          <div className="grid g2">
            <label className="f"><span>Jatuh tempo</span><input type="date" name="jatuh_tempo" required defaultValue={tambahBulan(bln, 1) + "-10"} min={hariIni()} /></label>
            <label className="f"><span>Kelas</span><select name="kelas"><option value="">Semua kelas</option>{kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</select></label>
          </div>
          <button className="btn"><Ikon n="plus" /> Terbitkan tagihan</button>
        </form>
      </div>

      {gj && (
        <div className="kartu rata mt" id="detail">
          <div className="kepala-kartu">
            <h3>{namaTagihan({ jenis: gj, periode: gp || null })}{gk ? <span className="muted kecil"> · {gk}</span> : null}</h3>
            <div className="tab-nav" style={{ margin: 0 }}>
              {[["", "Semua"], ["belum", "Belum"], ["sebagian", "Dicicil"], ["lunas", "Lunas"]].map(([v, l]) => <Link key={v} href={qs(v ? { status: v } : {}) + "#detail"} className={fs === v ? "aktif" : ""}>{l}</Link>)}
              <Link href="/tagihan">Tutup</Link>
            </div>
          </div>
          <div className="tabel-wrap"><table className="tabel">
            <thead><tr><th>Siswa</th><th>Kelas</th><th className="kanan">Tagihan</th><th className="kanan">Dibayar</th><th>Status</th><th></th></tr></thead>
            <tbody>{detail.map((d) => (
              <tr key={d.id}>
                <td><Link className="nama" href={`/siswa/${d.siswa_id}`}>{d.nama}</Link></td><td>{d.kelas}</td>
                <td className="kanan angka">{rupiah(d.total)}</td><td className="kanan angka">{rupiah(d.terbayar)}</td>
                <td><span className={`chip ${STATUS[d.status][1]}`}>{STATUS[d.status][0]}</span></td>
                <td className="kanan">{d.status !== "lunas" && <Link className="btn terang kecil" href={`/siswa/${d.siswa_id}`}>Bayar</Link>}</td>
              </tr>
            ))}</tbody>
          </table>{!detail.length && <div className="kosong">Tidak ada data.</div>}</div>
        </div>
      )}

      <div className="kartu rata mt">
        <div className="kepala-kartu"><h3>Rekap tagihan</h3><span className="kecil muted">Klik baris untuk melihat per siswa</span></div>
        <div className="tabel-wrap"><table className="tabel">
          <thead><tr><th>Tagihan</th><th>Jatuh tempo</th><th className="kanan">Siswa</th><th className="kanan">Total</th><th className="kanan">Terkumpul</th><th style={{ width: 180 }}>Pelunasan</th></tr></thead>
          <tbody>{grup.map((g, i) => {
            const pct = g.n ? Math.round((Number(g.lunas) / g.n) * 100) : 0;
            const href = "/tagihan?" + new URLSearchParams({ jenis: g.jenis, ...(g.periode ? { periode: g.periode } : { ket: g.keterangan }) }).toString() + "#detail";
            return (
              <tr key={i}>
                <td><Link className="nama" href={href}>{namaTagihan(g)}</Link>{g.keterangan ? <div className="kecil muted">{g.keterangan}</div> : null}</td>
                <td className="nowrap">{tgl(g.jatuh_tempo)}</td><td className="kanan">{g.n}</td>
                <td className="kanan angka">{rupiah(g.total)}</td><td className="kanan angka">{rupiah(g.terbayar)}</td>
                <td><div className="baris" style={{ flexWrap: "nowrap" }}><div className="progres" style={{ flex: 1 }}><i style={{ width: pct + "%", background: pct === 100 ? "var(--sage)" : pct > 70 ? "var(--mustard)" : "var(--terakota)" }} /></div><b className="kecil">{pct}%</b></div></td>
              </tr>
            );
          })}</tbody>
        </table>{!grup.length && <div className="kosong">Belum ada tagihan. Mulai dengan menerbitkan SPP bulan ini.</div>}</div>
      </div>
    </>
  );
}
