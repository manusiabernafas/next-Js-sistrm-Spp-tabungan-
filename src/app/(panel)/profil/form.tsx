"use client";
import { useActionState } from "react";
import { gantiSandi, type HasilSandi } from "../admin-actions";

export default function FormSandi() {
  const [st, aksi, jalan] = useActionState<HasilSandi, FormData>(gantiSandi, null);
  return (
    <form action={aksi} className="kartu" style={{ maxWidth: 460 }}>
      <h3>Ganti kata sandi</h3>
      {st?.err && <div className="pesan err">{st.err}</div>}
      {st?.ok && <div className="pesan ok">{st.ok}</div>}
      <label className="f"><span>Kata sandi lama</span><input type="password" name="lama" required autoComplete="current-password" /></label>
      <label className="f"><span>Kata sandi baru</span><input type="password" name="baru" required minLength={8} autoComplete="new-password" /><small>Minimal 8 karakter, berisi huruf dan angka.</small></label>
      <label className="f"><span>Ulangi kata sandi baru</span><input type="password" name="ulang" required autoComplete="new-password" /></label>
      <button className="btn" disabled={jalan}>Simpan</button>
    </form>
  );
}
