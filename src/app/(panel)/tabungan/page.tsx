import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { rows, row } from "@/lib/db";
import { rupiah, tgl, jam, hariIni } from "@/lib/format";
import Kepala from "@/components/kepala";
import Pesan from "@/components/pesan";
import Ikon from "@/components/ikon";
import { Hias } from "@/components/pelangi";

export const metadata = { title: "Tabungan" };

export default async function Tabungan({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireUser();
  const kelas = await rows<{ id: number; nama: string; saldo: number; n: number }>(
    `SELECT k.id, k.nama, COALESCE(SUM(s.saldo_tabungan), 0) saldo, COUNT(s.id) n FROM kelas k
     LEFT JOIN siswa s ON s.kelas_id = k.id AND s.status = 'aktif' GROUP BY k.id ORDER BY k.urutan`);
  const fk = Number(sp.kelas || 0);
  const q = (sp.q || "").trim().slice(0, 60);
  const h = hariIni();
  const ring = (await row<{ saldo: number; setor: number; tarik: number; hari_ini: number }>(
    `SELECT (SELECT COALESCE(SUM(saldo_tabungan),0) FROM siswa) saldo,
            (SELECT COALESCE(SUM(jumlah),0) FROM tabungan WHERE jenis='setor' AND DATE_FORMAT(tanggal,'%Y-%m') = ?) setor,
            (SELECT COALESCE(SUM(jumlah),0) FROM tabungan WHERE jenis='tarik' AND DATE_FORMAT(tanggal,'%Y-%m') = ?) tarik,
            (SELECT COALESCE(SUM(jumlah),0) FROM tabungan WHERE jenis='setor' AND DATE(tanggal) = ?) hari_ini`, [h.slice(0, 7), h.slice(0, 7), h]))!;
  const w = ["s.status = 'aktif'"];
  const p: (string | number)[] = [];
  if (fk) { w.push("s.kelas_id = ?"); p.push(fk); }
  if (q) { w.push("(s.nama LIKE ? OR s.nis LIKE ?)"); p.push(`%${q}%`, `%${q}%`); }
  const siswa = await rows<{ id: number; nis: string; nama: string; kelas: string; saldo_tabungan: number; terakhir: string | null; setor_bulan: number }>(
    `SELECT s.id, s.nis, s.nama, k.nama kelas, s.saldo_tabungan,
            (SELECT MAX(tanggal) FROM tabungan t WHERE t.siswa_id = s.id) terakhir,
            (SELECT COALESCE(SUM(jumlah),0) FROM tabungan t WHERE t.siswa_id = s.id AND t.jenis='setor' AND DATE_FORMAT(t.tanggal,'%Y-%m') = ?) setor_bulan
     FROM siswa s LEFT JOIN kelas k ON k.id = s.kelas_id WHERE ${w.join(" AND ")} ORDER BY k.urutan, s.nama`, [h.slice(0, 7), ...p]);
  const mutasi = await rows<{ siswa_id: number; nama: string; tanggal: string; jenis: string; jumlah: number; keterangan: string }>(
    `SELECT t.siswa_id, s.nama, t.tanggal, t.jenis, t.jumlah, t.keterangan FROM tabungan t JOIN siswa s ON s.id = t.siswa_id
     ORDER BY t.tanggal DESC, t.id DESC LIMIT 10`);
  return (
    <>
      <Kepala judul="Tabungan siswa" sub="Buku tabungan setiap anak, setoran harian, dan penarikan">
        <a className="btn terang" href="/laporan/csv?jenis=tabungan"><Ikon n="unduh" /> CSV saldo</a>
        <Link className="btn hijau" href={`/tabungan/kolektif${fk ? `?kelas=${fk}` : ""}`}><Ikon n="celengan" /> Setoran hari menabung</Link>
      </Kepala>
      <Pesan sp={sp} />
      <div className="grid g4">
        <div className="balok sage"><div className="lbl">Total saldo</div><div className="nil">{rupiah(ring.saldo)}</div><Hias /></div>
        <div className="balok mustard"><div className="lbl">Setoran hari ini</div><div className="nil">{rupiah(ring.hari_ini)}</div><Hias c="rgba(255,255,255,.3)" /></div>
        <div className="balok kertas"><div className="lbl muted">Setoran bulan ini</div><div className="nil">{rupiah(ring.setor)}</div></div>
        <div className="balok kertas"><div className="lbl muted">Penarikan bulan ini</div><div className="nil">{rupiah(ring.tarik)}</div></div>
      </div>
      <div className="tab-nav mt">
        <Link href="/tabungan" className={!fk ? "aktif" : ""}>Semua kelas</Link>
        {kelas.map((k) => <Link key={k.id} href={`/tabungan?kelas=${k.id}`} className={fk === k.id ? "aktif" : ""}>{k.nama} · {rupiah(k.saldo)}</Link>)}
      </div>
      <div className="grid g21">
        <div className="kartu rata">
          <form className="kepala-kartu filter">
            {fk ? <input type="hidden" name="kelas" value={fk} /> : null}
            <input className="input" name="q" defaultValue={q} placeholder="Cari nama atau NIS" />
            <button className="btn terang kecil"><Ikon n="cari" s={16} /> Cari</button>
          </form>
          <div className="tabel-wrap"><table className="tabel">
            <thead><tr><th>Siswa</th><th>Setor bulan ini</th><th>Transaksi terakhir</th><th className="kanan">Saldo</th><th></th></tr></thead>
            <tbody>{siswa.map((s) => (
              <tr key={s.id}>
                <td><Link className="nama" href={`/tabungan/${s.id}`}>{s.nama}</Link><div className="kecil muted">{s.kelas} · NIS {s.nis}</div></td>
                <td className="angka">{s.setor_bulan ? rupiah(s.setor_bulan) : <span className="muted">-</span>}</td>
                <td className="kecil">{s.terakhir ? tgl(s.terakhir) : <span className="muted">belum menabung</span>}</td>
                <td className="kanan angka tebal">{rupiah(s.saldo_tabungan)}</td>
                <td className="kanan"><Link className="btn terang kecil" href={`/tabungan/${s.id}`}><Ikon n="buku" s={15} /> Buku</Link></td>
              </tr>
            ))}</tbody>
          </table>{!siswa.length && <div className="kosong">Tidak ada siswa.</div>}</div>
        </div>
        <div className="kartu" style={{ alignSelf: "start" }}>
          <h3>Mutasi terbaru</h3>
          <div className="daftar">{mutasi.map((m, i) => (
            <div key={i} className="kecil">
              <span style={{ flex: 1, minWidth: 0 }}><Link href={`/tabungan/${m.siswa_id}`} className="tebal" style={{ color: "var(--tinta)" }}>{m.nama}</Link><div className="muted">{tgl(m.tanggal)} {jam(m.tanggal)} · {m.keterangan}</div></span>
              <b className="angka" style={{ color: m.jenis === "setor" ? "var(--sage)" : "var(--terakota)" }}>{m.jenis === "setor" ? "+" : "-"}{rupiah(m.jumlah)}</b>
            </div>
          ))}</div>
        </div>
      </div>
    </>
  );
}
