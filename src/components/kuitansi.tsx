import type { DataKuitansi } from "@/lib/kuitansi";
import type { Setting } from "@/lib/setting";
import { rupiah, tgl, jam, namaTagihan, terbilang } from "@/lib/format";
import Pelangi from "./pelangi";

export default function Kuitansi({ d, s }: { d: DataKuitansi; s: Setting }) {
  const { p, detail } = d;
  return (
    <div className="lembar">
      <div className="kop">
        <div className="baris" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
          <Pelangi w={64} lapis={4} />
          <div><h2>{s.nama_sekolah}</h2><div className="kecil">{s.alamat}</div><div className="kecil">{s.telepon}</div></div>
        </div>
        <div className="kanan">
          <div style={{ font: "800 20px var(--font-judul)", letterSpacing: ".08em" }}>KUITANSI</div>
          <div className="tebal">{p.no_kuitansi}</div>
          <div className="kecil">{tgl(p.tanggal, true)} · {jam(p.tanggal)} WIB</div>
        </div>
      </div>
      <table style={{ width: "100%", fontSize: 14.5, marginBottom: 14 }}>
        <tbody>
          <tr><td style={{ width: 170 }}>Telah terima dari</td><td>: <b>{p.nama_wali}</b> ({p.hubungan})</td></tr>
          <tr><td>Untuk pembayaran</td><td>: ananda <b>{p.nama}</b> · NIS {p.nis} · {p.kelas || "-"}</td></tr>
          <tr><td>Metode</td><td>: {p.metode === "tabungan" ? "Potong saldo tabungan" : p.metode === "transfer" ? "Transfer bank" : "Tunai"}{p.catatan ? ` · ${p.catatan}` : ""}</td></tr>
        </tbody>
      </table>
      <table className="tabel">
        <thead><tr><th>No</th><th>Rincian</th><th className="kanan">Dibayar</th><th className="kanan">Sisa tagihan</th></tr></thead>
        <tbody>
          {detail.map((x, i) => (
            <tr key={i}><td>{i + 1}</td><td>{namaTagihan(x)}{!x.periode && x.keterangan ? <div className="kecil muted">{x.keterangan}</div> : null}</td>
              <td className="kanan angka">{rupiah(x.jumlah)}</td><td className="kanan angka">{p.batal ? "-" : x.sisa > 0 ? rupiah(x.sisa) : "Lunas"}</td></tr>
          ))}
          <tr><td></td><td className="tebal">Total</td><td className="kanan angka tebal" style={{ fontSize: 17 }}>{rupiah(p.total)}</td><td></td></tr>
        </tbody>
      </table>
      <p style={{ margin: "12px 0 0", fontStyle: "italic" }}>Terbilang: {terbilang(p.total)}</p>
      <div className="baris antara" style={{ alignItems: "flex-end", marginTop: 10 }}>
        <div>{p.batal ? <span className="cap-lunas cap-batal">DIBATALKAN</span> : <span className="cap-lunas">DITERIMA</span>}</div>
        <div className="ttd" style={{ marginTop: 0 }}>
          <div>Bendahara,<div className="nm">{s.bendahara || p.petugas || "................"}</div></div>
        </div>
      </div>
    </div>
  );
}
