# DompetKu v2

DompetKu v2 adalah aplikasi pencatat keuangan pribadi berbasis offline-first yang menyimpan seluruh data pengguna di SQLite lokal perangkat. Aplikasi ini mendukung pencadangan dan sinkronisasi data dua arah ke cloud menggunakan Supabase saat terhubung ke internet.

## Fitur Utama

- Pencatatan transaksi pemasukan dan pengeluaran.
- Manajemen multi dompet, termasuk pengelolaan dana darurat.
- Perencanaan dan pemantauan anggaran bulanan.
- Pengingat tagihan dengan notifikasi lokal perangkat.
- Laporan keuangan periode dengan opsi ekspor ke format PDF dan CSV.
- Mode tamu (dapat digunakan langsung tanpa perlu login akun).
- Sinkronisasi cloud dua arah (offline-first sync).

## Teknologi

- **Framework**: Expo (~58.0.23) & React Native (0.88.1)
- **Routing**: Expo Router (~58.0.30)
- **Database Lokal**: expo-sqlite (~58.0.15)
- **Backend & Auth**: Supabase (@supabase/supabase-js ^2.101.1)

## Cara Menjalankan

1. Pasang dependensi: `npm install`
2. Jalankan aplikasi: `npx expo start`

## Variabel Lingkungan

Konfigurasikan variabel lingkungan berikut pada file `.env`:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Perintah Berguna

- `npm run typecheck` - Menjalankan pemeriksaan tipe TypeScript (`tsc --noEmit`).
- `npm run lint` - Menjalankan linter kode Expo/ESLint (`expo lint`).

## Struktur Folder

- `src/app/` - Rute dan layar aplikasi berbasis Expo Router.
- `src/components/` - Komponen UI modular dan reusable.
- `src/constants/` - Konstanta aplikasi, rute, warna, dan tema.
- `src/database/` - Skema tabel, repositori SQLite, dan migrasi lokal.
- `src/lib/` - Klien Supabase, utilitas notifikasi, dan logger.
- `src/providers/` - Context provider autentikasi dan database lokal.
- `src/services/` - Logika bisnis, ekspor laporan, dan mesin sinkronisasi.
- `src/utils/` - Helper format mata uang, tanggal, dan normalisasi data.
- `assets/` - Aset gambar, font, dan stylesheet global.

## Database

- **SQLite Lokal**: Skrip migrasi lokal dikelola di `mobile/src/database/migrations.ts`.
- **Cloud Database**: Skrip migrasi Supabase tersimpan di folder `supabase/migrations/` dan dijalankan secara manual oleh pemilik proyek melalui Supabase CLI (tidak berjalan otomatis dari aplikasi).
