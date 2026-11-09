import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, bolehKeuangan } from "@/lib/auth";
import { rows, row } from "@/lib/db";
import { getSetting } from "@/lib/setting";
import { rupiah, tgl, jam, hariIni } from "@/lib/format";
import Pesan from "@/components/pesan";
import Ikon from "@/components/ikon";
import Pelangi from "@/components/pelangi";
import TombolCetak from "@/components/tombol-cetak";
import { transaksiTab } from "../actions";

export const metadata = { title: "Buku tabungan" };

export default async function BukuTabungan({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const u = await requireUser();
  const s = await row<{ id: number; nis: string; nama: string; kelas: string | null; nama_wali: string; saldo_tabungan: number; status: string }>(
    "SELECT s.id, s.nis, s.nama, k.nama kelas, s.nama_wali, s.saldo_tabungan, s.status FROM siswa s LEFT JOIN kelas k ON k.id = s.kelas_id WHERE s.id = ?", [Number(id) || 0]);
  if (!s) notFound();
  const st = await getSetting();
  const mut = await rows<{ id: number; tanggal: string; jenis: string; jumlah: number; saldo_setelah: number; keterangan: string; petugas: string | null }>(
    `SELECT t.id, t.tanggal, t.jenis, t.jumlah, t.saldo_setelah, t.keterangan, p.nama petugas FROM tabungan t
     LEFT JOIN pengguna p ON p.id = t.dicatat_oleh WHERE t.siswa_id = ? ORDER BY t.tanggal, t.id`, [s.id]);
  const setor = mut.filter((m) => m.jenis === "setor").reduce((a, m) => a + m.jumlah, 0);
  const tarik = mut.filter((m) => m.jenis === "tarik").reduce((a, m) => a + m.jumlah, 0);
  const keu = bolehKeuangan(u);
  return (
    <>
      <div className="alat-cetak no-print" style={{ flexWrap: "wrap", maxWidth: 900 }}>
        <Link className="btn terang" href="/tabungan"><Ikon n="kiri" /> Tabungan</Link>
        <Link className="btn terang" href={`/siswa/${s.id}`}>Data siswa</Link>
        <TombolCetak label="Cetak buku" />
      </div>
      <div className="no-print" style={{ maxWidth: 900, margin: "0 auto" }}>
        <Pesan sp={sp} />
        <form action={transaksiTab} className="kartu baris" style={{ marginBottom: 16 }}>
          <input type="hidden" name="siswa_id" value={s.id} />
          <b style={{ marginRight: 6 }}>Transaksi baru</b>
          <select className="input" name="jenis" style={{ width: "auto" }}><option value="setor">Setor</option>{keu && <option value="tarik">Tarik</option>}</select>
          <input className="input" name="jumlah" inputMode="numeric" placeholder="Nominal" required style={{ width: 140 }} />
          <input className="input" name="keterangan" placeholder="Keterangan" maxLength={160} style={{ flex: 1, minWidth: 160, width: "auto" }} />
          <button className="btn hijau">Simpan</button>
        </form>
      </div>
      <div className="lembar" style={{ maxWidth: 900 }}>
        <div className="kop">
          <div className="baris" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
            <Pelangi w={64} lapis={4} />
            <div><h2>Buku Tabungan Siswa</h2><div className="kecil">{st.nama_sekolah}</div><div className="kecil">{st.alamat}</div></div>
          </div>
          <div className="kanan">
            <div className="tebal" style={{ fontSize: 17 }}>{s.nama}</div>
            <div className="kecil">NIS {s.nis} · {s.kelas || "-"}</div>
            <div className="kecil">Wali: {s.nama_wali}</div>
          </div>
        </div>
        <div className="grid g3" style={{ marginBottom: 14 }}>
          <div><div className="kecil muted">Total setoran</div><b className="angka">{rupiah(setor)}</b></div>
          <div><div className="kecil muted">Total penarikan</div><b className="angka">{rupiah(tarik)}</b></div>
          <div><div className="kecil muted">Saldo per {tgl(hariIni())}</div><b className="angka" style={{ fontSize: 20 }}>{rupiah(s.saldo_tabungan)}</b></div>
        </div>
        <table className="tabel">
          <thead><tr><th>No</th><th>Tanggal</th><th>Keterangan</th><th className="kanan">Setor</th><th className="kanan">Tarik</th><th className="kanan">Saldo</th><th>Paraf</th></tr></thead>
          <tbody>{mut.map((m, i) => (
            <tr key={m.id}>
              <td>{i + 1}</td><td className="nowrap">{tgl(m.tanggal)} <span className="muted kecil">{jam(m.tanggal)}</span></td>
              <td className="kecil">{m.keterangan}</td>
              <td className="kanan angka">{m.jenis === "setor" ? rupiah(m.jumlah) : ""}</td>
              <td className="kanan angka">{m.jenis === "tarik" ? rupiah(m.jumlah) : ""}</td>
              <td className="kanan angka tebal">{rupiah(m.saldo_setelah)}</td>
              <td className="kecil muted">{m.petugas ? m.petugas.split(/[ ,]/)[0] === "Hj." ? m.petugas.split(" ")[1] : m.petugas.split(/[ ,]/)[0] : ""}</td>
            </tr>
          ))}</tbody>
        </table>
        {!mut.length && <div className="kosong">Belum ada transaksi.</div>}
      </div>
    </>
  );
}
