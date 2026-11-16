-- ============================================================
-- Migration 000007: prune unused query indexes (Grup A)
-- Tanggal : 2026-11-16
-- Alasan  : Supabase Performance Advisor lint `unused_index` (INFO).
--           Index di bawah dibuat di 000001 untuk pola query cloud-side
--           (filter jenis/status/tanggal/bulan, order urutan) yang TIDAK
--           pernah dipakai. Akses cloud hanya:
--             - RPC sync_bundle (upsert ON CONFLICT pengguna_id, id_lokal)
--             - pull: .eq(pengguna_id) + keyset server_updated_at, id_lokal
--             - RPC hapus_semua_data_pengguna (DELETE WHERE pengguna_id)
--           Index hanya menambah beban tulis pada setiap upsert sync.
-- ============================================================
BEGIN;

DROP INDEX IF EXISTS public.idx_dompet_pengguna_jenis;
DROP INDEX IF EXISTS public.idx_kategori_pemasukan_pengguna_urutan;
DROP INDEX IF EXISTS public.idx_kategori_pengeluaran_pengguna_urutan;
DROP INDEX IF EXISTS public.idx_pemasukan_pengguna_tanggal;
DROP INDEX IF EXISTS public.idx_pengeluaran_pengguna_tanggal;
DROP INDEX IF EXISTS public.idx_pengingat_pengguna_status_tanggal;
DROP INDEX IF EXISTS public.idx_transfer_pengguna_tanggal;
DROP INDEX IF EXISTS public.idx_anggaran_bulanan_pengguna_bulan;

-- ------------------------------------------------------------
-- SENGAJA DIPERTAHANKAN (Grup B, covering index Foreign Key).
-- Advisor menandai "unused" karena trafik rendah dan baris induk memakai
-- soft-delete. Tetap dibutuhkan untuk cek ON DELETE RESTRICT/cascade
-- (hapus akun, hard-delete induk). Jika di-drop, lint
-- `unindexed_foreign_keys` muncul. JANGAN dihapus tanpa keputusan terpisah:
--   idx_anggaran_fk_kategori
--   idx_koreksi_fk_dompet_id
--   idx_pemasukan_fk_dompet_id
--   idx_pemasukan_fk_kategori_id
--   idx_pengeluaran_fk_dompet_id
--   idx_pengeluaran_fk_kategori_id
--   idx_pengingat_fk_dompet_id
--   idx_transfer_fk_sumber_id
--   idx_transfer_fk_tujuan_id
-- Juga JANGAN drop: idx_anggaran_aktif_unik (UNIQUE) dan idx_*_server_updated_at.
-- ------------------------------------------------------------

COMMIT;

-- ============================================================
-- ROLLBACK (manual; definisi asli dari 000001 baris 172-179)
-- ============================================================
-- CREATE INDEX IF NOT EXISTS idx_dompet_pengguna_jenis ON public.dompet (pengguna_id, jenis);
-- CREATE INDEX IF NOT EXISTS idx_kategori_pemasukan_pengguna_urutan ON public.kategori_pemasukan (pengguna_id, urutan);
-- CREATE INDEX IF NOT EXISTS idx_kategori_pengeluaran_pengguna_urutan ON public.kategori_pengeluaran (pengguna_id, urutan);
-- CREATE INDEX IF NOT EXISTS idx_pemasukan_pengguna_tanggal ON public.pemasukan (pengguna_id, tanggal_transaksi DESC);
-- CREATE INDEX IF NOT EXISTS idx_pengeluaran_pengguna_tanggal ON public.pengeluaran (pengguna_id, tanggal_transaksi DESC);
-- CREATE INDEX IF NOT EXISTS idx_pengingat_pengguna_status_tanggal ON public.pengingat_tagihan (pengguna_id, status, tanggal_jatuh_tempo);
-- CREATE INDEX IF NOT EXISTS idx_transfer_pengguna_tanggal ON public.transfer_dompet (pengguna_id, tanggal_transfer DESC);
-- CREATE INDEX IF NOT EXISTS idx_anggaran_bulanan_pengguna_bulan ON public.anggaran_bulanan (pengguna_id, bulan);
