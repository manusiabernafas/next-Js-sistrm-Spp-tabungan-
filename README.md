# Aplikasi SPP & Tabungan TK (Next.js + MySQL)

Aplikasi pencatatan, pengingat, dan penagihan SPP untuk TK, PAUD, KB, dan RA, lengkap dengan buku tabungan siswa. Dibangun dengan Next.js 16 (App Router + Server Actions) dan database MySQL, jadi cukup dijalankan dengan Node.js dan MySQL bawaan XAMPP atau Laragon.

Bendahara bisa menerbitkan SPP bulanan untuk semua siswa sekali klik, menerima pembayaran yang boleh dicicil, mencetak kuitansi, lalu mengingatkan wali murid yang menunggak lewat WhatsApp dengan pesan yang sudah terisi rincian tagihannya. Guru kelas mencatat setoran hari menabung satu kelas sekaligus, dan orang tua bisa melihat tagihan, kuitansi, serta saldo tabungan ananda dari HP lewat portal wali murid. Tampilannya bergaya mainan kayu Montessori: warna tanah yang hangat, busur pelangi, dan kartu membulat yang ramah.

## Cara kerja

Setiap kelas punya tarif SPP sendiri, dan setiap siswa bisa diberi potongan tetap (misalnya anak yatim atau saudara kandung). Saat bendahara menerbitkan SPP satu bulan, sistem membuat tagihan untuk semua siswa aktif dengan tarif kelas dikurangi potongan, jatuh tempo pada tanggal yang diatur di Pengaturan. Penerbitan aman diklik ulang karena satu siswa tidak bisa punya dua tagihan SPP di bulan yang sama (dijaga constraint UNIQUE di database). Tagihan lain seperti uang kegiatan, seragam, atau buku bisa diterbitkan untuk semua kelas atau kelas tertentu saja.

Di halaman siswa, bendahara mencentang tagihan yang dibayar lalu mengisi jumlahnya. Pembayaran boleh dicicil dan otomatis dialokasikan ke tagihan dengan jatuh tempo paling lama. Metode bayar bisa tunai, transfer, atau potong saldo tabungan. Baris siswa dikunci dengan SELECT ... FOR UPDATE selama transaksi, sehingga klik ganda atau dua petugas yang membayar bersamaan tidak membuat pembayaran dobel. Nomor kuitansi dibuat otomatis, kuitansi siap cetak memuat terbilang, dan pembatalan kuitansi mengembalikan sisa tagihan serta saldo tabungan bila dibayar dari tabungan.

Halaman Pengingat menampilkan siswa yang menunggak beserta lamanya. Dengan satu klik, WhatsApp terbuka dengan pesan dari template (nama wali, rincian tagihan, total, nomor rekening, dan tautan portal wali), dan setiap pengingat tercatat di riwayat. Bila sekolah memakai Fonnte, pengingat bisa dikirim massal atau otomatis setiap hari, misalnya 3 hari sebelum jatuh tempo, tepat di hari jatuh tempo, dan seminggu sesudahnya.

Buku tabungan mencatat setiap setoran dan penarikan dengan saldo berjalan. Guru kelas mengisi setoran hari menabung untuk satu kelas dalam satu layar, penarikan hanya bisa dilakukan bendahara dan tidak bisa melebihi saldo, lalu buku tabungan bisa dicetak. Laporan menampilkan penerimaan per bulan dan metode, per jenis tagihan, kolektibilitas per kelas, serta mutasi tabungan, semuanya bisa diekspor ke CSV yang langsung rapi dibuka di Excel.

## Fitur

