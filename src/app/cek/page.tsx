import Link from "next/link";
import { getSetting } from "@/lib/setting";
import Pelangi from "@/components/pelangi";
import FormCek from "./form";

export const metadata = { title: "Cek tagihan" };

export default async function Cek() {
  const s = await getSetting();
  return (
    <main className="pub">
      <div className="pub-kartu">
        <div className="pelangi-wrap"><Pelangi w={150} /></div>
        <div className="kartu" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 26 }}>Cek tagihan & tabungan</h1>
          <p className="muted" style={{ margin: "4px 0 20px" }}>Untuk orang tua / wali murid {s.nama_sekolah}.</p>
          <FormCek />
        </div>
        <p className="tengah kecil muted mt"><Link href="/login">Masuk sebagai petugas sekolah</Link></p>
      </div>
    </main>
  );
}
