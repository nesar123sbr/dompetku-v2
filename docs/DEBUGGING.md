# Panduan Debugging & Pengambilan Log DompetKu

Dokumen ini berisi panduan teknis bagi pengembang untuk menangkap, mengisolasi, dan mendiagnosis kesalahan (*runtime error*, *crash*, kendala database, dan bundling) pada aplikasi DompetKu (React Native / Expo + SQLite + Supabase).

---

## 1. Temuan Utama Crash Booting APK (Root Cause)

### Gejala Masalah
Pada APK build preview EAS, aplikasi menampilkan layar error umum:
- **Judul**: "Terjadi kesalahan"
- **Pesan**: "Aplikasi mengalami kendala yang tidak terduga. Silakan coba lagi untuk memuat ulang halaman."
- **Tombol**: "Coba lagi" (saat ditekan tetap gagal memuat halaman)
- **Status Bar**: Ikon/teks berwarna putih di atas latar terang (tidak terbaca).

### Bukti Logcat Hardware Asli
Dari inspeksi logcat langsung pada perangkat Android fisik terhubung (`adb -s YHZ9ZLKFLF6LH6HM logcat`):
```text
ReactNativeJS: 'Global ErrorBoundary caught error:', { [Error: Error code 1: no such column: dompet_asal_id]
  code: 'ERR_INTERNAL_SQLITE_ERROR',
  nativeStack: 'expo.modules.sqlite.SQLiteErrorException: Error code 1: no such column: dompet_asal_id\n...
```

### Penyebab Akar (*Root Cause*)
1. **Typo Nama Kolom SQLite**:
   - Di `mobile/src/database/repositories/dompet.repository.ts` (baris 406 dan 480) serta `mobile/src/database/migrations.ts` (baris 446 pada migrasi v9), query rekonsiliasi saldo memanggil:
     ```sql
     SELECT SUM(jumlah) FROM transfer_dompet WHERE dompet_asal_id = d.id
     ```
   - Skema tabel `transfer_dompet` sebenarnya menggunakan kolom `dompet_sumber_id`, bukan `dompet_asal_id`.
   - Kesalahan ini menyebabkan query gagal secara instan (`SQLiteErrorException: no such column: dompet_asal_id`).
2. **Penanganan Error Diam (*Blind Error Boundary*)**:
   - `_layout.tsx` memiliki `ErrorBoundary` yang menangkap seluruh uncaught error dari React tree, namun teks komponennya di-hardcode tanpa menampilkan properti `error.message` atau `error.stack`, dan tanpa opsi menyalin detail error.
3. **Status Bar Style Tidak Didefinisikan**:
   - Komponen `<StatusBar style="dark" />` belum dirender di tingkat root layout sehingga sistem default memilih icon putih.

---

## 2. Cara Menangkap Log Aplikasi Menggunakan ADB Logcat

### A. Memastikan Perangkat Terhubung
Jalankan perintah berikut di terminal:
```bash
adb devices -l
```
Pastikan status perangkat `device` (bukan `unauthorized` atau `offline`).

### B. Menangkap Log Khusus React Native & JavaScript
Untuk melihat log keluaran `console.log`, `console.error`, dan pesan JavaScript:
```bash
adb logcat *:S ReactNative:V ReactNativeJS:V
```

### C. Menangkap Log Spesifik Aplikasi DompetKu (Filter Package)
Dapatkan PID aplikasi `com.gadanesar.dompetku`:
```bash
# Windows PowerShell
$pid = adb shell "pidof com.gadanesar.dompetku"
adb logcat --pid=$pid

# Linux / macOS
PID=$(adb shell pidof com.gadanesar.dompetku)
adb logcat --pid=$PID
```

### D. Menangkap Log Terkait SQLite & Crash Native
Untuk menelusuri pesan error SQLite atau exception Android:
```bash
adb logcat -v time | Select-String -Pattern "SQLite|AndroidRuntime|FATAL|dompetku|ReactNativeJS"
```

### E. Membersihkan Buffer Logcat Sebelum Menjalankan Tes
Sebelum menguji skenario baru, bersihkan buffer agar tidak membaca log lama:
```bash
adb logcat -c
```

---

## 3. Menjalankan Development Build

Development build memungkinkan hot reload dan inspect error secara langsung di perangkat:

1. **Jalankan Bundler Metro**:
   ```bash
   cd mobile
   npx expo start --dev-client
   ```
2. **Kompilasi & Pasang ke Perangkat Android**:
   ```bash
   cd mobile
   npx expo run:android
   ```
3. **Membuka Menu Pengembang di HP**:
   - Goyangkan perangkat fisik (*shake gesture*) atau jalankan:
     ```bash
     adb shell input keyevent 82
     ```
   - Pilih **Open JS Debugger** atau **Show Performance Monitor**.

---

## 4. Verifikasi Bundling Android (Expo Export)

Sebelum mengirim build ke EAS (*Expo Application Services*), selalu pastikan bundling JavaScript produksi tidak memiliki kesalahan sintaks atau dependensi rusak:

```bash
cd mobile
npx expo export --platform android
```

Jika proses ekspor berhasil tanpa error, bundle JavaScript produksi dijamin valid untuk APK/AAB.

---

## 5. Layar Pemulihan Baru (Error Boundaries)

### A. Root ErrorBoundary (`mobile/src/app/_layout.tsx`)
- Menangkap error di seluruh navigasi React.
- Menampilkan pesan error asli secara transparan.
- Pada mode `__DEV__`, menampilkan stack trace lengkap.
- Tombol **"Salin detail"** membuka dialog bagikan/salin sistem (Android Share Sheet).
- Tombol **"Coba lagi"** menjalankan fungsi `retry()` bawaan Expo Router.

### B. Database Recovery Screen (`mobile/src/providers/LocalDatabaseProvider.tsx`)
- Menangkap kegagalan migrasi dan koneksi SQLite via callback `onError`.
- Menyediakan opsi:
  1. **Coba Buka Lagi**: Mengulang inisialisasi SQLite secara aman.
  2. **Salin Detail Error**: Membagikan log error teknis.
  3. **Reset Database Lokal**:
     - *Jika akun terhubung (cloud)*: Memberi konfirmasi 2 langkah untuk membersihkan berkas SQLite lokal bermasalah dan mengunduh ulang dari cloud.
     - *Jika mode tamu*: Memberikan peringatan tegas bahwa data lokal akan hilang permanen sebelum konfirmasi 2 langkah.
