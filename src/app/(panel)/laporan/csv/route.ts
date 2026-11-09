import { getUser, bolehKeuangan } from "@/lib/auth";
import { rows } from "@/lib/db";
import { hariIni, namaTagihan } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Sel diawali = + - @ diberi kutip satu agar tidak dieksekusi Excel sebagai rumus. */
const sel = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return new Response("Silakan masuk", { status: 401 });
  const sp = new URL(req.url).searchParams;
  const jenis = sp.get("jenis") || "pembayaran";
  if (jenis !== "tabungan" && !bolehKeuangan(u)) return new Response("Tidak diizinkan", { status: 403 });
  const ok = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
  const dari = ok(sp.get("dari")) || hariIni().slice(0, 4) + "-01-01";
  const sampai = ok(sp.get("sampai")) || hariIni();
  let head: string[] = [], data: unknown[][] = [];

  if (jenis === "pembayaran") {
    head = ["No kuitansi", "Tanggal", "NIS", "Nama siswa", "Kelas", "Tagihan", "Jumlah", "Metode", "Status", "Petugas"];
    const r = await rows(`SELECT p.no_kuitansi, p.tanggal, s.nis, s.nama, k.nama kelas, t.jenis, t.periode, d.jumlah, p.metode, p.batal, g.nama petugas
      FROM pembayaran p JOIN pembayaran_detail d ON d.pembayaran_id = p.id JOIN tagihan t ON t.id = d.tagihan_id
      JOIN siswa s ON s.id = p.siswa_id LEFT JOIN kelas k ON k.id = s.kelas_id LEFT JOIN pengguna g ON g.id = p.dicatat_oleh
      WHERE DATE(p.tanggal) BETWEEN ? AND ? ORDER BY p.tanggal, p.id`, [dari, sampai]);
    data = r.map((x) => [x.no_kuitansi, x.tanggal, x.nis, x.nama, x.kelas, namaTagihan(x as never), x.jumlah, x.metode, x.batal ? "Batal" : "Sah", x.petugas]);
  } else if (jenis === "tunggakan") {
    head = ["NIS", "Nama siswa", "Kelas", "Nama wali", "No WA", "Tagihan", "Jatuh tempo", "Total", "Dibayar", "Sisa"];
    const r = await rows(`SELECT s.nis, s.nama, k.nama kelas, s.nama_wali, s.no_wa, t.jenis, t.periode, t.jatuh_tempo,
      t.nominal - t.potongan total, t.terbayar FROM tagihan t JOIN siswa s ON s.id = t.siswa_id LEFT JOIN kelas k ON k.id = s.kelas_id
      WHERE t.status IN ('belum','sebagian') AND s.status = 'aktif' ORDER BY k.urutan, s.nama, t.jatuh_tempo`);
    data = r.map((x) => [x.nis, x.nama, x.kelas, x.nama_wali, x.no_wa, namaTagihan(x as never), x.jatuh_tempo, x.total, x.terbayar, x.total - x.terbayar]);
  } else if (jenis === "tabungan") {
    head = ["NIS", "Nama siswa", "Kelas", "Total setor", "Total tarik", "Saldo"];
    const r = await rows(`SELECT s.nis, s.nama, k.nama kelas,
      (SELECT COALESCE(SUM(jumlah),0) FROM tabungan t WHERE t.siswa_id = s.id AND t.jenis='setor') setor,
      (SELECT COALESCE(SUM(jumlah),0) FROM tabungan t WHERE t.siswa_id = s.id AND t.jenis='tarik') tarik, s.saldo_tabungan
      FROM siswa s LEFT JOIN kelas k ON k.id = s.kelas_id WHERE s.status = 'aktif' OR s.saldo_tabungan > 0 ORDER BY k.urutan, s.nama`);
    data = r.map((x) => [x.nis, x.nama, x.kelas, x.setor, x.tarik, x.saldo_tabungan]);
  } else if (jenis === "mutasi") {
    head = ["Tanggal", "NIS", "Nama siswa", "Kelas", "Jenis", "Jumlah", "Saldo setelah", "Keterangan"];
    const r = await rows(`SELECT t.tanggal, s.nis, s.nama, k.nama kelas, t.jenis, t.jumlah, t.saldo_setelah, t.keterangan
      FROM tabungan t JOIN siswa s ON s.id = t.siswa_id LEFT JOIN kelas k ON k.id = s.kelas_id
      WHERE DATE(t.tanggal) BETWEEN ? AND ? ORDER BY t.tanggal, t.id`, [dari, sampai]);
    data = r.map((x) => [x.tanggal, x.nis, x.nama, x.kelas, x.jenis, x.jumlah, x.saldo_setelah, x.keterangan]);
  } else {
    return new Response("Jenis laporan tidak dikenal", { status: 400 });
  }
  // BOM + pemisah titik koma agar langsung rapi dibuka Excel versi Indonesia
  const csv = "﻿" + [head, ...data].map((r) => r.map(sel).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${jenis}-${jenis === "tunggakan" || jenis === "tabungan" ? hariIni() : `${dari}_${sampai}`}.csv"`,
    },
  });
}
