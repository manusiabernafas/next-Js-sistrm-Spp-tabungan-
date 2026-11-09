import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, bolehKeuangan } from "@/lib/auth";
import { rows, row } from "@/lib/db";
import { appUrl } from "@/lib/setting";
import { rupiah, tgl, jam, namaTagihan, hariIni, umur, waLink } from "@/lib/format";
import Kepala from "@/components/kepala";
import Pesan from "@/components/pesan";
import Ikon from "@/components/ikon";
import FormBayar from "./form-bayar";
import { batalkanTagihan, gantiTokenWali } from "../actions";
import { transaksiTab } from "../../tabungan/actions";

export const metadata = { title: "Detail siswa" };

const WARNA: Record<string, string> = { terakota: "var(--terakota)", mustard: "var(--mustard)", sage: "var(--sage)", biru: "var(--biru)", plum: "var(--plum)" };

type Tagihan = { id: number; jenis: string; periode: string | null; keterangan: string; nominal: number; potongan: number; terbayar: number; status: string; jatuh_tempo: string };

export default async function DetailSiswa({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const u = await requireUser();
  const keu = bolehKeuangan(u);
  const s = await row<Record<string, any>>(
    "SELECT s.*, k.nama kelas, k.warna, k.tarif_spp FROM siswa s LEFT JOIN kelas k ON k.id = s.kelas_id WHERE s.id = ?", [Number(id) || 0]);
  if (!s) notFound();
  const hari = hariIni();
  const tagihan = await rows<Tagihan>("SELECT * FROM tagihan WHERE siswa_id = ? ORDER BY jatuh_tempo DESC, id DESC", [s.id]);
  const terbuka = tagihan.filter((t) => t.status === "belum" || t.status === "sebagian").reverse();
  const sisa = terbuka.reduce((a, t) => a + t.nominal - t.potongan - t.terbayar, 0);
  const bayar = await rows<{ id: number; no_kuitansi: string; tanggal: string; total: number; metode: string; batal: number }>(
    "SELECT id, no_kuitansi, tanggal, total, metode, batal FROM pembayaran WHERE siswa_id = ? ORDER BY tanggal DESC, id DESC LIMIT 12", [s.id]);
  const tab = await rows<{ tanggal: string; jenis: string; jumlah: number; saldo_setelah: number; keterangan: string }>(
    "SELECT tanggal, jenis, jumlah, saldo_setelah, keterangan FROM tabungan WHERE siswa_id = ? ORDER BY tanggal DESC, id DESC LIMIT 6", [s.id]);
  const linkWali = `${appUrl()}/wali/${s.token_wali}`;
  const STATUS: Record<string, [string, string]> = { belum: ["Belum", "merah"], sebagian: ["Dicicil", "kuning"], lunas: ["Lunas", "hijau"], batal: ["Batal", "abu"] };

  return (
    <>
      <Kepala judul={s.nama} sub={<>NIS {s.nis} · {s.kelas || "tanpa kelas"} · {umur(s.tgl_lahir)}{s.status !== "aktif" ? ` · ${s.status}` : ""}</>}>
        <Link className="btn terang" href="/siswa"><Ikon n="kiri" /> Daftar siswa</Link>
        {keu && <Link className="btn terang" href={`/siswa/${s.id}/ubah`}><Ikon n="edit" /> Ubah</Link>}
        {keu && sisa > 0 && <Link className="btn kuning" href={`/pengingat?siswa=${s.id}`}><Ikon n="lonceng" /> Ingatkan wali</Link>}
      </Kepala>
      <Pesan sp={sp} />

      <div className="grid g12">
        <div className="tumpuk" style={{ alignContent: "start" }}>
          <div className="kartu">
            <div className="siswa-kepala">
              <span className="avatar" style={{ background: WARNA[s.warna || "sage"] }}>{(s.panggilan || s.nama).charAt(0)}</span>
              <div><h2 style={{ fontSize: 22 }}>{s.panggilan || s.nama}</h2><div className="muted kecil">{s.jk === "L" ? "Laki-laki" : "Perempuan"} · lahir {tgl(s.tgl_lahir, true)}</div></div>
            </div>
            <div className="info-grid mt">
              <div><span>{s.hubungan}</span>{s.nama_wali}</div>
              <div><span>WhatsApp</span>{s.no_wa ? <a href={waLink(s.no_wa)} target="_blank" rel="noopener">{s.no_wa}</a> : "-"}</div>
              <div><span>Masuk</span>{tgl(s.tgl_masuk, true)}</div>
              <div><span>SPP per bulan</span>{rupiah((s.tarif_spp || 0) - s.potongan)}{s.potongan ? <div className="kecil muted">potongan {rupiah(s.potongan)} ({s.ket_potongan})</div> : null}</div>
              <div style={{ gridColumn: "1 / -1" }}><span>Alamat</span>{s.alamat || "-"}</div>
            </div>
          </div>
          <div className="balok terakota" style={{ minHeight: 0 }}>
            <div className="lbl">Sisa tagihan</div><div className="nil">{rupiah(sisa)}</div>
            <div className="sub">{terbuka.length} tagihan belum lunas</div>
          </div>
          <div className="kartu">
            <div className="kepala-kartu"><h3>Tabungan</h3><Link className="kecil tebal" href={`/tabungan/${s.id}`}>Buku tabungan</Link></div>
            <div style={{ font: "700 28px var(--font-judul)" }}>{rupiah(s.saldo_tabungan)}</div>
            <form action={transaksiTab} className="baris mt2" style={{ flexWrap: "nowrap" }}>
              <input type="hidden" name="siswa_id" value={s.id} />
              <input type="hidden" name="kembali" value={`/siswa/${s.id}`} />
              <input className="input" name="jumlah" inputMode="numeric" placeholder="Nominal" required style={{ minWidth: 0 }} />
              <select className="input" name="jenis" style={{ width: "auto" }} defaultValue="setor">
                <option value="setor">Setor</option>{keu && <option value="tarik">Tarik</option>}
              </select>
              <button className="btn hijau kecil">Simpan</button>
            </form>
            <div className="daftar mt2">
              {tab.map((t, i) => (
                <div key={i} className="kecil">
                  <span style={{ flex: 1 }}>{tgl(t.tanggal)} · {t.keterangan}</span>
                  <b className="angka" style={{ color: t.jenis === "setor" ? "var(--sage)" : "var(--terakota)" }}>{t.jenis === "setor" ? "+" : "-"}{rupiah(t.jumlah)}</b>
                </div>
              ))}
              {!tab.length && <div className="kecil muted">Belum ada transaksi tabungan.</div>}
            </div>
          </div>
          {keu && (
            <div className="kartu">
              <h3>Portal wali murid</h3>
              <p className="kecil muted m0">Orang tua bisa melihat tagihan, kuitansi, dan saldo tabungan lewat tautan pribadi ini (otomatis disertakan di pesan pengingat).</p>
              <input className="input mt2" readOnly value={linkWali} />
              <div className="baris mt2">
                <a className="btn terang kecil" href={`/wali/${s.token_wali}`} target="_blank">Buka</a>
                {s.no_wa && <a className="btn terang kecil" target="_blank" rel="noopener" href={waLink(s.no_wa, `Bapak/Ibu ${s.nama_wali}, tagihan & tabungan ananda ${s.panggilan} bisa dilihat di: ${linkWali}`)}><Ikon n="wa" s={15} /> Kirim tautan</a>}
                <form action={gantiTokenWali}><input type="hidden" name="id" value={s.id} /><button className="tautan merah kecil">Ganti tautan</button></form>
              </div>
            </div>
          )}
        </div>

        <div className="tumpuk" style={{ alignContent: "start" }}>
          {keu && (
            <div className="kartu rata">
              <div className="kepala-kartu"><h3>Terima pembayaran</h3><span className="kecil muted">Centang tagihan yang dibayar</span></div>
              {terbuka.length ? (
                <FormBayar siswaId={s.id} saldo={s.saldo_tabungan} tagihan={terbuka.map((t) => ({
                  id: t.id, nama: namaTagihan(t), ket: t.periode ? "" : t.keterangan, sisa: t.nominal - t.potongan - t.terbayar,
                  jatuh_tempo: tgl(t.jatuh_tempo), telat: t.jatuh_tempo <= hari, status: t.status,
                }))} />
              ) : <div className="kosong">Tidak ada tagihan terbuka. Semua lunas.</div>}
            </div>
          )}

          <div className="kartu rata">
            <div className="kepala-kartu"><h3>Semua tagihan</h3><span className="kecil muted">{tagihan.length} tagihan</span></div>
            <div className="tabel-wrap">
              <table className="tabel">
                <thead><tr><th>Tagihan</th><th>Jatuh tempo</th><th className="kanan">Total</th><th className="kanan">Dibayar</th><th>Status</th>{keu && <th></th>}</tr></thead>
                <tbody>
                  {tagihan.map((t) => (
                    <tr key={t.id}>
                      <td><b>{namaTagihan(t)}</b>{!t.periode && t.keterangan ? <div className="kecil muted">{t.keterangan}</div> : null}{t.potongan ? <div className="kecil muted">potongan {rupiah(t.potongan)}</div> : null}</td>
                      <td className="nowrap">{tgl(t.jatuh_tempo)}</td>
                      <td className="kanan angka">{rupiah(t.nominal - t.potongan)}</td>
                      <td className="kanan angka">{rupiah(t.terbayar)}</td>
                      <td><span className={`chip ${STATUS[t.status][1]}`}>{STATUS[t.status][0]}</span></td>
                      {keu && <td className="kanan">{t.status === "belum" && t.terbayar === 0 && (
                        <form action={batalkanTagihan}><input type="hidden" name="id" value={t.id} /><button className="tautan merah kecil" title="Batalkan tagihan ini">Batalkan</button></form>
                      )}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!tagihan.length && <div className="kosong">Belum ada tagihan.</div>}
            </div>
          </div>

          {keu && (
            <div className="kartu rata">
              <div className="kepala-kartu"><h3>Riwayat pembayaran</h3></div>
              <div className="tabel-wrap"><table className="tabel"><tbody>
                {bayar.map((p) => (
                  <tr key={p.id}>
                    <td><Link className="nama" href={`/kuitansi/${p.id}`}>{p.no_kuitansi}</Link><div className="kecil muted">{tgl(p.tanggal)} {jam(p.tanggal)} · {p.metode}</div></td>
                    <td className="kanan angka tebal">{p.batal ? <span className="chip merah">Dibatalkan</span> : rupiah(p.total)}</td>
                    <td className="kanan"><Link className="btn terang kecil" href={`/kuitansi/${p.id}`}><Ikon n="cetak" s={15} /> Kuitansi</Link></td>
                  </tr>
                ))}
              </tbody></table>
              {!bayar.length && <div className="kosong">Belum ada pembayaran.</div>}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
