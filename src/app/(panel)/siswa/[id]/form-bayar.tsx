"use client";
import { useState } from "react";
import { terimaBayar } from "../actions";

type T = { id: number; nama: string; ket: string; sisa: number; jatuh_tempo: string; telat: boolean; status: string };
const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");

export default function FormBayar({ siswaId, tagihan, saldo }: { siswaId: number; tagihan: T[]; saldo: number }) {
  const [pilih, setPilih] = useState<number[]>(tagihan.filter((t) => t.telat).map((t) => t.id).slice(0, 12));
  const total = tagihan.filter((t) => pilih.includes(t.id)).reduce((a, t) => a + t.sisa, 0);
  const [jumlah, setJumlah] = useState<string>("");
  const [metode, setMetode] = useState("tunai");
  const [kirim, setKirim] = useState(false);
  const nilai = jumlah === "" ? total : Number(jumlah.replace(/\D/g, "")) || 0;
  const ubah = (id: number) => { setPilih((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); setJumlah(""); };
  const kurangSaldo = metode === "tabungan" && nilai > saldo;
  return (
    <form action={terimaBayar} onSubmit={() => setKirim(true)} className="form-bayar">
      <input type="hidden" name="siswa_id" value={siswaId} />
      <div className="tabel-wrap">
        <table className="tabel">
          <thead><tr><th style={{ width: 36 }}></th><th>Tagihan</th><th>Jatuh tempo</th><th className="kanan">Sisa</th></tr></thead>
          <tbody>
            {tagihan.map((t) => (
              <tr key={t.id} onClick={() => ubah(t.id)} style={{ cursor: "pointer" }}>
                <td><input type="checkbox" name="tagihan" value={t.id} checked={pilih.includes(t.id)} onChange={() => ubah(t.id)} onClick={(e) => e.stopPropagation()} aria-label={`Pilih ${t.nama}`} style={{ width: 18, height: 18, accentColor: "var(--sage)" }} /></td>
                <td><b>{t.nama}</b>{t.ket && <div className="kecil muted">{t.ket}</div>}</td>
                <td>{t.jatuh_tempo} {t.telat ? <span className="chip merah">lewat</span> : null} {t.status === "sebagian" ? <span className="chip kuning">dicicil</span> : null}</td>
                <td className="kanan angka tebal">{rp(t.sisa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: 20, borderTop: "1.5px solid var(--garis)" }}>
        <div className="grid g3">
          <label className="f"><span>Jumlah dibayar</span>
            <input name="jumlah" inputMode="numeric" value={jumlah === "" ? String(total) : jumlah} onChange={(e) => setJumlah(e.target.value)} />
            <small>Terpilih {rp(total)}. Boleh dicicil, dialokasikan ke tagihan terlama dulu.</small>
          </label>
          <label className="f"><span>Metode</span>
            <select name="metode" value={metode} onChange={(e) => setMetode(e.target.value)}>
              <option value="tunai">Tunai</option><option value="transfer">Transfer bank</option>
              <option value="tabungan" disabled={saldo <= 0}>Potong tabungan (saldo {rp(saldo)})</option>
            </select>
            {kurangSaldo && <span className="galat">Saldo tabungan tidak cukup.</span>}
          </label>
          <label className="f"><span>Catatan (opsional)</span><input name="catatan" maxLength={160} placeholder="mis. transfer dari rek. ayah" /></label>
        </div>
        <button className="btn hijau" disabled={!pilih.length || nilai <= 0 || nilai > total || kurangSaldo || kirim}>
          {kirim ? "Menyimpan..." : `Terima pembayaran ${rp(nilai)}`}
        </button>
        {nilai > total && <span className="galat" style={{ marginLeft: 12 }}>Melebihi total tagihan terpilih.</span>}
      </div>
    </form>
  );
}
