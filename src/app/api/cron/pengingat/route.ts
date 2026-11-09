import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { rows } from "@/lib/db";
import { getSetting } from "@/lib/setting";
import { hariIni } from "@/lib/format";
import { pesanPengingat, kirimFonnte, catatPengingat } from "@/lib/pengingat";

export const dynamic = "force-dynamic";

/**
 * Dipanggil sekali sehari oleh penjadwal: GET /api/cron/pengingat?key=<cron_key>
 * Mengirim pengingat via Fonnte untuk tagihan yang jatuh temponya cocok dengan "hari pengingat" (mis. -3,0,7).
 */
export async function GET(req: Request) {
  const st = await getSetting();
  const key = new URL(req.url).searchParams.get("key") || "";
  const a = Buffer.from(key), b = Buffer.from(st.cron_key);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ ok: false, pesan: "Kunci salah" }, { status: 403 });
  if (!st.pengingat_otomatis) return NextResponse.json({ ok: true, pesan: "Pengingat otomatis nonaktif", terkirim: 0 });
  if (!st.fonnte_token) return NextResponse.json({ ok: false, pesan: "Token Fonnte belum diisi" });

  const hari = st.hari_pengingat.split(",").map((x) => Number(x.trim())).filter((x) => Number.isInteger(x) && x >= -30 && x <= 90);
  if (!hari.length) return NextResponse.json({ ok: true, pesan: "Hari pengingat kosong", terkirim: 0 });
  const h = hariIni();
  const target = await rows<{ siswa_id: number }>(
    `SELECT DISTINCT t.siswa_id FROM tagihan t JOIN siswa s ON s.id = t.siswa_id
     WHERE s.status = 'aktif' AND s.no_wa <> '' AND t.status IN ('belum','sebagian')
       AND DATEDIFF(?, t.jatuh_tempo) IN (${hari.map(() => "?").join(",")})
       AND NOT EXISTS (SELECT 1 FROM pengingat_log l WHERE l.siswa_id = s.id AND l.kanal = 'otomatis' AND DATE(l.tanggal) = ?)`,
    [h, ...hari, h]);
  let terkirim = 0, gagal = 0;
  for (const t of target) {
    const m = await pesanPengingat(t.siswa_id, false);
    if (!m) continue;
    const r = await kirimFonnte(st.fonnte_token, m.no_wa, m.pesan);
    await catatPengingat(t.siswa_id, "otomatis", r.ok ? "terkirim" : r.info, m.total, m.pesan, null);
    r.ok ? terkirim++ : gagal++;
    await new Promise((res) => setTimeout(res, 1500));
  }
  return NextResponse.json({ ok: true, tanggal: h, target: target.length, terkirim, gagal });
}
