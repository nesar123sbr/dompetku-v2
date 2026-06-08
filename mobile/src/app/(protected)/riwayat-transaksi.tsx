import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, useFocusEffect, usePathname, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AppButton,
  AppCard,
  AppDateField,
  AppLoader,
  AppScreen,
} from "@/components";
import { COLORS, getFloatingTabContentPadding, ROUTES } from "@/constants";
import {
  getRingkasanRiwayatTransaksi,
  getRiwayatTransaksiPaged,
  hapusTransaksiLokalDanKembalikanSaldo,
  type RingkasanRiwayatTransaksi,
  type RiwayatTransaksiRow,
} from "@/database";
import {
  dateToDateInput,
  formatRupiah,
  formatTanggalIndonesiaPendek,
} from "@/utils";
import { riwayatScreenStyles } from "@assets/styles/screens/protected/riwayatScreen.styles";

const PROTECTED_ROUTES = ROUTES.PROTECTED as unknown as Record<string, string>;

const DASHBOARD_HREF = (PROTECTED_ROUTES.DASHBOARD ??
  "/(protected)/(tabs)/dashboard") as Href;

const TRANSAKSI_HREF = (PROTECTED_ROUTES.TRANSAKSI ??
  "/(protected)/(tabs)/transaksi") as Href;

const EDIT_TRANSAKSI_HREF = (PROTECTED_ROUTES.EDIT_TRANSAKSI ??
  "/(protected)/edit-transaksi") as Href;

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type FilterJenis = "semua" | "pemasukan" | "pengeluaran";

type FilterPeriode =
  | "hari_ini"
  | "bulan_ini"
  | "bulan_lalu"
  | "pilih_bulan"
  | "semua";

type DateRange = {
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
};

type ListRow =
  | {
      type: "date";
      id: string;
      label: string;
    }
  | {
      type: "item";
      id: string;
      item: RiwayatTransaksiRow;
    };

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_SUMMARY: RingkasanRiwayatTransaksi = {
  totalPemasukan: 0,
  totalPengeluaran: 0,
  saldoBersih: 0,
  jumlahTransaksi: 0,
};

const JENIS_FILTERS: {
  label: string;
  value: FilterJenis;
  icon: IoniconName;
}[] = [
  {
    label: "Semua",
    value: "semua",
    icon: "swap-vertical",
  },
  {
    label: "Uang masuk",
    value: "pemasukan",
    icon: "arrow-down",
  },
  {
    label: "Uang keluar",
    value: "pengeluaran",
    icon: "arrow-up",
  },
];

const PERIODE_FILTERS: {
  label: string;
  value: FilterPeriode;
}[] = [
  {
    label: "Hari ini",
    value: "hari_ini",
  },
  {
    label: "Bulan ini",
    value: "bulan_ini",
  },
  {
    label: "Bulan lalu",
    value: "bulan_lalu",
  },
  {
    label: "Pilih bulan",
    value: "pilih_bulan",
  },
  {
    label: "Semua",
    value: "semua",
  },
];

function getTodayInput() {
  return dateToDateInput(new Date());
}

function addDays(date: Date, days: number) {
  const cloned = new Date(date);
  cloned.setDate(cloned.getDate() + days);
  return cloned;
}

