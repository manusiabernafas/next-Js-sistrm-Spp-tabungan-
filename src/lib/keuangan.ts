import "server-only";
import type { PoolConnection } from "mysql2/promise";
import { tx, rows, row, exec } from "./db";
import { getSetting } from "./setting";

/** Kesalahan yang pesannya aman ditampilkan ke pengguna. */
export class Gagal extends Error {}

type Siswa = { id: number; nama: string; saldo_tabungan: number; status: string };

async function kunciSiswa(c: PoolConnection, siswaId: number): Promise<Siswa> {
  // FOR UPDATE: transaksi lain untuk siswa yang sama menunggu sampai transaksi ini selesai,
  // sehingga saldo tabungan & sisa tagihan tidak bisa dipakai dua kali bersamaan.
  const s = await row<Siswa>("SELECT id, nama, saldo_tabungan, status FROM siswa WHERE id = ? FOR UPDATE", [siswaId], c);
  if (!s) throw new Gagal("Siswa tidak ditemukan.");
  return s;
}

async function catatTabungan(c: PoolConnection, s: Siswa, jenis: "setor" | "tarik", jumlah: number, ket: string, oleh: number | null, pembayaranId: number | null = null) {
  const saldo = s.saldo_tabungan + (jenis === "setor" ? jumlah : -jumlah);
  if (saldo < 0) throw new Gagal(`Saldo tabungan ${s.nama} tidak cukup.`);
  await exec("UPDATE siswa SET saldo_tabungan = ? WHERE id = ?", [saldo, s.id], c);
  await exec(`INSERT INTO tabungan (siswa_id, tanggal, jenis, jumlah, saldo_setelah, keterangan, pembayaran_id, dicatat_oleh)
              VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)`, [s.id, jenis, jumlah, saldo, ket, pembayaranId, oleh], c);
  s.saldo_tabungan = saldo;
}

export type Metode = "tunai" | "transfer" | "tabungan";

/**
 * Catat pembayaran untuk tagihan terpilih. Jumlah dialokasikan ke tagihan dengan jatuh tempo paling lama dulu,
 * jadi wali murid boleh mencicil. Mengembalikan id pembayaran (untuk kuitansi).
 */
export async function bayar(siswaId: number, tagihanIds: number[], jumlah: number, metode: Metode, catatan: string, oleh: number): Promise<number> {
  if (!tagihanIds.length) throw new Gagal("Pilih minimal satu tagihan.");
  if (!Number.isInteger(jumlah) || jumlah <= 0) throw new Gagal("Jumlah bayar harus lebih dari nol.");
  return tx(async (c) => {
    const s = await kunciSiswa(c, siswaId);
    const tg = await rows<{ id: number; sisa: number; terbayar: number; total: number }>(
      `SELECT id, (nominal - potongan) total, terbayar, (nominal - potongan - terbayar) sisa FROM tagihan
       WHERE siswa_id = ? AND id IN (${tagihanIds.map(() => "?").join(",")}) AND status IN ('belum','sebagian')
       ORDER BY jatuh_tempo, id FOR UPDATE`, [siswaId, ...tagihanIds], c);
    if (!tg.length) throw new Gagal("Tagihan yang dipilih sudah lunas atau tidak ditemukan.");
    const sisaTotal = tg.reduce((a, t) => a + Number(t.sisa), 0);
    if (jumlah > sisaTotal) throw new Gagal(`Jumlah bayar melebihi sisa tagihan terpilih (${sisaTotal.toLocaleString("id-ID")}).`);
    if (metode === "tabungan" && s.saldo_tabungan < jumlah) throw new Gagal("Saldo tabungan tidak cukup untuk membayar tagihan ini.");

    // Nomor kuitansi diambil dari id agar tidak pernah bentrok walau ada dua kasir bersamaan
    const ins = await exec(`INSERT INTO pembayaran (no_kuitansi, siswa_id, tanggal, total, metode, catatan, dicatat_oleh)
                            VALUES (?, ?, NOW(), ?, ?, ?, ?)`, ["TMP-" + Math.random().toString(36).slice(2, 12), siswaId, jumlah, metode, catatan, oleh], c);
    const pid = ins.insertId;
    await exec("UPDATE pembayaran SET no_kuitansi = ? WHERE id = ?", ["KW-" + String(pid).padStart(5, "0"), pid], c);

    let sisaBayar = jumlah;
    for (const t of tg) {
      if (sisaBayar <= 0) break;
      const j = Math.min(sisaBayar, Number(t.sisa));
      sisaBayar -= j;
      await exec("INSERT INTO pembayaran_detail (pembayaran_id, tagihan_id, jumlah) VALUES (?, ?, ?)", [pid, t.id, j], c);
      await exec(`UPDATE tagihan SET terbayar = terbayar + ?,
                  status = IF(terbayar >= nominal - potongan, 'lunas', 'sebagian') WHERE id = ?`, [j, t.id], c);
    }
    if (metode === "tabungan") {
      await catatTabungan(c, s, "tarik", jumlah, `Pembayaran tagihan (KW-${String(pid).padStart(5, "0")})`, oleh, pid);
    }
    return pid;
  });
}

