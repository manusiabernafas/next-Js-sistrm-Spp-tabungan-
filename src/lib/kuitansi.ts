import "server-only";
import { row, rows } from "./db";

export type DataKuitansi = {
  p: { id: number; no_kuitansi: string; tanggal: string; total: number; metode: string; catatan: string; batal: number; petugas: string | null;
       siswa_id: number; nama: string; nis: string; nama_wali: string; hubungan: string; no_wa: string; kelas: string | null; token_wali: string };
  detail: { jenis: string; periode: string | null; keterangan: string; jumlah: number; sisa: number }[];
};

export async function ambilKuitansi(id: number, siswaId?: number): Promise<DataKuitansi | null> {
  const p = await row<DataKuitansi["p"]>(
    `SELECT p.id, p.no_kuitansi, p.tanggal, p.total, p.metode, p.catatan, p.batal, g.nama petugas,
            s.id siswa_id, s.nama, s.nis, s.nama_wali, s.hubungan, s.no_wa, k.nama kelas, s.token_wali
     FROM pembayaran p JOIN siswa s ON s.id = p.siswa_id LEFT JOIN kelas k ON k.id = s.kelas_id LEFT JOIN pengguna g ON g.id = p.dicatat_oleh
     WHERE p.id = ? ${siswaId ? "AND p.siswa_id = ?" : ""}`, siswaId ? [id, siswaId] : [id]);
  if (!p) return null;
  const detail = await rows<DataKuitansi["detail"][number]>(
    `SELECT t.jenis, t.periode, t.keterangan, d.jumlah, (t.nominal - t.potongan - t.terbayar) sisa
     FROM pembayaran_detail d JOIN tagihan t ON t.id = d.tagihan_id WHERE d.pembayaran_id = ? ORDER BY t.jatuh_tempo`, [id]);
  return { p, detail };
}
