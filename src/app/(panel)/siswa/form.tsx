"use client";
import { useActionState } from "react";
import { simpanSiswa, type HasilForm } from "./actions";

type Siswa = Record<string, string | number | null>;

export default function FormSiswa({ s, kelas }: { s: Siswa; kelas: { id: number; nama: string; tarif_spp: number }[] }) {
  const [st, aksi, jalan] = useActionState<HasilForm, FormData>(simpanSiswa, null);
  const e = st?.err || {};
  const G = ({ k }: { k: string }) => (e[k] ? <span className="galat">{e[k]}</span> : null);
  const v = (k: string) => (st?.nilai?.[k] ?? s[k] ?? "") as string;
  return (
    // key berubah tiap ada galat: form dipasang ulang dengan isian terakhir (reset bawaan React tidak memulihkan <select>)
    <form key={st?.t ?? 0} action={aksi} className="kartu" style={{ maxWidth: 860 }}>
      {st?.umum && <div className="pesan err">{st.umum}</div>}
      {s.id ? <input type="hidden" name="id" value={String(s.id)} /> : null}
      <h3>Data anak</h3>
      <div className="grid g3">
        <label className="f"><span>NIS</span><input name="nis" defaultValue={v("nis")} required maxLength={20} /><G k="nis" /></label>
        <label className="f" style={{ gridColumn: "span 2" }}><span>Nama lengkap</span><input name="nama" defaultValue={v("nama")} required maxLength={100} /><G k="nama" /></label>
      </div>
      <div className="grid g3">
        <label className="f"><span>Nama panggilan</span><input name="panggilan" defaultValue={v("panggilan")} maxLength={30} /></label>
        <label className="f"><span>Jenis kelamin</span><select name="jk" defaultValue={v("jk") || "L"}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label>
        <label className="f"><span>Tanggal lahir</span><input type="date" name="tgl_lahir" defaultValue={v("tgl_lahir")} required /><G k="tgl_lahir" /></label>
      </div>
      <div className="grid g3">
        <label className="f"><span>Kelas</span><select name="kelas_id" defaultValue={v("kelas_id")}><option value="">- pilih -</option>{kelas.map((k) => <option key={k.id} value={k.id}>{k.nama} (SPP {k.tarif_spp.toLocaleString("id-ID")})</option>)}</select><G k="kelas_id" /></label>
        <label className="f"><span>Tanggal masuk</span><input type="date" name="tgl_masuk" defaultValue={v("tgl_masuk")} required /><G k="tgl_masuk" /></label>
        <label className="f"><span>Status</span><select name="status" defaultValue={v("status") || "aktif"}><option value="aktif">Aktif</option><option value="lulus">Lulus</option><option value="keluar">Keluar / pindah</option></select></label>
      </div>
      <h3 className="mt">Orang tua / wali</h3>
      <div className="grid g3">
        <label className="f"><span>Nama orang tua / wali</span><input name="nama_wali" defaultValue={v("nama_wali")} required maxLength={100} /><G k="nama_wali" /></label>
        <label className="f"><span>Hubungan</span><select name="hubungan" defaultValue={v("hubungan") || "Ibu"}>{["Ibu", "Ayah", "Wali", "Nenek", "Kakek"].map((h) => <option key={h}>{h}</option>)}</select></label>
        <label className="f"><span>No. WhatsApp</span><input name="no_wa" defaultValue={v("no_wa")} inputMode="tel" placeholder="081234567890" /><G k="no_wa" /><small>Dipakai untuk pengingat tagihan.</small></label>
      </div>
      <label className="f"><span>Alamat</span><input name="alamat" defaultValue={v("alamat")} maxLength={255} /></label>
      <h3 className="mt">Keringanan SPP</h3>
      <div className="grid g2">
        <label className="f"><span>Potongan SPP per bulan (Rp)</span><input name="potongan" defaultValue={v("potongan") || "0"} inputMode="numeric" /><G k="potongan" /><small>Isi 0 bila tidak ada. Berlaku untuk tagihan SPP yang diterbitkan berikutnya.</small></label>
        <label className="f"><span>Alasan potongan</span><input name="ket_potongan" defaultValue={v("ket_potongan")} placeholder="Yatim, saudara kandung, dll." maxLength={80} /></label>
      </div>
      <button className="btn" disabled={jalan}>{jalan ? "Menyimpan..." : "Simpan data siswa"}</button>
    </form>
  );
}
