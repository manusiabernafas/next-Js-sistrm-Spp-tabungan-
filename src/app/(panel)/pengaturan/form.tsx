"use client";
import { useActionState } from "react";
import { simpanPengaturan, type HasilSetting } from "../admin-actions";
import type { Setting } from "@/lib/setting";

export default function FormPengaturan({ s }: { s: Setting }) {
  const [st, aksi, jalan] = useActionState<HasilSetting, FormData>(simpanPengaturan, null);
  const e = st?.err || {};
  // React me-reset form setelah aksi; pakai nilai terakhir yang dikirim agar isian tidak hilang saat ada galat
  const n = (k: keyof Setting) => (st?.nilai ? (st.nilai[k] ?? "") : String(s[k] ?? ""));
  const c = (k: keyof Setting) => (st?.nilai ? k in st.nilai : !!s[k]);
  const G = ({ k }: { k: string }) => (e[k] ? <span className="galat">{e[k]}</span> : null);
  return (
    <form key={st?.t ?? 0} action={aksi} className="tumpuk" style={{ maxWidth: 900 }}>
      {st?.ok && <div className="pesan ok">{st.ok}</div>}
      {st?.err && <div className="pesan err">Periksa kembali isian yang ditandai.</div>}
      <div className="kartu">
        <h3>Identitas sekolah</h3>
        <div className="grid g2">
          <label className="f"><span>Nama sekolah</span><input name="nama_sekolah" defaultValue={n("nama_sekolah")} required /><G k="nama_sekolah" /></label>
          <label className="f"><span>Telepon</span><input name="telepon" defaultValue={n("telepon")} /></label>
        </div>
        <label className="f"><span>Alamat</span><input name="alamat" defaultValue={n("alamat")} /></label>
        <div className="grid g3">
          <label className="f"><span>Kepala sekolah</span><input name="kepala_sekolah" defaultValue={n("kepala_sekolah")} /></label>
          <label className="f"><span>Bendahara (tanda tangan kuitansi)</span><input name="bendahara" defaultValue={n("bendahara")} /></label>
          <label className="f"><span>WhatsApp sekolah</span><input name="whatsapp" defaultValue={n("whatsapp")} /></label>
        </div>
      </div>
      <div className="kartu">
        <h3>Tagihan</h3>
        <div className="grid g2">
          <label className="f"><span>Tanggal jatuh tempo SPP</span><input name="jatuh_tempo" type="number" min={1} max={28} defaultValue={n("jatuh_tempo")} /><G k="jatuh_tempo" /><small>Setiap bulan, mis. 10 = tanggal 10.</small></label>
          <label className="f"><span>Rekening pembayaran</span><input name="rekening" defaultValue={n("rekening")} placeholder="BRI 0123-... a.n. TK ..." /><small>Disebut di pesan pengingat.</small></label>
        </div>
      </div>
      <div className="kartu">
        <h3>Pesan pengingat WhatsApp</h3>
        <label className="f"><span>Template</span><textarea name="template_pengingat" defaultValue={n("template_pengingat")} rows={9} /><G k="template_pengingat" />
          <small>Kode yang bisa dipakai: {"{wali} {nama} {panggilan} {kelas} {rincian} {total} {sekolah} {rekening} {link}"}. {"{link}"} = tautan portal wali murid.</small></label>
        <div className="grid g2">
          <label className="f"><span>Token Fonnte (opsional)</span><input name="fonnte_token" defaultValue={n("fonnte_token")} autoComplete="off" placeholder="kosongkan bila kirim manual lewat WhatsApp" /><G k="fonnte_token" />
            <small>Daftar di fonnte.com, hubungkan nomor WA sekolah, salin tokennya ke sini.</small></label>
          <label className="f"><span>Hari pengingat otomatis</span><input name="hari_pengingat" defaultValue={n("hari_pengingat")} /><G k="hari_pengingat" /><small>Relatif terhadap jatuh tempo: -3 = 3 hari sebelum, 0 = hari H, 7 = seminggu sesudah.</small></label>
        </div>
        <label className="cek"><input type="checkbox" name="pengingat_otomatis" defaultChecked={c("pengingat_otomatis")} /> Aktifkan pengingat otomatis (butuh token Fonnte & penjadwal harian)</label>
        <label className="cek mt2"><input type="checkbox" name="ganti_kunci" /> Buat ulang kunci URL cron (URL lama tidak berlaku)</label>
      </div>
      <div><button className="btn" disabled={jalan}>{jalan ? "Menyimpan..." : "Simpan pengaturan"}</button></div>
    </form>
  );
}
