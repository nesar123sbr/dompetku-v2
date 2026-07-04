import { useCallback, useMemo, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";

import {
  AppButton,
  AppCard,
  AppDateField,
  AppLoader,
  AppScreen,
  GuestModeNotice,
  StatusBadge,
} from "@/components";
import { COLORS, ROUTES, getFloatingTabContentPadding } from "@/constants";
import {
  getRingkasanAnggaranBulanan,
  getRingkasanDanaDarurat,
  getRingkasanPengingatTagihan,
  getInsightRentangPeriode,
  type InsightBulanan,
  type RingkasanAnggaranBulananItem,
  type RingkasanDanaDarurat,
  type RingkasanPengingatTagihan,
} from "@/database";
import { useAuthSession } from "@/providers/AuthProvider";
import {
  formatPersen,
  formatRupiah,
  getCategoryChartColor,
} from "@/utils";
import {
  exportLaporanBulananCsv,
  exportLaporanBulananPdf,
} from "@/services";
import { insightScreenStyles } from "@assets/styles/screens/protected/insightScreen.styles";

const EMPTY_INSIGHT: InsightBulanan = {
  totalPemasukanBulanIni: 0,
  totalPengeluaranBulanIni: 0,
  totalPemasukanBulanLalu: 0,
  totalPengeluaranBulanLalu: 0,
  perubahanPengeluaranPersen: null,
  arusKasBersih: 0,
  rasioPengeluaranTerhadapPemasukan: 0,
  statusKesehatan: "belum_ada_data",
  kelompokPengeluaran: [],
  kategoriTeratas: [],
};

const EMPTY_DANA_DARURAT: RingkasanDanaDarurat = {
  saldoDanaDarurat: 0,
  estimasiProteksi30Hari: 0,
  targetMinimal: 0,
  targetIdeal: 0,
  rasioMinimal: 0,
  rasioIdeal: 0,
  status: "belum_ada_data",
};

const EMPTY_PENGINGAT: RingkasanPengingatTagihan = {
  totalAktif: 0,
  jatuhTempoHariIni: 0,
  terlambat: 0,
  notifikasiAktif: 0,
};

function getHealthLabel(status: InsightBulanan["statusKesehatan"]) {
  switch (status) {
    case "aman":
      return "Aman";
    case "cukup":
      return "Cukup sehat";
    case "waspada":
      return "Waspada";
    case "rawan":
      return "Rawan";
    default:
      return "Belum ada data";
  }
}

function getHealthVariant(status: InsightBulanan["statusKesehatan"]) {
  switch (status) {
    case "aman":
      return "success" as const;
    case "cukup":
      return "info" as const;
    case "waspada":
      return "warning" as const;
    case "rawan":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function getHealthIcon(status: InsightBulanan["statusKesehatan"]) {
  switch (status) {
    case "aman":
      return "checkmark-circle" as const;
    case "cukup":
      return "information-circle" as const;
    case "waspada":
      return "warning" as const;
    case "rawan":
      return "alert-circle" as const;
    default:
      return "bar-chart" as const;
  }
}

function getHealthBackground(status: InsightBulanan["statusKesehatan"]) {
  switch (status) {
    case "aman":
      return insightScreenStyles.healthSuccess;
    case "cukup":
      return insightScreenStyles.healthInfo;
    case "waspada":
      return insightScreenStyles.healthWarning;
    case "rawan":
      return insightScreenStyles.healthDanger;
    default:
      return insightScreenStyles.healthNeutral;
  }
}

function getHealthIconColor(status: InsightBulanan["statusKesehatan"]) {
  switch (status) {
    case "aman":
      return COLORS.success;
    case "cukup":
      return COLORS.info;
    case "waspada":
      return COLORS.warning;
    case "rawan":
      return COLORS.danger;
    default:
      return COLORS.brandPrimary;
  }
}

function getHealthText(status: InsightBulanan["statusKesehatan"]) {
  switch (status) {
    case "aman":
      return "Uang keluar pada bulan ini masih lebih kecil dari uang masuk. Kebiasaan mencatatmu sudah membantu melihat kondisi uang.";
    case "cukup":
      return "Keuangan masih cukup terkendali, tapi tetap pantau pengeluaran supaya tidak naik diam-diam.";
    case "waspada":
      return "Pengeluaran mulai mendekati uang masuk. Tahan dulu belanja yang tidak mendesak.";
    case "rawan":
      return "Uang keluar sudah lebih besar dari uang masuk. Prioritaskan kebutuhan utama dan hentikan belanja tambahan dulu.";
    default:
      return "Mulai catat uang masuk dan keluar supaya DompetKu bisa membuat laporan yang lebih akurat.";
  }
}

function getPerubahanLabel(value: number | null) {
  if (value === null) {
    return "Belum ada data bulan sebelumnya untuk dibandingkan.";
  }

  if (value > 0) {
    return `Pengeluaran naik ${formatPersen(
      value
    )} dibanding bulan sebelumnya. Cek kategori terbesar agar tidak kebablasan.`;
  }

  if (value < 0) {
    return `Bagus, pengeluaran turun ${formatPersen(
      Math.abs(value)
    )} dibanding bulan sebelumnya. Pertahankan pola ini.`;
  }

  return "Pengeluaran bulan ini sama seperti bulan sebelumnya.";
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(value, 100));
}

function getBudgetStatusText(item: RingkasanAnggaranBulananItem) {
  if (item.status === "melewati_batas") {
    return "Melewati batas";
  }

  if (item.status === "mendekati_batas") {
    return "Hampir habis";
  }

  return "Masih aman";
}

function getBudgetStatusVariant(item: RingkasanAnggaranBulananItem) {
  if (item.status === "melewati_batas") {
    return "danger" as const;
  }

  if (item.status === "mendekati_batas") {
    return "warning" as const;
  }

  return "success" as const;
}

function getBudgetProgressStyle(item: RingkasanAnggaranBulananItem) {
  if (item.status === "melewati_batas") {
    return insightScreenStyles.progressFillDanger;
  }

  if (item.status === "mendekati_batas") {
    return insightScreenStyles.progressFillWarning;
  }

  return insightScreenStyles.progressFillSuccess;
}

export default function InsightTabPage() {
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isGuestMode } = useAuthSession();

  const [isLoading, setIsLoading] = useState(true);
  const [insight, setInsight] = useState<InsightBulanan>(EMPTY_INSIGHT);
  const [danaDarurat, setDanaDarurat] =
    useState<RingkasanDanaDarurat>(EMPTY_DANA_DARURAT);
  const [ringkasanPengingat, setRingkasanPengingat] =
    useState<RingkasanPengingatTagihan>(EMPTY_PENGINGAT);
  const [anggaran, setAnggaran] = useState<RingkasanAnggaranBulananItem[]>([]);

  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // <-- State khusus pesan error rentang tanggal

  // ===== STATE RENTANG TANGGAL =====
  const [tanggalMulai, setTanggalMulai] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });

  const [tanggalSelesai, setTanggalSelesai] = useState<string>(() => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}`;
  });

  // Turunan bulan untuk export & anggaran (tetap pakai bulan dari tanggalMulai)
  const selectedBulan = useMemo(() => tanggalMulai.substring(0, 7), [tanggalMulai]);

  // === FUNGSI PRESET CEPAT ===
  function setPreset(preset: "bulan_ini" | "bulan_lalu" | "7_hari" | "30_hari") {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (preset === "bulan_ini") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === "bulan_lalu") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === "7_hari") {
      start = new Date(now);
      start.setDate(now.getDate() - 6);
    } else if (preset === "30_hari") {
      start = new Date(now);
      start.setDate(now.getDate() - 29);
    }

    const formatAman = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    setErrorMessage(""); // Bersihkan error jika pakai preset
    setTanggalMulai(formatAman(start));
    setTanggalSelesai(formatAman(end));
    setExportMessage("Laporan diperbarui mengikuti rentang tanggal baru.");
  }

  // === VALIDASI ANTI-TANGGAL TERBALIK ===
  function handleDateChange(type: "start" | "end", val: string) {
    setErrorMessage(""); // Bersihkan error sebelum validasi

    if (type === "start") {
      if (val > tanggalSelesai) {
        setErrorMessage("⚠️ Error: Tanggal mulai tidak boleh melebihi tanggal selesai.");
        return;
      }
      setTanggalMulai(val);
    } else {
      if (val < tanggalMulai) {
        setErrorMessage("⚠️ Error: Tanggal selesai tidak boleh kurang dari tanggal mulai.");
        return;
      }
      setTanggalSelesai(val);
    }
    setExportMessage("Laporan diperbarui mengikuti rentang tanggal baru.");
  }

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadInsight() {
        try {
          setIsLoading(true);

          const [insightData, danaDaruratData, pengingatData, anggaranData] =
            await Promise.all([
              getInsightRentangPeriode(db, { tanggalMulai, tanggalSelesai }),
              getRingkasanDanaDarurat(db),
              getRingkasanPengingatTagihan(db),
              getRingkasanAnggaranBulanan(db, selectedBulan),
            ]);

          if (!isActive) return;

          setInsight(insightData);
          setDanaDarurat(danaDaruratData);
          setRingkasanPengingat(pengingatData);
          setAnggaran(anggaranData);
        } catch (error) {
          console.log("loadInsight error:", error);
        } finally {
          if (!isActive) return;
          setIsLoading(false);
        }
      }

      loadInsight();

      return () => {
        isActive = false;
      };
    }, [db, selectedBulan, tanggalMulai, tanggalSelesai])
  );

  async function handleExportPdf() {
    try {
      setIsExporting(true);
      setExportMessage("");

      const result = await exportLaporanBulananPdf(db, { bulan: selectedBulan });
      
      if (result !== null) {
        setExportMessage("Laporan PDF berhasil disimpan.");
      } else {
        console.log("Ekspor PDF dibatalkan oleh user.");
      }
    } catch (error) {
      console.log("handleExportPdf error:", error);
      setExportMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengekspor laporan PDF."
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportCsv() {
    try {
      setIsExporting(true);
      setExportMessage("");

      const result = await exportLaporanBulananCsv(db, { bulan: selectedBulan });
      
      if (result !== null) {
        setExportMessage("Laporan CSV berhasil disimpan.");
      } else {
        console.log("Ekspor CSV dibatalkan oleh user.");
      }
    } catch (error) {
      console.log("handleExportCsv error:", error);
      setExportMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengekspor laporan CSV."
      );
    } finally {
      setIsExporting(false);
    }
  }

  const hasCashflowData =
    insight.totalPemasukanBulanIni > 0 ||
    insight.totalPengeluaranBulanIni > 0;

  const maxCashflow = Math.max(
    insight.totalPemasukanBulanIni,
    insight.totalPengeluaranBulanIni,
    1
  );

  const incomeBarPercent = clampPercent(
    (insight.totalPemasukanBulanIni / maxCashflow) * 100
  );

  const expenseBarPercent = clampPercent(
    (insight.totalPengeluaranBulanIni / maxCashflow) * 100
  );

  const expenseRatioPercent = clampPercent(
    insight.rasioPengeluaranTerhadapPemasukan * 100
  );

  const sisaPositif = insight.arusKasBersih >= 0;

  const topKategoriTotal = insight.kategoriTeratas[0]?.total ?? 0;

  const rekomendasi = useMemo(() => {
    const result: string[] = [];

    if (!hasCashflowData) {
      result.push(
        "Mulai catat uang masuk dan uang keluar dulu. Setelah ada data, DompetKu bisa membaca pola keuanganmu."
      );
    }

    if (insight.statusKesehatan === "rawan") {
      result.push(
        "Pengeluaran sudah lebih besar dari uang masuk. Tahan belanja tambahan dan fokus pada kebutuhan penting dulu."
      );
    }

    if (insight.statusKesehatan === "waspada") {
      result.push(
        "Pengeluaran hampir mendekati uang masuk. Kurangi jajan kecil atau belanja spontan agar sisa bulan ini tidak habis."
      );
    }

    if (insight.perubahanPengeluaranPersen !== null) {
      if (insight.perubahanPengeluaranPersen > 0.2) {
        result.push(
          "Pengeluaran naik cukup besar dibanding bulan sebelumnya. Cek kategori terbesar supaya tahu bagian mana yang perlu dikurangi."
        );
      }

      if (insight.perubahanPengeluaranPersen < -0.1) {
        result.push(
          "Bagus, pengeluaran turun dibanding bulan sebelumnya. Pertahankan kebiasaan ini sampai akhir bulan."
        );
      }
    }

    const topKategori = insight.kategoriTeratas[0];

    if (topKategori && insight.totalPengeluaranBulanIni > 0) {
      result.push(
        `Pengeluaran terbesar bulan ini ada di ${topKategori.nama}, nilainya ${formatRupiah(
          topKategori.total
        )}. Coba cek apakah ada belanja di pos ini yang bisa ditunda.`
      );
    }

    const anggaranRawan = anggaran.find(
      (item) => item.status === "melewati_batas"
    );

    if (anggaranRawan) {
      result.push(
        `${anggaranRawan.nama} sudah melewati batas anggaran. Hentikan dulu pengeluaran di pos ini jika memungkinkan.`
      );
    }

    const anggaranMendekati = anggaran.find(
      (item) => item.status === "mendekati_batas"
    );

    if (anggaranMendekati) {
      result.push(
        `${anggaranMendekati.nama} hampir habis. Pantau pos ini sampai akhir bulan.`
      );
    }

    if (danaDarurat.status === "belum_aman") {
      result.push(
        "Dana darurat belum aman. Kalau ada sisa uang, sisihkan sedikit ke dompet dana darurat."
      );
    }

    if (ringkasanPengingat.terlambat > 0) {
      result.push(
        `Ada ${ringkasanPengingat.terlambat} tagihan yang terlambat. Prioritaskan agar tidak menumpuk.`
      );
    }

    if (result.length === 0) {
      result.push(
        "Keuangan bulan ini cukup stabil. Lanjutkan pencatatan supaya laporan tetap akurat."
      );
    }

    return result.slice(0, 5);
  }, [
    anggaran,
    danaDarurat.status,
    hasCashflowData,
    insight.kategoriTeratas,
    insight.perubahanPengeluaranPersen,
    insight.statusKesehatan,
    insight.totalPengeluaranBulanIni,
    ringkasanPengingat.terlambat,
  ]);

  const contentPaddingBottom = getFloatingTabContentPadding(
    insets.bottom,
    width,
    height
  );

  if (isLoading) {
    return <AppLoader label="Membuat laporan keuangan..." />;
  }

  return (
    <AppScreen
      scrollable
      contentContainerStyle={[
        insightScreenStyles.content,
        {
          paddingBottom: contentPaddingBottom,
        },
      ]}
    >
      <View style={insightScreenStyles.heroCard}>
        <View style={insightScreenStyles.heroIcon}>
          <Ionicons name="bar-chart" size={28} color={COLORS.brandPrimary} />
        </View>

        <View style={insightScreenStyles.heroTextWrap}>
          <Text style={insightScreenStyles.heroTitle}>Laporan Keuangan</Text>
          <Text style={insightScreenStyles.heroSubtitle}>
            Lihat kondisi uang, pengeluaran terbesar, anggaran, dan saran
            DompetKu.
          </Text>
        </View>
      </View>

      {isGuestMode ? (
        <View style={insightScreenStyles.notice}>
          <GuestModeNotice />
        </View>
      ) : null}

      <AppCard style={insightScreenStyles.monthCard}>
        <Text style={insightScreenStyles.sectionTitle}>Periode Laporan</Text>
        <Text style={insightScreenStyles.sectionSubtitle}>
          Gunakan tombol cepat atau pilih rentang tanggal sendiri.
        </Text>

        <View style={{ flexDirection: 'row', marginBottom: 16, marginTop: 12 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <AppButton title="Bulan Ini" variant="secondary" onPress={() => setPreset("bulan_ini")} />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <AppButton title="7 Hari" variant="secondary" onPress={() => setPreset("7_hari")} />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton title="30 Hari" variant="secondary" onPress={() => setPreset("30_hari")} />
          </View>
        </View>

        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <AppDateField
              label="Dari Tanggal"
              value={tanggalMulai}
              onChangeDate={(val) => handleDateChange("start", val)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppDateField
              label="Sampai Tanggal"
              value={tanggalSelesai}
              onChangeDate={(val) => handleDateChange("end", val)}
            />
          </View>
        </View>

        {!!errorMessage && (
          <Text style={{ color: COLORS.danger, marginTop: 12, fontSize: 13 }}>
            {errorMessage}
          </Text>
        )}
      </AppCard>

      <View
        style={[
          insightScreenStyles.healthCard,
          getHealthBackground(insight.statusKesehatan),
        ]}
      >
        <View style={insightScreenStyles.healthTopRow}>
          <View style={insightScreenStyles.healthIcon}>
            <Ionicons
              name={getHealthIcon(insight.statusKesehatan)}
              size={28}
              color={getHealthIconColor(insight.statusKesehatan)}
            />
          </View>

          <View style={insightScreenStyles.healthTextWrap}>
            <View style={insightScreenStyles.healthTitleRow}>
              <Text style={insightScreenStyles.healthTitle}>
                {getHealthLabel(insight.statusKesehatan)}
              </Text>

              <StatusBadge
                label={getHealthLabel(insight.statusKesehatan)}
                variant={getHealthVariant(insight.statusKesehatan)}
              />
            </View>

            <Text style={insightScreenStyles.healthDescription}>
              {getHealthText(insight.statusKesehatan)}
            </Text>
          </View>
        </View>
      </View>

      <View style={insightScreenStyles.section}>
        <Text style={insightScreenStyles.sectionTitle}>Ringkasan arus kas</Text>
        <Text style={insightScreenStyles.sectionSubtitle}>
          Uang masuk, uang keluar, dan sisa bulan ini.
        </Text>

        <View style={insightScreenStyles.summaryGrid}>
          <AppCard style={insightScreenStyles.summaryCardHalf}>
            <View style={insightScreenStyles.summaryIconIncome}>
              <Ionicons name="arrow-down" size={18} color={COLORS.income} />
            </View>
            <Text style={insightScreenStyles.summaryLabel}>Uang masuk</Text>
            <Text style={insightScreenStyles.summaryValueIncome}>
              {formatRupiah(insight.totalPemasukanBulanIni)}
            </Text>
          </AppCard>

          <AppCard style={insightScreenStyles.summaryCardHalf}>
            <View style={insightScreenStyles.summaryIconExpense}>
              <Ionicons name="arrow-up" size={18} color={COLORS.expense} />
            </View>
            <Text style={insightScreenStyles.summaryLabel}>Uang keluar</Text>
            <Text style={insightScreenStyles.summaryValueExpense}>
              {formatRupiah(insight.totalPengeluaranBulanIni)}
            </Text>
          </AppCard>

          <AppCard style={insightScreenStyles.summaryCardFull}>
            <View style={insightScreenStyles.netRow}>
              <View>
                <Text style={insightScreenStyles.summaryLabel}>
                  Sisa bulan ini
                </Text>
                <Text
                  style={
                    sisaPositif
                      ? insightScreenStyles.netValuePositive
                      : insightScreenStyles.netValueNegative
                  }
                >
                  {formatRupiah(insight.arusKasBersih)}
                </Text>
              </View>

              <View
                style={
                  sisaPositif
                    ? insightScreenStyles.netIconPositive
                    : insightScreenStyles.netIconNegative
                }
              >
                <Ionicons
                  name={sisaPositif ? "trending-up" : "trending-down"}
                  size={24}
                  color={sisaPositif ? COLORS.income : COLORS.expense}
                />
              </View>
            </View>
          </AppCard>
        </View>
      </View>

      <View style={insightScreenStyles.section}>
        <Text style={insightScreenStyles.sectionTitle}>
          Pemasukan vs pengeluaran
        </Text>
        <Text style={insightScreenStyles.sectionSubtitle}>
          Perbandingan sederhana antara uang masuk dan uang keluar bulan ini.
        </Text>

        <AppCard style={insightScreenStyles.wideCard}>
          {hasCashflowData ? (
            <>
              <View style={insightScreenStyles.barItem}>
                <View style={insightScreenStyles.barHeader}>
                  <Text style={insightScreenStyles.barLabel}>Uang masuk</Text>
                  <Text style={insightScreenStyles.barValueIncome}>
                    {formatRupiah(insight.totalPemasukanBulanIni)}
                  </Text>
                </View>
                <View style={insightScreenStyles.barTrack}>
                  <View
                    style={[
                      insightScreenStyles.barFillIncome,
                      {
                        width: `${incomeBarPercent}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={insightScreenStyles.barItem}>
                <View style={insightScreenStyles.barHeader}>
                  <Text style={insightScreenStyles.barLabel}>Uang keluar</Text>
                  <Text style={insightScreenStyles.barValueExpense}>
                    {formatRupiah(insight.totalPengeluaranBulanIni)}
                  </Text>
                </View>
                <View style={insightScreenStyles.barTrack}>
                  <View
                    style={[
                      insightScreenStyles.barFillExpense,
                      {
                        width: `${expenseBarPercent}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={insightScreenStyles.ratioBox}>
                <Text style={insightScreenStyles.ratioTitle}>
                  Pengeluaran memakai {Math.round(expenseRatioPercent)}% dari
                  uang masuk.
                </Text>
                <Text style={insightScreenStyles.ratioText}>
                  {expenseRatioPercent > 100
                    ? "Pengeluaran sudah melewati uang masuk."
                    : expenseRatioPercent >= 80
                    ? "Mulai hati-hati, sisa uang makin tipis."
                    : "Masih ada ruang untuk mengatur sisa uang bulan ini."}
                </Text>
              </View>
            </>
          ) : (
            <Text style={insightScreenStyles.emptyText}>
              Belum ada pemasukan atau pengeluaran pada bulan ini.
            </Text>
          )}
        </AppCard>
      </View>

      <View style={insightScreenStyles.section}>
        <Text style={insightScreenStyles.sectionTitle}>
          Dibanding bulan sebelumnya
        </Text>
        <Text style={insightScreenStyles.sectionSubtitle}>
          Lihat apakah pengeluaran bulan ini naik atau turun.
        </Text>

        <AppCard style={insightScreenStyles.wideCard}>
          <Text style={insightScreenStyles.comparisonTitle}>
            {getPerubahanLabel(insight.perubahanPengeluaranPersen)}
          </Text>

          <View style={insightScreenStyles.comparisonGrid}>
            <View style={insightScreenStyles.comparisonItem}>
              <Text style={insightScreenStyles.comparisonLabel}>
                Bulan dipilih
              </Text>
              <Text style={insightScreenStyles.comparisonValue}>
                {formatRupiah(insight.totalPengeluaranBulanIni)}
              </Text>
            </View>

            <View style={insightScreenStyles.comparisonItem}>
              <Text style={insightScreenStyles.comparisonLabel}>
                Bulan sebelumnya
              </Text>
              <Text style={insightScreenStyles.comparisonValue}>
                {formatRupiah(insight.totalPengeluaranBulanLalu)}
              </Text>
            </View>
          </View>
        </AppCard>
      </View>

      <View style={insightScreenStyles.section}>
        <Text style={insightScreenStyles.sectionTitle}>
          Pengeluaran terbesar
        </Text>
        <Text style={insightScreenStyles.sectionSubtitle}>
          Pos yang paling banyak memakai uang bulan ini.
        </Text>

        {insight.kategoriTeratas.length > 0 ? (
          <AppCard style={insightScreenStyles.wideCard}>
            {insight.kategoriTeratas.map((item) => {
              const percent =
                topKategoriTotal > 0
                  ? (item.total / topKategoriTotal) * 100
                  : 0;

              return (
                <View key={item.nama} style={insightScreenStyles.categoryItem}>
                  <View style={insightScreenStyles.categoryHeader}>
                    <View style={insightScreenStyles.categoryLeft}>
                      <View
                        style={[
                          insightScreenStyles.categoryDot,
                          {
                            backgroundColor: getCategoryChartColor(item.nama),
                          },
                        ]}
                      />
                      <Text
                        style={insightScreenStyles.categoryName}
                        numberOfLines={1}
                      >
                        {item.nama}
                      </Text>
                    </View>

                    <Text style={insightScreenStyles.categoryAmount}>
                      {formatRupiah(item.total)}
                    </Text>
                  </View>

                  <View style={insightScreenStyles.categoryTrack}>
                    <View
                      style={[
                        insightScreenStyles.categoryFill,
                        {
                          width: `${clampPercent(percent)}%`,
                          backgroundColor: getCategoryChartColor(item.nama),
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </AppCard>
        ) : (
          <AppCard style={insightScreenStyles.emptyCard}>
            <Text style={insightScreenStyles.emptyText}>
              Belum ada pengeluaran pada bulan ini. Catat uang keluar agar
              laporan kategori muncul.
            </Text>
          </AppCard>
        )}
      </View>

      <View style={insightScreenStyles.section}>
        <Text style={insightScreenStyles.sectionTitle}>Anggaran bulan ini</Text>
        <Text style={insightScreenStyles.sectionSubtitle}>
          Pantau batas belanja supaya tidak kebablasan.
        </Text>

        {anggaran.length > 0 ? (
          <AppCard style={insightScreenStyles.wideCard}>
            {anggaran.map((item) => {
              const progressPercent = clampPercent(
                item.persentase_terpakai * 100
              );

              return (
                <View key={item.id} style={insightScreenStyles.budgetItem}>
                  <View style={insightScreenStyles.budgetHeader}>
                    <View style={insightScreenStyles.budgetTextWrap}>
                      <Text style={insightScreenStyles.budgetName}>
                        {item.nama}
                      </Text>
                      <Text style={insightScreenStyles.budgetMeta}>
                        {formatRupiah(item.total_terpakai)} dari{" "}
                        {formatRupiah(item.batas_nominal)}
                      </Text>
                    </View>

                    <StatusBadge
                      label={getBudgetStatusText(item)}
                      variant={getBudgetStatusVariant(item)}
                    />
                  </View>

                  <View style={insightScreenStyles.budgetTrack}>
                    <View
                      style={[
                        insightScreenStyles.budgetFill,
                        getBudgetProgressStyle(item),
                        {
                          width: `${progressPercent}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </AppCard>
        ) : (
          <AppCard style={insightScreenStyles.emptyCard}>
            <Text style={insightScreenStyles.emptyText}>
              Belum ada anggaran. Buat batas belanja agar DompetKu bisa memberi
              peringatan sebelum uang kebablasan.
            </Text>

            <AppButton
              title="Buat anggaran"
              style={insightScreenStyles.emptyButton}
              onPress={() => router.push(ROUTES.PROTECTED.ANGGARAN)}
            />
          </AppCard>
        )}
      </View>

      <View style={insightScreenStyles.section}>
        <Text style={insightScreenStyles.sectionTitle}>Saran DompetKu</Text>
        <Text style={insightScreenStyles.sectionSubtitle}>
          Saran ini dibuat dari catatan uangmu bulan ini.
        </Text>

        <AppCard style={insightScreenStyles.adviceCard}>
          {rekomendasi.map((item, index) => (
            <View
              key={`${index}-${item}`}
              style={insightScreenStyles.adviceItem}
            >
              <View style={insightScreenStyles.adviceIcon}>
                <Ionicons
                  name={index === 0 ? "bulb-outline" : "checkmark"}
                  size={18}
                  color={COLORS.brandPrimary}
                />
              </View>

              <Text style={insightScreenStyles.adviceText}>{item}</Text>
            </View>
          ))}
        </AppCard>
      </View>

      <View style={insightScreenStyles.section}>
        <Text style={insightScreenStyles.sectionTitle}>Unduh laporan</Text>
        <Text style={insightScreenStyles.sectionSubtitle}>
          Simpan laporan untuk Excel, arsip pribadi, atau kebutuhan usaha.
        </Text>

        <AppCard style={insightScreenStyles.exportCard}>
          <Text style={insightScreenStyles.paragraph}>
            CSV cocok dibuka di Excel atau spreadsheet. PDF cocok untuk dibaca
            atau dikirim.
          </Text>

          <View style={insightScreenStyles.exportRow}>
            <View style={insightScreenStyles.exportItem}>
              <AppButton
                title={isExporting ? "Membuat..." : "CSV / Excel"}
                variant="secondary"
                disabled={isExporting}
                onPress={handleExportCsv}
              />
            </View>

            <View style={insightScreenStyles.exportItemLast}>
              <AppButton
                title={isExporting ? "Membuat..." : "PDF"}
                disabled={isExporting}
                onPress={handleExportPdf}
              />
            </View>
          </View>

          {!!exportMessage ? (
            <Text style={insightScreenStyles.exportMessage}>
              {exportMessage}
            </Text>
          ) : null}
        </AppCard>
      </View>
    </AppScreen>
  );
}