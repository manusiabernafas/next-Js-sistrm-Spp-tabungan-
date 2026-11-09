import Ikon from "./ikon";

/** Menampilkan ?ok= / ?err= dari URL setelah aksi formulir. */
export default function Pesan({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const ok = typeof sp.ok === "string" ? sp.ok : "";
  const err = typeof sp.err === "string" ? sp.err : "";
  if (!ok && !err) return null;
  return (
    <div className={`pesan ${err ? "err" : "ok"}`} role="status">
      <Ikon n={err ? "awas" : "centang"} /> <span>{err || ok}</span>
    </div>
  );
}
