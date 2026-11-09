import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { rows } from "@/lib/db";
import { tgl, hariIni, hari } from "@/lib/format";
import Kepala from "@/components/kepala";
import Pesan from "@/components/pesan";
import Ikon from "@/components/ikon";
import FormKolektif from "./form";

export const metadata = { title: "Setoran hari menabung" };

export default async function Kolektif({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireUser();
  const kelas = await rows<{ id: number; nama: string }>("SELECT id, nama FROM kelas ORDER BY urutan");
  const fk = Number(sp.kelas || 0) || kelas[0]?.id || 0;
  // "biasanya" = setoran yang paling sering dari siswa tsb, membantu guru mengisi cepat
  const siswa = await rows<{ id: number; nama: string; saldo: number; biasa: number }>(
    `SELECT s.id, s.nama, s.saldo_tabungan saldo,
            COALESCE((SELECT t.jumlah FROM tabungan t WHERE t.siswa_id = s.id AND t.jenis = 'setor'
                      GROUP BY t.jumlah ORDER BY COUNT(*) DESC, t.jumlah DESC LIMIT 1), 0) biasa
     FROM siswa s WHERE s.kelas_id = ? AND s.status = 'aktif' ORDER BY s.nama`, [fk]);
  const h = hariIni();
  return (
    <>
      <Kepala judul="Setoran hari menabung" sub={`${hari(h)}, ${tgl(h, true)} · isi nominal tiap anak lalu simpan sekaligus`}>
        <Link className="btn terang" href={`/tabungan?kelas=${fk}`}><Ikon n="kiri" /> Tabungan</Link>
      </Kepala>
      <Pesan sp={sp} />
      <div className="tab-nav">{kelas.map((k) => <Link key={k.id} href={`/tabungan/kolektif?kelas=${k.id}`} className={fk === k.id ? "aktif" : ""}>{k.nama}</Link>)}</div>
      <div className="kartu rata">
        {siswa.length ? <FormKolektif key={fk} kelas={fk} siswa={siswa} /> : <div className="kosong">Belum ada siswa aktif di kelas ini.</div>}
      </div>
    </>
  );
}
