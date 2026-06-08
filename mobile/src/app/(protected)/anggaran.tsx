import { useCallback, useMemo, useState } from "react";
import { Alert, Keyboard, Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import {
  AppButton,
  AppCard,
  AppHeading,
  AppLoader,
  AppScreen,
  AppTextField,
  OptionChip,
  StatCard,
  StatusBadge,
} from "@/components";
import { ROUTES } from "@/constants";
import {
  getKategoriPengeluaranAktif,
  getRingkasanAnggaranBulanIni,
  nonaktifkanAnggaranBulananLokal,
  simpanAnggaranBulanan,
  ubahAnggaranBulananLokal,
  type KategoriPengeluaranRow,
  type RingkasanAnggaranBulananItem,
} from "@/database";
import {
  formatPersen,
  formatRupiah,
  parseNumericInput,
  sanitizeNumericInput,
} from "@/utils";
import { anggaranScreenStyles } from "@assets/styles/screens/protected/anggaranScreen.styles";

type LoadedAnggaranData = {
  kategoriList: KategoriPengeluaranRow[];
  anggaranList: RingkasanAnggaranBulananItem[];
};

type AnggaranBadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";

function getAnggaranBadge(persentaseTerpakai: number): {
  label: string;
  variant: AnggaranBadgeVariant;
} {
  if (persentaseTerpakai >= 1) {
    return {
      label: "Overbudget!",
      variant: "danger",
    };
  }

  if (persentaseTerpakai >= 0.8) {
    return {
      label: "Hampir Habis",
      variant: "warning",
    };
  }

  return {
    label: "Aman",
    variant: "success",
  };
}

export default function AnggaranPage() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [kategoriList, setKategoriList] = useState<KategoriPengeluaranRow[]>(
    []
  );
  const [anggaranList, setAnggaranList] = useState<
    RingkasanAnggaranBulananItem[]
  >([]);

  const [namaAnggaran, setNamaAnggaran] = useState("");
  const [batasInput, setBatasInput] = useState("");
  const [selectedKategoriId, setSelectedKategoriId] = useState<string | null>(
    null
  );
  const [editingAnggaranId, setEditingAnggaranId] = useState<string | null>(
    null
  );

  const [formError, setFormError] = useState("");

  const batasNominal = useMemo(
    () => parseNumericInput(batasInput),
    [batasInput]
  );

  const fetchData = useCallback(async (): Promise<LoadedAnggaranData> => {
    const [kategoriData, anggaranData] = await Promise.all([
      getKategoriPengeluaranAktif(db),
      getRingkasanAnggaranBulanIni(db),
    ]);

    return {
      kategoriList: kategoriData,
      anggaranList: anggaranData,
    };
  }, [db]);

  function applyLoadedData(data: LoadedAnggaranData) {
    setKategoriList(data.kategoriList);
    setAnggaranList(data.anggaranList);
  }

  async function refreshData() {
    const refreshed = await fetchData();
    applyLoadedData(refreshed);
  }

  function handlePilihKategori(kategoriId: string | null) {
    setSelectedKategoriId(kategoriId);
    setFormError("");
  }

  function resetFormAfterSubmit() {
    setNamaAnggaran("");
    setBatasInput("");
    setSelectedKategoriId(null);
    setEditingAnggaranId(null);
    setFormError("");
  }

  function handlePilihAnggaran(item: RingkasanAnggaranBulananItem) {
    setEditingAnggaranId(item.id);
    setNamaAnggaran(item.nama);
    setBatasInput(String(Math.round(item.batas_nominal)));
    setSelectedKategoriId(item.kategori_id);
    setFormError("");
  }

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function load() {
        try {
          setIsLoading(true);
          setFormError("");

          const data = await fetchData();

          if (!isActive) return;
          applyLoadedData(data);
        } catch (error) {
          console.log("load anggaran error:", error);

          if (!isActive) return;
          setFormError("Gagal memuat data anggaran.");
        } finally {
          if (!isActive) return;
          setIsLoading(false);
        }
      }

      load();

      return () => {
        isActive = false;
      };
    }, [fetchData])
  );

  async function handleSimpanAnggaran() {
    Keyboard.dismiss();

    try {
      setFormError("");

      const namaAnggaranBersih = namaAnggaran.trim();

      if (namaAnggaranBersih.length < 2) {
        setFormError("Nama anggaran minimal 2 karakter.");
        return;
      }

      if (batasNominal <= 0) {
        setFormError("Batas anggaran harus lebih dari 0.");
        return;
      }

      setIsSubmitting(true);

      if (editingAnggaranId) {
        await ubahAnggaranBulananLokal(db, {
          id: editingAnggaranId,
          nama: namaAnggaranBersih,
          kategoriId: selectedKategoriId,
          batasNominal,
          ambangPeringatanPersen: 0.8,
        });

        resetFormAfterSubmit();
        await refreshData();

        Alert.alert("Berhasil", "Anggaran berhasil diperbarui.");
        return;
      }

      await simpanAnggaranBulanan(db, {
        nama: namaAnggaranBersih,
        kategoriId: selectedKategoriId,
        batasNominal,
        ambangPeringatanPersen: 0.8,
      });

      resetFormAfterSubmit();
      await refreshData();

      Alert.alert("Berhasil", "Anggaran bulan ini berhasil disimpan.");
    } catch (error) {
      console.log("handleSimpanAnggaran error:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Anggaran belum berhasil disimpan."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleHapusAnggaran() {
    if (!editingAnggaranId) {
      setFormError("Pilih anggaran yang ingin dihapus dulu.");
      return;
    }

    const targetId = editingAnggaranId;

    Alert.alert(
      "Hapus anggaran ini?",
      "Anggaran akan disembunyikan dari daftar aktif. Data tidak dihapus permanen agar sinkronisasi cloud tetap aman.",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Hapus anggaran",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSubmitting(true);
              setFormError("");

              await nonaktifkanAnggaranBulananLokal(db, targetId);

              resetFormAfterSubmit();
              await refreshData();

              Alert.alert(
                "Berhasil",
                "Anggaran berhasil dihapus dari daftar aktif."
              );
            } catch (error) {
              console.log("handleHapusAnggaran error:", error);
              setFormError(
                error instanceof Error
                  ? error.message
                  : "Anggaran belum berhasil dihapus."
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return <AppLoader label="Memuat anggaran..." />;
  }

  return (
    <AppScreen scrollable safeTop>
      <AppButton
        title="Kembali ke profil"
        variant="secondary"
        style={anggaranScreenStyles.topButton}
        onPress={() => router.replace(ROUTES.PROTECTED.PROFIL)}
      />

      <AppHeading
        title="Anggaran bulanan"
        subtitle="Buat batas pengeluaran supaya kamu tahu kapan belanja mulai mendekati batas aman."
      />

      <AppCard style={anggaranScreenStyles.card}>
        <Text style={anggaranScreenStyles.formModeTitle}>
          {editingAnggaranId ? "Ubah anggaran" : "Buat anggaran baru"}
        </Text>

        <Text style={anggaranScreenStyles.formModeHelper}>
          {editingAnggaranId
            ? "Perbarui batas belanja kalau sebelumnya salah input atau kebutuhan bulan ini berubah."
            : "Buat batas belanja bulanan agar kamu tahu kapan pengeluaran mulai mendekati batas aman."}
        </Text>

        <AppTextField
          label="Nama anggaran"
          placeholder="Contoh: Batas jajan bulan ini"
          value={namaAnggaran}
          onChangeText={(value) => {
            setNamaAnggaran(value);
            setFormError("");
          }}
        />

        <AppTextField
          label="Batas nominal"
          placeholder="Contoh: 1000000"
          value={batasInput}
          onChangeText={(value) => {
            setBatasInput(sanitizeNumericInput(value));
            setFormError("");
          }}
          keyboardType="number-pad"
          helperText={
            batasInput
              ? `Batas: ${formatRupiah(batasNominal)}`
              : "Masukkan batas pengeluaran bulan ini."
          }
        />

        <Text style={anggaranScreenStyles.sectionTitle}>Kategori</Text>
        <Text style={anggaranScreenStyles.sectionSubtitle}>
          Pilih kategori tertentu, atau pilih Semua pengeluaran untuk membatasi
          total belanja bulanan.
        </Text>

        <View style={anggaranScreenStyles.chipGroup}>
          <View style={anggaranScreenStyles.chipItem}>
            <OptionChip
              label="Semua pengeluaran"
              helperText="Total belanja bulan ini"
              selected={selectedKategoriId === null}
              onPress={() => handlePilihKategori(null)}
            />
          </View>

          {kategoriList.map((item) => (
            <View key={item.id} style={anggaranScreenStyles.chipItem}>
              <OptionChip
                label={item.nama}
                helperText={item.kelompok}
                selected={selectedKategoriId === item.id}
                onPress={() => handlePilihKategori(item.id)}
              />
            </View>
          ))}
        </View>

        {!!formError ? (
          <Text style={anggaranScreenStyles.errorText}>{formError}</Text>
        ) : null}

        <AppButton
          title={
            isSubmitting
              ? "Menyimpan..."
              : editingAnggaranId
              ? "Simpan perubahan"
              : "Simpan anggaran"
          }
          style={anggaranScreenStyles.button}
          disabled={isSubmitting}
          onPress={handleSimpanAnggaran}
        />

        {editingAnggaranId ? (
          <>
            <AppButton
              title="Batal ubah"
              variant="secondary"
              style={anggaranScreenStyles.buttonSecondary}
              disabled={isSubmitting}
              onPress={resetFormAfterSubmit}
            />

            <AppButton
              title="Hapus anggaran"
              variant="danger"
              style={anggaranScreenStyles.buttonSecondary}
              disabled={isSubmitting}
              onPress={handleHapusAnggaran}
            />
          </>
        ) : null}
      </AppCard>

      <View style={anggaranScreenStyles.section}>
        <Text style={anggaranScreenStyles.sectionTitle}>Anggaran aktif</Text>
        <Text style={anggaranScreenStyles.sectionSubtitle}>
          Aplikasi akan memberi gambaran saat pengeluaran mendekati atau
          melewati batas. Ketuk salah satu anggaran untuk mengubah atau
          menghapusnya.
        </Text>

        {anggaranList.length > 0 ? (
          anggaranList.map((item) => {
            const badge = getAnggaranBadge(item.persentase_terpakai);
            const isSelected = editingAnggaranId === item.id;

            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Ubah anggaran ${item.nama}`}
                accessibilityHint="Ketuk untuk mengisi form dengan data anggaran ini."
                onPress={() => handlePilihAnggaran(item)}
                style={({ pressed }) => [
                  anggaranScreenStyles.budgetItem,
                  isSelected && anggaranScreenStyles.selectedCard,
                  pressed && anggaranScreenStyles.pressedCard,
                ]}
              >
                <View style={anggaranScreenStyles.budgetHeader}>
                  <Text style={anggaranScreenStyles.budgetTitle}>
                    {item.nama}
                  </Text>

                  <StatusBadge label={badge.label} variant={badge.variant} />
                </View>

                <StatCard
                  label={item.nama_kategori ?? "Semua pengeluaran"}
                  value={`${formatPersen(item.persentase_terpakai)} terpakai`}
                  helper={`${formatRupiah(
                    item.total_terpakai
                  )} dari ${formatRupiah(item.batas_nominal)}`}
                />
              </Pressable>
            );
          })
        ) : (
          <AppCard style={anggaranScreenStyles.card}>
            <Text style={anggaranScreenStyles.listText}>
              Belum ada anggaran. Buat satu anggaran dulu, misalnya batas
              jajan, batas hiburan, atau batas belanja harian.
            </Text>
          </AppCard>
        )}
      </View>
    </AppScreen>
  );
}