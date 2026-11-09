"use client";
import Ikon from "./ikon";

export default function TombolCetak({ label = "Cetak" }: { label?: string }) {
  return <button type="button" className="btn" onClick={() => window.print()}><Ikon n="cetak" /> {label}</button>;
}
