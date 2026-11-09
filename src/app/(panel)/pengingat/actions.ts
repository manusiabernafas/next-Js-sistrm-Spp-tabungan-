"use server";
import { requireUser } from "@/lib/auth";
import { getSetting } from "@/lib/setting";
import { waLink } from "@/lib/format";
import { pesanPengingat, catatPengingat, kirimFonnte, daftarTunggakan } from "@/lib/pengingat";
import { ke } from "@/lib/aksi";

/** Catat pengingat lalu kembalikan tautan wa.me berisi pesan (dibuka di tab baru oleh tombol). */
export async function siapkanWA(sid: number, jt: boolean): Promise<{ url?: string; err?: string }> {
  const u = await requireUser("admin", "bendahara");
  const m = await pesanPengingat(Number(sid), Boolean(jt));
  if (!m) return { err: "Siswa ini tidak punya tagihan terbuka." };
  if (!m.no_wa) return { err: "Nomor WhatsApp wali belum diisi." };
  await catatPengingat(Number(sid), "whatsapp", "dibuka", m.total, m.pesan, u.id);
  return { url: waLink(m.no_wa, m.pesan) };
}

export async function kirimLewatFonnte(fd: FormData) {
  const u = await requireUser("admin", "bendahara");
  const st = await getSetting();
  if (!st.fonnte_token) ke("/pengingat", { err: "Token Fonnte belum diisi di Pengaturan." });
  const jt = fd.get("jt") === "1";
  const kelas = Number(fd.get("kelas") || 0) || undefined;
  const satu = Number(fd.get("siswa_id") || 0);
  const target = satu ? [{ siswa_id: satu }] : (await daftarTunggakan({ hanyaJatuhTempo: jt, kelas })).slice(0, 150);
  let ok = 0, gagal = 0;
  for (const t of target) {
    const m = await pesanPengingat(t.siswa_id, jt);
    if (!m || !m.no_wa) { gagal++; continue; }
    const r = await kirimFonnte(st.fonnte_token, m.no_wa, m.pesan);
    await catatPengingat(t.siswa_id, "fonnte", r.ok ? "terkirim" : r.info, m.total, m.pesan, u.id);
    r.ok ? ok++ : gagal++;
    await new Promise((res) => setTimeout(res, 400));
  }
  ke(`/pengingat${satu ? `?siswa=${satu}` : ""}`, gagal && !ok ? { err: `Pengingat gagal dikirim (${gagal}). Periksa token & perangkat Fonnte.` } : { ok: `${ok} pengingat terkirim lewat Fonnte${gagal ? `, ${gagal} gagal` : ""}.` });
}
