import { cache } from "react";
import { row } from "./db";

export type Setting = {
  nama_sekolah: string; alamat: string; telepon: string; whatsapp: string; kepala_sekolah: string; bendahara: string;
  rekening: string; jatuh_tempo: number; template_pengingat: string; fonnte_token: string; pengingat_otomatis: number;
  hari_pengingat: string; cron_key: string;
};

export const getSetting = cache(async () => (await row<Setting>("SELECT * FROM pengaturan WHERE id = 1"))!);

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
