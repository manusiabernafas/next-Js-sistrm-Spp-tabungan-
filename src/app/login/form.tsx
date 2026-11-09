"use client";
import { useActionState } from "react";
import { masuk } from "./actions";

export default function FormMasuk() {
  const [err, aksi, jalan] = useActionState(masuk, null);
  return (
    <form action={aksi}>
      {err && <div className="pesan err">{err}</div>}
      <label className="f"><span>Username</span><input name="username" autoComplete="username" required autoFocus /></label>
      <label className="f"><span>Kata sandi</span><input name="password" type="password" autoComplete="current-password" required /></label>
      <button className="btn blok" disabled={jalan}>{jalan ? "Memeriksa..." : "Masuk"}</button>
    </form>
  );
}
