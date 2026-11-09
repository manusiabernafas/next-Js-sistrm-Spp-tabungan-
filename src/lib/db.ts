import mysql, { type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";

// Satu pool untuk seluruh aplikasi (disimpan di globalThis agar tidak dobel saat hot reload)
const g = globalThis as unknown as { __pool?: Pool };

export function pool(): Pool {
  if (!g.__pool) {
    g.__pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "spp_tk",
      connectionLimit: 8,
      timezone: process.env.DB_TIMEZONE || "+07:00",
      dateStrings: true,
      decimalNumbers: true,
    });
    // NOW(), CURDATE() dll. memakai zona waktu sekolah (default WIB), bukan zona waktu server MySQL
    const tz = process.env.DB_TIMEZONE || "+07:00";
    g.__pool.on("connection", (c) => { c.query("SET time_zone = ?", [tz]); });
  }
  return g.__pool;
}

type Param = string | number | null | boolean;
type Db = Pool | PoolConnection;

export async function rows<T = Record<string, any>>(sql: string, params: Param[] = [], db: Db = pool()): Promise<T[]> {
  const [r] = await db.query<RowDataPacket[]>(sql, params);
  return r as T[];
}

export async function row<T = Record<string, any>>(sql: string, params: Param[] = [], db: Db = pool()): Promise<T | null> {
  return (await rows<T>(sql, params, db))[0] ?? null;
}

export async function val<T = number>(sql: string, params: Param[] = [], db: Db = pool()): Promise<T> {
  const r = await row<Record<string, T>>(sql, params, db);
  return (r ? Object.values(r)[0] : null) as T;
}

export async function exec(sql: string, params: Param[] = [], db: Db = pool()): Promise<ResultSetHeader> {
  const [r] = await db.query<ResultSetHeader>(sql, params);
  return r;
}

/** Jalankan beberapa query dalam satu transaksi; rollback otomatis bila ada error. */
export async function tx<T>(fn: (c: PoolConnection) => Promise<T>): Promise<T> {
  const c = await pool().getConnection();
  try {
    await c.beginTransaction();
    const hasil = await fn(c);
    await c.commit();
    return hasil;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
