-- ============================================================
-- Fungsi RPC: Atomik Sinkronisasi Multi-Tabel DompetKu v3
-- ============================================================
DROP FUNCTION IF EXISTS public.sync_bundle(jsonb);

CREATE OR REPLACE FUNCTION public.sync_bundle(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- KEAMANAN MAX: Hanya catalog bawaan yang dipercaya
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak. User tidak terautentikasi.';
  END IF;

  -- Validasi ringan: payload harus objek JSON
  IF jsonb_typeof(payload) <> 'object' THEN
    RAISE EXCEPTION 'Payload harus berupa objek JSON.';
  END IF;

  -- 1. PROFIL PENGGUNA
  IF payload ? 'profilPengguna' THEN
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

  -- 2. DOMPET
  IF payload ? 'dompet' THEN
    INSERT INTO public.dompet (
      pengguna_id, id_lokal, nama, jenis, tipe_dompet,
      saldo_saat_ini, is_default, is_aktif, sumber_data, created_at, updated_at
    )
    SELECT
      v_user_id,
      d->>'id_lokal',
      d->>'nama',
      d->>'jenis',
      d->>'tipe_dompet',
      (d->>'saldo_saat_ini')::numeric,
      (d->>'is_default')::boolean,
      (d->>'is_aktif')::boolean,
      d->>'sumber_data',
      (d->>'created_at')::timestamptz,
      (d->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'dompet') AS d
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      nama = EXCLUDED.nama,
      jenis = EXCLUDED.jenis,
      tipe_dompet = EXCLUDED.tipe_dompet,
      saldo_saat_ini = EXCLUDED.saldo_saat_ini,
      is_default = EXCLUDED.is_default,
      is_aktif = EXCLUDED.is_aktif,
      updated_at = EXCLUDED.updated_at
    WHERE public.dompet.updated_at < EXCLUDED.updated_at;
  END IF;

  -- 3. KATEGORI PEMASUKAN
  IF payload ? 'kategoriPemasukan' THEN
    INSERT INTO public.kategori_pemasukan (
      pengguna_id, id_lokal, nama, ikon, warna, urutan,
      is_bawaan, is_aktif, created_at, updated_at
    )
    SELECT
      v_user_id,
      kp->>'id_lokal',
      kp->>'nama',
      kp->>'ikon',
      kp->>'warna',
      (kp->>'urutan')::integer,
      (kp->>'is_bawaan')::boolean,
      (kp->>'is_aktif')::boolean,
      (kp->>'created_at')::timestamptz,
      (kp->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'kategoriPemasukan') AS kp
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      nama = EXCLUDED.nama,
      ikon = EXCLUDED.ikon,
      warna = EXCLUDED.warna,
      urutan = EXCLUDED.urutan,
      is_bawaan = EXCLUDED.is_bawaan,
      is_aktif = EXCLUDED.is_aktif,
      updated_at = EXCLUDED.updated_at
    WHERE public.kategori_pemasukan.updated_at < EXCLUDED.updated_at;
  END IF;

  -- 4. KATEGORI PENGELUARAN
  IF payload ? 'kategoriPengeluaran' THEN
    INSERT INTO public.kategori_pengeluaran (
      pengguna_id, id_lokal, nama, kelompok, ikon, warna, urutan,
      is_bawaan, is_aktif, created_at, updated_at
    )
    SELECT
      v_user_id,
      kg->>'id_lokal',
      kg->>'nama',
      kg->>'kelompok',
      kg->>'ikon',
      kg->>'warna',
      (kg->>'urutan')::integer,
      (kg->>'is_bawaan')::boolean,
      (kg->>'is_aktif')::boolean,
      (kg->>'created_at')::timestamptz,
      (kg->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'kategoriPengeluaran') AS kg
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      nama = EXCLUDED.nama,
      kelompok = EXCLUDED.kelompok,
      ikon = EXCLUDED.ikon,
      warna = EXCLUDED.warna,
      urutan = EXCLUDED.urutan,
      is_bawaan = EXCLUDED.is_bawaan,
      is_aktif = EXCLUDED.is_aktif,
      updated_at = EXCLUDED.updated_at
    WHERE public.kategori_pengeluaran.updated_at < EXCLUDED.updated_at;
  END IF;

  -- 5. PEMASUKAN
  IF payload ? 'pemasukan' THEN
    INSERT INTO public.pemasukan (
      pengguna_id, id_lokal, dompet_id_lokal, kategori_id_lokal,
      judul, catatan, jumlah, tanggal_transaksi, sumber_data, is_deleted,
      created_at, updated_at
    )
    SELECT
      v_user_id,
      p->>'id_lokal',
      p->>'dompet_id_lokal',
      p->>'kategori_id_lokal',
      p->>'judul',
      p->>'catatan',
      (p->>'jumlah')::numeric,
      (p->>'tanggal_transaksi')::date,
      p->>'sumber_data',
      (p->>'is_deleted')::boolean,
      (p->>'created_at')::timestamptz,
      (p->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'pemasukan') AS p
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      dompet_id_lokal = EXCLUDED.dompet_id_lokal,
      kategori_id_lokal = EXCLUDED.kategori_id_lokal,
      judul = EXCLUDED.judul,
      catatan = EXCLUDED.catatan,
      jumlah = EXCLUDED.jumlah,
      tanggal_transaksi = EXCLUDED.tanggal_transaksi,
      sumber_data = EXCLUDED.sumber_data,
      is_deleted = EXCLUDED.is_deleted,
      updated_at = EXCLUDED.updated_at
    WHERE public.pemasukan.updated_at < EXCLUDED.updated_at;
  END IF;

  -- 6. PENGELUARAN
  IF payload ? 'pengeluaran' THEN
    INSERT INTO public.pengeluaran (
      pengguna_id, id_lokal, dompet_id_lokal, kategori_id_lokal,
      judul, catatan, jumlah, tanggal_transaksi, pakai_dana_darurat,
      sumber_data, is_deleted, created_at, updated_at
    )
    SELECT
      v_user_id,
      g->>'id_lokal',
      g->>'dompet_id_lokal',
      g->>'kategori_id_lokal',
      g->>'judul',
      g->>'catatan',
      (g->>'jumlah')::numeric,
      (g->>'tanggal_transaksi')::date,
      (g->>'pakai_dana_darurat')::boolean,
      g->>'sumber_data',
      (g->>'is_deleted')::boolean,
      (g->>'created_at')::timestamptz,
      (g->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'pengeluaran') AS g
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      dompet_id_lokal = EXCLUDED.dompet_id_lokal,
      kategori_id_lokal = EXCLUDED.kategori_id_lokal,
      judul = EXCLUDED.judul,
      catatan = EXCLUDED.catatan,
      jumlah = EXCLUDED.jumlah,
      tanggal_transaksi = EXCLUDED.tanggal_transaksi,
      pakai_dana_darurat = EXCLUDED.pakai_dana_darurat,
      sumber_data = EXCLUDED.sumber_data,
      is_deleted = EXCLUDED.is_deleted,
      updated_at = EXCLUDED.updated_at
    WHERE public.pengeluaran.updated_at < EXCLUDED.updated_at;
  END IF;

  -- 7. PENGINGAT TAGIHAN
  IF payload ? 'pengingatTagihan' THEN
    INSERT INTO public.pengingat_tagihan (
      pengguna_id, id_lokal, judul, catatan, nominal, dompet_id_lokal,
      tanggal_jatuh_tempo, jam_pengingat, status, pengulangan,
      notifikasi_diaktifkan, sumber_data, created_at, updated_at
    )
    SELECT
      v_user_id,
      pt->>'id_lokal',
      pt->>'judul',
      pt->>'catatan',
      (pt->>'nominal')::numeric,
      pt->>'dompet_id_lokal',
      (pt->>'tanggal_jatuh_tempo')::date,
      (pt->>'jam_pengingat')::time,
      pt->>'status',
      pt->>'pengulangan',
      (pt->>'notifikasi_diaktifkan')::boolean,
      pt->>'sumber_data',
      (pt->>'created_at')::timestamptz,
      (pt->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'pengingatTagihan') AS pt
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      judul = EXCLUDED.judul,
      catatan = EXCLUDED.catatan,
      nominal = EXCLUDED.nominal,
      dompet_id_lokal = EXCLUDED.dompet_id_lokal,
      tanggal_jatuh_tempo = EXCLUDED.tanggal_jatuh_tempo,
      jam_pengingat = EXCLUDED.jam_pengingat,
      status = EXCLUDED.status,
      pengulangan = EXCLUDED.pengulangan,
      notifikasi_diaktifkan = EXCLUDED.notifikasi_diaktifkan,
      updated_at = EXCLUDED.updated_at
    WHERE public.pengingat_tagihan.updated_at < EXCLUDED.updated_at;
  END IF;

  -- 8. TRANSFER DOMPET
  IF payload ? 'transferDompet' THEN
    INSERT INTO public.transfer_dompet (
      pengguna_id, id_lokal, dompet_sumber_id_lokal, dompet_tujuan_id_lokal,
      jumlah, tanggal_transfer, catatan, sumber_dana_darurat, created_at, updated_at
    )
    SELECT
      v_user_id,
      td->>'id_lokal',
      td->>'dompet_sumber_id_lokal',
      td->>'dompet_tujuan_id_lokal',
      (td->>'jumlah')::numeric,
      (td->>'tanggal_transfer')::date,
      td->>'catatan',
      (td->>'sumber_dana_darurat')::boolean,
      (td->>'created_at')::timestamptz,
      (td->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'transferDompet') AS td
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      dompet_sumber_id_lokal = EXCLUDED.dompet_sumber_id_lokal,
      dompet_tujuan_id_lokal = EXCLUDED.dompet_tujuan_id_lokal,
      jumlah = EXCLUDED.jumlah,
      tanggal_transfer = EXCLUDED.tanggal_transfer,
      catatan = EXCLUDED.catatan,
      sumber_dana_darurat = EXCLUDED.sumber_dana_darurat,
      updated_at = EXCLUDED.updated_at
    WHERE public.transfer_dompet.updated_at < EXCLUDED.updated_at;
  END IF;

  -- 9. ANGGARAN BULANAN (SOFT-DELETE AMAN DENGAN PARTIAL INDEX)
  IF payload ? 'anggaranBulanan' THEN
    -- Nonaktifkan anggaran lama dengan bulan+kategori sama dan ID berbeda
    UPDATE public.anggaran_bulanan target
    SET is_aktif = false, updated_at = timezone('utc', now())
    FROM (
      SELECT
        ab->>'id_lokal' AS id_baru,
        ab->>'bulan' AS bln,
        ab->>'kategori_id_lokal' AS kat
      FROM jsonb_array_elements(payload->'anggaranBulanan') AS ab
    ) source
    WHERE target.pengguna_id = v_user_id
      AND target.bulan = source.bln
      AND target.kategori_id_lokal IS NOT DISTINCT FROM source.kat
      AND target.id_lokal <> source.id_baru
      AND target.is_aktif = true;

    -- Sisipkan/update data baru
    INSERT INTO public.anggaran_bulanan (
      pengguna_id, id_lokal, bulan, nama, kategori_id_lokal,
      batas_nominal, ambang_peringatan_persen, is_aktif, created_at, updated_at
    )
    SELECT
      v_user_id,
      ab->>'id_lokal',
      ab->>'bulan',
      ab->>'nama',
      ab->>'kategori_id_lokal',
      (ab->>'batas_nominal')::numeric,
      (ab->>'ambang_peringatan_persen')::numeric,
      (ab->>'is_aktif')::boolean,
      (ab->>'created_at')::timestamptz,
      (ab->>'updated_at')::timestamptz
    FROM jsonb_array_elements(payload->'anggaranBulanan') AS ab
    ON CONFLICT (pengguna_id, id_lokal) DO UPDATE SET
      bulan = EXCLUDED.bulan,
      nama = EXCLUDED.nama,
      kategori_id_lokal = EXCLUDED.kategori_id_lokal,
      batas_nominal = EXCLUDED.batas_nominal,
      ambang_peringatan_persen = EXCLUDED.ambang_peringatan_persen,
      is_aktif = EXCLUDED.is_aktif,
      updated_at = EXCLUDED.updated_at
    WHERE public.anggaran_bulanan.updated_at < EXCLUDED.updated_at;
  END IF;

END;
$$;