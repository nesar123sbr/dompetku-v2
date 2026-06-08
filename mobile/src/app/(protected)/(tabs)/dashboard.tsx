import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import {
  AppButton,
  AppCard,
  AppScreen,
  GuestModeNotice,
  ReminderCard,
} from "@/components";
import {
  getPreviewPengingatDashboard,
  getRingkasanDashboard,
  type PengingatTagihanListItem,
  type RingkasanDashboard,
} from "@/database";
import { COLORS, ROUTES } from "@/constants";
import { useAuthSession } from "@/providers/AuthProvider";
import { formatRupiah } from "@/utils";
import { dashboardScreenStyles } from "@assets/styles/screens/protected/dashboardScreen.styles";

const EMPTY_RINGKASAN: RingkasanDashboard = {
  totalSaldo: 0,
  totalDanaDarurat: 0,
  totalPemasukan: 0,
  totalPengeluaran: 0,
  jumlahDompetAktif: 0,
  jumlahPengingatAktif: 0,
};

const PROTECTED_ROUTES = ROUTES.PROTECTED as unknown as Record<string, string>;

const TRANSAKSI_HREF = (PROTECTED_ROUTES.TRANSAKSI ??
  "/(protected)/(tabs)/transaksi") as Href;

const PENGINGAT_HREF = (PROTECTED_ROUTES.PENGINGAT ??
  "/(protected)/pengingat") as Href;

const ANGGARAN_HREF = (PROTECTED_ROUTES.ANGGARAN ??
  "/(protected)/anggaran") as Href;

const LAPORAN_HREF = (PROTECTED_ROUTES.INSIGHT ??
  "/(protected)/(tabs)/insight") as Href;

const MENU_HREF = (PROTECTED_ROUTES.PROFIL ??
  "/(protected)/(tabs)/profil") as Href;

type HomeStatusVariant = "success" | "info" | "warning" | "danger";

type HomeStatus = {
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant: HomeStatusVariant;
};

type SmartWarning = {
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant: HomeStatusVariant;
  actionLabel?: string;
  actionHref?: Href;
};

function getHomeStatus(
  totalPemasukan: number,
  totalPengeluaran: number
): HomeStatus {
  const belumAdaData = totalPemasukan <= 0 && totalPengeluaran <= 0;

  if (belumAdaData) {
    return {
      title: "Mulai catat uangmu",
      text: "Catat uang masuk dan keluar supaya DompetKu bisa membaca kondisi keuanganmu.",
      icon: "wallet-outline",
      variant: "info",
    };
  }

  if (totalPemasukan <= 0 && totalPengeluaran > 0) {
    return {
      title: "Uang keluar sudah tercatat",
      text: "Catat juga uang masuk agar laporan bulan ini lebih seimbang.",
      icon: "alert-circle",
      variant: "danger",
    };
  }

  const rasioPengeluaran = totalPengeluaran / totalPemasukan;

  if (rasioPengeluaran <= 0.6) {
    return {
      title: "Keuanganmu masih aman",
      text: "Uang keluar bulan ini masih jauh di bawah uang masuk.",
      icon: "checkmark-circle",
      variant: "success",
    };
  }

  if (rasioPengeluaran <= 0.8) {
    return {
      title: "Masih cukup terkendali",
      text: "Pengeluaran mulai naik, tapi masih dalam batas yang wajar.",
      icon: "information-circle",
      variant: "info",
    };
  }

  if (rasioPengeluaran <= 1) {
    return {
      title: "Mulai hati-hati",
      text: "Pengeluaran bulan ini hampir menyamai uang masuk.",
      icon: "warning",
      variant: "warning",
    };
  }

  return {
    title: "Pengeluaran lebih besar",
    text: "Tahan dulu belanja yang tidak wajib agar uang tidak makin menipis.",
    icon: "alert-circle",
    variant: "danger",
  };
}

