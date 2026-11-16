-- ============================================================
-- Migration 000008: Security & Sync Hardening Fixes
-- Tanggal : 2026-11-16
-- Cakupan :
--   1. [T1/P0] Kunci RPC public.hapus_semua_data_pengguna(uuid) hanya untuk
--              service_role dengan SET search_path = '' dan tanpa celah
--              auth.uid() IS NULL.
--   2. [T5a/P2] Hapus 4 index FK duplikat warisan 000001 yang belum terhapus
--               di 000005 (varian _id dari 000003 dipertahankan).
--   3. [T5b/P2] Perbaiki partial unique index idx_anggaran_aktif_unik agar
--               memakai COALESCE(kategori_id_lokal, '__semua__') (selaras
--               dengan SQLite v11) setelah menonaktifkan duplikat aktif.
--   4. [T2/P1] Perbarui RPC public.sync_bundle(jsonb):
--              - Klausa WHERE LWW memakai strict '<' (bukan '<=') agar re-push
--                baris yang tidak berubah tidak memicu trigger set_updated_at.
--              - Subselect deaktivasi anggaran_bulanan hanya memproses item
--                payload yang aktif ((ab->>'is_aktif')::boolean IS TRUE).
-- ============================================================
BEGIN;

-- ============================================================
-- 1. [T1] KUNCI RPC HAPUS_SEMUA_DATA_PENGGUNA HANYA UNTUK SERVICE_ROLE
-- ============================================================
CREATE OR REPLACE FUNCTION public.hapus_semua_data_pengguna(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id tidak boleh kosong.';
  END IF;

  -- Hapus data dengan urutan aman FK (tabel anak sebelum tabel induk dompet/kategori)
  DELETE FROM public.pemasukan WHERE pengguna_id = target_user_id;
  DELETE FROM public.pengeluaran WHERE pengguna_id = target_user_id;
  DELETE FROM public.transfer_dompet WHERE pengguna_id = target_user_id;
  DELETE FROM public.koreksi_saldo_dompet WHERE pengguna_id = target_user_id;
  DELETE FROM public.pengingat_tagihan WHERE pengguna_id = target_user_id;
  DELETE FROM public.anggaran_bulanan WHERE pengguna_id = target_user_id;
  DELETE FROM public.kategori_pemasukan WHERE pengguna_id = target_user_id;
  DELETE FROM public.kategori_pengeluaran WHERE pengguna_id = target_user_id;
  DELETE FROM public.dompet WHERE pengguna_id = target_user_id;
  DELETE FROM public.profil_pengguna WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.hapus_semua_data_pengguna(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hapus_semua_data_pengguna(uuid) TO service_role;

-- ============================================================
-- 2. [T5a] HAPUS 4 INDEX FK DUPLIKAT WARISAN 000001
--    (Varian _id dari 000003 dan idx_anggaran_fk_kategori DIPERTAHANKAN)
-- ============================================================
DROP INDEX IF EXISTS public.idx_transfer_fk_sumber;
DROP INDEX IF EXISTS public.idx_transfer_fk_tujuan;
DROP INDEX IF EXISTS public.idx_koreksi_fk_dompet;
DROP INDEX IF EXISTS public.idx_pengingat_fk_dompet;

-- ============================================================
-- 3. [T5b] DEDUPE & PERBAIKI UNIQUE INDEX ANGGARAN AKTIF (NULL SAFE)
-- ============================================================
UPDATE public.anggaran_bulanan a SET is_aktif = false
WHERE a.is_aktif AND EXISTS (SELECT 1 FROM public.anggaran_bulanan b
  WHERE b.pengguna_id = a.pengguna_id AND b.bulan = a.bulan
    AND b.kategori_id_lokal IS NOT DISTINCT FROM a.kategori_id_lokal
    AND b.is_aktif AND (b.updated_at, b.id_lokal) > (a.updated_at, a.id_lokal));

DROP INDEX IF EXISTS public.idx_anggaran_aktif_unik;
CREATE UNIQUE INDEX IF NOT EXISTS idx_anggaran_aktif_unik
  ON public.anggaran_bulanan (pengguna_id, bulan, COALESCE(kategori_id_lokal, '__semua__'))
  WHERE is_aktif = true;

-- ============================================================
-- 4. [T2] PEMBARUAN RPC SYNC_BUNDLE (STRICT '<' LWW & FILTER ANGGARAN AKTIF)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_bundle(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak. User tidak terautentikasi.';
  END IF;

  IF jsonb_typeof(payload) <> 'object' THEN
    RAISE EXCEPTION 'Payload harus berupa objek JSON.';
  END IF;

  -- 1. Profil Pengguna
  IF jsonb_typeof(payload->'profilPengguna') = 'object' THEN
    INSERT INTO public.profil_pengguna (id, email, nama_lengkap)
    SELECT
      v_user_id,
      payload->'profilPengguna'->>'email',
      payload->'profilPengguna'->>'nama_lengkap'
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      nama_lengkap = EXCLUDED.nama_lengkap,
      updated_at = timezone('utc', now());
  END IF;

  -- 2. Dompet
  IF jsonb_typeof(payload->'dompet') = 'array' THEN
    INSERT INTO public.dompet (
      pengguna_id, id_lokal, nama, jenis, tipe_dompet,
      saldo_saat_ini, saldo_awal, is_default, is_aktif, sumber_data, created_at, updated_at
    )
    SELECT
      v_user_id, d->>'id_lokal', d->>'nama', d->>'jenis', d->>'tipe_dompet',
      (d->>'saldo_saat_ini')::numeric, COALESCE((d->>'saldo_awal')::numeric, 0),
      (d->>'is_default')::boolean, (d->>'is_aktif')::boolean,
      d->>'sumber_data', (d->>'created_at')::timestamptz, (d->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'dompet') AS d
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      nama = EXCLUDED.nama,
      jenis = EXCLUDED.jenis,
      tipe_dompet = EXCLUDED.tipe_dompet,
      saldo_saat_ini = EXCLUDED.saldo_saat_ini,
      saldo_awal = EXCLUDED.saldo_awal,
      is_default = EXCLUDED.is_default,
      is_aktif = EXCLUDED.is_aktif,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.dompet.updated_at < LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 3. Kategori Pemasukan
  IF jsonb_typeof(payload->'kategoriPemasukan') = 'array' THEN
    INSERT INTO public.kategori_pemasukan (
      pengguna_id, id_lokal, nama, ikon, warna, urutan, is_bawaan, is_aktif, created_at, updated_at
    )
    SELECT
      v_user_id, kp->>'id_lokal', kp->>'nama', kp->>'ikon', kp->>'warna', (kp->>'urutan')::integer,
      (kp->>'is_bawaan')::boolean, (kp->>'is_aktif')::boolean, (kp->>'created_at')::timestamptz, (kp->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'kategoriPemasukan') AS kp
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      nama = EXCLUDED.nama, ikon = EXCLUDED.ikon, warna = EXCLUDED.warna, urutan = EXCLUDED.urutan,
      is_bawaan = EXCLUDED.is_bawaan, is_aktif = EXCLUDED.is_aktif,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.kategori_pemasukan.updated_at < LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 4. Kategori Pengeluaran
  IF jsonb_typeof(payload->'kategoriPengeluaran') = 'array' THEN
    INSERT INTO public.kategori_pengeluaran (
      pengguna_id, id_lokal, nama, kelompok, ikon, warna, urutan, is_bawaan, is_aktif, created_at, updated_at
    )
    SELECT
      v_user_id, kg->>'id_lokal', kg->>'nama', kg->>'kelompok', kg->>'ikon', kg->>'warna',
      (kg->>'urutan')::integer, (kg->>'is_bawaan')::boolean, (kg->>'is_aktif')::boolean,
      (kg->>'created_at')::timestamptz, (kg->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'kategoriPengeluaran') AS kg
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      nama = EXCLUDED.nama, kelompok = EXCLUDED.kelompok, ikon = EXCLUDED.ikon, warna = EXCLUDED.warna,
      urutan = EXCLUDED.urutan, is_bawaan = EXCLUDED.is_bawaan, is_aktif = EXCLUDED.is_aktif,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.kategori_pengeluaran.updated_at < LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 5. Pemasukan
  IF jsonb_typeof(payload->'pemasukan') = 'array' THEN
    INSERT INTO public.pemasukan (
      pengguna_id, id_lokal, dompet_id_lokal, kategori_id_lokal, judul, catatan, jumlah,
      tanggal_transaksi, sumber_data, is_deleted, created_at, updated_at
    )
    SELECT
      v_user_id, p->>'id_lokal', p->>'dompet_id_lokal', p->>'kategori_id_lokal', p->>'judul',
      p->>'catatan', (p->>'jumlah')::numeric, (p->>'tanggal_transaksi')::date, p->>'sumber_data',
      (p->>'is_deleted')::boolean, (p->>'created_at')::timestamptz, (p->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'pemasukan') AS p
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      dompet_id_lokal = EXCLUDED.dompet_id_lokal, kategori_id_lokal = EXCLUDED.kategori_id_lokal,
      judul = EXCLUDED.judul, catatan = EXCLUDED.catatan, jumlah = EXCLUDED.jumlah,
      tanggal_transaksi = EXCLUDED.tanggal_transaksi, sumber_data = EXCLUDED.sumber_data,
      is_deleted = EXCLUDED.is_deleted,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.pemasukan.updated_at < LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 6. Pengeluaran
  IF jsonb_typeof(payload->'pengeluaran') = 'array' THEN
    INSERT INTO public.pengeluaran (
      pengguna_id, id_lokal, dompet_id_lokal, kategori_id_lokal, judul, catatan, jumlah,
      tanggal_transaksi, pakai_dana_darurat, sumber_data, is_deleted, created_at, updated_at
    )
    SELECT
      v_user_id, g->>'id_lokal', g->>'dompet_id_lokal', g->>'kategori_id_lokal', g->>'judul',
      g->>'catatan', (g->>'jumlah')::numeric, (g->>'tanggal_transaksi')::date,
      (g->>'pakai_dana_darurat')::boolean, g->>'sumber_data', (g->>'is_deleted')::boolean,
      (g->>'created_at')::timestamptz, (g->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'pengeluaran') AS g
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      dompet_id_lokal = EXCLUDED.dompet_id_lokal, kategori_id_lokal = EXCLUDED.kategori_id_lokal,
      judul = EXCLUDED.judul, catatan = EXCLUDED.catatan, jumlah = EXCLUDED.jumlah,
      tanggal_transaksi = EXCLUDED.tanggal_transaksi, pakai_dana_darurat = EXCLUDED.pakai_dana_darurat,
      sumber_data = EXCLUDED.sumber_data, is_deleted = EXCLUDED.is_deleted,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.pengeluaran.updated_at < LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 7. Pengingat Tagihan
  IF jsonb_typeof(payload->'pengingatTagihan') = 'array' THEN
    INSERT INTO public.pengingat_tagihan (
      pengguna_id, id_lokal, judul, catatan, nominal, dompet_id_lokal,
      tanggal_jatuh_tempo, jam_pengingat, status, pengulangan, notifikasi_diaktifkan,
      sumber_data, created_at, updated_at
    )
    SELECT
      v_user_id, pt->>'id_lokal', pt->>'judul', pt->>'catatan', (pt->>'nominal')::numeric,
      pt->>'dompet_id_lokal', (pt->>'tanggal_jatuh_tempo')::date, (pt->>'jam_pengingat')::time,
      pt->>'status', pt->>'pengulangan', (pt->>'notifikasi_diaktifkan')::boolean,
      pt->>'sumber_data', (pt->>'created_at')::timestamptz, (pt->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'pengingatTagihan') AS pt
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      judul = EXCLUDED.judul, catatan = EXCLUDED.catatan, nominal = EXCLUDED.nominal,
      dompet_id_lokal = EXCLUDED.dompet_id_lokal, tanggal_jatuh_tempo = EXCLUDED.tanggal_jatuh_tempo,
      jam_pengingat = EXCLUDED.jam_pengingat, status = EXCLUDED.status,
      pengulangan = EXCLUDED.pengulangan, notifikasi_diaktifkan = EXCLUDED.notifikasi_diaktifkan,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.pengingat_tagihan.updated_at < LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 8. Transfer Dompet
  IF jsonb_typeof(payload->'transferDompet') = 'array' THEN
    INSERT INTO public.transfer_dompet (
      pengguna_id, id_lokal, dompet_sumber_id_lokal, dompet_tujuan_id_lokal,
      jumlah, tanggal_transfer, catatan, sumber_dana_darurat, created_at, updated_at
    )
    SELECT
      v_user_id, td->>'id_lokal', td->>'dompet_sumber_id_lokal', td->>'dompet_tujuan_id_lokal',
      (td->>'jumlah')::numeric, (td->>'tanggal_transfer')::date, td->>'catatan',
      (td->>'sumber_dana_darurat')::boolean, (td->>'created_at')::timestamptz, (td->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'transferDompet') AS td
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      dompet_sumber_id_lokal = EXCLUDED.dompet_sumber_id_lokal, dompet_tujuan_id_lokal = EXCLUDED.dompet_tujuan_id_lokal,
      jumlah = EXCLUDED.jumlah, tanggal_transfer = EXCLUDED.tanggal_transfer,
      catatan = EXCLUDED.catatan, sumber_dana_darurat = EXCLUDED.sumber_dana_darurat,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.transfer_dompet.updated_at < LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 9. Anggaran Bulanan
  IF jsonb_typeof(payload->'anggaranBulanan') = 'array' THEN
    UPDATE public.anggaran_bulanan target
    SET is_aktif = false, updated_at = timezone('utc', now())
    FROM (
      SELECT
        ab->>'id_lokal' AS id_baru,
        ab->>'bulan' AS bln,
        ab->>'kategori_id_lokal' AS kat
      FROM jsonb_array_elements(payload->'anggaranBulanan') AS ab
      WHERE (ab->>'is_aktif')::boolean IS TRUE
    ) source
    WHERE target.pengguna_id = v_user_id
      AND target.bulan = source.bln
      AND target.kategori_id_lokal IS NOT DISTINCT FROM source.kat
      AND target.id_lokal <> source.id_baru
      AND target.is_aktif = true;

    INSERT INTO public.anggaran_bulanan (
      pengguna_id, id_lokal, bulan, nama, kategori_id_lokal,
      batas_nominal, ambang_peringatan_persen, is_aktif, created_at, updated_at
    )
    SELECT
      v_user_id, ab->>'id_lokal', ab->>'bulan', ab->>'nama', ab->>'kategori_id_lokal',
      (ab->>'batas_nominal')::numeric, (ab->>'ambang_peringatan_persen')::numeric,
      (ab->>'is_aktif')::boolean, (ab->>'created_at')::timestamptz, (ab->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'anggaranBulanan') AS ab
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      bulan = EXCLUDED.bulan, nama = EXCLUDED.nama, kategori_id_lokal = EXCLUDED.kategori_id_lokal,
      batas_nominal = EXCLUDED.batas_nominal, ambang_peringatan_persen = EXCLUDED.ambang_peringatan_persen,
      is_aktif = EXCLUDED.is_aktif,
      updated_at = LEAST(EXCLUDED.updated_at, timezone('utc', now()))
    WHERE public.anggaran_bulanan.updated_at < LEAST(EXCLUDED.updated_at, timezone('utc', now()));
  END IF;

  -- 10. Koreksi Saldo Dompet (Append-Only)
  IF jsonb_typeof(payload->'koreksiSaldoDompet') = 'array' THEN
    INSERT INTO public.koreksi_saldo_dompet (
      pengguna_id, id_lokal, dompet_id_lokal, nama_dompet_snapshot,
      saldo_sebelum, saldo_sesudah, selisih, catatan, sumber, created_at, updated_at
    )
    SELECT
      v_user_id, k->>'id_lokal', k->>'dompet_id_lokal', k->>'nama_dompet_snapshot',
      (k->>'saldo_sebelum')::numeric, (k->>'saldo_sesudah')::numeric, (k->>'selisih')::numeric,
      k->>'catatan', COALESCE(k->>'sumber', 'manual'),
      (k->>'created_at')::timestamptz, (k->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'koreksiSaldoDompet') AS k
    ON CONFLICT (pengguna_id, id_lokal) DO NOTHING;
  END IF;

END;
$$;

-- Hak Akses RPC sync_bundle
REVOKE EXECUTE ON FUNCTION public.sync_bundle(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sync_bundle(jsonb) TO authenticated;

COMMIT;
