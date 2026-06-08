import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  LayoutAnimation,
  Text,
  View,
} from "react-native";
import {
  type Href,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import {
  AppButton,
  AppCard,
  AppDateField,
  AppHeading,
  AppLoader,
  AppScreen,
  AppTextField,
  GuestModeNotice,
  OptionChip,
  RecentTransactionItem,
} from "@/components";
import { ROUTES } from "@/constants";
import {
  getKategoriPemasukanAktif,
  getKategoriPengeluaranAktif,
  getRiwayatTransaksiTerbaru,
  getSemuaDompetAktif,
  hapusKategoriLokal,
  hapusTransaksiLokalDanKembalikanSaldo,
  tambahPemasukanLokal,
  tambahPengeluaranLokal,
  tambahKategoriPemasukanLokal,
  tambahKategoriPengeluaranLokal,
  ubahKategoriLokal,
  type DompetRow,
  type JenisTransaksi,
  type KategoriPemasukanRow,
  type KategoriPengeluaranRow,
  type KelompokKategoriPengeluaran,
  type RiwayatTransaksiRow,
} from "@/database";
import { useAuthSession } from "@/providers/AuthProvider";
import {
  formatRupiah,
  getTodayDateInput,
  isValidDateInput,
  parseNumericInput,
  sanitizeNumericInput,
} from "@/utils";
import { transaksiScreenStyles } from "@assets/styles/screens/protected/transaksiScreen.styles";

function animateLayoutChange() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

type LoadedData = {
  dompetList: DompetRow[];
  kategoriPemasukan: KategoriPemasukanRow[];
  kategoriPengeluaran: KategoriPengeluaranRow[];
  riwayatTerbaru: RiwayatTransaksiRow[];
};

type KategoriAktifRow = KategoriPemasukanRow | KategoriPengeluaranRow;

function getFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getJenisTransaksiFromParam(
  value: string | string[] | undefined
): JenisTransaksi | null {
  const normalized = getFirstSearchParam(value);

  if (normalized === "pemasukan" || normalized === "pengeluaran") {
    return normalized;
  }

  return null;
}

function getRouteIntentKey(
  jenis: string | string[] | undefined,
  intentId: string | string[] | undefined
) {
  return `${getFirstSearchParam(jenis) ?? ""}|${
    getFirstSearchParam(intentId) ?? ""
  }`;
}

export default function TransaksiTabPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    jenis?: string | string[];
    intentId?: string | string[];
  }>();
  const lastAppliedRouteIntentRef = useRef<string | null>(null);

  const db = useSQLiteContext();
  const { isGuestMode } = useAuthSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [jenisTransaksi, setJenisTransaksi] =
    useState<JenisTransaksi>("pengeluaran");

  const [dompetList, setDompetList] = useState<DompetRow[]>([]);
  const [kategoriPemasukan, setKategoriPemasukan] = useState<
    KategoriPemasukanRow[]
  >([]);
  const [kategoriPengeluaran, setKategoriPengeluaran] = useState<
    KategoriPengeluaranRow[]
  >([]);
  const [riwayatTerbaru, setRiwayatTerbaru] = useState<RiwayatTransaksiRow[]>(
    []
  );

  const [selectedDompetId, setSelectedDompetId] = useState<string | null>(null);
  const [selectedKategoriId, setSelectedKategoriId] = useState<string | null>(
    null
  );

  const [judul, setJudul] = useState("");
  const [jumlahInput, setJumlahInput] = useState("");
  const [tanggalTransaksi, setTanggalTransaksi] = useState(getTodayDateInput());
  const [catatan, setCatatan] = useState("");

  const [konfirmasiGunakanDanaDarurat, setKonfirmasiGunakanDanaDarurat] =
    useState(false);

  const [showTambahKategori, setShowTambahKategori] = useState(false);
  const [namaKategoriBaru, setNamaKategoriBaru] = useState("");
  const [kelompokKategoriBaru, setKelompokKategoriBaru] =
    useState<KelompokKategoriPengeluaran>("lainnya");
  const [editingKategoriId, setEditingKategoriId] = useState<string | null>(
    null
  );

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const jumlahValue = useMemo(
    () => parseNumericInput(jumlahInput),
    [jumlahInput]
  );

  const kategoriAktif = useMemo(() => {
    return jenisTransaksi === "pemasukan"
      ? kategoriPemasukan
      : kategoriPengeluaran;
  }, [jenisTransaksi, kategoriPemasukan, kategoriPengeluaran]);

  const selectedDompet = useMemo(() => {
    return dompetList.find((item) => item.id === selectedDompetId) ?? null;
  }, [dompetList, selectedDompetId]);

  const saldoSebelum = selectedDompet?.saldo_saat_ini ?? 0;

  const saldoSesudah = useMemo(() => {
    if (!selectedDompet) return 0;

    if (jenisTransaksi === "pemasukan") {
      return saldoSebelum + jumlahValue;
    }

    return saldoSebelum - jumlahValue;
  }, [jenisTransaksi, jumlahValue, saldoSebelum, selectedDompet]);

  const isUsingDanaDarurat =
    jenisTransaksi === "pengeluaran" &&
    selectedDompet?.jenis === "dana_darurat";

  const willBeNegative =
    jenisTransaksi === "pengeluaran" &&
    !!selectedDompet &&
    jumlahValue > 0 &&
    saldoSesudah < 0;

  const fetchData = useCallback(async (): Promise<LoadedData> => {
    const dompetData = await getSemuaDompetAktif(db);
    const pemasukanData = await getKategoriPemasukanAktif(db);
    const pengeluaranData = await getKategoriPengeluaranAktif(db);
    const riwayatData = await getRiwayatTransaksiTerbaru(db, 8);

    return {
      dompetList: dompetData,
      kategoriPemasukan: pemasukanData,
      kategoriPengeluaran: pengeluaranData,
      riwayatTerbaru: riwayatData,
    };
  }, [db]);

  function applyLoadedData(data: LoadedData) {
    setDompetList(data.dompetList);
    setKategoriPemasukan(data.kategoriPemasukan);
    setKategoriPengeluaran(data.kategoriPengeluaran);
    setRiwayatTerbaru(data.riwayatTerbaru);
  }

  async function refreshTransaksiData() {
    const refreshed = await fetchData();
    applyLoadedData(refreshed);
  }

  function resetKategoriDraft() {
    setShowTambahKategori(false);
    setEditingKategoriId(null);
    setNamaKategoriBaru("");
    setKelompokKategoriBaru("lainnya");
  }

  function handleChangeJenis(nextJenis: JenisTransaksi) {
    animateLayoutChange();
    setJenisTransaksi(nextJenis);
    setSelectedKategoriId(null);
    resetKategoriDraft();
    setFormError("");
    setSuccessMessage("");
  }

  function syncJenisTransaksiFromRoute(force = false) {
    const nextJenis = getJenisTransaksiFromParam(params.jenis);

    if (!nextJenis) {
      return;
    }

    const routeIntentKey = getRouteIntentKey(params.jenis, params.intentId);

    if (!force && lastAppliedRouteIntentRef.current === routeIntentKey) {
      return;
    }

    lastAppliedRouteIntentRef.current = routeIntentKey;

    if (nextJenis !== jenisTransaksi) {
      handleChangeJenis(nextJenis);
    }
  }

  function handleEditTransaksi(item: RiwayatTransaksiRow) {
    const href =
      `${ROUTES.PROTECTED.EDIT_TRANSAKSI}?id=${encodeURIComponent(
        item.id
      )}&jenis=${item.jenis_transaksi}` as Href;

    router.push(href);
  }

  function handleHapusTransaksi(item: RiwayatTransaksiRow) {
    Alert.alert(
      "Hapus transaksi ini?",
      `Transaksi "${item.judul}" akan dihapus. Saldo dompet akan disesuaikan kembali secara otomatis.`,
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSubmitting(true);
              setFormError("");
              setSuccessMessage("");

              await hapusTransaksiLokalDanKembalikanSaldo(db, {
                id: item.id,
                jenisTransaksi: item.jenis_transaksi,
              });

              Alert.alert(
                "Berhasil",
                "Transaksi telah dihapus dan saldo dompet sudah dikembalikan."
              );

              await refreshTransaksiData();
            } catch (error) {
              console.log("handleHapusTransaksi error:", error);
              setFormError(
                error instanceof Error
                  ? error.message
                  : "Transaksi belum berhasil dihapus."
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  }

  function isKategoriSistem(id: string) {
    return id === "kat-peng-lainnya" || id === "kat-pem-lainnya";
  }

  function handleLongPressKategori(item: KategoriAktifRow) {
    if (isKategoriSistem(item.id) || item.is_bawaan) {
      Alert.alert(
        "Kategori bawaan",
        "Kategori bawaan aplikasi tidak bisa diubah atau dihapus."
      );
      return;
    }

    const jenisKategori = jenisTransaksi;

    Alert.alert(
      "Kelola kategori",
      `Apa yang ingin kamu lakukan pada kategori "${item.nama}"?`,
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Ubah nama",
          onPress: () => {
            animateLayoutChange();
            setEditingKategoriId(item.id);
            setNamaKategoriBaru(item.nama);
            setShowTambahKategori(true);
            setSelectedKategoriId(item.id);
            setFormError("");
            setSuccessMessage("");
          },
        },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () =>
            confirmHapusKategori({
              id: item.id,
              nama: item.nama,
              jenis: jenisKategori,
            }),
        },
      ]
    );
  }

  function confirmHapusKategori(payload: {
    id: string;
    nama: string;
    jenis: JenisTransaksi;
  }) {
    Alert.alert(
      "Hapus kategori ini?",
      `Kategori "${payload.nama}" akan dihapus dari daftar aktif. Kalau kategori ini sudah pernah dipakai transaksi, penghapusan akan ditolak supaya riwayat tetap aman.`,
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSubmitting(true);
              setFormError("");
              setSuccessMessage("");

              await hapusKategoriLokal(db, {
                id: payload.id,
                jenis: payload.jenis,
              });

              animateLayoutChange();

              if (selectedKategoriId === payload.id) {
                setSelectedKategoriId(null);
              }

              if (editingKategoriId === payload.id) {
                resetKategoriDraft();
              }

              setSuccessMessage(`Kategori "${payload.nama}" berhasil dihapus.`);
              await refreshTransaksiData();
            } catch (error) {
              console.log("confirmHapusKategori error:", error);
              setFormError(
                error instanceof Error
                  ? error.message
                  : "Kategori belum berhasil dihapus."
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  }

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadScreenData() {
        try {
          setIsLoading(true);
          syncJenisTransaksiFromRoute(true);

          const data = await fetchData();

          if (!isActive) return;
          applyLoadedData(data);
        } catch (error) {
          console.log("load transaksi screen error:", error);
        } finally {
          if (!isActive) return;
          setIsLoading(false);
        }
      }

      loadScreenData();

      return () => {
        isActive = false;
      };
    }, [fetchData, params.intentId, params.jenis])
  );

  useEffect(() => {
    syncJenisTransaksiFromRoute();
    // Hanya bereaksi pada perubahan query param route. Manual toggle tetap bebas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.intentId, params.jenis]);

  useEffect(() => {
    if (!isUsingDanaDarurat && konfirmasiGunakanDanaDarurat) {
      setKonfirmasiGunakanDanaDarurat(false);
    }
  }, [isUsingDanaDarurat, konfirmasiGunakanDanaDarurat]);

  useEffect(() => {
    if (
      !selectedDompetId ||
      !dompetList.some((item) => item.id === selectedDompetId)
    ) {
      setSelectedDompetId(dompetList[0]?.id ?? null);
    }
  }, [dompetList, selectedDompetId]);

  useEffect(() => {
    if (
      !selectedKategoriId ||
      !kategoriAktif.some((item) => item.id === selectedKategoriId)
    ) {
      setSelectedKategoriId(kategoriAktif[0]?.id ?? null);
    }
  }, [kategoriAktif, selectedKategoriId]);

  function resetFormAfterSubmit() {
    animateLayoutChange();
    setJudul("");
    setJumlahInput("");
    setCatatan("");
    setTanggalTransaksi(getTodayDateInput());
    setKonfirmasiGunakanDanaDarurat(false);
    setFormError("");
    resetKategoriDraft();
  }

  async function handleTambahKategori() {
    try {
      setFormError("");
      setSuccessMessage("");

      const namaKategoriBersih = namaKategoriBaru.trim();

      if (namaKategoriBersih.length < 2) {
        setFormError("Nama kategori minimal 2 karakter.");
        return;
      }

      if (editingKategoriId) {
        const targetKategoriId = editingKategoriId;
        const targetJenis = jenisTransaksi;

        Alert.alert(
          "Ubah nama kategori?",
          `Nama kategori akan diubah menjadi "${namaKategoriBersih}". Riwayat transaksi lama tetap aman dan akan mengikuti nama kategori terbaru.`,
          [
            {
              text: "Batal",
              style: "cancel",
            },
            {
              text: "Ubah",
              onPress: async () => {
                try {
                  setIsSubmitting(true);
                  setFormError("");
                  setSuccessMessage("");

                  await ubahKategoriLokal(db, {
                    id: targetKategoriId,
                    jenis: targetJenis,
                    namaBaru: namaKategoriBersih,
                  });

                  animateLayoutChange();

                  setEditingKategoriId(null);
                  setNamaKategoriBaru("");
                  setKelompokKategoriBaru("lainnya");
                  setShowTambahKategori(false);
                  setSelectedKategoriId(targetKategoriId);
                  setSuccessMessage("Nama kategori berhasil diubah.");

                  await refreshTransaksiData();
                } catch (error) {
                  console.log("handleEditKategori error:", error);
                  setFormError(
                    error instanceof Error
                      ? error.message
                      : "Nama kategori belum berhasil diubah."
                  );
                } finally {
                  setIsSubmitting(false);
                }
              },
            },
          ]
        );

        return;
      }

      setIsSubmitting(true);

      let newKategoriId = "";

      if (jenisTransaksi === "pemasukan") {
        newKategoriId = await tambahKategoriPemasukanLokal(db, {
          nama: namaKategoriBersih,
        });
      } else {
        newKategoriId = await tambahKategoriPengeluaranLokal(db, {
          nama: namaKategoriBersih,
          kelompok: kelompokKategoriBaru,
        });
      }

      animateLayoutChange();

      setNamaKategoriBaru("");
      setKelompokKategoriBaru("lainnya");
      setShowTambahKategori(false);
      setSelectedKategoriId(newKategoriId);
      setSuccessMessage("Kategori baru berhasil ditambahkan.");

      await refreshTransaksiData();
    } catch (error) {
      console.log("handleTambahKategori error:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Kategori baru belum berhasil disimpan."
      );
    } finally {
      if (!editingKategoriId) {
        setIsSubmitting(false);
      }
    }
  }

  async function handleSubmit() {
    Keyboard.dismiss();

    try {
      setFormError("");
      setSuccessMessage("");

      if (judul.trim().length < 2) {
        setFormError("Judul transaksi minimal 2 karakter.");
        return;
      }

      if (jumlahValue <= 0) {
        setFormError("Jumlah transaksi harus lebih dari 0.");
        return;
      }

      if (!selectedDompetId) {
        setFormError("Pilih dompet terlebih dahulu.");
        return;
      }

      if (!selectedKategoriId) {
        setFormError("Pilih kategori terlebih dahulu.");
        return;
      }

      if (!isValidDateInput(tanggalTransaksi)) {
        setFormError("Tanggal wajib format YYYY-MM-DD.");
        return;
      }

      if (isUsingDanaDarurat && !konfirmasiGunakanDanaDarurat) {
        setFormError(
          "Kamu perlu mengonfirmasi penggunaan dana darurat terlebih dahulu."
        );
        return;
      }

      setIsSubmitting(true);

      if (jenisTransaksi === "pemasukan") {
        await tambahPemasukanLokal(db, {
          dompetId: selectedDompetId,
          kategoriId: selectedKategoriId,
          judul,
          catatan,
          jumlah: jumlahValue,
          tanggalTransaksi,
        });

        setSuccessMessage("Pemasukan berhasil dicatat.");
      } else {
        await tambahPengeluaranLokal(db, {
          dompetId: selectedDompetId,
          kategoriId: selectedKategoriId,
          judul,
          catatan,
          jumlah: jumlahValue,
          tanggalTransaksi,
          pakaiDanaDarurat: selectedDompet?.jenis === "dana_darurat",
        });

        setSuccessMessage("Pengeluaran berhasil dicatat.");
      }

      resetFormAfterSubmit();

      await refreshTransaksiData();
    } catch (error) {
      console.log("handleSubmit transaksi error:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan transaksi. Coba lagi."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <AppLoader label="Menyiapkan form transaksi..." />;
  }

  return (
    <AppScreen scrollable withFloatingTabSpace>
      <AppHeading
        title="Transaksi"
        subtitle="Catat uang masuk dan uang keluar di sini. Saldo dompet yang kamu pilih akan ikut berubah otomatis."
      />

      {isGuestMode ? (
        <View style={transaksiScreenStyles.notice}>
          <GuestModeNotice />
        </View>
      ) : null}

      <AppCard style={transaksiScreenStyles.formCard}>
        <Text style={transaksiScreenStyles.sectionTitle}>Jenis transaksi</Text>
        <Text style={transaksiScreenStyles.sectionHelper}>
          Pilih apakah transaksi ini menambah saldo atau mengurangi saldo.
        </Text>

        <View style={transaksiScreenStyles.chipGroup}>
          <View style={transaksiScreenStyles.chipItem}>
            <OptionChip
              label="Pemasukan"
              helperText="Saldo dompet bertambah"
              selected={jenisTransaksi === "pemasukan"}
              onPress={() => handleChangeJenis("pemasukan")}
            />
          </View>

          <View style={transaksiScreenStyles.chipItem}>
            <OptionChip
              label="Pengeluaran"
              helperText="Saldo dompet berkurang"
              selected={jenisTransaksi === "pengeluaran"}
              onPress={() => handleChangeJenis("pengeluaran")}
            />
          </View>
        </View>

        <AppTextField
          label="Judul transaksi"
          placeholder={
            jenisTransaksi === "pemasukan"
              ? "Contoh: Penjualan hari ini"
              : "Contoh: Belanja stok warung"
          }
          value={judul}
          onChangeText={(value) => {
            setJudul(value);
            setFormError("");
            setSuccessMessage("");
          }}
          autoCapitalize="sentences"
        />

        <AppTextField
          label="Jumlah"
          placeholder="Contoh: 250000"
          value={jumlahInput}
          onChangeText={(value) => {
            setJumlahInput(sanitizeNumericInput(value));
            setFormError("");
            setSuccessMessage("");
          }}
          keyboardType="number-pad"
          helperText={
            jumlahInput
              ? `Preview nominal: ${formatRupiah(jumlahValue)}`
              : "Masukkan angka tanpa titik atau koma."
          }
        />

        <AppDateField
          label="Tanggal transaksi"
          value={tanggalTransaksi}
          onChangeDate={(value) => {
            setTanggalTransaksi(value);
            setFormError("");
            setSuccessMessage("");
          }}
          helperText="Pilih tanggal transaksi dari kalender."
        />

        <Text style={transaksiScreenStyles.sectionTitle}>Dompet</Text>
        <Text style={transaksiScreenStyles.sectionHelper}>
          Dompet yang dipilih akan langsung berubah saldonya saat transaksi
          disimpan.
        </Text>

        <View style={transaksiScreenStyles.chipGroup}>
          {dompetList.map((item) => (
            <View key={item.id} style={transaksiScreenStyles.chipItem}>
              <OptionChip
                label={item.nama}
                helperText={`${item.jenis} • ${formatRupiah(
                  item.saldo_saat_ini
                )}`}
                selected={selectedDompetId === item.id}
                onPress={() => {
                  setSelectedDompetId(item.id);
                  setFormError("");
                  setSuccessMessage("");
                }}
              />
            </View>
          ))}
        </View>

        <Text style={transaksiScreenStyles.sectionTitle}>Kategori</Text>
        <Text style={transaksiScreenStyles.sectionHelper}>
          Ketuk kategori untuk memilih. Tekan lama kategori buatan sendiri untuk
          mengubah nama atau menghapusnya.
        </Text>

        <View style={transaksiScreenStyles.chipGroup}>
          {kategoriAktif.map((item) => {
            const helper =
              jenisTransaksi === "pemasukan"
                ? "kategori pemasukan"
                : (item as KategoriPengeluaranRow).kelompok;

            return (
              <View key={item.id} style={transaksiScreenStyles.chipItem}>
                <OptionChip
                  label={item.nama}
                  helperText={helper}
                  selected={selectedKategoriId === item.id}
                  onPress={() => {
                    setFormError("");
                    setSuccessMessage("");

                    const isLainnya =
                      item.id === "kat-peng-lainnya" ||
                      item.id === "kat-pem-lainnya";

                    if (isLainnya) {
                      animateLayoutChange();
                      setEditingKategoriId(null);
                      setNamaKategoriBaru("");
                      setKelompokKategoriBaru("lainnya");
                      setShowTambahKategori(true);
                      setSelectedKategoriId(item.id);
                      return;
                    }

                    animateLayoutChange();
                    setEditingKategoriId(null);
                    setShowTambahKategori(false);
                    setSelectedKategoriId(item.id);
                  }}
                  onLongPress={() => handleLongPressKategori(item)}
                />
              </View>
            );
          })}
        </View>

        {showTambahKategori ? (
          <View style={transaksiScreenStyles.warningWrap}>
            <AppCard>
              <Text style={transaksiScreenStyles.sectionTitle}>
                {editingKategoriId ? "Ubah kategori" : "Tambah kategori baru"}
              </Text>

              <Text style={transaksiScreenStyles.sectionHelper}>
                {editingKategoriId
                  ? "Ubah nama kategori dengan hati-hati karena riwayat transaksi lama akan ikut memakai nama terbaru."
                  : "Buat kategori sendiri, misalnya Bensin, Obat, Anak sekolah, Modal usaha, atau kebutuhan lain."}
              </Text>

              <AppTextField
                label="Nama kategori"
                placeholder={
                  jenisTransaksi === "pemasukan"
                    ? "Contoh: Komisi"
                    : "Contoh: Bensin"
                }
                value={namaKategoriBaru}
                onChangeText={(value) => {
                  setNamaKategoriBaru(value);
                  setFormError("");
                  setSuccessMessage("");
                }}
              />

              {jenisTransaksi === "pengeluaran" && !editingKategoriId ? (
                <>
                  <Text style={transaksiScreenStyles.sectionTitle}>
                    Kelompok kategori
                  </Text>

                  <View style={transaksiScreenStyles.chipGroup}>
                    {[
                      ["kebutuhan", "Kebutuhan"],
                      ["rutin", "Rutin"],
                      ["fleksibel", "Fleksibel"],
                      ["usaha", "Usaha"],
                      ["lainnya", "Lainnya"],
                    ].map(([value, label]) => (
                      <View key={value} style={transaksiScreenStyles.chipItem}>
                        <OptionChip
                          label={label}
                          helperText="Pilih kelompok"
                          selected={kelompokKategoriBaru === value}
                          onPress={() => {
                            setKelompokKategoriBaru(
                              value as KelompokKategoriPengeluaran
                            );
                            setFormError("");
                            setSuccessMessage("");
                          }}
                        />
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              <AppButton
                title={
                  isSubmitting
                    ? "Menyimpan..."
                    : editingKategoriId
                    ? "Simpan perubahan kategori"
                    : "Simpan kategori baru"
                }
                style={transaksiScreenStyles.submitButton}
                disabled={isSubmitting}
                onPress={handleTambahKategori}
              />
            </AppCard>
          </View>
        ) : null}

        <AppTextField
          label="Catatan (opsional)"
          placeholder="Tulis catatan tambahan bila perlu"
          value={catatan}
          onChangeText={(value) => {
            setCatatan(value);
            setFormError("");
            setSuccessMessage("");
          }}
          multiline
        />

        <View style={transaksiScreenStyles.previewCard}>
          <Text style={transaksiScreenStyles.previewTitle}>
            Preview perubahan saldo
          </Text>

          <View style={transaksiScreenStyles.previewRow}>
            <Text style={transaksiScreenStyles.previewLabel}>
              Saldo sebelum
            </Text>
            <Text style={transaksiScreenStyles.previewValue}>
              {formatRupiah(saldoSebelum)}
            </Text>
          </View>

          <View style={transaksiScreenStyles.previewRow}>
            <Text style={transaksiScreenStyles.previewLabel}>
              Nilai transaksi
            </Text>
            <Text style={transaksiScreenStyles.previewValue}>
              {formatRupiah(jumlahValue)}
            </Text>
          </View>

          <View style={transaksiScreenStyles.previewRow}>
            <Text style={transaksiScreenStyles.previewLabel}>
              Saldo sesudah
            </Text>
            <Text style={transaksiScreenStyles.previewValue}>
              {formatRupiah(saldoSesudah)}
            </Text>
          </View>
        </View>

        {isUsingDanaDarurat ? (
          <View style={transaksiScreenStyles.warningWrap}>
            <GuestModeNotice
              title="Dana darurat sedang dipakai"
              text="Pengeluaran ini berasal dari dompet dana darurat. Untuk mencegah pemakaian yang terlalu spontan, kamu perlu mengonfirmasi dulu sebelum transaksi disimpan."
            />

            <View style={transaksiScreenStyles.chipGroup}>
              <View style={transaksiScreenStyles.chipItemWide}>
                <OptionChip
                  label="Saya paham ini memakai dana darurat"
                  helperText="Gunakan hanya untuk kebutuhan mendesak."
                  selected={konfirmasiGunakanDanaDarurat}
                  onPress={() => {
                    setKonfirmasiGunakanDanaDarurat((prev) => !prev);
                    setFormError("");
                    setSuccessMessage("");
                  }}
                />
              </View>
            </View>
          </View>
        ) : null}

        {willBeNegative ? (
          <View style={transaksiScreenStyles.warningWrap}>
            <GuestModeNotice
              title="Saldo dompet akan menjadi minus"
              text="Aplikasi tetap mengizinkan penyimpanan supaya pencatatan tidak terhambat, tetapi kondisi ini akan memengaruhi evaluasi kesehatan keuangan dan batas belanja aman."
            />
          </View>
        ) : null}

        {!!formError ? (
          <Text style={transaksiScreenStyles.errorText}>{formError}</Text>
        ) : null}

        {!!successMessage ? (
          <Text style={transaksiScreenStyles.successText}>
            {successMessage}
          </Text>
        ) : null}

        <AppButton
          title={
            isSubmitting
              ? "Menyimpan transaksi..."
              : jenisTransaksi === "pemasukan"
              ? "Simpan pemasukan"
              : "Simpan pengeluaran"
          }
          style={transaksiScreenStyles.submitButton}
          disabled={isSubmitting}
          onPress={handleSubmit}
        />
      </AppCard>

      <View style={transaksiScreenStyles.recentSection}>
        <Text style={transaksiScreenStyles.recentTitle}>Transaksi terbaru</Text>
        <Text style={transaksiScreenStyles.recentSubtitle}>
          Riwayat di bawah ini diambil dari tabel pemasukan dan pengeluaran
          lokal.
        </Text>

        {riwayatTerbaru.length > 0 ? (
          riwayatTerbaru.map((item) => (
            <RecentTransactionItem
              key={`${item.jenis_transaksi}-${item.id}`}
              item={item}
              onEditPress={handleEditTransaksi}
              onDeletePress={handleHapusTransaksi}
            />
          ))
        ) : (
          <AppCard style={transaksiScreenStyles.emptyCard}>
            <Text style={transaksiScreenStyles.emptyText}>
              Belum ada transaksi. Coba simpan pemasukan atau pengeluaran
              pertama dari form di atas.
            </Text>
          </AppCard>
        )}

        <AppButton
          title="Lihat semua riwayat"
          variant="secondary"
          style={transaksiScreenStyles.submitButton}
          onPress={() => router.push(ROUTES.PROTECTED.RIWAYAT_TRANSAKSI)}
        />
      </View>
    </AppScreen>
  );
}