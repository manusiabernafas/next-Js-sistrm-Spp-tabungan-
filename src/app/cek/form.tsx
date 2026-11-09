"use client";
import { useActionState } from "react";
import { cariAnak } from "./actions";

export default function FormCek() {
  const [err, aksi, jalan] = useActionState(cariAnak, null);
  return (
    <form action={aksi}>
      {err && <div className="pesan err">{err}</div>}
      <label className="f"><span>NIS ananda</span><input name="nis" required inputMode="numeric" placeholder="lihat di kuitansi / kartu siswa" /></label>
      <label className="f"><span>Tanggal lahir ananda</span><input name="tgl_lahir" type="date" required /></label>
      <button className="btn blok" disabled={jalan}>{jalan ? "Mencari..." : "Lihat tagihan & tabungan"}</button>
    </form>
  );
}
