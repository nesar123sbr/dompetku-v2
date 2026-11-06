# Laporan Audit Komprehensif DompetKu (Stabilization & Hardening)

Laporan ini mendokumentasikan hasil audit teknis, analisis akar penyebab crash, verifikasi berbasis bukti pada kode dan perangkat keras fisik (*real hardware*), serta daftar perbaikan bertahap (Fase 0 hingga Fase 5) pada monorepo **DompetKu** (`mobile/` dan `supabase/`).

---

## 1. Analisis Akar Masalah Crash Booting APK (Fase 0)

### 1.1 Temuan & Bukti Hardware Langsung
Saat menjalankan APK preview pada perangkat Android fisik (`adb -s YHZ9ZLKFLF6LH6HM`), aplikasi langsung memicu *Global Error Boundary* pada `mobile/src/app/_layout.tsx` dengan log:
```text
ReactNativeJS: 'Global ErrorBoundary caught error:', { [Error: Error code 1: no such column: dompet_asal_id]
  code: 'ERR_INTERNAL_SQLITE_ERROR',
  nativeStack: 'expo.modules.sqlite.SQLiteErrorException: Error code 1: no such column: dompet_asal_id\n...
```

### 1.2 Urutan & Pembuktian Kandidat Penyebab (Prompt 0.3)

| Urutan | Kandidat | Status & Bukti | Tingkat Keyakinan |
|---|---|---|---|
| **#1** | **A. SQLite Schema / Typo Kolom & Migrasi** | **AKAR PENYEBAB UTAMA (SMOKING GUN)**.<br>Ditemukan typo kolom `dompet_asal_id` (seharusnya `dompet_sumber_id`) pada:<br>- `mobile/src/database/repositories/dompet.repository.ts:406`<br>- `mobile/src/database/repositories/dompet.repository.ts:480`<br>- `mobile/src/database/migrations.ts:446`<br>Karena `SQLiteProvider` menggunakan `useSuspense`, exception saat `onInit` / migrasi v9 langsung melempar error ke `ErrorBoundary` root. | **100% (Terbukti Logcat)** |
| **#2** | **B. Variabel Lingkungan (.env) pada EAS** | **FAKTOR KONTRIBUSI AWAN**.<br>Berkas `.env` masuk `.gitignore`. Di EAS Build, `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bernilai `undefined` jika tidak diset di dashboard EAS Environment Variables. Walaupun kode `supabase.ts` memiliki penanganan `null` (`isSupabaseConfigured = false`), kegagalan database lokal membuat aplikasi tidak bisa menampilkan fallback offline. | **Tinggi (Konfigurasi EAS)** |
| **#3** | **C. Kecocokan Versi Dependensi** | Versi Expo SDK 58, React Native 0.88.1, dan flash-list 2.3.2 sudah lolos `expo-doctor` (20/20 checks passed). Pinning versi paket Expo telah diselaraskan. | **Sedang** |
| **#4** | **D. Struktur Rute & Navigator** | Rute `/` ganda (`src/app/index.tsx` dan `(tabs)/index.tsx`) keduanya mengarah ke `/dashboard`. `riwayat.tsx` merupakan re-export `riwayat-transaksi.tsx`. `audit-saldo.tsx` belum terdaftar di Stack navigator. | **Sedang** |
| **#5** | **E. Case-Sensitivity Aset di Linux/EAS** | Terverifikasi aman. Nama aset di `app.json` (`Dompetku.png`, `DompetKu_icon.png`, `dompetku_logo_horizontal.png`) cocok 100% dengan kapitalisasi di `git ls-files`. | **Rendah (Aman)** |
| **#6** | **F. Permissions Android & Handler Notifikasi** | `POST_NOTIFICATIONS` dan `SCHEDULE_EXACT_ALARM` sudah terdaftar di `app.json`. Handler notifikasi di level modul perlu pengetikan resmi tanpa `as any`. | **Rendah** |

---

## 2. Rincian Perbaikan Fase 0

### Berkas Diubah:
1. `mobile/src/database/repositories/dompet.repository.ts`:
   - Mengganti `dompet_asal_id` menjadi `dompet_sumber_id` pada query `hitungUlangSaldoSemuaDompet` (baris 406) dan `periksaIntegritasSaldo` (baris 480).
