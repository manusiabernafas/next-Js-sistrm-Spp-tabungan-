// Busur pelangi bertumpuk ala mainan kayu Montessori (warna flat, tanpa gradasi)
const WARNA = ["#cf6a4c", "#e2a33a", "#6f9367", "#5a83a6", "#94688a"];

export default function Pelangi({ w = 120, lapis = 5, warna = WARNA }: { w?: number; lapis?: number; warna?: string[] }) {
  const h = w / 2;
  const tebal = h / (lapis + 0.6);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      {Array.from({ length: lapis }).map((_, i) => {
        const r = h - i * tebal - tebal / 2;
        return <path key={i} d={`M ${w / 2 - r} ${h} A ${r} ${r} 0 0 1 ${w / 2 + r} ${h}`} fill="none" stroke={warna[i % warna.length]} strokeWidth={tebal - 2} />;
      })}
    </svg>
  );
}

/** Hiasan pojok kartu ringkasan: setengah lingkaran & lingkaran kecil */
export function Hias({ c = "rgba(255,255,255,.22)" }: { c?: string }) {
  return (
    <svg className="hias" width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="62" cy="62" r="34" fill={c} />
      <circle cx="24" cy="70" r="10" fill={c} />
    </svg>
  );
}
