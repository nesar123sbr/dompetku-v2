-- Migration: 20261106100000_000006_delete_account_rpc.sql
-- Deskripsi: Fungsi RPC aman untuk menghapus seluruh data pengguna sebelum deleteUser di auth.admin

CREATE OR REPLACE FUNCTION public.hapus_semua_data_pengguna(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Keamanan: Hanya user itu sendiri atau service_role yang boleh menjalankan
  IF auth.uid() IS NOT NULL AND auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'Akses ditolak: Tidak dapat menghapus data pengguna lain.';
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

REVOKE ALL ON FUNCTION public.hapus_semua_data_pengguna(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hapus_semua_data_pengguna(UUID) TO authenticated, service_role;
