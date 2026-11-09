import type { Metadata } from "next";
import { Baloo_2, Karla } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--f-baloo" });
const karla = Karla({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--f-karla" });

export const metadata: Metadata = {
  title: { default: "SPP & Tabungan TK", template: "%s · SPP & Tabungan TK" },
  description: "Pencatatan, pengingat, dan penagihan SPP serta buku tabungan siswa TK",
};

// Semua halaman membaca database & sesi, jadi selalu dirender saat diminta
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${baloo.variable} ${karla.variable}`}>
      <body>{children}</body>
    </html>
  );
}