/** Batalkan kuitansi: sisa tagihan dikembalikan, dan bila dibayar dari tabungan saldonya dikembalikan. */
export async function batalBayar(pembayaranId: number, oleh: number, alasan: string) {
  return tx(async (c) => {
    const p = await row<{ id: number; siswa_id: number; total: number; metode: Metode; batal: number; no_kuitansi: string }>(
      "SELECT * FROM pembayaran WHERE id = ?", [pembayaranId], c);
    if (!p) throw new Gagal("Kuitansi tidak ditemukan.");
    const s = await kunciSiswa(c, p.siswa_id);
    const cek = await row<{ batal: number }>("SELECT batal FROM pembayaran WHERE id = ? FOR UPDATE", [pembayaranId], c);
    if (cek!.batal) throw new Gagal("Kuitansi ini sudah dibatalkan.");
    const det = await rows<{ tagihan_id: number; jumlah: number }>("SELECT tagihan_id, jumlah FROM pembayaran_detail WHERE pembayaran_id = ?", [pembayaranId], c);
    for (const d of det) {
      await exec(`UPDATE tagihan SET terbayar = GREATEST(terbayar - ?, 0),
                  status = IF(status = 'batal', 'batal', IF(terbayar = 0, 'belum', 'sebagian')) WHERE id = ?`, [d.jumlah, d.tagihan_id], c);
    }
    await exec("UPDATE pembayaran SET batal = 1, catatan = TRIM(CONCAT(catatan, ' [Dibatalkan: ', ?, ']')) WHERE id = ?", [alasan || "-", pembayaranId], c);
    if (p.metode === "tabungan") {
      await catatTabungan(c, s, "setor", p.total, `Pengembalian pembatalan ${p.no_kuitansi}`, oleh, pembayaranId);
    }
  });
}

/** Setor / tarik tabungan satu siswa. */
export async function transaksiTabungan(siswaId: number, jenis: "setor" | "tarik", jumlah: number, ket: string, oleh: number) {
  if (!Number.isInteger(jumlah) || jumlah <= 0) throw new Gagal("Jumlah harus lebih dari nol.");
  if (jumlah > 50_000_000) throw new Gagal("Jumlah terlalu besar.");
  return tx(async (c) => {
    const s = await kunciSiswa(c, siswaId);
    if (jenis === "setor" && s.status !== "aktif") throw new Gagal("Siswa sudah tidak aktif, tabungan hanya bisa ditarik.");
    if (jenis === "tarik" && jumlah > s.saldo_tabungan) throw new Gagal(`Penarikan melebihi saldo (${s.saldo_tabungan.toLocaleString("id-ID")}).`);
    await catatTabungan(c, s, jenis, jumlah, ket || (jenis === "setor" ? "Setoran" : "Penarikan"), oleh);
    return s.saldo_tabungan;
  });
}

