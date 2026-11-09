// Membuat database + data contoh dari database/spp_tk.sql.  Jalankan: npm run setup
// PERINGATAN: database lama dengan nama yang sama akan dihapus.
import fs from "node:fs";
import mysql from "mysql2/promise";
import { muatEnv } from "./env.mjs";

muatEnv();
const nama = process.env.DB_NAME || "spp_tk";
let sql = fs.readFileSync(new URL("../database/spp_tk.sql", import.meta.url), "utf8");
if (nama !== "spp_tk") sql = sql.replaceAll("`spp_tk`", "`" + nama.replace(/`/g, "") + "`");

const c = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", multipleStatements: true,
}).catch((e) => {
  console.error("\nGagal terhubung ke MySQL:", e.message);
  console.error("Pastikan MySQL (XAMPP/Laragon) sudah jalan dan isi .env.local sudah benar.\n");
  process.exit(1);
});
await c.query(sql);
const [[r]] = await c.query(`SELECT (SELECT COUNT(*) FROM \`${nama}\`.siswa) siswa, (SELECT COUNT(*) FROM \`${nama}\`.tagihan) tagihan`);
await c.end();
console.log(`\nDatabase "${nama}" siap: ${r.siswa} siswa, ${r.tagihan} tagihan contoh.`);
console.log("Jalankan: npm run dev  lalu buka http://localhost:3000  (login admin / admin123)\n");
