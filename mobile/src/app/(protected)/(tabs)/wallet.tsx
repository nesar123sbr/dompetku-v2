import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  LayoutAnimation,
  Pressable,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import {
  AppButton,
  AppCard,
  AppDateField,
  AppLoader,
  AppScreen,
  AppTextField,
  GuestModeNotice,
  OptionChip,
  TransferHistoryItem,
} from "@/components";
import { COLORS } from "@/constants";
import {
  getRingkasanDanaDarurat,
  getRingkasanWalletTab,
  getRiwayatTransferTerbaru,
  getSemuaDompetAktif,
  nonaktifkanDompetLokal,
  tambahDompetLokal,
  transferAntarDompetLokal,
  ubahSaldoDompetLokal,
  type DompetRow,
  type DompetTipe,
  type RingkasanDanaDarurat,
  type RingkasanWalletTab,
  type RiwayatTransferRow,
  type StatusDanaDarurat,
} from "@/database";
import { useAuthSession } from "@/providers/AuthProvider";
import {
  formatLabelStatusDanaDarurat,
  formatPersen,
  formatRupiah,
  getTodayDateInput,
  isValidDateInput,
  parseNumericInput,
  sanitizeNumericInput,
} from "@/utils";
import { walletScreenStyles } from "@assets/styles/screens/protected/walletScreen.styles";



function animateLayoutChange() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

type LoadedWalletData = {
  dompetList: DompetRow[];
  ringkasanWallet: RingkasanWalletTab;
  ringkasanDanaDarurat: RingkasanDanaDarurat;
  riwayatTransfer: RiwayatTransferRow[];
};

type ActiveWalletPanel = "none" | "tambah" | "transfer" | "kelola";

