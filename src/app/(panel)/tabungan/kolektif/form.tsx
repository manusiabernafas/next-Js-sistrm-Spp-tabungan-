"use client";
import { useState } from "react";
import { setorKelas } from "../actions";

type S = { id: number; nama: string; saldo: number; biasa: number };
const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");

export default function FormKolektif({ kelas, siswa }: { kelas: number; siswa: S[] }) {
  const [nilai, setNilai] = useState<Record<number, string>>({});
  const [kirim, setKirim] = useState(false);
  const total = Object.values(nilai).reduce((a, v) => a + (Number(v.replace(/\D/g, "")) || 0), 0);
  const isi = Object.values(nilai).filter((v) => Number(v.replace(/\D/g, "")) > 0).length;
  const set = (id: number, v: string) => setNilai((n) => ({ ...n, [id]: v.replace(/[^\d]/g, "") }));
  return (
    <form action={setorKelas} onSubmit={() => setKirim(true)}>
      <input type="hidden" name="kelas" value={kelas} />
      <div className="tabel-wrap"><table className="tabel">
        <thead><tr><th>Siswa</th><th className="kanan">Saldo</th><th style={{ width: 300 }}>Setoran hari ini</th></tr></thead>
        <tbody>{siswa.map((s) => (
          <tr key={s.id}>
            <td><b>{s.nama}</b>{s.biasa ? <div className="kecil muted">biasanya {rp(s.biasa)}</div> : null}</td>
            <td className="kanan angka">{rp(s.saldo)}</td>
            <td>
              <div className="baris" style={{ flexWrap: "nowrap", gap: 6 }}>
                <input className="input" name={`setor_${s.id}`} inputMode="numeric" value={nilai[s.id] ?? ""} onChange={(e) => set(s.id, e.target.value)} placeholder="0" aria-label={`Setoran ${s.nama}`} style={{ minHeight: 38, maxWidth: 120 }} />
                {[2000, 5000, 10000].map((n) => <button key={n} type="button" className="btn terang kecil" onClick={() => set(s.id, String(n))}>{n / 1000}rb</button>)}
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
      <div className="baris antara" style={{ padding: 20, borderTop: "1.5px solid var(--garis)" }}>
        <label className="f m0" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}><input name="keterangan" placeholder="Keterangan (default: Setoran hari menabung)" maxLength={160} /></label>
        <button className="btn hijau" disabled={!isi || kirim}>{kirim ? "Menyimpan..." : `Simpan ${isi} setoran · ${rp(total)}`}</button>
      </div>
    </form>
  );
}
