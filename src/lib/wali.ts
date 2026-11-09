import "server-only";
import { row } from "./db";

export type SiswaWali = { id: number; nama: string; panggilan: string; nis: string; kelas: string | null; nama_wali: string; saldo_tabungan: number; status: string; token_wali: string };

/** Cari siswa dari token portal wali (24 karakter heksadesimal). */
export async function siswaDariToken(token: string): Promise<SiswaWali | null> {
  if (!/^[a-f0-9]{24}$/.test(token)) return null;
  return row<SiswaWali>(
    `SELECT s.id, s.nama, s.panggilan, s.nis, k.nama kelas, s.nama_wali, s.saldo_tabungan, s.status, s.token_wali
     FROM siswa s LEFT JOIN kelas k ON k.id = s.kelas_id WHERE s.token_wali = ?`, [token]);
}
