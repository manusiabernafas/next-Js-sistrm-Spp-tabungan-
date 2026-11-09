import { requireUser, LABEL_ROLE, type Role } from "@/lib/auth";
import { rows } from "@/lib/db";
import Kepala from "@/components/kepala";
import Pesan from "@/components/pesan";
import { simpanPengguna, aturAktif } from "../admin-actions";

export const metadata = { title: "Pengguna" };

export default async function Pengguna({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const me = await requireUser("admin");
  const data = await rows<{ id: number; nama: string; username: string; role: Role; aktif: number }>("SELECT id, nama, username, role, aktif FROM pengguna ORDER BY aktif DESC, role, nama");
  const Form = ({ p }: { p?: (typeof data)[number] }) => (
    <form action={simpanPengguna} className="form-baris" style={{ "--kol": "1.5fr 1fr 1fr 1.2fr auto" } as React.CSSProperties}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <label className="f m0"><span>Nama</span><input name="nama" defaultValue={p?.nama} required /></label>
      <label className="f m0"><span>Username</span><input name="username" defaultValue={p?.username} required autoComplete="off" /></label>
      <label className="f m0"><span>Peran</span><select name="role" defaultValue={p?.role || "guru"}>{(Object.keys(LABEL_ROLE) as Role[]).map((r) => <option key={r} value={r}>{LABEL_ROLE[r]}</option>)}</select></label>
      <label className="f m0"><span>{p ? "Sandi baru (opsional)" : "Kata sandi"}</span><input name="password" type="password" autoComplete="new-password" required={!p} minLength={8} /></label>
      <button className={`btn ${p ? "terang" : ""}`}>{p ? "Simpan" : "Tambah"}</button>
    </form>
  );
  return (
    <>
      <Kepala judul="Pengguna" sub="Admin: semua menu · Bendahara: tagihan, pembayaran, pengingat, tabungan · Guru: data siswa & setoran tabungan" />
      <Pesan sp={sp} />
      <div className="tumpuk">
        {data.map((p) => (
          <div className="kartu" key={p.id} style={p.aktif ? undefined : { opacity: 0.6 }}>
            <div className="kepala-kartu" style={{ marginBottom: 10 }}>
              <h3 className="m0">{p.nama} <span className="kecil muted">· {LABEL_ROLE[p.role]}{p.id === me.id ? " · akun Anda" : ""}</span></h3>
              {p.id !== me.id && (
                <form action={aturAktif}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="aktif" value={p.aktif ? "0" : "1"} />
                  <button className={`tautan kecil ${p.aktif ? "merah" : ""}`}>{p.aktif ? "Nonaktifkan" : "Aktifkan"}</button></form>
              )}
            </div>
            <Form p={p} />
          </div>
        ))}
        <div className="kartu"><h3>Tambah pengguna</h3><Form /></div>
      </div>
    </>
  );
}
