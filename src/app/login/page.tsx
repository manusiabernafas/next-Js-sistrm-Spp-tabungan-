import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getSetting } from "@/lib/setting";
import Pelangi from "@/components/pelangi";
import FormMasuk from "./form";

export const metadata = { title: "Masuk" };

export default async function Login() {
  if (await getUser()) redirect("/dashboard");
  const s = await getSetting();
  return (
    <main className="pub">
      <div className="pub-kartu">
        <div className="pelangi-wrap"><Pelangi w={150} /></div>
        <div className="kartu" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 28 }}>{s.nama_sekolah}</h1>
          <p className="muted" style={{ margin: "4px 0 20px" }}>Masuk untuk mengelola SPP & tabungan siswa.</p>
          <FormMasuk />
        </div>
        <p className="tengah kecil muted mt">Orang tua / wali murid? <Link href="/cek">Cek tagihan & tabungan ananda</Link></p>
      </div>
    </main>
  );
}