- Login 3 peran: Admin/Kepala Sekolah, Bendahara, dan Guru Kelas dengan menu berbeda
- Beranda: penerimaan bulan ini, tunggakan lewat jatuh tempo, persentase SPP lunas, saldo tabungan, grafik 6 bulan
- Data siswa lengkap dengan orang tua/wali, nomor WhatsApp, kelas, dan potongan SPP (yatim, saudara kandung, dll.)
- Kelas dengan tarif SPP masing-masing, plus kenaikan kelas & kelulusan massal di awal tahun ajaran
- Terbitkan SPP bulanan untuk semua siswa sekali klik, tidak bisa dobel untuk bulan yang sama
- Tagihan lain (uang kegiatan, seragam, buku, outing) untuk semua kelas atau kelas tertentu
- Rekap pelunasan per tagihan dan daftar siswa yang belum bayar
- Pembayaran bisa dicicil, otomatis dialokasikan ke tagihan terlama
- Metode bayar tunai, transfer, atau potong saldo tabungan siswa
- Aman dari pembayaran ganda: transaksi database dengan penguncian baris (FOR UPDATE)
- Kuitansi otomatis siap cetak dengan nomor urut, terbilang, dan tanda tangan bendahara
- Pembatalan kuitansi mengembalikan sisa tagihan dan saldo tabungan
- Pengingat WhatsApp sekali klik dengan pesan dari template (rincian tagihan, total, rekening, tautan portal)
- Riwayat pengingat: siapa yang sudah diingatkan, kapan, dan lewat apa
- Opsional Fonnte: kirim pengingat massal, atau otomatis H-3, hari H, dan H+7 lewat cron / Task Scheduler
- Buku tabungan siswa dengan saldo berjalan, siap cetak
- Setoran hari menabung satu kelas dalam satu layar (tombol cepat 2rb, 5rb, 10rb)
- Penarikan tabungan hanya oleh bendahara dan tidak bisa melebihi saldo
- Portal wali murid: orang tua melihat tagihan, kuitansi, dan saldo tabungan ananda dari HP
- Halaman cek tagihan untuk orang tua cukup dengan NIS dan tanggal lahir anak
- Laporan penerimaan per bulan & metode, per jenis tagihan, kolektibilitas per kelas, dan mutasi tabungan
- Ekspor CSV pembayaran, tunggakan, saldo tabungan, dan mutasi (rapi di Excel, aman dari injeksi rumus)
- Pengaturan identitas sekolah, tanggal jatuh tempo, rekening, dan template pesan WhatsApp
- Keamanan: password bcrypt, sesi httpOnly yang bisa dicabut, batas percobaan login, query berparameter
- Data contoh 62 siswa (KB, TK A, TK B), 470+ tagihan, 400+ kuitansi, 900+ transaksi tabungan; tanggal menyesuaikan hari import
- Tampilan mainan kayu Montessori (warna tanah, busur pelangi), responsif di HP, ikon garis tanpa paket tambahan
- Next.js 16 + MySQL, tanpa ORM dan tanpa layanan berbayar, cukup Node.js + XAMPP/Laragon

## Instalasi

**Kebutuhan:** Node.js 20.9 atau lebih baru dan MySQL/MariaDB (paling mudah pakai XAMPP atau Laragon).

1. Ekstrak file ZIP, lalu buka terminal (Command Prompt / PowerShell) di dalam folder `spp-tk`.

2. Install paket: 
   ```bash
   npm install
   ```

3. Salin `.env.example` menjadi `.env.local`. Isi bawaannya sudah cocok untuk XAMPP (user `root` tanpa password):
   ```
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=spp_tk
   APP_URL=http://localhost:3000
   DB_TIMEZONE=+07:00
   ```

4. Jalankan MySQL di XAMPP/Laragon, lalu buat database beserta data contohnya:
   ```bash
   npm run setup
   ```
   Atau import `database/spp_tk.sql` lewat phpMyAdmin (tab **Import**). Tanggal data contoh menyesuaikan hari saat import.

5. Jalankan aplikasi:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` dan masuk dengan akun demo:
   - Admin / Kepala Sekolah: `admin` / `admin123`
   - Bendahara: `bendahara` / `tk12345`
   - Guru kelas: `guru` / `tk12345`

6. Ubah nama sekolah, tanggal jatuh tempo, rekening, dan template pesan di menu **Pengaturan**, atur tarif di **Kelas & tarif**, lalu ganti kata sandi akun demo.

**Untuk dipakai sehari-hari:** jalankan `npm run build` sekali, lalu `npm start` (lebih cepat dari mode dev). Agar portal wali bisa dibuka dari HP orang tua, isi `APP_URL` dengan alamat yang bisa diakses dari luar (misalnya hosting atau domain sekolah).

**Pengingat otomatis (opsional):** daftar di fonnte.com, isi token di Pengaturan, centang Aktifkan pengingat otomatis, lalu jadwalkan `npm run pengingat` sekali sehari lewat Task Scheduler (Windows) atau cron (Linux).

## Struktur folder

```
spp-tk/
├── database/spp_tk.sql        # skema + data contoh (import lewat phpMyAdmin atau npm run setup)
├── scripts/                   # setup.mjs (buat database), pengingat.mjs (pengingat harian)
├── src/lib/                   # db.ts (koneksi MySQL), auth.ts (sesi & peran), keuangan.ts (bayar, tabungan, terbit tagihan), pengingat.ts
├── src/app/(panel)/           # halaman petugas: siswa, tagihan, pembayaran, pengingat, tabungan, laporan, pengaturan
├── src/app/wali/              # portal wali murid (tanpa login, lewat tautan pribadi)
├── src/app/cek/               # cek tagihan dengan NIS + tanggal lahir
└── src/app/api/cron/pengingat # endpoint pengingat otomatis (Fonnte)
```
