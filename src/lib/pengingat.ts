import "server-only";
import { rows, exec } from "./db";
import { getSetting, appUrl } from "./setting";
import { rupiah, namaTagihan, tgl, hp62, hariIni } from "./format";

export type Tunggakan = {
  siswa_id: number; nama: string; panggilan: string; nama_wali: string; no_wa: string; kelas: string | null;
  token_wali: string; total: number; jumlah: number; tertua: string; terakhir_diingatkan: string | null;
};

/**
 * Rekap siswa yang punya tagihan belum lunas.
 * hanyaJatuhTempo = true: hanya tagihan yang jatuh temponya sudah lewat / hari ini.
 */
export async function daftarTunggakan(opsi: { kelas?: number; hanyaJatuhTempo?: boolean; siswa?: number } = {}) {
  const w = ["s.status = 'aktif'", "t.status IN ('belum','sebagian')"];
  const p: (string | number)[] = [];
  if (opsi.hanyaJatuhTempo) { w.push("t.jatuh_tempo <= ?"); p.push(hariIni()); }
  if (opsi.kelas) { w.push("s.kelas_id = ?"); p.push(opsi.kelas); }
  if (opsi.siswa) { w.push("s.id = ?"); p.push(opsi.siswa); }
  return rows<Tunggakan>(
    `SELECT s.id siswa_id, s.nama, s.panggilan, s.nama_wali, s.no_wa, k.nama kelas, s.token_wali,
            SUM(t.nominal - t.potongan - t.terbayar) total, COUNT(*) jumlah, MIN(t.jatuh_tempo) tertua,
            (SELECT MAX(l.tanggal) FROM pengingat_log l WHERE l.siswa_id = s.id) terakhir_diingatkan
     FROM tagihan t JOIN siswa s ON s.id = t.siswa_id LEFT JOIN kelas k ON k.id = s.kelas_id
     WHERE ${w.join(" AND ")}
     GROUP BY s.id ORDER BY tertua, total DESC`, p);
}

/** Susun pesan pengingat dari template di Pengaturan. */
export async function pesanPengingat(siswaId: number, hanyaJatuhTempo = false): Promise<{ pesan: string; total: number; no_wa: string } | null> {
  const st = await getSetting();
  const t = await rows<{ jenis: string; periode: string | null; sisa: number; jatuh_tempo: string; nama: string; panggilan: string;
    nama_wali: string; no_wa: string; kelas: string | null; token_wali: string }>(
    `SELECT t.jenis, t.periode, (t.nominal - t.potongan - t.terbayar) sisa, t.jatuh_tempo,
            s.nama, s.panggilan, s.nama_wali, s.no_wa, k.nama kelas, s.token_wali
     FROM tagihan t JOIN siswa s ON s.id = t.siswa_id LEFT JOIN kelas k ON k.id = s.kelas_id
     WHERE t.siswa_id = ? AND t.status IN ('belum','sebagian') ${hanyaJatuhTempo ? "AND t.jatuh_tempo <= ?" : ""}
     ORDER BY t.jatuh_tempo`, hanyaJatuhTempo ? [siswaId, hariIni()] : [siswaId]);
  if (!t.length) return null;
  const s = t[0];
  const total = t.reduce((a, b) => a + Number(b.sisa), 0);
  const rincian = t.map((x) => `- ${namaTagihan(x)}: ${rupiah(x.sisa)} (jatuh tempo ${tgl(x.jatuh_tempo)})`).join("\n");
  const isi: Record<string, string> = {
    wali: s.nama_wali, nama: s.nama, panggilan: s.panggilan || s.nama, kelas: s.kelas || "-", rincian,
    total: rupiah(total), sekolah: st.nama_sekolah, rekening: st.rekening || "rekening sekolah",
    link: `${appUrl()}/wali/${s.token_wali}`,
  };
  const pesan = st.template_pengingat.replace(/\{(\w+)\}/g, (m, k) => (k in isi ? isi[k] : m));
  return { pesan, total, no_wa: s.no_wa };
}

/** Kirim pesan lewat API Fonnte (opsional, isi token di Pengaturan). */
export async function kirimFonnte(token: string, no: string, pesan: string): Promise<{ ok: boolean; info: string }> {
  try {
    const r = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token },
      body: new URLSearchParams({ target: hp62(no), message: pesan, countryCode: "62" }),
      signal: AbortSignal.timeout(15000),
    });
    const j = (await r.json().catch(() => ({}))) as { status?: boolean; reason?: string; detail?: string };
    return j.status ? { ok: true, info: "terkirim" } : { ok: false, info: String(j.reason || j.detail || `HTTP ${r.status}`).slice(0, 20) };
  } catch (e) {
    return { ok: false, info: "gagal koneksi" };
  }
}

export async function catatPengingat(siswaId: number, kanal: "whatsapp" | "fonnte" | "otomatis", status: string, total: number, pesan: string, oleh: number | null) {
  await exec("INSERT INTO pengingat_log (siswa_id, tanggal, kanal, status, total, pesan, oleh) VALUES (?, NOW(), ?, ?, ?, ?, ?)",
    [siswaId, kanal, status, total, pesan, oleh]);
}
