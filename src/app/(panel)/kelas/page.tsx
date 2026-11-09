import { requireUser } from "@/lib/auth";
import { rows } from "@/lib/db";
import { rupiah } from "@/lib/format";
import Kepala from "@/components/kepala";
import Pesan from "@/components/pesan";
import { simpanKelas, hapusKelas, naikKelas } from "../admin-actions";

export const metadata = { title: "Kelas & tarif" };
const WARNA = ["terakota", "mustard", "sage", "biru", "plum"];

export default async function Kelas({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireUser("admin");
  const kelas = await rows<{ id: number; nama: string; wali_kelas: string; tarif_spp: number; warna: string; urutan: number; n: number }>(
    "SELECT k.*, (SELECT COUNT(*) FROM siswa s WHERE s.kelas_id = k.id AND s.status='aktif') n FROM kelas k ORDER BY urutan, nama");
  const Form = ({ k }: { k?: (typeof kelas)[number] }) => (
    <form action={simpanKelas} className="form-baris" style={{ "--kol": "1.3fr 1.5fr 1fr .9fr .6fr auto" } as React.CSSProperties}>
      {k && <input type="hidden" name="id" value={k.id} />}
      <label className="f m0"><span>Nama kelas</span><input name="nama" defaultValue={k?.nama} required /></label>
      <label className="f m0"><span>Wali kelas</span><input name="wali_kelas" defaultValue={k?.wali_kelas} /></label>
      <label className="f m0"><span>SPP / bulan</span><input name="tarif_spp" defaultValue={k?.tarif_spp ?? ""} inputMode="numeric" required /></label>
      <label className="f m0"><span>Warna</span><select name="warna" defaultValue={k?.warna || "sage"}>{WARNA.map((w) => <option key={w}>{w}</option>)}</select></label>
      <label className="f m0"><span>Urut</span><input name="urutan" defaultValue={k?.urutan ?? kelas.length + 1} inputMode="numeric" /></label>
      <button className={`btn ${k ? "terang" : ""}`}>{k ? "Simpan" : "Tambah"}</button>
    </form>
  );
  return (
    <>
      <Kepala judul="Kelas & tarif SPP" sub="Tarif dipakai saat menerbitkan tagihan SPP bulanan" />
      <Pesan sp={sp} />
      <div className="tumpuk">
        {kelas.map((k) => (
          <div className="kartu" key={k.id} style={{ borderLeft: `8px solid var(--${k.warna})` }}>
            <div className="kepala-kartu" style={{ marginBottom: 10 }}>
              <h3 className="m0">{k.nama} <span className="kecil muted">· {k.n} siswa aktif · {rupiah(k.tarif_spp)}/bulan</span></h3>
              {k.n === 0 && <form action={hapusKelas}><input type="hidden" name="id" value={k.id} /><button className="tautan merah kecil">Hapus kelas</button></form>}
            </div>
            <Form k={k} />
          </div>
        ))}
        <div className="kartu"><h3>Tambah kelas</h3><Form /></div>
        <form action={naikKelas} className="kartu">
          <h3>Kenaikan kelas / kelulusan</h3>
          <p className="kecil muted" style={{ marginTop: -6 }}>Pindahkan semua siswa aktif dari satu kelas ke kelas lain di awal tahun ajaran, mulai dari kelas tertinggi (TK B lulus dulu, lalu TK A naik ke TK B).</p>
          <div className="baris">
            <select className="input" name="dari" style={{ width: "auto" }}>{kelas.map((k) => <option key={k.id} value={k.id}>{k.nama} ({k.n})</option>)}</select>
            <span>ke</span>
            <select className="input" name="ke" style={{ width: "auto" }}><option value="lulus">Lulus</option>{kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</select>
            <button className="btn terang">Proses</button>
          </div>
        </form>
      </div>
    </>
  );
}
