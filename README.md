# myAkuntansi UMKM

myAkuntansi UMKM adalah aplikasi pencatatan keuangan sederhana untuk usaha kecil. Aplikasi ini membantu pengguna mencatat kas masuk/keluar, hutang piutang, stok barang, laporan, ekspor CSV, dan ringkasan berbantuan AI.

## Fitur utama

- Dashboard ringkas untuk total pemasukan, pengeluaran, laba, dan transaksi.
- Pencatatan transaksi kas dengan kategori pemasukan dan pengeluaran.
- Pengelolaan hutang/piutang dan inventori.
- Laporan laba rugi, neraca, buku besar, pajak UMKM, serta ekspor laporan.
- Penyimpanan lokal terenkripsi melalui `SecureStorage`.
- Asisten AI yang dapat memakai konteks transaksi ketika `GEMINI_API_KEY` tersedia.

## Menjalankan secara lokal

**Prasyarat:** Node.js 22 atau versi kompatibel.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Salin konfigurasi environment bila diperlukan dan isi `GEMINI_API_KEY` untuk fitur AI.
3. Jalankan aplikasi development:
   ```bash
   npm run dev
   ```
4. Buka URL lokal yang ditampilkan oleh server.

## Pemeriksaan kualitas

- Type-check:
  ```bash
  npm run lint
  ```
- Unit test:
  ```bash
  npm test
  ```
- Build produksi:
  ```bash
  npm run build
  ```
