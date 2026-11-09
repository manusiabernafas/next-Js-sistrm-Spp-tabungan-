import Link from "next/link";
import { requireUser, bolehKeuangan } from "@/lib/auth";
import { rows } from "@/lib/db";
import { rupiah, hariIni } from "@/lib/format";
import Kepala from "@/components/kepala";
import Pesan from "@/components/pesan";
import Ikon from "@/components/ikon";

export const metadata = { title: "Data siswa" };

const WARNA: Record<string, string> = { terakota: "var(--terakota)", mustard: "var(--mustard)", sage: "var(--sage)", biru: "var(--biru)", plum: "var(--plum)" };

export default async function DaftarSiswa({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const u = await requireUser();
  const keu = bolehKeuangan(u);
  const kelas = await rows<{ id: number; nama: string; n: number }>(
    "SELECT k.id, k.nama, (SELECT COUNT(*) FROM siswa s WHERE s.kelas_id = k.id AND s.status='aktif') n FROM kelas k ORDER BY urutan, nama");
  const fk = Number(sp.kelas || 0);
  const status = ["aktif", "lulus", "keluar", "semua"].includes(sp.status) ? sp.status : "aktif";
  const q = (sp.q || "").trim().slice(0, 60);
  const w: string[] = [];
  const p: (string | number)[] = [hariIni()];
  if (status !== "semua") { w.push("s.status = ?"); p.push(status); }
  if (fk) { w.push("s.kelas_id = ?"); p.push(fk); }
  if (q) { w.push("(s.nama LIKE ? OR s.nis LIKE ? OR s.nama_wali LIKE ?)"); p.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const data = await rows<{ id: number; nis: string; nama: string; panggilan: string; jk: string; kelas: string | null; warna: string | null;
    nama_wali: string; hubungan: string; no_wa: string; saldo_tabungan: number; status: string; tunggak: number; potongan: number }>(
    `SELECT s.id, s.nis, s.nama, s.panggilan, s.jk, k.nama kelas, k.warna, s.nama_wali, s.hubungan, s.no_wa, s.saldo_tabungan, s.status, s.potongan,
            (SELECT COALESCE(SUM(t.nominal - t.potongan - t.terbayar), 0) FROM tagihan t
             WHERE t.siswa_id = s.id AND t.status IN ('belum','sebagian') AND t.jatuh_tempo < ?) tunggak
     FROM siswa s LEFT JOIN kelas k ON k.id = s.kelas_id
     ${w.length ? "WHERE " + w.join(" AND ") : ""} ORDER BY k.urutan, s.nama`, p);

  const tautan = (o: Record<string, string | number>) => {
    const x = new URLSearchParams({ ...(fk ? { kelas: String(fk) } : {}), ...(status !== "aktif" ? { status } : {}), ...(q ? { q } : {}) });
    Object.entries(o).forEach(([k, v]) => (v ? x.set(k, String(v)) : x.delete(k)));
    const s = x.toString();
    return "/siswa" + (s ? "?" + s : "");
  };

  return (
    <>
      <Kepala judul="Data siswa" sub={`${data.length} siswa ditampilkan`}>
        {keu && <Link className="btn" href="/siswa/baru"><Ikon n="plus" /> Tambah siswa</Link>}
      </Kepala>
      <Pesan sp={sp} />
      <div className="tab-nav">
        <Link href={tautan({ kelas: 0 })} className={!fk ? "aktif" : ""}>Semua kelas</Link>
        {kelas.map((k) => <Link key={k.id} href={tautan({ kelas: k.id })} className={fk === k.id ? "aktif" : ""}>{k.nama} · {k.n}</Link>)}
      </div>
      <div className="kartu rata">
        <form className="kepala-kartu filter">
          {fk ? <input type="hidden" name="kelas" value={fk} /> : null}
          <input className="input" name="q" defaultValue={q} placeholder="Cari nama, NIS, atau nama wali" style={{ minWidth: 240 }} />
          <select className="input" name="status" defaultValue={status}>
            <option value="aktif">Aktif</option><option value="lulus">Lulus</option><option value="keluar">Keluar</option><option value="semua">Semua status</option>
          </select>
          <button className="btn terang kecil"><Ikon n="cari" s={16} /> Cari</button>
        </form>
        <div className="tabel-wrap">
          <table className="tabel">
            <thead><tr><th>Siswa</th><th>Kelas</th><th>Orang tua / wali</th>{keu && <th className="kanan">Tunggakan</th>}<th className="kanan">Tabungan</th><th></th></tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="baris" style={{ flexWrap: "nowrap" }}>
                      <span className="bulat" style={{ background: WARNA[s.warna || "sage"] }}>{s.panggilan.charAt(0)}</span>
                      <span><Link className="nama" href={`/siswa/${s.id}`}>{s.nama}</Link><div className="kecil muted">NIS {s.nis} · {s.jk === "L" ? "Laki-laki" : "Perempuan"}{s.potongan ? " · potongan SPP" : ""}</div></span>
                    </div>
                  </td>
                  <td>{s.kelas || "-"}{s.status !== "aktif" && <> <span className="chip abu">{s.status}</span></>}</td>
                  <td>{s.nama_wali}<div className="kecil muted">{s.hubungan}{s.no_wa ? ` · ${s.no_wa}` : ""}</div></td>
                  {keu && <td className="kanan angka">{s.tunggak > 0 ? <span className="chip merah">{rupiah(s.tunggak)}</span> : <span className="chip hijau">Lancar</span>}</td>}
                  <td className="kanan angka">{rupiah(s.saldo_tabungan)}</td>
                  <td className="kanan"><Link className="btn terang kecil" href={`/siswa/${s.id}`}>Buka</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.length && <div className="kosong">Tidak ada siswa yang cocok.</div>}
        </div>
      </div>
    </>
  );
}
