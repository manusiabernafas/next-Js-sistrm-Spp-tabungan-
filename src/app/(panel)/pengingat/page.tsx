import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { rows } from "@/lib/db";
import { getSetting, appUrl } from "@/lib/setting";
import { rupiah, tgl, jam, hariIni } from "@/lib/format";
import { daftarTunggakan, pesanPengingat } from "@/lib/pengingat";
import Kepala from "@/components/kepala";
import Pesan from "@/components/pesan";
import Ikon from "@/components/ikon";
import { kirimLewatFonnte } from "./actions";
import TombolWA from "@/components/tombol-wa";

export const metadata = { title: "Pengingat" };

export default async function Pengingat({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const u = await requireUser("admin", "bendahara");
  const st = await getSetting();
  const jt = sp.semua !== "1";
  const kelasId = Number(sp.kelas || 0) || undefined;
  const kelas = await rows<{ id: number; nama: string }>("SELECT id, nama FROM kelas ORDER BY urutan");
  const data = await daftarTunggakan({ hanyaJatuhTempo: jt, kelas: kelasId });
  const total = data.reduce((a, t) => a + Number(t.total), 0);
  const pilih = Number(sp.siswa || 0);
  const pratinjau = pilih ? await pesanPengingat(pilih, false) : null;
  const pSiswa = pilih ? (await daftarTunggakan({ siswa: pilih }))[0] : null;
  const log = await rows<{ tanggal: string; kanal: string; status: string; total: number; nama: string; siswa_id: number; oleh: string | null }>(
    `SELECT l.tanggal, l.kanal, l.status, l.total, s.nama, s.id siswa_id, p.nama oleh FROM pengingat_log l
     JOIN siswa s ON s.id = l.siswa_id LEFT JOIN pengguna p ON p.id = l.oleh ORDER BY l.tanggal DESC, l.id DESC LIMIT 12`);
  const hari = hariIni();
  const q = (o: Record<string, string>) => "/pengingat?" + new URLSearchParams({ ...(kelasId ? { kelas: String(kelasId) } : {}), ...(!jt ? { semua: "1" } : {}), ...o }).toString();

  return (
    <>
      <Kepala judul="Pengingat & penagihan" sub={`${data.length} siswa · total ${rupiah(total)} ${jt ? "sudah lewat jatuh tempo" : "belum lunas"}`}>
        {st.fonnte_token && data.length > 0 && (
          <form action={kirimLewatFonnte}>
            <input type="hidden" name="jt" value={jt ? "1" : "0"} />{kelasId && <input type="hidden" name="kelas" value={kelasId} />}
            <button className="btn kuning"><Ikon n="kirim" /> Kirim semua via Fonnte ({Math.min(data.length, 150)})</button>
          </form>
        )}
      </Kepala>
      <Pesan sp={sp} />

      {pratinjau && pSiswa && (
        <div className="kartu mt2" style={{ marginBottom: 16 }}>
          <div className="kepala-kartu"><h3>Pesan untuk {pSiswa.nama_wali} (wali {pSiswa.nama})</h3><Link className="kecil tebal" href={q({})}>Tutup</Link></div>
          <div className="grid g21">
            <div className="wa-pratinjau">{pratinjau.pesan}</div>
            <div className="tumpuk" style={{ alignContent: "start" }}>
              <div className="kecil muted">Ke: {pratinjau.no_wa || "nomor belum diisi"}<br />Terakhir diingatkan: {pSiswa.terakhir_diingatkan ? `${tgl(pSiswa.terakhir_diingatkan)} ${jam(pSiswa.terakhir_diingatkan)}` : "belum pernah"}</div>
              {pratinjau.no_wa && (
                <TombolWA siswaId={pilih} label="Buka di WhatsApp" blok />
              )}
              {st.fonnte_token && pratinjau.no_wa && (
                <form action={kirimLewatFonnte}><input type="hidden" name="siswa_id" value={pilih} /><button className="btn terang blok"><Ikon n="kirim" /> Kirim otomatis (Fonnte)</button></form>
              )}
              <Link className="kecil" href={`/siswa/${pilih}`}>Catat pembayaran siswa ini</Link>
            </div>
          </div>
        </div>
      )}

      <div className="tab-nav">
        <Link href={q({ semua: "" })} className={jt ? "aktif" : ""}>Lewat jatuh tempo</Link>
        <Link href={q({ semua: "1" })} className={!jt ? "aktif" : ""}>Semua belum lunas</Link>
        <span style={{ width: 10 }} />
        <Link href={"/pengingat?" + new URLSearchParams(!jt ? { semua: "1" } : {}).toString()} className={!kelasId ? "aktif" : ""}>Semua kelas</Link>
        {kelas.map((k) => <Link key={k.id} href={q({ kelas: String(k.id) })} className={kelasId === k.id ? "aktif" : ""}>{k.nama}</Link>)}
      </div>

      <div className="grid g21">
        <div className="kartu rata">
          <div className="tabel-wrap"><table className="tabel">
            <thead><tr><th>Siswa</th><th className="kanan">Tunggakan</th><th>Sejak</th><th>Diingatkan</th><th></th></tr></thead>
            <tbody>{data.map((t) => {
              const telat = Math.round((Date.parse(hari) - Date.parse(t.tertua)) / 864e5);
              return (
                <tr key={t.siswa_id}>
                  <td><Link className="nama" href={`/siswa/${t.siswa_id}`}>{t.nama}</Link><div className="kecil muted">{t.kelas} · {t.nama_wali}{!t.no_wa ? " · tanpa nomor WA" : ""}</div></td>
                  <td className="kanan angka tebal">{rupiah(t.total)}<div className="kecil muted">{t.jumlah} tagihan</div></td>
                  <td className="nowrap">{tgl(t.tertua)}{telat > 0 ? <div><span className={`chip ${telat > 30 ? "merah" : "kuning"}`}>{telat} hari</span></div> : null}</td>
                  <td className="kecil nowrap">{t.terakhir_diingatkan ? tgl(t.terakhir_diingatkan) : <span className="muted">belum</span>}</td>
                  <td className="kanan nowrap">
                    <Link className="btn terang kecil" href={q({ siswa: String(t.siswa_id) })}>Pratinjau</Link>{" "}
                    {t.no_wa && <TombolWA siswaId={t.siswa_id} jt={jt} kecil />}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>{!data.length && <div className="kosong">Tidak ada tunggakan. Semua wali tertib membayar.</div>}</div>
        </div>
        <div className="tumpuk" style={{ alignContent: "start" }}>
          <div className="kartu">
            <h3>Pengingat otomatis</h3>
            <p className="kecil m0">Status: {st.pengingat_otomatis && st.fonnte_token ? <span className="chip hijau">Aktif</span> : <span className="chip abu">Nonaktif</span>}</p>
            <p className="kecil muted">Dengan token <a href="https://fonnte.com" target="_blank" rel="noopener">Fonnte</a>, pesan dikirim otomatis {st.hari_pengingat.split(",").map((h) => Number(h)).map((h) => h < 0 ? `H${h}` : h === 0 ? "tepat hari jatuh tempo" : `H+${h}`).join(", ")}. Jalankan penjadwal (cron / Task Scheduler) yang memanggil:</p>
            {u.role === "admin" ? <input className="input kecil" readOnly value={`${appUrl()}/api/cron/pengingat?key=${st.cron_key}`} /> : <p className="kecil muted">Alamat cron hanya terlihat oleh admin.</p>}
            <p className="kecil muted m0" style={{ marginTop: 8 }}>atau cukup jalankan <code>npm run pengingat</code> sekali sehari. Atur di menu Pengaturan.</p>
          </div>
          <div className="kartu">
            <h3>Riwayat pengingat</h3>
            <div className="daftar">{log.map((l, i) => (
              <div key={i} className="kecil">
                <span style={{ flex: 1, minWidth: 0 }}><Link href={`/siswa/${l.siswa_id}`} className="tebal" style={{ color: "var(--tinta)" }}>{l.nama}</Link><div className="muted">{tgl(l.tanggal)} {jam(l.tanggal)} · {l.kanal}{l.oleh ? ` · ${l.oleh.split(",")[0]}` : ""}</div></span>
                <span className={`chip ${l.status === "terkirim" || l.status === "dibuka" ? "hijau" : "merah"}`}>{l.status}</span>
              </div>
            ))}{!log.length && <span className="muted kecil">Belum ada.</span>}</div>
          </div>
        </div>
      </div>
    </>
  );
}
