import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Keyboard, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import {
  AppButton,
  AppCard,
  AppDateField,
  AppHeading,
  AppLoader,
  AppScreen,
  AppTextField,
  OptionChip,
} from "@/components";
import { ROUTES } from "@/constants";
import {
  getDetailTransaksiUntukEdit,
  getKategoriPemasukanAktif,
  getKategoriPengeluaranAktif,
  getSemuaDompetAktif,
  ubahTransaksiLokalDanSesuaikanSaldo,
  type DetailTransaksiEdit,
  type DompetRow,
  type JenisTransaksi,
  type KategoriPemasukanRow,
  type KategoriPengeluaranRow,
} from "@/database";
import {
  formatRupiah,
  isValidDateInput,
  parseNumericInput,
  sanitizeNumericInput,
} from "@/utils";
import { editTransaksiScreenStyles } from "@assets/styles/screens/protected/editTransaksiScreen.styles";

function isJenisTransaksi(value: string): value is JenisTransaksi {
  return value === "pemasukan" || value === "pengeluaran";
}

export default function EditTransaksiPage() {
  const router = useRouter();
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id?: string; jenis?: string }>();

  const id = typeof params.id === "string" ? params.id : "";
  const rawJenis = typeof params.jenis === "string" ? params.jenis : "";

  const jenisTransaksi: JenisTransaksi =
    rawJenis === "pemasukan" ? "pemasukan" : "pengeluaran";

  const isValidRoute = Boolean(id) && isJenisTransaksi(rawJenis);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [detail, setDetail] = useState<DetailTransaksiEdit | null>(null);
  const [dompetList, setDompetList] = useState<DompetRow[]>([]);
  const [kategoriPemasukan, setKategoriPemasukan] = useState<
    KategoriPemasukanRow[]
  >([]);
  const [kategoriPengeluaran, setKategoriPengeluaran] = useState<
    KategoriPengeluaranRow[]
  >([]);

  const [selectedDompetId, setSelectedDompetId] = useState<string | null>(null);
  const [selectedKategoriId, setSelectedKategoriId] = useState<string | null>(
    null
  );

  const [judul, setJudul] = useState("");
  const [jumlahInput, setJumlahInput] = useState("");
  const [tanggalTransaksi, setTanggalTransaksi] = useState("");
  const [catatan, setCatatan] = useState("");

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

  const isDompetBerubah = Boolean(
    detail && selectedDompetId && selectedDompetId !== detail.dompet_id
  );

  const saldoSebelum = useMemo(() => {
    if (!selectedDompet) {
      return 0;
    }

    if (!detail) {
      return selectedDompet.saldo_saat_ini;
    }

    if (selectedDompet.id !== detail.dompet_id) {
      return selectedDompet.saldo_saat_ini;
    }

    if (jenisTransaksi === "pemasukan") {
      return selectedDompet.saldo_saat_ini - detail.jumlah;
    }

    return selectedDompet.saldo_saat_ini + detail.jumlah;
  }, [selectedDompet, detail, jenisTransaksi]);

  const saldoSesudah = useMemo(() => {
    if (!selectedDompet) {
      return 0;
    }

    if (jenisTransaksi === "pemasukan") {
      return saldoSebelum + jumlahValue;
    }

    return saldoSebelum - jumlahValue;
  }, [jenisTransaksi, jumlahValue, saldoSebelum, selectedDompet]);

  function clearFeedback() {
    setFormError("");
    setSuccessMessage("");
  }

  function getKategoriHelper(
    item: KategoriPemasukanRow | KategoriPengeluaranRow
  ) {
    if (jenisTransaksi === "pengeluaran") {
      return (item as KategoriPengeluaranRow).kelompok;
    }

    return "pemasukan";
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          setIsLoading(true);
          setFormError("");
          setSuccessMessage("");

          if (!isValidRoute) {
            if (!active) return;

            setDetail(null);
            setFormError("Parameter transaksi tidak valid.");
            return;
          }

          const [detailData, dompetData, kp, kg] = await Promise.all([
            getDetailTransaksiUntukEdit(db, {
              id,
              jenisTransaksi,
            }),
            getSemuaDompetAktif(db),
            getKategoriPemasukanAktif(db),
            getKategoriPengeluaranAktif(db),
          ]);

          if (!active) return;

          setDetail(detailData);
          setDompetList(dompetData);
          setKategoriPemasukan(kp);
          setKategoriPengeluaran(kg);

          if (!detailData) {
            setFormError("Transaksi tidak ditemukan.");
            return;
          }

          setSelectedDompetId(detailData.dompet_id);
          setSelectedKategoriId(detailData.kategori_id);
          setJudul(detailData.judul);
          setJumlahInput(String(Math.round(detailData.jumlah)));
          setTanggalTransaksi(detailData.tanggal_transaksi);
          setCatatan(detailData.catatan ?? "");
        } catch (error) {
          console.log("load edit transaksi error:", error);

          if (!active) return;

          setFormError(
            error instanceof Error
              ? error.message
              : "Transaksi belum berhasil dimuat."
          );
        } finally {
          if (!active) return;
          setIsLoading(false);
        }
      }

      load();

      return () => {
        active = false;
      };
    }, [db, id, jenisTransaksi, isValidRoute])
  );

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

  async function submitPerubahan() {
    if (!detail || !selectedDompetId || !selectedKategoriId) {
      setFormError("Data transaksi belum lengkap.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError("");
      setSuccessMessage("");

      await ubahTransaksiLokalDanSesuaikanSaldo(db, {
        id: detail.id,
        jenisTransaksi: detail.jenis_transaksi,
        dompetId: selectedDompetId,
        kategoriId: selectedKategoriId,
        judul,
        catatan,
        jumlah: jumlahValue,
        tanggalTransaksi,
      });

      setSuccessMessage("Transaksi berhasil diperbarui.");

      Alert.alert("Berhasil", "Transaksi berhasil diperbarui.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.log("submitPerubahan edit transaksi error:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Transaksi belum berhasil diperbarui."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSave() {
    Keyboard.dismiss();
    clearFeedback();

    if (!detail) {
      setFormError("Transaksi tidak ditemukan.");
      return;
    }

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
      setFormError("Tanggal transaksi belum valid.");
      return;
    }

    Alert.alert(
      "Simpan perubahan?",
      "Saldo dompet akan disesuaikan ulang berdasarkan data transaksi yang baru.",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Simpan",
          onPress: submitPerubahan,
        },
      ]
    );
  }

  if (isLoading) {
    return <AppLoader label="Memuat transaksi..." />;
  }

  if (!detail) {
    return (
      <AppScreen scrollable safeTop>
        <AppButton
          title="Kembali"
          variant="secondary"
          style={editTransaksiScreenStyles.topButton}
          onPress={() => router.replace(ROUTES.PROTECTED.TRANSAKSI)}
        />

        <AppHeading
          title="Ubah transaksi"
          subtitle="Data transaksi tidak bisa ditampilkan."
        />

        <AppCard style={editTransaksiScreenStyles.card}>
          <Text style={editTransaksiScreenStyles.errorText}>
            {formError || "Transaksi tidak ditemukan."}
          </Text>
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable safeTop>
      <AppButton
        title="Kembali"
        variant="secondary"
        style={editTransaksiScreenStyles.topButton}
        onPress={() => router.back()}
      />

      <AppHeading
        title="Ubah transaksi"
        subtitle="Perbaiki judul, nominal, tanggal, dompet, atau kategori kalau ada catatan yang salah."
      />

      <AppCard style={editTransaksiScreenStyles.card}>
        <AppTextField
          label="Judul transaksi"
          value={judul}
          onChangeText={(value) => {
            setJudul(value);
            clearFeedback();
          }}
          placeholder="Contoh: Belanja bensin"
        />

        <AppTextField
          label="Jumlah"
          value={jumlahInput}
          onChangeText={(value) => {
            setJumlahInput(sanitizeNumericInput(value));
            clearFeedback();
          }}
          keyboardType="number-pad"
          helperText={
            jumlahInput
              ? `Preview: ${formatRupiah(jumlahValue)}`
              : "Masukkan angka tanpa titik atau koma."
          }
        />

        <AppDateField
          label="Tanggal transaksi"
          value={tanggalTransaksi}
          onChangeDate={(value) => {
            setTanggalTransaksi(value);
            clearFeedback();
          }}
          helperText="Pilih tanggal transaksi dari kalender."
        />

        <Text style={editTransaksiScreenStyles.sectionTitle}>Dompet</Text>
        <Text style={editTransaksiScreenStyles.sectionHelper}>
          Jika dompet diganti, saldo dompet lama dan dompet baru akan
          disesuaikan otomatis.
        </Text>

        <View style={editTransaksiScreenStyles.chipGroup}>
          {dompetList.map((item) => (
            <View key={item.id} style={editTransaksiScreenStyles.chipItem}>
              <OptionChip
                label={item.nama}
                helperText={formatRupiah(item.saldo_saat_ini)}
                selected={selectedDompetId === item.id}
                onPress={() => {
                  setSelectedDompetId(item.id);
                  clearFeedback();
                }}
              />
            </View>
          ))}
        </View>

        <Text style={editTransaksiScreenStyles.sectionTitle}>Kategori</Text>

        <View style={editTransaksiScreenStyles.chipGroup}>
          {kategoriAktif.map((item) => (
            <View key={item.id} style={editTransaksiScreenStyles.chipItem}>
              <OptionChip
                label={item.nama}
                helperText={getKategoriHelper(item)}
                selected={selectedKategoriId === item.id}
                onPress={() => {
                  setSelectedKategoriId(item.id);
                  clearFeedback();
                }}
              />
            </View>
          ))}
        </View>

        <AppTextField
          label="Catatan (opsional)"
          value={catatan}
          onChangeText={(value) => {
            setCatatan(value);
            clearFeedback();
          }}
          placeholder="Catatan tambahan"
          multiline
        />

        <View style={editTransaksiScreenStyles.previewCard}>
          <Text style={editTransaksiScreenStyles.previewTitle}>
            Preview saldo dompet pilihan
          </Text>

          <View style={editTransaksiScreenStyles.previewRow}>
            <Text style={editTransaksiScreenStyles.previewLabel}>
              Saldo sebelum transaksi
            </Text>
            <Text style={editTransaksiScreenStyles.previewValue}>
              {formatRupiah(saldoSebelum)}
            </Text>
          </View>

          <View style={editTransaksiScreenStyles.previewRow}>
            <Text style={editTransaksiScreenStyles.previewLabel}>
              Nilai transaksi baru
            </Text>
            <Text style={editTransaksiScreenStyles.previewValue}>
              {jenisTransaksi === "pemasukan" ? "+" : "-"}{" "}
              {formatRupiah(jumlahValue)}
            </Text>
          </View>

          <View style={editTransaksiScreenStyles.previewRow}>
            <Text style={editTransaksiScreenStyles.previewLabel}>
              Saldo sesudah transaksi
            </Text>
            <Text style={editTransaksiScreenStyles.previewValue}>
              {formatRupiah(saldoSesudah)}
            </Text>
          </View>

          {isDompetBerubah ? (
            <Text style={editTransaksiScreenStyles.previewNote}>
              Dompet transaksi berubah. Dompet lama juga akan disesuaikan
              kembali secara otomatis.
            </Text>
          ) : null}
        </View>

        {!!formError ? (
          <Text style={editTransaksiScreenStyles.errorText}>{formError}</Text>
        ) : null}

        {!!successMessage ? (
          <Text style={editTransaksiScreenStyles.successText}>
            {successMessage}
          </Text>
        ) : null}

        <AppButton
          title={isSubmitting ? "Menyimpan..." : "Simpan perubahan"}
          style={editTransaksiScreenStyles.button}
          disabled={isSubmitting}
          onPress={handleSave}
        />
      </AppCard>
    </AppScreen>
  );
}