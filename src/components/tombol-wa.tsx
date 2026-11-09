"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { siapkanWA } from "@/app/(panel)/pengingat/actions";
import Ikon from "./ikon";

export default function TombolWA({ siswaId, jt = false, label, kecil, blok }: { siswaId: number; jt?: boolean; label?: string; kecil?: boolean; blok?: boolean }) {
  const router = useRouter();
  const [jalan, setJalan] = useState(false);
  async function klik() {
    // Buka tab lebih dulu (sinkron dengan klik) agar tidak diblokir popup blocker
    const w = window.open("about:blank", "_blank");
    setJalan(true);
    const r = await siapkanWA(siswaId, jt);
    setJalan(false);
    if (r.url && w) { w.opener = null; w.location.href = r.url; }
    else { w?.close(); if (r.err) alertAman(r.err); }
    router.refresh();
  }
  return (
    <button type="button" onClick={klik} disabled={jalan} className={`btn hijau${kecil ? " kecil" : ""}${blok ? " blok" : ""}`} aria-label={label || "Kirim pengingat WhatsApp"}>
      <Ikon n="wa" s={kecil ? 15 : 18} />{label ? ` ${label}` : ""}
    </button>
  );
}

function alertAman(m: string) {
  const el = document.createElement("div");
  el.className = "pesan err";
  el.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:50;max-width:320px";
  el.textContent = m;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
