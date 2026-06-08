import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import {
  AppButton,
  AppCard,
  AppLoader,
  AppScreen,
  StatusBadge,
} from "@/components";
import { COLORS, ROUTES } from "@/constants";
import {
  getRiwayatKoreksiSaldoDompet,
  type KoreksiSaldoDompetRow,
} from "@/database";
import { formatRupiah, formatTanggalWaktuIndonesia } from "@/utils";
import { auditSaldoScreenStyles } from "../../../assets/styles/screens/protected/auditSaldoScreen.styles";

const PAGE_SIZE = 30;

function getSelisihLabel(value: number) {
  if (value > 0) {
    return `+ ${formatRupiah(value)}`;
  }

  if (value < 0) {
    return `- ${formatRupiah(Math.abs(value))}`;
  }

  return formatRupiah(0);
}

function getSelisihVariant(value: number) {
  if (value > 0) {
    return "success" as const;
  }

  if (value < 0) {
    return "danger" as const;
  }

  return "neutral" as const;
}

function getSelisihTextStyle(value: number) {
  if (value > 0) {
    return auditSaldoScreenStyles.amountPositive;
  }

  if (value < 0) {
    return auditSaldoScreenStyles.amountNegative;
  }

  return auditSaldoScreenStyles.amountNeutral;
}

export default function AuditSaldoPage() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [rows, setRows] = useState<KoreksiSaldoDompetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadFirstPage = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await getRiwayatKoreksiSaldoDompet(db, {
        limit: PAGE_SIZE,
        offset: 0,
      });

      setRows(result);
      setHasMore(result.length === PAGE_SIZE);
    } catch (error) {
      console.log("load audit saldo error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Riwayat koreksi saldo belum berhasil dimuat."
      );
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  async function loadMore() {
    if (isLoadingMore || !hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setErrorMessage("");

      const result = await getRiwayatKoreksiSaldoDompet(db, {
        limit: PAGE_SIZE,
        offset: rows.length,
      });

      setRows((current) => [...current, ...result]);
      setHasMore(result.length === PAGE_SIZE);
    } catch (error) {
      console.log("load more audit saldo error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Riwayat koreksi saldo berikutnya belum berhasil dimuat."
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage])
  );

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(ROUTES.PROTECTED.PROFIL);
  }

  if (isLoading) {
    return <AppLoader label="Memuat audit saldo..." />;
  }

  return (
    <AppScreen
      scrollable
      safeTop
      contentContainerStyle={auditSaldoScreenStyles.content}
    >
      <AppButton
        title="Kembali"
        variant="secondary"
        style={auditSaldoScreenStyles.backButton}
        onPress={handleBack}
      />

      <View style={auditSaldoScreenStyles.heroCard}>
        <View style={auditSaldoScreenStyles.heroIcon}>
          <Ionicons
            name="shield-checkmark"
            size={28}
            color={COLORS.brandPrimary}
          />
        </View>

        <View style={auditSaldoScreenStyles.heroTextWrap}>
          <Text style={auditSaldoScreenStyles.heroTitle}>Audit Saldo</Text>
          <Text style={auditSaldoScreenStyles.heroSubtitle}>
            Jejak koreksi saldo manual dari fitur Kelola Dompet.
          </Text>
        </View>
      </View>

      <AppCard style={auditSaldoScreenStyles.infoCard}>
        <Text style={auditSaldoScreenStyles.infoTitle}>
          Kenapa ini penting?
        </Text>
        <Text style={auditSaldoScreenStyles.infoText}>
          Koreksi saldo bukan pemasukan atau pengeluaran. Catatan ini membantu
          melihat perubahan saldo manual tanpa mengubah laporan transaksi utama.
        </Text>
      </AppCard>

      {!!errorMessage ? (
        <Text style={auditSaldoScreenStyles.errorText}>{errorMessage}</Text>
      ) : null}

      <View style={auditSaldoScreenStyles.sectionHeader}>
        <Text style={auditSaldoScreenStyles.sectionTitle}>
          Riwayat koreksi
        </Text>
        <Text style={auditSaldoScreenStyles.sectionSubtitle}>
          {rows.length} koreksi saldo tersimpan di perangkat ini.
        </Text>
      </View>

      {rows.length > 0 ? (
        rows.map((item) => {
          const displayName =
            item.nama_dompet_terkini ?? item.nama_dompet_snapshot;

          return (
            <AppCard key={item.id} style={auditSaldoScreenStyles.auditCard}>
              <View style={auditSaldoScreenStyles.auditTopRow}>
                <View style={auditSaldoScreenStyles.auditIconWrap}>
                  <Ionicons
                    name={item.selisih >= 0 ? "trending-up" : "trending-down"}
                    size={20}
                    color={item.selisih >= 0 ? COLORS.success : COLORS.danger}
                  />
                </View>

                <View style={auditSaldoScreenStyles.auditTitleWrap}>
                  <Text
                    style={auditSaldoScreenStyles.auditTitle}
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  <Text style={auditSaldoScreenStyles.auditDate}>
                    {formatTanggalWaktuIndonesia(item.created_at)}
                  </Text>
                </View>

                <StatusBadge
                  label={item.sumber === "manual" ? "Manual" : item.sumber}
                  variant={getSelisihVariant(item.selisih)}
                />
              </View>

              <View style={auditSaldoScreenStyles.amountBox}>
                <View style={auditSaldoScreenStyles.amountRow}>
                  <Text style={auditSaldoScreenStyles.amountLabel}>
                    Saldo sebelum
                  </Text>
                  <Text style={auditSaldoScreenStyles.amountValue}>
                    {formatRupiah(item.saldo_sebelum)}
                  </Text>
                </View>

                <View style={auditSaldoScreenStyles.amountRow}>
                  <Text style={auditSaldoScreenStyles.amountLabel}>
                    Saldo sesudah
                  </Text>
                  <Text style={auditSaldoScreenStyles.amountValue}>
                    {formatRupiah(item.saldo_sesudah)}
                  </Text>
                </View>

                <View style={auditSaldoScreenStyles.amountRowStrong}>
                  <Text style={auditSaldoScreenStyles.amountLabelStrong}>
                    Selisih
                  </Text>
                  <Text
                    style={[
                      auditSaldoScreenStyles.amountValueStrong,
                      getSelisihTextStyle(item.selisih),
                    ]}
                  >
                    {getSelisihLabel(item.selisih)}
                  </Text>
                </View>
              </View>

              {item.catatan ? (
                <Text style={auditSaldoScreenStyles.noteText}>
                  {item.catatan}
                </Text>
              ) : null}
            </AppCard>
          );
        })
      ) : (
        <AppCard style={auditSaldoScreenStyles.emptyCard}>
          <View style={auditSaldoScreenStyles.emptyIcon}>
            <Ionicons
              name="document-text-outline"
              size={28}
              color={COLORS.brandPrimary}
            />
          </View>
          <Text style={auditSaldoScreenStyles.emptyTitle}>
            Belum ada koreksi saldo
          </Text>
          <Text style={auditSaldoScreenStyles.emptyText}>
            Riwayat akan muncul setelah kamu mengubah saldo manual dari halaman
            Dompet.
          </Text>
        </AppCard>
      )}

      {hasMore ? (
        <AppButton
          title={isLoadingMore ? "Memuat..." : "Muat lagi"}
          variant="secondary"
          style={auditSaldoScreenStyles.loadMoreButton}
          disabled={isLoadingMore}
          onPress={loadMore}
        />
      ) : null}
    </AppScreen>
  );
}