function getStatusCardStyle(variant: HomeStatusVariant) {
  switch (variant) {
    case "success":
      return dashboardScreenStyles.statusSuccess;
    case "warning":
      return dashboardScreenStyles.statusWarning;
    case "danger":
      return dashboardScreenStyles.statusDanger;
    default:
      return dashboardScreenStyles.statusInfo;
  }
}

function getStatusTextStyle(variant: HomeStatusVariant) {
  switch (variant) {
    case "success":
      return dashboardScreenStyles.statusSuccessText;
    case "warning":
      return dashboardScreenStyles.statusWarningText;
    case "danger":
      return dashboardScreenStyles.statusDangerText;
    default:
      return dashboardScreenStyles.statusInfoText;
  }
}

function getStatusColor(variant: HomeStatusVariant) {
  switch (variant) {
    case "success":
      return COLORS.success;
    case "warning":
      return COLORS.warning;
    case "danger":
      return COLORS.danger;
    default:
      return COLORS.brandPrimary;
  }
}

function DashboardSkeleton() {
  return (
    <AppScreen scrollable
    withFloatingTabSpace
    contentContainerStyle={dashboardScreenStyles.content}>
      <View style={dashboardScreenStyles.heroCard}>
        <View style={dashboardScreenStyles.heroDecorOne} />
        <View style={dashboardScreenStyles.heroDecorTwo} />

        <View
          style={[
            dashboardScreenStyles.skeletonBoxOnHero,
            dashboardScreenStyles.skeletonLogo,
          ]}
        />
        <View
          style={[
            dashboardScreenStyles.skeletonBoxOnHero,
            dashboardScreenStyles.skeletonGreeting,
          ]}
        />
        <View
          style={[
            dashboardScreenStyles.skeletonBoxOnHero,
            dashboardScreenStyles.skeletonHeroLabel,
          ]}
        />
        <View
          style={[
            dashboardScreenStyles.skeletonBoxOnHero,
            dashboardScreenStyles.skeletonHeroAmount,
          ]}
        />

        <View style={dashboardScreenStyles.skeletonPillRow}>
          <View
            style={[
              dashboardScreenStyles.skeletonBoxOnHero,
              dashboardScreenStyles.skeletonPillSmall,
            ]}
          />
          <View
            style={[
              dashboardScreenStyles.skeletonBoxOnHero,
              dashboardScreenStyles.skeletonPillLarge,
            ]}
          />
        </View>
      </View>

      <View style={dashboardScreenStyles.skeletonStatusCard} />

      <View style={dashboardScreenStyles.skeletonSectionHeader}>
        <View
          style={[
            dashboardScreenStyles.skeletonBox,
            dashboardScreenStyles.skeletonSectionTitle,
          ]}
        />
        <View
          style={[
            dashboardScreenStyles.skeletonBox,
            dashboardScreenStyles.skeletonSectionSubtitle,
          ]}
        />
      </View>

      <View style={dashboardScreenStyles.monthGrid}>
        <View style={dashboardScreenStyles.skeletonMonthCard} />
        <View style={dashboardScreenStyles.skeletonMonthCard} />
      </View>

      <View style={dashboardScreenStyles.skeletonWideCard} />
      <View style={dashboardScreenStyles.skeletonWideCard} />
    </AppScreen>
  );
}

