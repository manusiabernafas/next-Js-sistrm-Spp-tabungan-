"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Ikon from "./ikon";
import Pelangi from "./pelangi";

type Menu = { judul: string; item: { href: string; label: string; ikon: string; n?: number }[] }[];

export default function Samping({ menu, sekolah, nama, peran, aksiKeluar }: {
  menu: Menu; sekolah: string; nama: string; peran: string; aksiKeluar: () => Promise<void>;
}) {
  const path = usePathname();
  const [buka, setBuka] = useState(false);
  useEffect(() => setBuka(false), [path]);
  const aktif = (h: string) => path === h || path.startsWith(h + "/");
  return (
    <>
      <div className="atas-hp no-print">
        <Link href="/dashboard" className="merek" style={{ padding: 0 }}><Pelangi w={40} lapis={3} /><b>{sekolah}</b></Link>
        <button className="btn terang kecil" onClick={() => setBuka(true)} aria-label="Buka menu"><Ikon n="menu" /></button>
      </div>
      <aside className={`samping no-print ${buka ? "buka" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setBuka(false); }}>
        <Link href="/dashboard" className="merek">
          <Pelangi w={46} lapis={3} />
          <span><b>{sekolah}</b><small>SPP & Tabungan</small></span>
        </Link>
        {menu.map((g) => (
          <nav className="nav" key={g.judul}>
            <div className="nav-judul">{g.judul}</div>
            {g.item.map((m) => (
              <Link key={m.href} href={m.href} className={aktif(m.href) ? "aktif" : ""}>
                <Ikon n={m.ikon} s={19} /> {m.label}{m.n ? <span className="n">{m.n}</span> : null}
              </Link>
            ))}
          </nav>
        ))}
        <div className="akun">
          <div className="akun-kartu">
            <span className="bulat" style={{ background: "var(--sage)" }}>{nama.charAt(0)}</span>
            <span style={{ minWidth: 0, flex: 1 }}><b style={{ display: "block", fontSize: 14 }}>{nama}</b><small className="muted">{peran}</small></span>
            <form action={aksiKeluar}><button className="btn terang kecil" title="Keluar" aria-label="Keluar"><Ikon n="keluar" s={16} /></button></form>
          </div>
        </div>
      </aside>
    </>
  );
}
