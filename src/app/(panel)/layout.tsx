import { requireUser, LABEL_ROLE, bolehKeuangan } from "@/lib/auth";
import { getSetting } from "@/lib/setting";
import { val } from "@/lib/db";
import { hariIni } from "@/lib/format";
import { keluar } from "../login/actions";
import Samping from "@/components/samping";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const s = await getSetting();
  const keu = bolehKeuangan(u);
  const nunggak = keu
    ? await val<number>(`SELECT COUNT(DISTINCT t.siswa_id) FROM tagihan t JOIN siswa s ON s.id = t.siswa_id
                         WHERE s.status = 'aktif' AND t.status IN ('belum','sebagian') AND t.jatuh_tempo < ?`, [hariIni()])
    : 0;
  const menu = [
    { judul: "Utama", item: [
      { href: "/dashboard", label: "Beranda", ikon: "rumah" },
      { href: "/siswa", label: "Data siswa", ikon: "anak" },
    ] },
    { judul: "Keuangan", item: [
      ...(keu ? [
        { href: "/tagihan", label: "Tagihan", ikon: "tagihan" },
        { href: "/pembayaran", label: "Pembayaran", ikon: "dompet" },
        { href: "/pengingat", label: "Pengingat", ikon: "lonceng", n: Number(nunggak) },
      ] : []),
      { href: "/tabungan", label: "Tabungan", ikon: "celengan" },
      ...(keu ? [{ href: "/laporan", label: "Laporan", ikon: "grafik" }] : []),
    ] },
    { judul: "Sekolah", item: [
      ...(u.role === "admin" ? [
        { href: "/kelas", label: "Kelas & tarif", ikon: "kelas" },
        { href: "/pengguna", label: "Pengguna", ikon: "pengguna" },
        { href: "/pengaturan", label: "Pengaturan", ikon: "setel" },
      ] : []),
      { href: "/profil", label: "Profil & sandi", ikon: "kunci" },
    ] },
  ];
  return (
    <div className="app">
      <Samping menu={menu} sekolah={s.nama_sekolah} nama={u.nama} peran={LABEL_ROLE[u.role]} aksiKeluar={keluar} />
      <main className="utama">{children}</main>
    </div>
  );
}