export default function DashboardTabPage() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { isGuestMode } = useAuthSession();

  const [isLoading, setIsLoading] = useState(true);
  const [showSaldo, setShowSaldo] = useState(true);
  const [ringkasan, setRingkasan] =
    useState<RingkasanDashboard>(EMPTY_RINGKASAN);
  const [previewPengingat, setPreviewPengingat] = useState<
    PengingatTagihanListItem[]
  >([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadDashboard() {
        try {
          setIsLoading(true);

          const [ringkasanResult, previewResult] = await Promise.all([
            getRingkasanDashboard(db),
            getPreviewPengingatDashboard(db, 3),
          ]);

          if (!isActive) return;

          setRingkasan(ringkasanResult);
          setPreviewPengingat(previewResult);
        } catch (error) {
          console.log("loadDashboard error:", error);
        } finally {
          if (!isActive) return;
          setIsLoading(false);
        }
      }

      loadDashboard();

      return () => {
        isActive = false;
      };
    }, [db])
  );

  const sisaBulanIni = ringkasan.totalPemasukan - ringkasan.totalPengeluaran;
  const uangAmanDipakai = Math.max(0, sisaBulanIni);

  const status = useMemo(
    () => getHomeStatus(ringkasan.totalPemasukan, ringkasan.totalPengeluaran),
    [ringkasan.totalPemasukan, ringkasan.totalPengeluaran]
  );

  const hasMonthlyData =
    ringkasan.totalPemasukan > 0 || ringkasan.totalPengeluaran > 0;

  const uangAmanTitle = useMemo(() => {
    if (!hasMonthlyData) {
      return "Belum bisa dihitung";
    }

    if (sisaBulanIni <= 0) {
      return "Belum aman untuk belanja tambahan";
    }

    if (ringkasan.totalPemasukan <= 0) {
      return "Perlu catat uang masuk dulu";
    }

    const rasioPengeluaran =
      ringkasan.totalPengeluaran / ringkasan.totalPemasukan;

    if (rasioPengeluaran <= 0.6) {
      return "Masih aman untuk belanja kecil";
    }

    if (rasioPengeluaran <= 0.8) {
      return "Uang bebas mulai terbatas";
    }

    return "Sebaiknya mulai hemat";
  }, [
    hasMonthlyData,
    ringkasan.totalPemasukan,
    ringkasan.totalPengeluaran,
    sisaBulanIni,
  ]);

  const smartWarning = useMemo<SmartWarning>(() => {
    if (previewPengingat.length > 0) {
      const target = previewPengingat[0];

      return {
        title: "Ada tagihan aktif",
        text: `${target.judul} perlu diperhatikan agar tidak lupa bayar.`,
        icon: "alarm-outline",
        variant: "warning",
        actionLabel: "Cek tagihan",
        actionHref: PENGINGAT_HREF,
      };
    }

    if (isGuestMode) {
      return {
        title: "Data hanya tersimpan di HP ini",
        text: "Masuk akun dan backup data supaya aman saat aplikasi dihapus atau HP diganti.",
        icon: "phone-portrait-outline",
        variant: "info",
        actionLabel: "Buka menu",
        actionHref: MENU_HREF,
      };
    }

    if (status.variant === "danger" || status.variant === "warning") {
      return {
        title:
          status.variant === "danger"
            ? "Pengeluaran sedang rawan"
            : "Pengeluaran mulai tinggi",
        text:
          status.variant === "danger"
            ? "Uang keluar sudah lebih besar dari uang masuk. Tahan belanja yang tidak wajib dulu."
            : "Uang keluar hampir menyamai uang masuk. Coba cek pengeluaran terbesar.",
        icon: status.variant === "danger" ? "alert-circle" : "warning",
        variant: status.variant,
        actionLabel: "Lihat laporan",
        actionHref: LAPORAN_HREF,
      };
    }

    return {
      title: "Tidak ada peringatan penting",
      text: "Keuanganmu masih terkendali. Lanjutkan kebiasaan mencatat uang masuk dan keluar.",
      icon: "checkmark-circle",
      variant: "success",
    };
  }, [isGuestMode, previewPengingat, status.variant]);

  const backupLabel = isGuestMode
    ? "Data hanya di HP ini"
    : "Data tersimpan di akun";

  const displayMoney = useCallback(
    (value: number) => {
      if (!showSaldo) {
        return "Rp •••••••";
      }

      return formatRupiah(value);
    },
    [showSaldo]
  );

  function goTo(href: Href) {
    router.push(href);
  }

  function goToCatat(jenis: "pemasukan" | "pengeluaran") {
    router.push(`${TRANSAKSI_HREF}?jenis=${jenis}` as Href);
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <AppScreen scrollable contentContainerStyle={dashboardScreenStyles.content}>
      <View style={dashboardScreenStyles.heroCard}>
        <View style={dashboardScreenStyles.heroDecorOne} />
        <View style={dashboardScreenStyles.heroDecorTwo} />

        <View style={dashboardScreenStyles.heroTopRow}>
          <View style={dashboardScreenStyles.heroTitleWrap}>
            <Text style={dashboardScreenStyles.heroAppName}>DompetKu</Text>
            <Text style={dashboardScreenStyles.heroGreeting}>Halo 👋</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showSaldo ? "Sembunyikan saldo" : "Tampilkan saldo"
            }
            style={dashboardScreenStyles.eyeButton}
            onPress={() => setShowSaldo((prev) => !prev)}
          >
            <Ionicons
              name={showSaldo ? "eye-outline" : "eye-off-outline"}
              size={22}
              color={COLORS.white}
            />
          </Pressable>
        </View>

        <Text style={dashboardScreenStyles.heroLabel}>Total uang kamu</Text>

        <Text style={dashboardScreenStyles.heroAmount}>
          {displayMoney(ringkasan.totalSaldo)}
        </Text>

        <View style={dashboardScreenStyles.heroMetaRow}>
          <View style={dashboardScreenStyles.heroMetaPill}>
            <Ionicons name="wallet-outline" size={14} color={COLORS.white} />
            <Text style={dashboardScreenStyles.heroMetaText}>
              {ringkasan.jumlahDompetAktif} dompet aktif
            </Text>
          </View>

          <View style={dashboardScreenStyles.heroMetaPill}>
            <Ionicons
              name={isGuestMode ? "phone-portrait-outline" : "cloud-done-outline"}
              size={14}
              color={COLORS.white}
            />
            <Text style={dashboardScreenStyles.heroMetaText}>
              {backupLabel}
            </Text>
          </View>
        </View>
      </View>

      {isGuestMode ? (
        <View style={dashboardScreenStyles.banner}>
          <GuestModeNotice />
        </View>
      ) : null}

      <View
        style={[
          dashboardScreenStyles.statusCard,
          getStatusCardStyle(status.variant),
        ]}
      >
        <View style={dashboardScreenStyles.statusIconWrap}>
          <Ionicons
            name={status.icon}
            size={22}
            color={getStatusColor(status.variant)}
          />
        </View>

        <View style={dashboardScreenStyles.statusTextWrap}>
          <Text
            style={[
              dashboardScreenStyles.statusTitle,
              getStatusTextStyle(status.variant),
            ]}
          >
            {status.title}
          </Text>
          <Text style={dashboardScreenStyles.statusDescription}>
            {status.text}
          </Text>
        </View>
      </View>

      <View style={dashboardScreenStyles.sectionHeader}>
        <Text style={dashboardScreenStyles.sectionTitle}>
          Ringkasan bulan ini
        </Text>
        <Text style={dashboardScreenStyles.sectionSubtitle}>
          Uang masuk, uang keluar, dan sisa dari catatan bulan berjalan.
        </Text>
      </View>

      <View style={dashboardScreenStyles.monthGrid}>
        <AppCard style={dashboardScreenStyles.monthCard}>
          <View style={dashboardScreenStyles.monthCardHeader}>
            <View
              style={[
                dashboardScreenStyles.monthIcon,
                dashboardScreenStyles.incomeIcon,
              ]}
            >
              <Ionicons name="arrow-down" size={16} color={COLORS.income} />
            </View>
            <Text style={dashboardScreenStyles.monthLabel}>Uang masuk</Text>
          </View>

          <Text style={dashboardScreenStyles.monthValueIncome}>
            {displayMoney(ringkasan.totalPemasukan)}
          </Text>
          <Text style={dashboardScreenStyles.monthHelper}>Bulan ini</Text>
        </AppCard>

        <AppCard style={dashboardScreenStyles.monthCard}>
          <View style={dashboardScreenStyles.monthCardHeader}>
            <View
              style={[
                dashboardScreenStyles.monthIcon,
                dashboardScreenStyles.expenseIcon,
              ]}
            >
              <Ionicons name="arrow-up" size={16} color={COLORS.expense} />
            </View>
            <Text style={dashboardScreenStyles.monthLabel}>Uang keluar</Text>
          </View>

          <Text style={dashboardScreenStyles.monthValueExpense}>
            {displayMoney(ringkasan.totalPengeluaran)}
          </Text>
          <Text style={dashboardScreenStyles.monthHelper}>Bulan ini</Text>
        </AppCard>
      </View>

      <AppCard style={dashboardScreenStyles.netCard}>
        <View style={dashboardScreenStyles.netTopRow}>
          <View style={dashboardScreenStyles.netTextWrap}>
            <Text style={dashboardScreenStyles.netLabel}>Sisa bulan ini</Text>
            <Text
              style={
                sisaBulanIni >= 0
                  ? dashboardScreenStyles.netValuePositive
                  : dashboardScreenStyles.netValueNegative
              }
            >
              {displayMoney(sisaBulanIni)}
            </Text>
          </View>

          <View
            style={[
              dashboardScreenStyles.netIcon,
              sisaBulanIni >= 0
                ? dashboardScreenStyles.netIconPositive
                : dashboardScreenStyles.netIconNegative,
            ]}
          >
            <Ionicons
              name={sisaBulanIni >= 0 ? "trending-up" : "trending-down"}
              size={22}
              color={sisaBulanIni >= 0 ? COLORS.income : COLORS.expense}
            />
          </View>
        </View>

        <Text style={dashboardScreenStyles.netHelper}>
          Masuk dikurangi keluar dari transaksi bulan ini.
        </Text>
      </AppCard>

      <AppCard style={dashboardScreenStyles.safeMoneyCard}>
        <View style={dashboardScreenStyles.safeMoneyHeader}>
          <View style={dashboardScreenStyles.safeMoneyIcon}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.info} />
          </View>

          <View style={dashboardScreenStyles.safeMoneyTextWrap}>
            <Text style={dashboardScreenStyles.safeMoneyTitle}>
              Uang aman dipakai
            </Text>
            <Text style={dashboardScreenStyles.safeMoneySubtitle}>
              {uangAmanTitle}
            </Text>
          </View>
        </View>

        <Text style={dashboardScreenStyles.safeMoneyAmount}>
          {hasMonthlyData ? displayMoney(uangAmanDipakai) : "Belum ada data"}
        </Text>

        <Text style={dashboardScreenStyles.safeMoneyHelper}>
          Perkiraan awal dari sisa uang bulan ini. Nanti akan makin akurat
          setelah tagihan dan anggaran ikut dihitung.
        </Text>
      </AppCard>

      <AppCard style={dashboardScreenStyles.quickActionCard}>
        <Text style={dashboardScreenStyles.quickActionTitle}>
          Mau catat apa?
        </Text>
        <Text style={dashboardScreenStyles.quickActionSubtitle}>
          Pilih salah satu supaya pencatatan lebih cepat.
        </Text>

        <View style={dashboardScreenStyles.quickActionRow}>
          <View style={dashboardScreenStyles.quickActionItem}>
            <AppButton
              title="+ Uang masuk"
              onPress={() => goToCatat("pemasukan")}
            />
          </View>

          <View style={dashboardScreenStyles.quickActionItemLast}>
            <AppButton
              title="- Uang keluar"
              variant="danger"
              onPress={() => goToCatat("pengeluaran")}
            />
          </View>
        </View>
      </AppCard>

      <View style={dashboardScreenStyles.shortcutGrid}>
        <Pressable
          style={dashboardScreenStyles.shortcutItem}
          onPress={() => goTo(PENGINGAT_HREF)}
        >
          <View style={dashboardScreenStyles.shortcutIconWarning}>
            <Ionicons name="alarm-outline" size={22} color={COLORS.warning} />
          </View>
          <Text style={dashboardScreenStyles.shortcutLabel}>Tagihan</Text>
        </Pressable>

        <Pressable
          style={dashboardScreenStyles.shortcutItem}
          onPress={() => goTo(ANGGARAN_HREF)}
        >
          <View style={dashboardScreenStyles.shortcutIconSuccess}>
            <Ionicons name="speedometer-outline" size={22} color={COLORS.income} />
          </View>
          <Text style={dashboardScreenStyles.shortcutLabel}>Anggaran</Text>
        </Pressable>

        <Pressable
          style={dashboardScreenStyles.shortcutItem}
          onPress={() => goTo(LAPORAN_HREF)}
        >
          <View style={dashboardScreenStyles.shortcutIconInfo}>
            <Ionicons name="bar-chart-outline" size={22} color={COLORS.info} />
          </View>
          <Text style={dashboardScreenStyles.shortcutLabel}>Laporan</Text>
        </Pressable>

        <Pressable
          style={dashboardScreenStyles.shortcutItem}
          onPress={() => goTo(MENU_HREF)}
        >
          <View style={dashboardScreenStyles.shortcutIconPrimary}>
            <Ionicons
              name="cloud-upload-outline"
              size={22}
              color={COLORS.brandPrimary}
            />
          </View>
          <Text style={dashboardScreenStyles.shortcutLabel}>Backup</Text>
        </Pressable>
      </View>

      <View
        style={[
          dashboardScreenStyles.warningCard,
          getStatusCardStyle(smartWarning.variant),
        ]}
      >
        <View style={dashboardScreenStyles.warningTopRow}>
          <View style={dashboardScreenStyles.statusIconWrap}>
            <Ionicons
              name={smartWarning.icon}
              size={22}
              color={getStatusColor(smartWarning.variant)}
            />
          </View>

          <View style={dashboardScreenStyles.warningTextWrap}>
            <Text
              style={[
                dashboardScreenStyles.statusTitle,
                getStatusTextStyle(smartWarning.variant),
              ]}
            >
              {smartWarning.title}
            </Text>
            <Text style={dashboardScreenStyles.statusDescription}>
              {smartWarning.text}
            </Text>
          </View>
        </View>

        {smartWarning.actionHref && smartWarning.actionLabel ? (
          <AppButton
            title={smartWarning.actionLabel}
            variant="secondary"
            style={dashboardScreenStyles.warningButton}
            onPress={() => goTo(smartWarning.actionHref as Href)}
          />
        ) : null}
      </View>

      <View style={dashboardScreenStyles.sectionHeader}>
        <Text style={dashboardScreenStyles.sectionTitle}>
          Pengingat terdekat
        </Text>
        <Text style={dashboardScreenStyles.sectionSubtitle}>
          Tagihan aktif yang paling dekat jatuh tempo.
        </Text>
      </View>

      {previewPengingat.length > 0 ? (
        <View style={dashboardScreenStyles.reminderList}>
          {previewPengingat.map((item) => (
            <ReminderCard key={item.id} item={item} compact />
          ))}
        </View>
      ) : (
        <AppCard style={dashboardScreenStyles.emptyCard}>
          <Text style={dashboardScreenStyles.emptyText}>
            Belum ada pengingat tagihan aktif. Buat reminder pertama supaya
            notifikasi pembayaran bisa muncul tepat waktu.
          </Text>
        </AppCard>
      )}

      <AppButton
        title="Kelola pengingat tagihan"
        variant="secondary"
        style={dashboardScreenStyles.ctaButton}
        onPress={() => goTo(PENGINGAT_HREF)}
      />
    </AppScreen>
  );
}