type DompetTypeOption = {
  value: DompetTipe;
  label: string;
  helper: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const EMPTY_RINGKASAN_WALLET: RingkasanWalletTab = {
  totalSaldo: 0,
  saldoNonDarurat: 0,
  saldoTabungan: 0,
  saldoDanaDarurat: 0,
  jumlahDompetAktif: 0,
};

const EMPTY_RINGKASAN_DANA_DARURAT: RingkasanDanaDarurat = {
  saldoDanaDarurat: 0,
  estimasiProteksi30Hari: 0,
  targetMinimal: 0,
  targetIdeal: 0,
  rasioMinimal: 0,
  rasioIdeal: 0,
  status: "belum_ada_data",
  estimasiHariKekuatan: null,
};

const DOMPET_TYPE_OPTIONS: DompetTypeOption[] = [
  {
    value: "tunai",
    label: "Tunai",
    helper: "Cash / uang di tangan",
    icon: "cash-outline",
  },
  {
    value: "bank",
    label: "Bank",
    helper: "Rekening bank",
    icon: "business-outline",
  },
  {
    value: "ewallet",
    label: "E-wallet",
    helper: "DANA, OVO, GoPay",
    icon: "phone-portrait-outline",
  },
  {
    value: "tabungan",
    label: "Tabungan",
    helper: "Simpanan tujuan",
    icon: "archive-outline",
  },
  {
    value: "dana_darurat",
    label: "Dana darurat",
    helper: "Cadangan penting",
    icon: "shield-checkmark-outline",
  },
  {
    value: "lainnya",
    label: "Lainnya",
    helper: "Jenis lain",
    icon: "ellipsis-horizontal-circle-outline",
  },
];

// ✅ TAMBAHAN PATCH: Helper visual untuk rendering hari proteksi
function renderTeksHariProteksi(hari: number | null): string {
  if (hari === null) return "Belum cukup data";
  if (hari <= 0) return "0 hari (Segera isi)";
  if (hari > 365) return "> 1 Tahun (Sangat Aman)";
  return `${hari} hari`;
}

function getDompetTipe(item: DompetRow): DompetTipe {
  const itemWithTipe = item as DompetRow & {
    tipe_dompet?: DompetTipe | null;
  };

  if (itemWithTipe.tipe_dompet) {
    return itemWithTipe.tipe_dompet;
  }

  if (item.jenis === "tabungan") {
    return "tabungan";
  }

  if (item.jenis === "dana_darurat") {
    return "dana_darurat";
  }

  return "tunai";
}

function isDompetDanaDarurat(item: DompetRow | null) {
  if (!item) return false;
  return getDompetTipe(item) === "dana_darurat" || item.jenis === "dana_darurat";
}

function getTipeDompetLabel(tipe: DompetTipe) {
  switch (tipe) {
    case "tunai":
      return "Tunai";
    case "bank":
      return "Bank";
    case "ewallet":
      return "E-wallet";
    case "tabungan":
      return "Tabungan";
    case "dana_darurat":
      return "Dana darurat";
    default:
      return "Lainnya";
  }
}

function getTipeDompetDescription(tipe: DompetTipe) {
  switch (tipe) {
    case "tunai":
      return "Uang cash yang kamu pegang langsung.";
    case "bank":
      return "Saldo rekening bank.";
    case "ewallet":
      return "Saldo dompet digital.";
    case "tabungan":
      return "Dana simpanan tujuan.";
    case "dana_darurat":
      return "Cadangan untuk keadaan mendesak.";
    default:
      return "Dompet tambahan.";
  }
}

function getTipeDompetIcon(tipe: DompetTipe): keyof typeof Ionicons.glyphMap {
  switch (tipe) {
    case "bank":
      return "business-outline";
    case "ewallet":
      return "phone-portrait-outline";
    case "tabungan":
      return "archive-outline";
    case "dana_darurat":
      return "shield-checkmark-outline";
    case "lainnya":
      return "ellipsis-horizontal-circle-outline";
    case "tunai":
    default:
      return "cash-outline";
  }
}

function getSaldoByTipe(dompetList: DompetRow[], tipe: DompetTipe) {
  return dompetList
    .filter((item) => getDompetTipe(item) === tipe)
    .reduce((total, item) => total + item.saldo_saat_ini, 0);
}

function getPanelTitle(activePanel: ActiveWalletPanel) {
  switch (activePanel) {
    case "tambah":
      return "Tambah dompet";
    case "transfer":
      return "Pindah dompet";
    case "kelola":
      return "Kelola dompet";
    default:
      return "";
  }
}

function getDanaDaruratStatusColor(status: StatusDanaDarurat) {
  switch (status) {
    case "aman":
      return COLORS.success;
    case "cukup":
      return COLORS.info;
    case "belum_aman":
      return COLORS.warning;
    default:
      return COLORS.textSecondary;
  }
}

function getDanaDaruratStatusBackground(status: StatusDanaDarurat) {
  switch (status) {
    case "aman":
      return COLORS.successSoft;
    case "cukup":
      return COLORS.brandPrimarySoft;
    case "belum_aman":
      return COLORS.warningSoft;
    default:
      return COLORS.surfaceSoft;
  }
}

function getDanaDaruratDescription(status: StatusDanaDarurat) {
  switch (status) {
    case "aman":
      return "Dana darurat sudah kuat. Pertahankan agar tetap siap untuk keadaan mendesak.";
    case "cukup":
      return "Dana darurat sudah melewati batas minimum, tapi masih bisa diperkuat lagi.";
    case "belum_aman":
      return "Dana darurat belum mencapai batas aman. Sisihkan sedikit demi sedikit saat ada sisa uang.";
    case "belum_ada_data":
    default:
      return "DompetKu butuh data pengeluaran kebutuhan dan rutin untuk menghitung target dana darurat.";
  }
}

function WarningBox({
  title,
  text,
  icon = "warning-outline",
}: {
  title: string;
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={walletScreenStyles.warningBox}>
      <View style={walletScreenStyles.warningIcon}>
        <Ionicons name={icon} size={20} color={COLORS.warning} />
      </View>

      <View style={walletScreenStyles.warningTextWrap}>
        <Text style={walletScreenStyles.warningTitle}>{title}</Text>
        <Text style={walletScreenStyles.warningText}>{text}</Text>
      </View>
    </View>
  );
}

function WalletListItem({
  item,
  selected,
  showSaldo,
  onPress,
}: {
  item: DompetRow;
  selected: boolean;
  showSaldo: boolean;
  onPress: () => void;
}) {
  const tipeDompet = getDompetTipe(item);
  const isEmergency = tipeDompet === "dana_darurat";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Kelola dompet ${item.nama}`}
      style={({ pressed }) => [
        walletScreenStyles.walletItem,
        selected && walletScreenStyles.walletItemSelected,
        pressed && walletScreenStyles.walletItemPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          walletScreenStyles.walletIcon,
          isEmergency && walletScreenStyles.walletIconEmergency,
        ]}
      >
        <Ionicons
          name={getTipeDompetIcon(tipeDompet)}
          size={22}
          color={isEmergency ? COLORS.warning : COLORS.brandPrimary}
        />
      </View>

      <View style={walletScreenStyles.walletBody}>
        <Text style={walletScreenStyles.walletName} numberOfLines={1}>
          {item.nama}
        </Text>

        <Text style={walletScreenStyles.walletMeta} numberOfLines={1}>
          {getTipeDompetLabel(tipeDompet)} •{" "}
          {getTipeDompetDescription(tipeDompet)}
        </Text>
      </View>

      <View style={walletScreenStyles.walletRight}>
        <Text style={walletScreenStyles.walletBalance}>
          {showSaldo ? formatRupiah(item.saldo_saat_ini) : "Rp •••••••"}
        </Text>

        <Text style={walletScreenStyles.walletActionText}>
          {selected ? "Terpilih" : "Kelola"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function WalletTabPage() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ action?: string }>();
  const { isGuestMode } = useAuthSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSaldo, setShowSaldo] = useState(true);
  const [activePanel, setActivePanel] = useState<ActiveWalletPanel>("none");

  const [dompetList, setDompetList] = useState<DompetRow[]>([]);
  const [ringkasanWallet, setRingkasanWallet] =
    useState<RingkasanWalletTab>(EMPTY_RINGKASAN_WALLET);
  const [ringkasanDanaDarurat, setRingkasanDanaDarurat] =
    useState<RingkasanDanaDarurat>(EMPTY_RINGKASAN_DANA_DARURAT);
  const [riwayatTransfer, setRiwayatTransfer] = useState<RiwayatTransferRow[]>(
    []
  );

  const [selectedSumberId, setSelectedSumberId] = useState<string | null>(null);
  const [selectedTujuanId, setSelectedTujuanId] = useState<string | null>(null);

  const [jumlahTransferInput, setJumlahTransferInput] = useState("");
  const [tanggalTransfer, setTanggalTransfer] = useState(getTodayDateInput());
  const [catatanTransfer, setCatatanTransfer] = useState("");
  const [konfirmasiGunakanDanaDarurat, setKonfirmasiGunakanDanaDarurat] =
    useState(false);

  const [namaDompetBaru, setNamaDompetBaru] = useState("");
  const [tipeDompetBaru, setTipeDompetBaru] = useState<DompetTipe>("tunai");
  const [saldoAwalDompetInput, setSaldoAwalDompetInput] = useState("");

  const [selectedKelolaDompetId, setSelectedKelolaDompetId] =
    useState<string | null>(null);
  const [saldoEditInput, setSaldoEditInput] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const jumlahTransfer = useMemo(
    () => parseNumericInput(jumlahTransferInput),
    [jumlahTransferInput]
  );

  const saldoAwalDompet = useMemo(
    () => parseNumericInput(saldoAwalDompetInput),
    [saldoAwalDompetInput]
  );

  const selectedKelolaDompet = useMemo(() => {
    return dompetList.find((item) => item.id === selectedKelolaDompetId) ?? null;
  }, [dompetList, selectedKelolaDompetId]);

  const saldoEditValue = useMemo(
    () => parseNumericInput(saldoEditInput),
    [saldoEditInput]
  );

  const dompetSumber = useMemo(() => {
    return dompetList.find((item) => item.id === selectedSumberId) ?? null;
  }, [dompetList, selectedSumberId]);

  const dompetTargetList = useMemo(() => {
    return dompetList.filter((item) => item.id !== selectedSumberId);
  }, [dompetList, selectedSumberId]);

  const dompetTujuan = useMemo(() => {
    return dompetTargetList.find((item) => item.id === selectedTujuanId) ?? null;
  }, [dompetTargetList, selectedTujuanId]);

  const isSumberDanaDarurat = isDompetDanaDarurat(dompetSumber);
  const isTujuanDanaDarurat = isDompetDanaDarurat(dompetTujuan);

  const saldoSumberSesudah = useMemo(() => {
    if (!dompetSumber) return 0;
    return dompetSumber.saldo_saat_ini - jumlahTransfer;
  }, [dompetSumber, jumlahTransfer]);

  const saldoTujuanSesudah = useMemo(() => {
    if (!dompetTujuan) return 0;
    return dompetTujuan.saldo_saat_ini + jumlahTransfer;
  }, [dompetTujuan, jumlahTransfer]);

  const isSaldoSumberTidakCukup =
    !!dompetSumber &&
    jumlahTransfer > 0 &&
    jumlahTransfer > dompetSumber.saldo_saat_ini;

  const tipeSummary = useMemo(() => {
    return DOMPET_TYPE_OPTIONS.map((item) => ({
      ...item,
      saldo: getSaldoByTipe(dompetList, item.value),
    })).filter((item) => item.saldo > 0 || item.value === "tunai");
  }, [dompetList]);

  const displayMoney = useCallback(
    (value: number) => {
      if (!showSaldo) {
        return "Rp •••••••";
      }

      return formatRupiah(value);
    },
    [showSaldo]
  );

  const fetchData = useCallback(async (): Promise<LoadedWalletData> => {
    const [
      dompetData,
      ringkasanWalletData,
      ringkasanDanaDaruratData,
      riwayatData,
    ] = await Promise.all([
      getSemuaDompetAktif(db),
      getRingkasanWalletTab(db),
      getRingkasanDanaDarurat(db),
      getRiwayatTransferTerbaru(db, 5),
    ]);

    return {
      dompetList: dompetData,
      ringkasanWallet: ringkasanWalletData,
      ringkasanDanaDarurat: ringkasanDanaDaruratData,
      riwayatTransfer: riwayatData,
    };
  }, [db]);

  function applyLoadedData(data: LoadedWalletData) {
    setDompetList(data.dompetList);
    setRingkasanWallet(data.ringkasanWallet);
    setRingkasanDanaDarurat(data.ringkasanDanaDarurat);
    setRiwayatTransfer(data.riwayatTransfer);
  }

  async function refreshWalletData() {
    const refreshed = await fetchData();
    applyLoadedData(refreshed);
  }

    // ✅ Kunci memori clearMessages
  const clearMessages = useCallback(() => {
    setFormError("");
    setSuccessMessage("");
  }, []);

  // ✅ Kunci memori changePanel
  const changePanel = useCallback((panel: ActiveWalletPanel) => {
    animateLayoutChange();
    setActivePanel(panel);
  }, []);

  // ✅ Kunci memori closePanel dan masukkan dependensinya
  const closePanel = useCallback(() => {
    changePanel("none");
    clearMessages();
  }, [changePanel, clearMessages]);

  function openTambahDompet() {
    Keyboard.dismiss();
    changePanel("tambah");
    setSelectedKelolaDompetId(null);
    clearMessages();
  }

  // ✅ openTransferPanel sekarang 100% aman, dependensi lengkap, bebas Infinite Loop
  const openTransferPanel = useCallback(() => {
    Keyboard.dismiss();

    if (dompetList.length < 2) {
      Alert.alert(
        "Butuh minimal 2 dompet",
        "Pindah dompet hanya bisa dilakukan kalau kamu punya minimal dua dompet aktif."
      );
      return;
    }

    changePanel("transfer");
    setSelectedKelolaDompetId(null);
    clearMessages();
  }, [dompetList.length, changePanel, clearMessages]);

  // ✅ useEffect berjalan dengan sempurna tanpa warning linter
  useEffect(() => {
    if (params.action === "transfer" && dompetList.length > 0) {
      openTransferPanel();
    }
  }, [params.action, dompetList.length, openTransferPanel]);

  function openTransferDariDompet(dompetId: string) {
    Keyboard.dismiss();

    if (dompetList.length < 2) {
      Alert.alert(
        "Butuh minimal 2 dompet",
        "Buat dompet tujuan terlebih dahulu sebelum memindahkan uang."
      );
      return;
    }

    setSelectedSumberId(dompetId);
    setSelectedKelolaDompetId(null);
    changePanel("transfer");
    clearMessages();
  }

  function handlePilihKelolaDompet(item: DompetRow) {
    Keyboard.dismiss();

    if (selectedKelolaDompetId === item.id && activePanel === "kelola") {
      setSelectedKelolaDompetId(null);
      setSaldoEditInput("");
      changePanel("none");
      clearMessages();
      return;
    }

    setSelectedKelolaDompetId(item.id);
    setSaldoEditInput(String(Math.max(0, Math.round(item.saldo_saat_ini))));
    changePanel("kelola");
    clearMessages();
  }

  function resetTransferForm() {
    setJumlahTransferInput("");
    setTanggalTransfer(getTodayDateInput());
    setCatatanTransfer("");
    setKonfirmasiGunakanDanaDarurat(false);
    clearMessages();
  }

  function resetTambahDompetForm() {
    setNamaDompetBaru("");
    setTipeDompetBaru("tunai");
    setSaldoAwalDompetInput("");
    clearMessages();
  }

  function handleUbahSaldoDompet() {
    if (!selectedKelolaDompet) {
      setFormError("Pilih dompet dulu.");
      return;
    }

    if (saldoEditValue < 0) {
      setFormError("Saldo baru tidak boleh minus.");
      return;
    }

    Alert.alert(
      "Ubah saldo dompet?",
      `Saldo "${selectedKelolaDompet.nama}" akan diubah dari ${formatRupiah(
        selectedKelolaDompet.saldo_saat_ini
      )} menjadi ${formatRupiah(
        saldoEditValue
      )}. Gunakan hanya untuk koreksi saldo, karena perubahan ini tidak berasal dari transaksi uang masuk atau uang keluar.`,
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Tetap ubah",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSubmitting(true);
              clearMessages();

              await ubahSaldoDompetLokal(db, {
                dompetId: selectedKelolaDompet.id,
                saldoBaru: saldoEditValue,
              });

              setSuccessMessage("Saldo dompet berhasil diperbarui.");
              await refreshWalletData();
            } catch (error) {
              console.log("handleUbahSaldoDompet error:", error);
              setFormError(
                error instanceof Error
                  ? error.message
                  : "Saldo dompet belum berhasil diubah."
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  }

  function handleHapusDompet() {
    if (!selectedKelolaDompet) {
      setFormError("Pilih dompet dulu.");
      return;
    }

    const isDanaDarurat = isDompetDanaDarurat(selectedKelolaDompet);

    Alert.alert(
      isDanaDarurat ? "Hapus dompet dana darurat?" : "Hapus dompet ini?",
      isDanaDarurat
        ? "Dompet dana darurat akan disembunyikan dari daftar aktif. Riwayat lama tetap aman, tapi cadangan darurat tidak akan muncul sebagai dompet aktif."
        : "Dompet akan disembunyikan dari daftar aktif. Riwayat transaksi lama tetap aman. Minimal harus tersisa 1 dompet aktif.",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: isDanaDarurat ? "Tetap hapus" : "Hapus dompet",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSubmitting(true);
              clearMessages();

              await nonaktifkanDompetLokal(db, selectedKelolaDompet.id);

              setSelectedKelolaDompetId(null);
              setSaldoEditInput("");
              changePanel("none");
              setSuccessMessage("Dompet berhasil dihapus dari daftar aktif.");
              await refreshWalletData();
            } catch (error) {
              console.log("handleHapusDompet error:", error);
              setFormError(
                error instanceof Error
                  ? error.message
                  : "Dompet belum berhasil dihapus."
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

      async function loadWalletData() {
        try {
          setIsLoading(true);
          const data = await fetchData();

          if (!isActive) return;
          applyLoadedData(data);
        } catch (error) {
          console.log("loadWalletData error:", error);
        } finally {
          if (!isActive) return;
          setIsLoading(false);
        }
      }

      loadWalletData();

      return () => {
        isActive = false;
      };
    }, [fetchData])
  );

  useEffect(() => {
    if (
      !selectedSumberId ||
      !dompetList.some((item) => item.id === selectedSumberId)
    ) {
      setSelectedSumberId(dompetList[0]?.id ?? null);
    }
  }, [dompetList, selectedSumberId]);

  useEffect(() => {
    if (
      !selectedTujuanId ||
      selectedTujuanId === selectedSumberId ||
      !dompetTargetList.some((item) => item.id === selectedTujuanId)
    ) {
      setSelectedTujuanId(dompetTargetList[0]?.id ?? null);
    }
  }, [dompetTargetList, selectedSumberId, selectedTujuanId]);

  useEffect(() => {
    if (!isSumberDanaDarurat && konfirmasiGunakanDanaDarurat) {
      setKonfirmasiGunakanDanaDarurat(false);
    }
  }, [isSumberDanaDarurat, konfirmasiGunakanDanaDarurat]);

  async function handleTambahDompet() {
    try {
      clearMessages();

      const namaDompetBersih = namaDompetBaru.trim();

      if (namaDompetBersih.length < 2) {
        setFormError("Nama dompet minimal 2 karakter.");
        return;
      }

      if (saldoAwalDompet < 0) {
        setFormError("Saldo awal tidak boleh minus.");
        return;
      }

      setIsSubmitting(true);

      await tambahDompetLokal(db, {
        nama: namaDompetBersih,
        tipeDompet: tipeDompetBaru,
        saldoAwal: saldoAwalDompet,
      });

      resetTambahDompetForm();
      changePanel("none");
      setSuccessMessage("Dompet baru berhasil ditambahkan.");

      await refreshWalletData();

      Alert.alert("Berhasil", "Dompet baru berhasil ditambahkan.");
    } catch (error) {
      console.log("handleTambahDompet error:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Dompet baru belum berhasil disimpan."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitTransfer() {
    Keyboard.dismiss();

    try {
      clearMessages();

      if (!selectedSumberId) {
        setFormError("Pilih dompet asal terlebih dahulu.");
        return;
      }

      if (!selectedTujuanId) {
        setFormError("Pilih dompet tujuan terlebih dahulu.");
        return;
      }

      if (selectedSumberId === selectedTujuanId) {
        setFormError("Dompet asal dan tujuan tidak boleh sama.");
        return;
      }

      if (jumlahTransfer <= 0) {
        setFormError("Jumlah pindah dompet harus lebih dari Rp 0.");
        return;
      }

      if (!isValidDateInput(tanggalTransfer)) {
        setFormError("Tanggal pindah dompet belum valid.");
        return;
      }

      if (isSumberDanaDarurat && !konfirmasiGunakanDanaDarurat) {
        setFormError(
          "Kamu perlu mengonfirmasi penggunaan dana darurat terlebih dahulu."
        );
        return;
      }

      if (isSaldoSumberTidakCukup) {
        setFormError(
          `${dompetSumber?.nama ?? "Dompet asal"} tidak punya saldo cukup.`
        );
        return;
      }

      setIsSubmitting(true);

      await transferAntarDompetLokal(db, {
        dompetSumberId: selectedSumberId,
        dompetTujuanId: selectedTujuanId,
        jumlah: jumlahTransfer,
        tanggalTransfer,
        catatan: catatanTransfer.trim(),
        konfirmasiGunakanDanaDarurat,
      });

      resetTransferForm();
      changePanel("none");
      setSuccessMessage("Pindah dompet berhasil disimpan.");

      await refreshWalletData();

      Alert.alert(
        isTujuanDanaDarurat ? "Dana darurat bertambah" : "Berhasil",
        isTujuanDanaDarurat
          ? `Bagus, ${formatRupiah(
              jumlahTransfer
            )} berhasil dipindahkan ke dana darurat.`
          : "Pindah dompet berhasil disimpan."
      );
    } catch (error) {
      console.log("handleSubmitTransfer error:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan pindah dompet. Coba lagi."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderActivePanel() {
    if (activePanel === "none") {
      return null;
    }

    return (
      <View style={walletScreenStyles.focusPanel}>
        <View style={walletScreenStyles.focusPanelHeader}>
          <View style={walletScreenStyles.focusPanelTitleWrap}>
            <Text style={walletScreenStyles.focusPanelTitle}>
              {getPanelTitle(activePanel)}
            </Text>
            <Text style={walletScreenStyles.focusPanelSubtitle}>
              {activePanel === "tambah"
                ? "Buat tempat penyimpanan uang baru."
                : activePanel === "transfer"
                ? "Pindahkan uang antar dompet tanpa dihitung sebagai uang masuk atau keluar."
                : "Ubah saldo, pindahkan uang, atau hapus dompet aktif."}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup panel"
            style={walletScreenStyles.closePanelButton}
            onPress={closePanel}
          >
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>

        {activePanel === "tambah" ? (
          <>
            <AppTextField
              label="Nama dompet"
              placeholder="Contoh: Cash Warung, BCA, DANA Ojol"
              value={namaDompetBaru}
              onChangeText={(value) => {
                setNamaDompetBaru(value);
                clearMessages();
              }}
            />

            <Text style={walletScreenStyles.formSectionTitle}>
              Jenis dompet
            </Text>
            <Text style={walletScreenStyles.formSectionHelper}>
              Pilih jenis yang paling mendekati tempat uang ini disimpan.
            </Text>

            <View style={walletScreenStyles.chipGroup}>
              {DOMPET_TYPE_OPTIONS.map((item) => (
                <View key={item.value} style={walletScreenStyles.chipItem}>
                  <OptionChip
                    label={item.label}
                    helperText={item.helper}
                    selected={tipeDompetBaru === item.value}
                    onPress={() => {
                      setTipeDompetBaru(item.value);
                      clearMessages();
                    }}
                  />
                </View>
              ))}
            </View>

            <AppTextField
              label="Saldo awal"
              placeholder="Contoh: 100000"
              value={saldoAwalDompetInput}
              onChangeText={(value) => {
                setSaldoAwalDompetInput(sanitizeNumericInput(value));
                clearMessages();
              }}
              keyboardType="number-pad"
              helperText={
                saldoAwalDompetInput
                  ? `Saldo awal: ${formatRupiah(saldoAwalDompet)}`
                  : "Boleh kosong atau 0 kalau dompet belum ada uangnya."
              }
            />

            {!!formError ? (
              <Text style={walletScreenStyles.errorText}>{formError}</Text>
            ) : null}

            <AppButton
              title={isSubmitting ? "Menyimpan..." : "Simpan dompet"}
              style={walletScreenStyles.submitButton}
              disabled={isSubmitting}
              onPress={handleTambahDompet}
            />
          </>
        ) : null}

        {activePanel === "transfer" ? (
          <>
            <Text style={walletScreenStyles.formSectionTitle}>Dari dompet</Text>
            <Text style={walletScreenStyles.formSectionHelper}>
              Pilih dompet asal uang.
            </Text>

            <View style={walletScreenStyles.chipGroup}>
              {dompetList.map((item) => (
                <View key={item.id} style={walletScreenStyles.chipItem}>
                  <OptionChip
                    label={item.nama}
                    helperText={`${getTipeDompetLabel(
                      getDompetTipe(item)
                    )} • ${displayMoney(item.saldo_saat_ini)}`}
                    selected={selectedSumberId === item.id}
                    onPress={() => {
                      setSelectedSumberId(item.id);
                      clearMessages();
                    }}
                  />
                </View>
              ))}
            </View>

            <Text style={walletScreenStyles.formSectionTitle}>Ke dompet</Text>
            <Text style={walletScreenStyles.formSectionHelper}>
              Pilih dompet tujuan uang.
            </Text>

            <View style={walletScreenStyles.chipGroup}>
              {dompetTargetList.map((item) => (
                <View key={item.id} style={walletScreenStyles.chipItem}>
                  <OptionChip
                    label={item.nama}
                    helperText={`${getTipeDompetLabel(
                      getDompetTipe(item)
                    )} • ${displayMoney(item.saldo_saat_ini)}`}
                    selected={selectedTujuanId === item.id}
                    onPress={() => {
                      setSelectedTujuanId(item.id);
                      clearMessages();
                    }}
                  />
                </View>
              ))}
            </View>

            <AppTextField
              label="Jumlah uang"
              placeholder="Contoh: 100000"
              value={jumlahTransferInput}
              onChangeText={(value) => {
                setJumlahTransferInput(sanitizeNumericInput(value));
                clearMessages();
              }}
              keyboardType="number-pad"
              helperText={
                jumlahTransferInput
                  ? `Nominal: ${formatRupiah(jumlahTransfer)}`
                  : "Masukkan angka tanpa titik atau koma."
              }
            />

            <AppDateField
              label="Tanggal pindah dompet"
              value={tanggalTransfer}
              onChangeDate={(value) => {
                setTanggalTransfer(value);
                clearMessages();
              }}
              helperText="Tanggal otomatis hari ini. Ubah kalau perlu."
            />

            <AppTextField
              label="Catatan (opsional)"
              placeholder="Contoh: top up DANA, setor cash ke bank"
              value={catatanTransfer}
              onChangeText={(value) => {
                setCatatanTransfer(value);
                clearMessages();
              }}
              multiline
            />

            <View style={walletScreenStyles.previewCard}>
              <Text style={walletScreenStyles.previewTitle}>
                Preview pindah dompet
              </Text>

              <View style={walletScreenStyles.previewRow}>
                <Text style={walletScreenStyles.previewLabel}>
                  Asal sebelum
                </Text>
                <Text style={walletScreenStyles.previewValue}>
                  {displayMoney(dompetSumber?.saldo_saat_ini ?? 0)}
                </Text>
              </View>

              <View style={walletScreenStyles.previewRow}>
                <Text style={walletScreenStyles.previewLabel}>
                  Asal sesudah
                </Text>
                <Text style={walletScreenStyles.previewValue}>
                  {displayMoney(saldoSumberSesudah)}
                </Text>
              </View>

              <View style={walletScreenStyles.previewRow}>
                <Text style={walletScreenStyles.previewLabel}>
                  Tujuan sebelum
                </Text>
                <Text style={walletScreenStyles.previewValue}>
                  {displayMoney(dompetTujuan?.saldo_saat_ini ?? 0)}
                </Text>
              </View>

              <View style={walletScreenStyles.previewRow}>
                <Text style={walletScreenStyles.previewLabel}>
                  Tujuan sesudah
                </Text>
                <Text style={walletScreenStyles.previewValue}>
                  {displayMoney(saldoTujuanSesudah)}
                </Text>
              </View>
            </View>

            {isSumberDanaDarurat ? (
              <View style={walletScreenStyles.warningWrap}>
                <WarningBox
                  title="Kamu mengambil dari dana darurat"
                  text="Dana darurat sebaiknya dipakai hanya untuk keadaan mendesak. Konfirmasi dulu sebelum pindah dompet disimpan."
                  icon="shield-outline"
                />

                <View style={walletScreenStyles.chipGroup}>
                  <View style={walletScreenStyles.chipItemWide}>
                    <OptionChip
                      label="Saya paham ini memakai dana darurat"
                      helperText="Gunakan hanya untuk kebutuhan yang benar-benar mendesak."
                      selected={konfirmasiGunakanDanaDarurat}
                      onPress={() => {
                        setKonfirmasiGunakanDanaDarurat((prev) => !prev);
                        clearMessages();
                      }}
                    />
                  </View>
                </View>
              </View>
            ) : null}

            {isSaldoSumberTidakCukup ? (
              <View style={walletScreenStyles.warningWrap}>
                <WarningBox
                  title="Saldo asal tidak cukup"
                  text="Pindah dompet hanya bisa dilakukan kalau saldo dompet asal mencukupi."
                  icon="alert-circle-outline"
                />
              </View>
            ) : null}

            {!!formError ? (
              <Text style={walletScreenStyles.errorText}>{formError}</Text>
            ) : null}

            <AppButton
              title={isSubmitting ? "Menyimpan..." : "Simpan pindah dompet"}
              style={walletScreenStyles.submitButton}
              disabled={isSubmitting}
              onPress={handleSubmitTransfer}
            />
          </>
        ) : null}

        {activePanel === "kelola" ? (
          <>
            {selectedKelolaDompet ? (
              <>
                <View style={walletScreenStyles.manageHero}>
                  <Text style={walletScreenStyles.manageName}>
                    {selectedKelolaDompet.nama}
                  </Text>
                  <Text style={walletScreenStyles.manageType}>
                    {getTipeDompetLabel(getDompetTipe(selectedKelolaDompet))} •{" "}
                    {getTipeDompetDescription(getDompetTipe(selectedKelolaDompet))}
                  </Text>
                  <Text style={walletScreenStyles.manageBalance}>
                    {displayMoney(selectedKelolaDompet.saldo_saat_ini)}
                  </Text>
                </View>

                <WarningBox
                  title="Perhatian sebelum ubah saldo"
                  text="Ubah saldo hanya untuk koreksi. Kalau ada uang masuk atau keluar, lebih baik catat dari tab CATAT agar laporan tetap akurat."
                  icon="information-circle-outline"
                />

                <AppTextField
                  label="Saldo baru"
                  placeholder="Contoh: 300000"
                  value={saldoEditInput}
                  onChangeText={(value) => {
                    setSaldoEditInput(sanitizeNumericInput(value));
                    clearMessages();
                  }}
                  keyboardType="number-pad"
                  helperText={
                    saldoEditInput
                      ? `Saldo baru: ${formatRupiah(saldoEditValue)}`
                      : "Gunakan hanya untuk koreksi saldo."
                  }
                />

                <View style={walletScreenStyles.manageActionRow}>
                  <View
                    style={[
                      walletScreenStyles.manageActionItem,
                      walletScreenStyles.manageActionItemSpacing,
                    ]}
                  >
                    <AppButton
                      title="Ubah saldo"
                      variant="secondary"
                      disabled={isSubmitting}
                      onPress={handleUbahSaldoDompet}
                    />
                  </View>

                  <View style={walletScreenStyles.manageActionItem}>
                    <AppButton
                      title="Pindahkan"
                      disabled={isSubmitting}
                      onPress={() =>
                        openTransferDariDompet(selectedKelolaDompet.id)
                      }
                    />
                  </View>
                </View>

                <AppButton
                  title="Hapus dompet"
                  variant="danger"
                  style={walletScreenStyles.submitButton}
                  disabled={isSubmitting}
                  onPress={handleHapusDompet}
                />

                {!!formError ? (
                  <Text style={walletScreenStyles.errorText}>{formError}</Text>
                ) : null}
              </>
            ) : (
              <Text style={walletScreenStyles.emptyText}>
                Pilih salah satu dompet aktif untuk dikelola.
              </Text>
            )}
          </>
        ) : null}
      </View>
    );
  }

  if (isLoading) {
    return <AppLoader label="Memuat dompet..." />;
  }

  return (
    <AppScreen 
    scrollable
    withFloatingTabSpace
    contentContainerStyle={walletScreenStyles.content}>
      <View style={walletScreenStyles.heroCard}>
        <View style={walletScreenStyles.heroTopRow}>
          <View style={walletScreenStyles.heroTextWrap}>
            <Text style={walletScreenStyles.heroTitle}>Dompet</Text>
            <Text style={walletScreenStyles.heroSubtitle}>
              Uangmu tersimpan di cash, bank, e-wallet, tabungan, dan dana
              darurat.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showSaldo ? "Sembunyikan saldo" : "Tampilkan saldo"
            }
            style={walletScreenStyles.eyeButton}
            onPress={() => setShowSaldo((prev) => !prev)}
          >
            <Ionicons
              name={showSaldo ? "eye-outline" : "eye-off-outline"}
              size={22}
              color={COLORS.brandPrimary}
            />
          </Pressable>
        </View>

        <Text style={walletScreenStyles.heroLabel}>Total uang kamu</Text>
        <Text style={walletScreenStyles.heroAmount}>
          {displayMoney(ringkasanWallet.totalSaldo)}
        </Text>

        <View style={walletScreenStyles.heroMetaRow}>
          <View style={walletScreenStyles.heroMetaPill}>
            <Ionicons
              name="wallet-outline"
              size={14}
              color={COLORS.brandPrimary}
            />
            <Text style={walletScreenStyles.heroMetaText}>
              {ringkasanWallet.jumlahDompetAktif} dompet aktif
            </Text>
          </View>

          <View style={walletScreenStyles.heroMetaPill}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={COLORS.warning}
            />
            <Text style={walletScreenStyles.heroMetaText}>
              Dana darurat {displayMoney(ringkasanWallet.saldoDanaDarurat)}
            </Text>
          </View>
        </View>
      </View>

      {isGuestMode ? (
        <View style={walletScreenStyles.notice}>
          <GuestModeNotice />
        </View>
      ) : null}

      <View style={walletScreenStyles.typeGrid}>
        {tipeSummary.map((item) => (
          <View key={item.value} style={walletScreenStyles.typeCard}>
            <View style={walletScreenStyles.typeIcon}>
              <Ionicons
                name={item.icon}
                size={20}
                color={COLORS.brandPrimary}
              />
            </View>

            <Text style={walletScreenStyles.typeLabel}>{item.label}</Text>
            <Text style={walletScreenStyles.typeValue}>
              {displayMoney(item.saldo)}
            </Text>
          </View>
        ))}
      </View>

      <AppCard style={walletScreenStyles.actionCard}>
        <Text style={walletScreenStyles.actionTitle}>Mau kelola apa?</Text>
        <Text style={walletScreenStyles.actionSubtitle}>
          Tambah tempat uang baru atau pindahkan uang antar dompet.
        </Text>

        <View style={walletScreenStyles.actionRow}>
          <View style={walletScreenStyles.actionItem}>
            <AppButton title="+ Tambah dompet" onPress={openTambahDompet} />
          </View>

          <View style={walletScreenStyles.actionItemLast}>
            <AppButton
              title="Pindah dompet"
              variant="secondary"
              onPress={openTransferPanel}
            />
          </View>
        </View>
      </AppCard>

      {renderActivePanel()}

      {!!successMessage && activePanel === "none" ? (
        <Text style={walletScreenStyles.successText}>{successMessage}</Text>
      ) : null}

      <View style={walletScreenStyles.section}>
        <Text style={walletScreenStyles.sectionTitle}>Dompet aktif</Text>
        <Text style={walletScreenStyles.sectionSubtitle}>
          Ketuk dompet untuk ubah saldo, pindahkan uang, atau hapus dompet.
        </Text>

        {dompetList.length > 0 ? (
          dompetList.map((item) => (
            <WalletListItem
              key={item.id}
              item={item}
              selected={selectedKelolaDompetId === item.id}
              showSaldo={showSaldo}
              onPress={() => handlePilihKelolaDompet(item)}
            />
          ))
        ) : (
          <AppCard style={walletScreenStyles.emptyCard}>
            <Text style={walletScreenStyles.emptyText}>
              Belum ada dompet aktif. Buat dompet pertama untuk mulai mencatat
              uang.
            </Text>
          </AppCard>
        )}
      </View>

      <View style={walletScreenStyles.section}>
        <Text style={walletScreenStyles.sectionTitle}>Dana darurat</Text>
        <Text style={walletScreenStyles.sectionSubtitle}>
          Cadangan untuk kebutuhan mendesak, bukan belanja harian.
        </Text>

        <AppCard style={walletScreenStyles.emergencyCard}>
          <View style={walletScreenStyles.emergencyHeader}>
            <View style={walletScreenStyles.emergencyIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={COLORS.warning}
              />
            </View>

            <View style={walletScreenStyles.emergencyTextWrap}>
              <View
                style={[
                  walletScreenStyles.statusPill,
                  {
                    backgroundColor: getDanaDaruratStatusBackground(
                      ringkasanDanaDarurat.status
                    ),
                  },
                ]}
              >
                <Text
                  style={[
                    walletScreenStyles.statusPillText,
                    {
                      color: getDanaDaruratStatusColor(
                        ringkasanDanaDarurat.status
                      ),
                    },
                  ]}
                >
                  {formatLabelStatusDanaDarurat(ringkasanDanaDarurat.status)}
                </Text>
              </View>

              <Text style={walletScreenStyles.emergencyTitle}>
                {formatLabelStatusDanaDarurat(ringkasanDanaDarurat.status)}
              </Text>

              <Text style={walletScreenStyles.emergencyDescription}>
                {getDanaDaruratDescription(ringkasanDanaDarurat.status)}
              </Text>
            </View>
          </View>

          <View style={walletScreenStyles.metricRow}>
            <Text style={walletScreenStyles.metricLabel}>
              Saldo dana darurat
            </Text>
            <Text style={walletScreenStyles.metricValue}>
              {displayMoney(ringkasanDanaDarurat.saldoDanaDarurat)}
            </Text>
          </View>

          <View style={walletScreenStyles.metricRow}>
            <Text style={walletScreenStyles.metricLabel}>Target minimum</Text>
            <Text style={walletScreenStyles.metricValue}>
              {displayMoney(ringkasanDanaDarurat.targetMinimal)}
            </Text>
          </View>

          <View style={walletScreenStyles.metricRow}>
            <Text style={walletScreenStyles.metricLabel}>
              Progress minimum
            </Text>
            <Text style={walletScreenStyles.metricValue}>
              {formatPersen(ringkasanDanaDarurat.rasioMinimal)}
            </Text>
          </View>

          {/* ✅ PATCH: Bagian Estimasi proteksi sudah menggunakan renderTeksHariProteksi dan properti estimasiHariKekuatan */}
          <View style={walletScreenStyles.metricRow}>
            <Text style={walletScreenStyles.metricLabel}>
              Estimasi proteksi
            </Text>
            <Text style={walletScreenStyles.metricValue}>
              {renderTeksHariProteksi(ringkasanDanaDarurat.estimasiHariKekuatan)}
            </Text>
          </View>
        </AppCard>
      </View>

      <View style={walletScreenStyles.section}>
        <Text style={walletScreenStyles.sectionTitle}>
          Pindah dompet terakhir
        </Text>
        <Text style={walletScreenStyles.sectionSubtitle}>
          Riwayat perpindahan saldo antar dompet.
        </Text>

        {riwayatTransfer.length > 0 ? (
          riwayatTransfer.map((item) => (
            <TransferHistoryItem key={item.id} item={item} />
          ))
        ) : (
          <AppCard style={walletScreenStyles.emptyCard}>
            <Text style={walletScreenStyles.emptyText}>
              Belum ada pindah dompet. Contoh: pindahkan cash ke DANA, bank ke
              cash, atau sisihkan uang ke dana darurat.
            </Text>
          </AppCard>
        )}
      </View>
    </AppScreen>
  );
}