/** Setoran kolektif satu kelas (hari menabung): semua masuk atau tidak sama sekali. */
export async function setorKolektif(data: { siswaId: number; jumlah: number }[], ket: string, oleh: number) {
  const isi = data.filter((d) => d.jumlah > 0);
  if (!isi.length) throw new Gagal("Isi nominal setoran minimal untuk satu siswa.");
  if (isi.some((d) => d.jumlah > 5_000_000)) throw new Gagal("Nominal setoran per siswa maksimal Rp5.000.000.");
  return tx(async (c) => {
    // Kunci berurutan menurut id agar dua setoran kolektif bersamaan tidak saling menunggu (deadlock)
    for (const d of [...isi].sort((a, b) => a.siswaId - b.siswaId)) {
      const s = await kunciSiswa(c, d.siswaId);
      if (s.status !== "aktif") throw new Gagal(`${s.nama} sudah tidak aktif.`);
      await catatTabungan(c, s, "setor", d.jumlah, ket || "Setoran hari menabung", oleh);
    }
    return { jumlah: isi.length, total: isi.reduce((a, d) => a + d.jumlah, 0) };
  });
}

/** Terbitkan tagihan SPP satu bulan untuk semua siswa aktif (yang sudah punya tagihan bulan itu dilewati). */
export async function terbitkanSPP(periode: string, kelasId: number | null) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periode)) throw new Gagal("Periode tidak valid.");
  const st = await getSetting();
  const jt = `${periode}-${String(Math.min(Math.max(st.jatuh_tempo, 1), 28)).padStart(2, "0")}`;
  const r = await exec(
    `INSERT IGNORE INTO tagihan (siswa_id, jenis, periode, keterangan, nominal, potongan, jatuh_tempo, created_at)
     SELECT s.id, 'SPP', ?, '', k.tarif_spp, LEAST(s.potongan, k.tarif_spp), ?, NOW()
     FROM siswa s JOIN kelas k ON k.id = s.kelas_id
     WHERE s.status = 'aktif' AND k.tarif_spp > 0 AND s.tgl_masuk <= LAST_DAY(?) ${kelasId ? "AND s.kelas_id = ?" : ""}`,
    kelasId ? [periode, jt, jt, kelasId] : [periode, jt, jt]);
  // Potongan 100% langsung lunas
  await exec("UPDATE tagihan SET status = 'lunas' WHERE periode = ? AND jenis = 'SPP' AND status = 'belum' AND nominal - potongan <= 0", [periode]);
  return r.affectedRows;
}

/** Tagihan di luar SPP (uang kegiatan, seragam, buku). Siswa yang sudah punya tagihan sama tidak dibuatkan lagi. */
export async function terbitkanTagihanLain(jenis: string, keterangan: string, nominal: number, jatuhTempo: string, kelasId: number | null) {
  if (jenis.length < 3) throw new Gagal("Isi nama tagihan, mis. Uang Kegiatan.");
  if (jenis.toUpperCase() === "SPP") throw new Gagal("Tagihan SPP diterbitkan lewat formulir SPP bulanan.");
  if (nominal < 1000 || nominal > 50_000_000) throw new Gagal("Nominal tagihan tidak wajar.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jatuhTempo)) throw new Gagal("Tanggal jatuh tempo tidak valid.");
  const r = await exec(
    `INSERT INTO tagihan (siswa_id, jenis, periode, keterangan, nominal, potongan, jatuh_tempo, created_at)
     SELECT s.id, ?, NULL, ?, ?, 0, ?, NOW() FROM siswa s
     WHERE s.status = 'aktif' ${kelasId ? "AND s.kelas_id = ?" : ""}
       AND NOT EXISTS (SELECT 1 FROM tagihan t WHERE t.siswa_id = s.id AND t.jenis = ? AND t.keterangan = ? AND t.status <> 'batal')`,
    kelasId ? [jenis, keterangan, nominal, jatuhTempo, kelasId, jenis, keterangan] : [jenis, keterangan, nominal, jatuhTempo, jenis, keterangan]);
  return r.affectedRows;
}
