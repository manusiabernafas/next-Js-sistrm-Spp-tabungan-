import Link from "next/link";
import { notFound } from "next/navigation";
import { rows } from "@/lib/db";
import { getSetting } from "@/lib/setting";
import { siswaDariToken } from "@/lib/wali";
import { rupiah, tgl, namaTagihan, hariIni, waLink } from "@/lib/format";
import Pelangi from "@/components/pelangi";
import Ikon from "@/components/ikon";

export const metadata = { title: "Portal wali murid", robots: { index: false, follow: false } };

export default async function PortalWali({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await siswaDariToken(token);
  if (!s) notFound();
  const st = await getSetting();
  const h = hariIni();
  const tagihan = await rows<{ id: number; jenis: string; periode: string | null; keterangan: string; sisa: number; jatuh_tempo: string; status: string }>(
    `SELECT id, jenis, periode, keterangan, (nominal - potongan - terbayar) sisa, jatuh_tempo, status FROM tagihan
     WHERE siswa_id = ? AND status IN ('belum','sebagian') ORDER BY jatuh_tempo`, [s.id]);
  const total = tagihan.reduce((a, t) => a + Number(t.sisa), 0);
  const bayar = await rows<{ id: number; no_kuitansi: string; tanggal: string; total: number; metode: string }>(
    "SELECT id, no_kuitansi, tanggal, total, metode FROM pembayaran WHERE siswa_id = ? AND batal = 0 ORDER BY tanggal DESC LIMIT 10", [s.id]);
  const tab = await rows<{ tanggal: string; jenis: string; jumlah: number; saldo_setelah: number; keterangan: string }>(
    "SELECT tanggal, jenis, jumlah, saldo_setelah, keterangan FROM tabungan WHERE siswa_id = ? ORDER BY tanggal DESC, id DESC LIMIT 15", [s.id]);
  return (
    <main className="pub" style={{ alignItems: "start" }}>
      <div className="pub-lebar tumpuk">
        <div className="tengah">
          <div className="pelangi-wrap"><Pelangi w={130} /></div>
          <div className="kecil tebal muted" style={{ letterSpacing: ".1em", textTransform: "uppercase", marginTop: 10 }}>{st.nama_sekolah}</div>
          <h1 style={{ fontSize: 30, marginTop: 4 }}>{s.nama}</h1>
          <p className="muted m0">NIS {s.nis} · {s.kelas || "-"} · wali: {s.nama_wali}</p>
        </div>
        <div className="grid g2">
          <div className={`balok ${total ? "terakota" : "sage"}`}><div className="lbl">Tagihan belum lunas</div><div className="nil">{rupiah(total)}</div><div className="sub">{tagihan.length ? `${tagihan.length} tagihan` : "Semua tagihan lunas. Terima kasih!"}</div></div>
          <div className="balok mustard"><div className="lbl">Saldo tabungan ananda</div><div className="nil">{rupiah(s.saldo_tabungan)}</div></div>
        </div>
        {tagihan.length > 0 && (
          <div className="kartu rata">
            <div className="kepala-kartu"><h3>Rincian tagihan</h3></div>
            <div className="tabel-wrap"><table className="tabel"><tbody>
              {tagihan.map((t) => (
                <tr key={t.id}>
                  <td><b>{namaTagihan(t)}</b>{!t.periode && t.keterangan ? <div className="kecil muted">{t.keterangan}</div> : null}</td>
                  <td className="nowrap kecil">jatuh tempo {tgl(t.jatuh_tempo)} {t.jatuh_tempo < h ? <span className="chip merah">lewat</span> : null}{t.status === "sebagian" ? <span className="chip kuning">dicicil</span> : null}</td>
                  <td className="kanan angka tebal">{rupiah(t.sisa)}</td>
                </tr>
              ))}
            </tbody></table></div>
            <div style={{ padding: 18, borderTop: "1.5px solid var(--garis)" }} className="kecil">
              Pembayaran bisa langsung di sekolah{st.rekening ? <> atau transfer ke <b>{st.rekening}</b></> : null}. Setelah transfer, kirim bukti ke sekolah agar segera dicatat.
              {st.whatsapp && <div className="mt2"><a className="btn hijau kecil" target="_blank" rel="noopener" href={waLink(st.whatsapp, `Assalamu'alaikum, saya ${s.nama_wali} wali dari ${s.nama} (${s.kelas}). Berikut bukti pembayaran:`)}><Ikon n="wa" s={15} /> Kirim bukti transfer</a></div>}
            </div>
          </div>
        )}
        <div className="grid g2">
          <div className="kartu">
            <h3>Pembayaran terakhir</h3>
            <div className="daftar">{bayar.map((p) => (
              <Link key={p.id} href={`/wali/${s.token_wali}/kuitansi/${p.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                <span style={{ flex: 1 }}><b>{p.no_kuitansi}</b><div className="kecil muted">{tgl(p.tanggal)} · {p.metode}</div></span>
                <b className="angka">{rupiah(p.total)}</b>
              </Link>
            ))}{!bayar.length && <span className="muted kecil">Belum ada pembayaran.</span>}</div>
          </div>
          <div className="kartu">
            <h3>Buku tabungan</h3>
            <div className="daftar">{tab.map((t, i) => (
              <div key={i} className="kecil">
                <span style={{ flex: 1 }}>{tgl(t.tanggal)}<div className="muted">{t.keterangan}</div></span>
                <span className="kanan"><b className="angka" style={{ color: t.jenis === "setor" ? "var(--sage)" : "var(--terakota)" }}>{t.jenis === "setor" ? "+" : "-"}{rupiah(t.jumlah)}</b><div className="muted angka">saldo {rupiah(t.saldo_setelah)}</div></span>
              </div>
            ))}{!tab.length && <span className="muted kecil">Belum ada transaksi tabungan.</span>}</div>
          </div>
        </div>
        <p className="tengah kecil muted">Halaman ini khusus untuk wali murid. Jangan bagikan tautannya ke orang lain.<br />{st.nama_sekolah} · {st.alamat}</p>
      </div>
    </main>
  );
}
