// Kirim pengingat otomatis hari ini (butuh aplikasi sedang berjalan + token Fonnte + pengingat otomatis aktif).
// Jadwalkan sekali sehari lewat Task Scheduler (Windows) atau cron (Linux), mis. pukul 08.00:  npm run pengingat
import mysql from "mysql2/promise";
import { muatEnv } from "./env.mjs";

muatEnv();
const c = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "spp_tk",
});
const [[s]] = await c.query("SELECT cron_key FROM pengaturan WHERE id = 1");
await c.end();
const url = `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/api/cron/pengingat?key=${s.cron_key}`;
const r = await fetch(url).catch((e) => ({ ok: false, json: async () => ({ pesan: "Aplikasi tidak bisa dihubungi: " + e.message }) }));
console.log(JSON.stringify(await r.json(), null, 2));
