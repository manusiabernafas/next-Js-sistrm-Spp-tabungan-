import Link from "next/link";
import Pelangi from "@/components/pelangi";

export default function TidakAda() {
  return (
    <main className="pub">
      <div className="pub-kartu tengah">
        <div className="pelangi-wrap"><Pelangi w={140} /></div>
        <h1 style={{ fontSize: 30, marginTop: 14 }}>Halaman tidak ditemukan</h1>
        <p className="muted">Tautan mungkin salah atau sudah diganti oleh sekolah.</p>
        <Link className="btn" href="/">Ke halaman utama</Link>
      </div>
    </main>
  );
}