2. `mobile/src/database/migrations.ts`:
   - Mengganti `dompet_asal_id` menjadi `dompet_sumber_id` pada query migrasi `createVersion9` (baris 446).
3. `mobile/src/app/_layout.tsx`:
   - Memperbarui `ErrorBoundary` global expo-router untuk menampilkan pesan error asli (`error.message`), stack trace pada mode `__DEV__`, tombol **"Salin detail"** via Android Share Sheet, dan tombol **"Coba lagi"** (`retry`).
   - Menambahkan komponen `<StatusBar style="dark" />` dari `expo-status-bar` agar ikon status bar kontras di atas latar belakang terang.
4. `mobile/src/providers/LocalDatabaseProvider.tsx`:
   - Menambahkan penanganan `onError` pada `SQLiteProvider`.
   - Mengimplementasikan **Layar Pemulihan Database** mandiri dengan deteksi sesi akun Supabase:
     - Jika akun terhubung: opsi reset database lokal dengan konfirmasi 2 langkah (data cloud aman).
     - Jika mode tamu: opsi reset dengan peringatan tegas bahwa data lokal akan hilang permanen.
     - Menggunakan API modern `File` dan `Paths` dari Expo SDK 58 (`expo-file-system`) untuk menghapus berkas SQLite korup secara idempotent.
5. `docs/DEBUGGING.md`:
   - Panduan lengkap cara menangkap log via ADB logcat, development build, dan verifikasi ekspor bundel Android.


---

## 3. Rincian Perbaikan Fase 1 (Stabilitas P0)

### 3.1 Migrasi Database Tahan Banting (`mobile/src/database/migrations.ts`)
- **Pengecekan Kolom Deterministik**: Menambahkan helper `columnExists(db, table, column)` via `PRAGMA table_info` menggantikan `.catch(() => {})` yang sebelumnya menelan error secara diam-diam pada versi 3, 5, dan 7.
- **Transaksi per Versi**: Seluruh migrasi dari v1 hingga v11 kini dibungkus dalam `db.withTransactionAsync` mandiri dengan pembaruan `PRAGMA user_version = N` seketika setelah blok versi sukses.
- **Kebijakan Seeding Terkontrol**: `seedDefaultData` hanya dieksekusi saat inisialisasi basis data baru (`currentVersion === 0`). Pada proses upgrade skema, hanya data pengaturan aplikasi dan kategori bawaan yang dipastikan tersedia (`INSERT OR IGNORE`) tanpa menyentuh atau mereset dompet pengguna yang sudah ada.
- **Uji Simulasi Migrasi**: Dibuat suite pengujian otomatis `mobile/tests/migration_simulation.test.mjs` menggunakan `node:sqlite` yang memvalidasi bahwa migrasi upgrade dari DB v7 ke v11 menghasilkan skema, index, dan perhitungan `saldo_awal` yang 100% konsisten dengan instalasi baru.

### 3.2 Boot Flow & Ketahanan Offline (`mobile/src/providers/AuthProvider.tsx`)
- **Timeout Session Supabase**: Menambahkan timeout 5 detik pada `supabase.auth.getSession()` dengan `Promise.race` plus failsafe timer 7 detik. Hal ini menjamin status `isReady` selalu `true` dalam kondisi koneksi lambat, mode pesawat, atau kegagalan jaringan, sehingga `RootNavigator` tidak pernah tersangkut pada splash screen.
- **Autentikasi Offline-First**: Mendukung akses aplikasi secara penuh saat offline jika `localMode === 'authenticated'` dan `authUserId` tersimpan di database lokal.
- **Fallback Sign Out Lokal**: Fallback ke `signOut({ scope: 'local' })` bila koneksi ke remote Supabase gagal.

### 3.3 Konfigurasi Klien & Keamanan Platform
- **Konversi TypeScript**: Mengonversi `mobile/src/lib/supabase.js` menjadi `mobile/src/lib/supabase.ts` dengan pengetikan `SupabaseClient` yang aman.
- **Privasi & Backup Android**: Menambahkan `"allowBackup": false` pada konfigurasi Android di `mobile/app.json` untuk mencegah pencadangan otomatis berkas database keuangan SQLite dan token otentikasi ke Google Drive / cloud backup Android.
- **Konfigurasi EAS**: Memperbarui profil `preview`, `development`, dan `production` di `mobile/eas.json` dengan channel eksplisit dan distribusi internal.