function getMonthStartInput(date: Date) {
  return dateToDateInput(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getMonthEndInput(date: Date) {
  return dateToDateInput(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function getDateRangeForPeriod(
  periode: FilterPeriode,
  customMonthDate: string
): DateRange {
  const now = new Date();

  if (periode === "hari_ini") {
    const today = getTodayInput();

    return {
      tanggalMulai: today,
      tanggalSelesai: today,
    };
  }

  if (periode === "bulan_ini") {
    return {
      tanggalMulai: getMonthStartInput(now),
      tanggalSelesai: getMonthEndInput(now),
    };
  }

  if (periode === "bulan_lalu") {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    return {
      tanggalMulai: getMonthStartInput(lastMonth),
      tanggalSelesai: getMonthEndInput(lastMonth),
    };
  }

  if (periode === "pilih_bulan") {
    const selected = new Date(`${customMonthDate}T00:00:00`);

    if (Number.isNaN(selected.getTime())) {
      return {
        tanggalMulai: null,
        tanggalSelesai: null,
      };
    }

    return {
      tanggalMulai: getMonthStartInput(selected),
      tanggalSelesai: getMonthEndInput(selected),
    };
  }

  return {
    tanggalMulai: null,
    tanggalSelesai: null,
  };
}

function getPeriodeTitle(periode: FilterPeriode, customMonthDate: string) {
  if (periode === "hari_ini") {
    return "Ringkasan hari ini";
  }

  if (periode === "bulan_ini") {
    return "Ringkasan bulan ini";
  }

  if (periode === "bulan_lalu") {
    return "Ringkasan bulan lalu";
  }

  if (periode === "pilih_bulan") {
    const selected = new Date(`${customMonthDate}T00:00:00`);

    if (!Number.isNaN(selected.getTime())) {
      return new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
      }).format(selected);
    }

    return "Ringkasan bulan pilihan";
  }

  return "Ringkasan semua transaksi";
}

function getDateGroupLabel(value: string) {
  const today = getTodayInput();
  const yesterday = dateToDateInput(addDays(new Date(), -1));

  if (value === today) {
    return `Hari ini, ${formatTanggalIndonesiaPendek(value)}`;
  }

  if (value === yesterday) {
    return `Kemarin, ${formatTanggalIndonesiaPendek(value)}`;
  }

  return formatTanggalIndonesiaPendek(value);
}

function buildGroupedRows(items: RiwayatTransaksiRow[]): ListRow[] {
  const result: ListRow[] = [];
  let currentDate = "";

  for (const item of items) {
    if (item.tanggal_transaksi !== currentDate) {
      currentDate = item.tanggal_transaksi;

      result.push({
        type: "date",
        id: `date-${currentDate}`,
        label: getDateGroupLabel(currentDate),
      });
    }

    result.push({
      type: "item",
      id: `${item.jenis_transaksi}-${item.id}`,
      item,
    });
  }

  return result;
}

function getAmountLabel(item: RiwayatTransaksiRow) {
  const isIncome = item.jenis_transaksi === "pemasukan";
  return `${isIncome ? "+" : "-"} ${formatRupiah(item.jumlah)}`;
}

function getTransactionIcon(item: RiwayatTransaksiRow): IoniconName {
  if (item.jenis_transaksi === "pemasukan") {
    return "arrow-down";
  }

  if (item.pakai_dana_darurat) {
    return "medical";
  }

  return "arrow-up";
}

const DateHeaderRow = memo(function DateHeaderRow({ label }: { label: string }) {
  return <Text style={riwayatScreenStyles.dateHeader}>{label}</Text>;
});

const TransactionRow = memo(function TransactionRow({
  item,
  onPress,
}: {
  item: RiwayatTransaksiRow;
  onPress: (item: RiwayatTransaksiRow) => void;
}) {
  const isIncome = item.jenis_transaksi === "pemasukan";
  const iconName = getTransactionIcon(item);

  const metaParts = [
    item.nama_kategori || "Tanpa kategori",
    item.nama_dompet || "Tanpa dompet",
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Transaksi ${item.judul}`}
      accessibilityHint="Ketuk untuk opsi ubah atau hapus transaksi."
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        riwayatScreenStyles.transactionCard,
        pressed && riwayatScreenStyles.transactionCardPressed,
      ]}
    >
      <View
        style={[
          riwayatScreenStyles.transactionIcon,
          isIncome
            ? riwayatScreenStyles.transactionIconIncome
            : riwayatScreenStyles.transactionIconExpense,
        ]}
      >
        <Ionicons
          name={iconName}
          size={18}
          color={isIncome ? COLORS.income : COLORS.expense}
        />
      </View>

      <View style={riwayatScreenStyles.transactionBody}>
        <Text style={riwayatScreenStyles.transactionTitle} numberOfLines={1}>
          {item.judul}
        </Text>

        <Text style={riwayatScreenStyles.transactionMeta} numberOfLines={1}>
          {metaParts.join(" • ")}
        </Text>

        {item.pakai_dana_darurat ? (
          <Text style={riwayatScreenStyles.emergencyText}>
            Memakai dana darurat
          </Text>
        ) : null}
      </View>

      <Text
        style={
          isIncome
            ? riwayatScreenStyles.transactionAmountIncome
            : riwayatScreenStyles.transactionAmountExpense
        }
      >
        {getAmountLabel(item)}
      </Text>
    </Pressable>
  );
});

export default function RiwayatTransaksiPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isTabMode = pathname.endsWith("/riwayat") || pathname === "/riwayat";
  const db = useSQLiteContext();

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const listBottomPadding = useMemo(
    () => getFloatingTabContentPadding(insets.bottom, width, height),
    [height, insets.bottom, width]
  );

  const requestIdRef = useRef(0);

  const [items, setItems] = useState<RiwayatTransaksiRow[]>([]);
  const [summary, setSummary] =
    useState<RingkasanRiwayatTransaksi>(EMPTY_SUMMARY);

  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [jenis, setJenis] = useState<FilterJenis>("semua");
  const [periode, setPeriode] = useState<FilterPeriode>("bulan_ini");
  const [customMonthDate, setCustomMonthDate] = useState(getTodayInput());

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const dateRange = useMemo(
    () => getDateRangeForPeriod(periode, customMonthDate),
    [periode, customMonthDate]
  );

  const groupedRows = useMemo(() => buildGroupedRows(items), [items]);

  const hasActiveFilter =
    keywordInput.trim().length > 0 ||
    jenis !== "semua" ||
    periode !== "bulan_ini";

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const sanitizedKeyword = keywordInput.replace(/\s+/g, " ").trim();
      setKeyword(sanitizedKeyword);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [keywordInput]);

  const loadFirstPage = useCallback(
    async (showFullLoader = false) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      try {
        setErrorMessage("");

        if (showFullLoader) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        const [result, summaryResult] = await Promise.all([
          getRiwayatTransaksiPaged(db, {
            limit: PAGE_SIZE,
            offset: 0,
            keyword,
            jenis,
            tanggalMulai: dateRange.tanggalMulai,
            tanggalSelesai: dateRange.tanggalSelesai,
          }),
          getRingkasanRiwayatTransaksi(db, {
            keyword,
            jenis,
            tanggalMulai: dateRange.tanggalMulai,
            tanggalSelesai: dateRange.tanggalSelesai,
          }),
        ]);

        if (requestIdRef.current !== requestId) return;

        setItems(result);
        setSummary(summaryResult);
        setHasMore(result.length === PAGE_SIZE);
      } catch (error) {
        console.log("loadFirstPage riwayat error:", error);

        if (requestIdRef.current !== requestId) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Riwayat transaksi belum berhasil dimuat."
        );
      } finally {
        if (requestIdRef.current !== requestId) return;

        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [dateRange.tanggalMulai, dateRange.tanggalSelesai, db, jenis, keyword]
  );

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) {
      return;
    }

    const requestId = requestIdRef.current;

    try {
      setIsLoadingMore(true);
      setErrorMessage("");

      const result = await getRiwayatTransaksiPaged(db, {
        limit: PAGE_SIZE,
        offset: items.length,
        keyword,
        jenis,
        tanggalMulai: dateRange.tanggalMulai,
        tanggalSelesai: dateRange.tanggalSelesai,
      });

      if (requestIdRef.current !== requestId) return;

      setItems((prev) => {
        const existingKeys = new Set(
          prev.map((item) => `${item.jenis_transaksi}-${item.id}`)
        );

        const uniqueItems = result.filter(
          (item) => !existingKeys.has(`${item.jenis_transaksi}-${item.id}`)
        );

        return [...prev, ...uniqueItems];
      });

      setHasMore(result.length === PAGE_SIZE);
    } catch (error) {
      console.log("loadMore riwayat error:", error);

      if (requestIdRef.current !== requestId) return;

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Riwayat berikutnya belum berhasil dimuat."
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoadingMore(false);
      }
    }
  }, [
    dateRange.tanggalMulai,
    dateRange.tanggalSelesai,
    db,
    hasMore,
    isLoading,
    isLoadingMore,
    items.length,
    jenis,
    keyword,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage(true);

      return () => {
        requestIdRef.current += 1;
      };
    }, [loadFirstPage])
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(DASHBOARD_HREF);
  }, [router]);

  const resetPagingState = useCallback(() => {
    setItems([]);
    setHasMore(true);
    setErrorMessage("");
  }, []);

  const handleChangeJenis = useCallback(
    (nextJenis: FilterJenis) => {
      setJenis(nextJenis);
      resetPagingState();
    },
    [resetPagingState]
  );

  const handleChangePeriode = useCallback(
    (nextPeriode: FilterPeriode) => {
      setPeriode(nextPeriode);
      resetPagingState();
    },
    [resetPagingState]
  );

  const handleClearSearch = useCallback(() => {
    setKeywordInput("");
    setKeyword("");
    resetPagingState();
  }, [resetPagingState]);

  const handleResetFilter = useCallback(() => {
    setKeywordInput("");
    setKeyword("");
    setJenis("semua");
    setPeriode("bulan_ini");
    setCustomMonthDate(getTodayInput());
    resetPagingState();
  }, [resetPagingState]);

  const handleEdit = useCallback(
    (item: RiwayatTransaksiRow) => {
      const href =
        `${EDIT_TRANSAKSI_HREF}?id=${encodeURIComponent(
          item.id
        )}&jenis=${item.jenis_transaksi}` as Href;

      router.push(href);
    },
    [router]
  );

  const handleDelete = useCallback(
    (item: RiwayatTransaksiRow) => {
      Alert.alert(
        "Hapus transaksi ini?",
        `Transaksi "${item.judul}" akan dihapus. Saldo dompet akan disesuaikan kembali seperti sebelum transaksi ini dicatat.`,
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
                setErrorMessage("");

                await hapusTransaksiLokalDanKembalikanSaldo(db, {
                  id: item.id,
                  jenisTransaksi: item.jenis_transaksi,
                });

                await loadFirstPage(false);

                Alert.alert(
                  "Berhasil",
                  "Transaksi berhasil dihapus dan saldo sudah disesuaikan."
                );
              } catch (error) {
                console.log("handleDelete riwayat error:", error);
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Transaksi belum berhasil dihapus."
                );
              }
            },
          },
        ]
      );
    },
    [db, loadFirstPage]
  );

  const handleOpenAction = useCallback(
    (item: RiwayatTransaksiRow) => {
      const amountLabel = getAmountLabel(item);
      const meta = [
        formatTanggalIndonesiaPendek(item.tanggal_transaksi),
        item.nama_dompet || "Tanpa dompet",
        item.nama_kategori || "Tanpa kategori",
      ].join(" • ");

      Alert.alert(item.judul, `${amountLabel}\n${meta}`, [
        {
          text: "Ubah transaksi",
          onPress: () => handleEdit(item),
        },
        {
          text: "Hapus transaksi",
          style: "destructive",
          onPress: () => handleDelete(item),
        },
        {
          text: "Tutup",
          style: "cancel",
        },
      ]);
    },
    [handleDelete, handleEdit]
  );

  const handleCustomMonthChange = useCallback(
    (value: string) => {
      setCustomMonthDate(value);
      resetPagingState();
    },
    [resetPagingState]
  );

  const renderHeader = useCallback(() => {
    const periodeTitle = getPeriodeTitle(periode, customMonthDate);
    const isSearchActive = keywordInput.trim().length > 0;

    return (
      <View>
        {!isTabMode ? (
          <AppButton
            title="Kembali"
            variant="secondary"
            style={riwayatScreenStyles.topButton}
            onPress={handleBack}
          />
        ) : null}

        <View style={riwayatScreenStyles.heroCard}>
          <View style={riwayatScreenStyles.heroIcon}>
            <Ionicons
              name="receipt-outline"
              size={26}
              color={COLORS.brandPrimary}
            />
          </View>

          <View style={riwayatScreenStyles.heroTextWrap}>
            <Text style={riwayatScreenStyles.heroTitle}>Riwayat</Text>
            <Text style={riwayatScreenStyles.heroSubtitle}>
              Cari, cek, ubah, atau hapus catatan uangmu.
            </Text>
          </View>
        </View>

        <View style={riwayatScreenStyles.searchCard}>
          <Ionicons
            name="search-outline"
            size={20}
            color={COLORS.textTertiary}
          />

          <TextInput
            value={keywordInput}
            placeholder="Cari: bensin, gaji, makan..."
            placeholderTextColor={COLORS.textTertiary}
            style={riwayatScreenStyles.searchInput}
            returnKeyType="search"
            onChangeText={(value) => {
              setKeywordInput(value);
              setErrorMessage("");
            }}
          />

          {isSearchActive ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bersihkan pencarian"
              style={riwayatScreenStyles.clearButton}
              onPress={handleClearSearch}
            >
              <Ionicons name="close" size={18} color={COLORS.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={riwayatScreenStyles.filterCard}>
          <Text style={riwayatScreenStyles.filterTitle}>Jenis catatan</Text>

          <View style={riwayatScreenStyles.filterRow}>
            {JENIS_FILTERS.map((item) => {
              const selected = jenis === item.value;
              const isIncome = item.value === "pemasukan";
              const isExpense = item.value === "pengeluaran";

              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    riwayatScreenStyles.filterChip,
                    selected && riwayatScreenStyles.filterChipActive,
                    selected && isIncome && riwayatScreenStyles.filterChipIncome,
                    selected &&
                      isExpense &&
                      riwayatScreenStyles.filterChipExpense,
                    pressed && riwayatScreenStyles.filterChipPressed,
                  ]}
                  onPress={() => handleChangeJenis(item.value)}
                >
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={
                      selected
                        ? isIncome
                          ? COLORS.income
                          : isExpense
                          ? COLORS.expense
                          : COLORS.brandPrimary
                        : COLORS.textSecondary
                    }
                  />

                  <Text
                    style={[
                      riwayatScreenStyles.filterChipText,
                      selected && riwayatScreenStyles.filterChipTextActive,
                      selected &&
                        isIncome &&
                        riwayatScreenStyles.filterChipTextIncome,
                      selected &&
                        isExpense &&
                        riwayatScreenStyles.filterChipTextExpense,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={riwayatScreenStyles.filterTitle}>Waktu</Text>

          <View style={riwayatScreenStyles.periodRow}>
            {PERIODE_FILTERS.map((item) => {
              const selected = periode === item.value;

              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    riwayatScreenStyles.periodChip,
                    selected && riwayatScreenStyles.periodChipActive,
                    pressed && riwayatScreenStyles.filterChipPressed,
                  ]}
                  onPress={() => handleChangePeriode(item.value)}
                >
                  <Text
                    style={[
                      riwayatScreenStyles.periodChipText,
                      selected && riwayatScreenStyles.periodChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {periode === "pilih_bulan" ? (
            <View style={riwayatScreenStyles.customMonthWrap}>
              <AppDateField
                label="Pilih bulan"
                value={customMonthDate}
                onChangeDate={handleCustomMonthChange}
                helperText="Pilih tanggal apa saja di bulan yang ingin dilihat."
              />
            </View>
          ) : null}

          {hasActiveFilter ? (
            <AppButton
              title="Reset filter"
              variant="secondary"
              style={riwayatScreenStyles.resetFilterButton}
              onPress={handleResetFilter}
            />
          ) : null}
        </View>

        <AppCard style={riwayatScreenStyles.summaryCard}>
          <View style={riwayatScreenStyles.summaryTopRow}>
            <View>
              <Text style={riwayatScreenStyles.summaryTitle}>
                {periodeTitle}
              </Text>
              <Text style={riwayatScreenStyles.summarySubtitle}>
                {summary.jumlahTransaksi} transaksi ditemukan
              </Text>
            </View>

            <View style={riwayatScreenStyles.summaryCountPill}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={COLORS.brandPrimary}
              />
              <Text style={riwayatScreenStyles.summaryCountText}>
                {summary.jumlahTransaksi}
              </Text>
            </View>
          </View>

          <View style={riwayatScreenStyles.summaryGrid}>
            <View style={riwayatScreenStyles.summaryItem}>
              <Text style={riwayatScreenStyles.summaryLabel}>Uang masuk</Text>
              <Text style={riwayatScreenStyles.summaryValueIncome}>
                {formatRupiah(summary.totalPemasukan)}
              </Text>
            </View>

            <View style={riwayatScreenStyles.summaryItemLast}>
              <Text style={riwayatScreenStyles.summaryLabel}>Uang keluar</Text>
              <Text style={riwayatScreenStyles.summaryValueExpense}>
                {formatRupiah(summary.totalPengeluaran)}
              </Text>
            </View>
          </View>

          <View
            style={[
              riwayatScreenStyles.netSummary,
              summary.saldoBersih >= 0
                ? riwayatScreenStyles.netSummaryPositive
                : riwayatScreenStyles.netSummaryNegative,
            ]}
          >
            <View>
              <Text style={riwayatScreenStyles.netLabel}>Selisih periode</Text>
              <Text
                style={
                  summary.saldoBersih >= 0
                    ? riwayatScreenStyles.netValuePositive
                    : riwayatScreenStyles.netValueNegative
                }
              >
                {formatRupiah(summary.saldoBersih)}
              </Text>
            </View>

            <Ionicons
              name={summary.saldoBersih >= 0 ? "trending-up" : "trending-down"}
              size={24}
              color={summary.saldoBersih >= 0 ? COLORS.income : COLORS.expense}
            />
          </View>
        </AppCard>

        {!!errorMessage ? (
          <Text style={riwayatScreenStyles.errorText}>{errorMessage}</Text>
        ) : null}

        <View style={riwayatScreenStyles.listHeader}>
          <Text style={riwayatScreenStyles.listTitle}>Daftar transaksi</Text>
          <Text style={riwayatScreenStyles.listSubtitle}>
            Ketuk transaksi untuk mengubah atau menghapus.
          </Text>
        </View>
      </View>
    );
  }, [
    customMonthDate,
    errorMessage,
    handleBack,
    handleChangeJenis,
    handleChangePeriode,
    handleClearSearch,
    handleCustomMonthChange,
    handleResetFilter,
    hasActiveFilter,
    isTabMode,
    jenis,
    keywordInput,
    periode,
    summary.jumlahTransaksi,
    summary.saldoBersih,
    summary.totalPemasukan,
    summary.totalPengeluaran,
  ]);

  const renderRow = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.type === "date") {
        return <DateHeaderRow label={item.label} />;
      }

      return <TransactionRow item={item.item} onPress={handleOpenAction} />;
    },
    [handleOpenAction]
  );

  const keyExtractor = useCallback((item: ListRow) => item.id, []);

  const handleRefresh = useCallback(() => {
    loadFirstPage(false);
  }, [loadFirstPage]);

  const emptyComponent = useMemo(
    () => (
      <AppCard style={riwayatScreenStyles.emptyCard}>
        <View style={riwayatScreenStyles.emptyIcon}>
          <Ionicons
            name="receipt-outline"
            size={26}
            color={COLORS.brandPrimary}
          />
        </View>

        <Text style={riwayatScreenStyles.emptyTitle}>
          {hasActiveFilter
            ? "Tidak ada transaksi yang cocok"
            : "Belum ada catatan uang"}
        </Text>

        <Text style={riwayatScreenStyles.emptyText}>
          {hasActiveFilter
            ? "Coba cari kata lain, ubah waktu, atau tekan Reset filter."
            : "Tekan Catat untuk mulai mencatat uang masuk atau uang keluar."}
        </Text>

        <AppButton
          title={hasActiveFilter ? "Reset filter" : "Catat sekarang"}
          style={riwayatScreenStyles.emptyButton}
          onPress={
            hasActiveFilter
              ? handleResetFilter
              : () => router.push(TRANSAKSI_HREF)
          }
        />
      </AppCard>
    ),
    [handleResetFilter, hasActiveFilter, router]
  );

  const footerComponent = useMemo(() => {
    if (isLoadingMore) {
      return (
        <Text style={riwayatScreenStyles.loadingMoreText}>
          Memuat transaksi berikutnya...
        </Text>
      );
    }

    return <View style={riwayatScreenStyles.bottomSpacer} />;
  }, [isLoadingMore]);

  if (isLoading) {
    return <AppLoader label="Memuat riwayat transaksi..." />;
  }

  return (
    <AppScreen safeTop contentContainerStyle={riwayatScreenStyles.screenContent}>
      <View style={riwayatScreenStyles.listWrap}>
        <FlashList<ListRow>
          data={groupedRows}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{
            paddingTop: 0,
            paddingBottom: listBottomPadding,
          }}
          keyboardShouldPersistTaps="handled"
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          getItemType={(item) => item.type}
          ListEmptyComponent={emptyComponent}
          ListFooterComponent={footerComponent}
        />
      </View>
    </AppScreen>
  );
}