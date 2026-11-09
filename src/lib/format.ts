export const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function rupiah(n: number | string | null | undefined): string {
  const v = Math.round(Number(n || 0));
  return (v < 0 ? "-Rp" : "Rp") + Math.abs(v).toLocaleString("id-ID");
}

/** "2026-11-03" atau "2026-11-03 07:30:00" -> "3 Nov 2026" / "3 November 2026" */
export function tgl(s: string | null | undefined, panjang = false): string {
  if (!s) return "-";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  const b = BULAN[m - 1];
  return `${d} ${panjang ? b : b.slice(0, 3)} ${y}`;
}

export function hari(s: string): string {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return HARI[new Date(y, m - 1, d).getDay()];
}

export function jam(s: string | null | undefined): string {
  return s && s.length > 11 ? s.slice(11, 16) : "";
}

export function periode(p: string | null | undefined, pendek = false): string {
  if (!p) return "";
  const [y, m] = p.split("-").map(Number);
  const b = BULAN[m - 1];
  return `${pendek ? b.slice(0, 3) : b} ${y}`;
}

/** Nama tagihan untuk ditampilkan: "SPP Oktober 2026" atau jenis + keterangan */
export function namaTagihan(t: { jenis: string; periode: string | null }): string {
  return t.periode ? `${t.jenis} ${periode(t.periode)}` : t.jenis;
}

/** Tanggal hari ini menurut zona waktu sekolah (DB_TIMEZONE, default WIB) dalam format YYYY-MM-DD */
export function hariIni(): string {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec((typeof process !== "undefined" && process.env.DB_TIMEZONE) || "+07:00");
  const menit = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 420;
  return new Date(Date.now() + menit * 60_000).toISOString().slice(0, 10);
}

export function bulanIni(): string {
  return hariIni().slice(0, 7);
}

export function tambahBulan(p: string, n: number): string {
  const [y, m] = p.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/** Tahun ajaran berjalan, mis. "2026/2027" (dimulai Juli) */
export function tahunAjaran(d = hariIni()): string {
  const [y, m] = d.split("-").map(Number);
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export function umur(lahir: string): string {
  const [y, m, d] = lahir.split("-").map(Number);
  const [ty, tm, td] = hariIni().split("-").map(Number);
  let th = ty - y, bl = tm - m;
  if (td < d) bl--;
  if (bl < 0) { th--; bl += 12; }
  return `${th} th ${bl} bln`;
}

export function hp62(no: string): string {
  const d = (no || "").replace(/\D/g, "");
  return d.startsWith("0") ? "62" + d.slice(1) : d;
}

export function waLink(no: string, pesan = ""): string {
  const n = hp62(no);
  return n ? `https://wa.me/${n}${pesan ? "?text=" + encodeURIComponent(pesan) : ""}` : "";
}

/** Bilangan terbilang untuk kuitansi */
export function terbilang(n: number): string {
  const s = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  const f = (x: number): string => {
    if (x < 12) return s[x];
    if (x < 20) return f(x - 10) + " belas";
    if (x < 100) return f(Math.floor(x / 10)) + " puluh " + f(x % 10);
    if (x < 200) return "seratus " + f(x - 100);
    if (x < 1000) return f(Math.floor(x / 100)) + " ratus " + f(x % 100);
    if (x < 2000) return "seribu " + f(x - 1000);
    if (x < 1e6) return f(Math.floor(x / 1000)) + " ribu " + f(x % 1000);
    if (x < 1e9) return f(Math.floor(x / 1e6)) + " juta " + f(x % 1e6);
    return f(Math.floor(x / 1e9)) + " miliar " + f(x % 1e9);
  };
  const h = f(Math.round(n)).replace(/\s+/g, " ").trim();
  return h ? h.charAt(0).toUpperCase() + h.slice(1) + " rupiah" : "Nol rupiah";
}

/** Ambil angka dari input rupiah ("Rp 25.000" -> 25000) */
export function angka(v: FormDataEntryValue | null): number {
  return Number(String(v ?? "").replace(/\D/g, "")) || 0;
}

export function teks(v: FormDataEntryValue | null, maks = 200): string {
  return String(v ?? "").trim().slice(0, maks);
}
