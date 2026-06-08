import { useMemo, useState, type ComponentProps } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import {
  AppButton,
  AppCard,
  AppScreen,
  GuestModeNotice,
  StatusBadge,
} from "@/components";
import { COLORS, ROUTES } from "@/constants";
import { DATABASE_NAME } from "@/database";
import { useAuthSession } from "@/providers/AuthProvider";
import {
  exportLaporanBulananCsv,
  exportLaporanBulananPdf,
} from "@/services";
import {
  formatLabelModePenggunaan,
  formatTanggalWaktuIndonesia,
} from "@/utils";
import { profilScreenStyles } from "@assets/styles/screens/protected/profilScreen.styles";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type MenuItemProps = {
  icon: IoniconName;
  title: string;
  description: string;
  badgeLabel?: string;
  badgeVariant?: ComponentProps<typeof StatusBadge>["variant"];
  onPress: () => void;
  disabled?: boolean;
};

function MenuItem({
  icon,
  title,
  description,
  badgeLabel,
  badgeVariant = "neutral",
  onPress,
  disabled = false,
}: MenuItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      disabled={disabled}
      style={({ pressed }) => [
        profilScreenStyles.menuItem,
        pressed && profilScreenStyles.menuItemPressed,
        disabled && profilScreenStyles.menuItemDisabled,
      ]}
      onPress={onPress}
    >
      <View style={profilScreenStyles.menuIconWrap}>
        <Ionicons name={icon} size={22} color={COLORS.brandPrimary} />
      </View>

      <View style={profilScreenStyles.menuTextWrap}>
        <View style={profilScreenStyles.menuTitleRow}>
          <Text style={profilScreenStyles.menuTitle}>{title}</Text>

          {badgeLabel ? (
            <StatusBadge label={badgeLabel} variant={badgeVariant} />
          ) : null}
        </View>

        <Text style={profilScreenStyles.menuDescription}>{description}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={COLORS.textTertiary}
      />
    </Pressable>
  );
}

export default function ProfilTabPage() {
  const router = useRouter();
  const db = useSQLiteContext();

  const {
    akunLokal,
    isGuestMode,
    isSupabaseConfigured,
    modePenggunaan,
    session,
    signOutUser,
    exitGuestMode,
    syncCloudNow,
    user,
  } = useAuthSession();

  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");

  const namaPengguna = useMemo(() => {
    const rawNama =
      user?.user_metadata?.nama_lengkap ??
      user?.user_metadata?.full_name ??
      akunLokal?.authNama ??
      null;

    if (typeof rawNama === "string" && rawNama.trim().length > 0) {
      return rawNama.trim();
    }

    if (session?.user?.email) {
      return session.user.email.split("@")[0];
    }

    if (akunLokal?.authEmail) {
      return akunLokal.authEmail.split("@")[0];
    }

    return "Teman DompetKu";
  }, [akunLokal?.authEmail, akunLokal?.authNama, session?.user?.email, user]);

  const emailLabel = session?.user?.email ?? akunLokal?.authEmail ?? "-";

  const perluSinkronisasiTerlihat = Boolean(
    session &&
      (akunLokal?.butuhSinkronisasiAwal ||
        (akunLokal?.adaDataLokalBermakna &&
          !akunLokal?.terakhirSinkronisasiAt))
  );

  const bolehSinkronisasiCloud = Boolean(session && isSupabaseConfigured);

  const backupBadge = useMemo(() => {
    if (isGuestMode) {
      return {
        label: "Mode tamu",
        variant: "info" as const,
      };
    }

    if (!session) {
      return {
        label: "Belum masuk",
        variant: "warning" as const,
      };
    }

    if (perluSinkronisasiTerlihat || !akunLokal?.terakhirSinkronisasiAt) {
      return {
        label: "Belum backup",
        variant: "warning" as const,
      };
    }

    return {
      label: "Backup aman",
      variant: "success" as const,
    };
  }, [
    akunLokal?.terakhirSinkronisasiAt,
    isGuestMode,
    perluSinkronisasiTerlihat,
    session,
  ]);

  const backupDescription = useMemo(() => {
    if (isGuestMode) {
      return "Data hanya tersimpan di HP ini. Masuk akun supaya data bisa dibackup dan tetap aman saat ganti HP.";
    }

    if (!session) {
      return "Masuk akun supaya data bisa disimpan online dan dipulihkan kembali.";
    }

    if (!isSupabaseConfigured) {
      return "Cloud belum dikonfigurasi di project ini.";
    }

    if (!akunLokal?.terakhirSinkronisasiAt) {
      return "Data di HP ini belum pernah dibackup ke akun.";
    }

    return `Backup terakhir: ${formatTanggalWaktuIndonesia(
      akunLokal.terakhirSinkronisasiAt
    )}`;
  }, [
    akunLokal?.terakhirSinkronisasiAt,
    isGuestMode,
    isSupabaseConfigured,
    session,
  ]);

  function clearFeedback() {
    setFeedbackError("");
    setFeedbackSuccess("");
  }

  function goTo(href: Href) {
    clearFeedback();
    router.push(href);
  }

  async function handleSyncCloudNow() {
    try {
      setIsProcessing(true);
      clearFeedback();

      const summary = await syncCloudNow();

      const totalPushed = Object.values(summary.pushed).reduce(
        (total, value) => total + value,
        0
      );

      const totalPulled = Object.values(summary.pulled).reduce(
        (total, value) => total + value,
        0
      );

      setFeedbackSuccess(
        `Backup berhasil. ${totalPushed} data dikirim ke akun dan ${totalPulled} data terbaru diambil dari akun.`
      );
    } catch (error) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Backup data belum berhasil."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleExportCsv() {
    try {
      setIsProcessing(true);
      clearFeedback();

      await exportLaporanBulananCsv(db);

      setFeedbackSuccess("Laporan CSV berhasil dibuat.");
    } catch (error) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Laporan CSV belum berhasil dibuat."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleExportPdf() {
    try {
      setIsProcessing(true);
      clearFeedback();

      await exportLaporanBulananPdf(db);

      setFeedbackSuccess("Laporan PDF berhasil dibuat.");
    } catch (error) {
      setFeedbackError(
        error instanceof Error
          ? error.message
          : "Laporan PDF belum berhasil dibuat."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleExitGuestMode() {
    try {
      setIsProcessing(true);
      clearFeedback();

      await exitGuestMode();
      router.replace(ROUTES.AUTH.SIGN_IN);
    } catch (error) {
      console.log("handleExitGuestMode error:", error);
      setFeedbackError("Mode tamu belum berhasil ditutup.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSignOut() {
    try {
      setIsProcessing(true);
      clearFeedback();

      const nextMode = await signOutUser();

      if (nextMode === "guest") {
        router.replace(ROUTES.PROTECTED.DASHBOARD);
      } else {
        router.replace(ROUTES.AUTH.SIGN_IN);
      }
    } catch (error) {
      console.log("handleSignOut error:", error);
      setFeedbackError("Keluar akun belum berhasil.");
    } finally {
      setIsProcessing(false);
    }
  }

  function confirmSignOut() {
    Alert.alert(
      "Keluar dari akun?",
      "Data yang sudah dibackup tetap aman di akun. Kamu bisa masuk lagi dengan email yang sama.",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Keluar",
          style: "destructive",
          onPress: handleSignOut,
        },
      ]
    );
  }

  function handleNeedLogin() {
    clearFeedback();
    router.push(ROUTES.AUTH.SIGN_IN);
  }

  return (
    <AppScreen 
    scrollable 
    withFloatingTabSpace
    contentContainerStyle={profilScreenStyles.content}>
      <View style={profilScreenStyles.heroCard}>
        <View style={profilScreenStyles.heroIcon}>
          <Ionicons name="menu" size={28} color={COLORS.brandPrimary} />
        </View>

        <View style={profilScreenStyles.heroTextWrap}>
          <Text style={profilScreenStyles.heroTitle}>Menu</Text>
          <Text style={profilScreenStyles.heroSubtitle}>
            Laporan, anggaran, tagihan, backup data, bantuan, dan akun.
          </Text>
        </View>
      </View>

      {isGuestMode ? (
        <View style={profilScreenStyles.noticeWrap}>
          <GuestModeNotice />
        </View>
      ) : null}

      <AppCard style={profilScreenStyles.accountCard}>
        <View style={profilScreenStyles.accountTopRow}>
          <View style={profilScreenStyles.accountAvatar}>
            <Ionicons
              name={session ? "person" : "person-outline"}
              size={26}
              color={COLORS.brandPrimary}
            />
          </View>

          <View style={profilScreenStyles.accountInfo}>
            <Text style={profilScreenStyles.accountLabel}>Akun saya</Text>
            <Text style={profilScreenStyles.accountName} numberOfLines={1}>
              {isGuestMode ? "Pakai tanpa akun" : namaPengguna}
            </Text>
            <Text style={profilScreenStyles.accountEmail} numberOfLines={1}>
              {isGuestMode ? "Data hanya tersimpan di HP ini" : emailLabel}
            </Text>
          </View>

          <StatusBadge
            label={backupBadge.label}
            variant={backupBadge.variant}
          />
        </View>

        <Text style={profilScreenStyles.accountDescription}>
          {backupDescription}
        </Text>

        {bolehSinkronisasiCloud ? (
          <AppButton
            title={isProcessing ? "Menyinkronkan..." : "Sinkronkan sekarang"}
            style={profilScreenStyles.accountButton}
            disabled={isProcessing}
            onPress={handleSyncCloudNow}
          />
        ) : (
          <AppButton
            title="Masuk / Daftar akun"
            style={profilScreenStyles.accountButton}
            disabled={isProcessing}
            onPress={handleNeedLogin}
          />
        )}

        {!!feedbackError ? (
          <Text style={profilScreenStyles.errorText}>{feedbackError}</Text>
        ) : null}

        {!!feedbackSuccess ? (
          <Text style={profilScreenStyles.successText}>
            {feedbackSuccess}
          </Text>
        ) : null}
      </AppCard>

      <View style={profilScreenStyles.section}>
        <Text style={profilScreenStyles.sectionTitle}>Keuangan</Text>
        <Text style={profilScreenStyles.sectionSubtitle}>
          Fitur utama untuk membaca kondisi uang dan mengatur batas belanja.
        </Text>

        <MenuItem
          icon="bar-chart-outline"
          title="Laporan Keuangan"
          description="Grafik, saran hemat, dan kondisi uang bulan ini."
          onPress={() => goTo(ROUTES.PROTECTED.INSIGHT)}
        />

        <MenuItem
          icon="speedometer-outline"
          title="Anggaran Bulanan"
          description="Atur batas belanja agar pengeluaran tidak kebablasan."
          onPress={() => goTo(ROUTES.PROTECTED.ANGGARAN)}
        />

        <MenuItem
          icon="alarm-outline"
          title="Pengingat Tagihan"
          description="Catat tagihan agar tidak lupa bayar."
          onPress={() => goTo(ROUTES.PROTECTED.PENGINGAT)}
        />

        <MenuItem
          icon="pricetags-outline"
          title="Kelola Kategori"
          description="Tambah atau rapikan kategori seperti Bensin, Makan, dan Belanja."
          onPress={() =>
            goTo(`${ROUTES.PROTECTED.TRANSAKSI}?jenis=pengeluaran` as Href)
          }
        />
      </View>

      <View style={profilScreenStyles.section}>
        <Text style={profilScreenStyles.sectionTitle}>Data & Laporan</Text>
        <Text style={profilScreenStyles.sectionSubtitle}>
          Backup data dan simpan laporan untuk pribadi, usaha, atau warung.
        </Text>

        <MenuItem
          icon="cloud-upload-outline"
          title="Sinkronkan Data"
          description={
            bolehSinkronisasiCloud
              ? "Backup data ke akun agar aman saat ganti HP."
              : "Masuk akun dulu agar data bisa dibackup."
          }
          badgeLabel={backupBadge.label}
          badgeVariant={backupBadge.variant}
          onPress={bolehSinkronisasiCloud ? handleSyncCloudNow : handleNeedLogin}
          disabled={isProcessing}
        />

        <AppCard style={profilScreenStyles.exportCard}>
          <View style={profilScreenStyles.exportHeader}>
            <View style={profilScreenStyles.menuIconWrap}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={COLORS.brandPrimary}
              />
            </View>

            <View style={profilScreenStyles.exportTextWrap}>
              <Text style={profilScreenStyles.menuTitle}>Unduh Laporan</Text>
              <Text style={profilScreenStyles.menuDescription}>
                Simpan laporan bulan ini sebagai CSV/Excel atau PDF.
              </Text>
            </View>
          </View>

          <View style={profilScreenStyles.exportButtonRow}>
            <View style={profilScreenStyles.exportButtonItem}>
              <AppButton
                title={isProcessing ? "Membuat..." : "CSV / Excel"}
                variant="secondary"
                disabled={isProcessing}
                onPress={handleExportCsv}
              />
            </View>

            <View style={profilScreenStyles.exportButtonItemLast}>
              <AppButton
                title={isProcessing ? "Membuat..." : "PDF"}
                disabled={isProcessing}
                onPress={handleExportPdf}
              />
            </View>
          </View>
        </AppCard>

        <AppCard style={profilScreenStyles.localCard}>
          <Text style={profilScreenStyles.localTitle}>
            Penyimpanan perangkat
          </Text>

          <View style={profilScreenStyles.localRow}>
            <Text style={profilScreenStyles.localLabel}>Mode</Text>
            <Text style={profilScreenStyles.localValue}>
              {formatLabelModePenggunaan(modePenggunaan)}
            </Text>
          </View>

          <View style={profilScreenStyles.localRow}>
            <Text style={profilScreenStyles.localLabel}>Database lokal</Text>
            <Text style={profilScreenStyles.localValue}>{DATABASE_NAME}</Text>
          </View>

          <View style={profilScreenStyles.localRow}>
            <Text style={profilScreenStyles.localLabel}>Backup terakhir</Text>
            <Text style={profilScreenStyles.localValue}>
              {formatTanggalWaktuIndonesia(
                akunLokal?.terakhirSinkronisasiAt ?? null
              )}
            </Text>
          </View>
        </AppCard>
      </View>

      <View style={profilScreenStyles.section}>
        <Text style={profilScreenStyles.sectionTitle}>Bantuan</Text>
        <Text style={profilScreenStyles.sectionSubtitle}>
          Panduan singkat supaya pengguna baru tidak bingung.
        </Text>

        <AppCard style={profilScreenStyles.guideCard}>
          <View style={profilScreenStyles.guideHeader}>
            <View style={profilScreenStyles.menuIconWrap}>
              <Ionicons
                name="help-circle-outline"
                size={22}
                color={COLORS.brandPrimary}
              />
            </View>

            <View style={profilScreenStyles.guideTextWrap}>
              <Text style={profilScreenStyles.menuTitle}>
                Cara pakai DompetKu
              </Text>
              <Text style={profilScreenStyles.menuDescription}>
                Ikuti langkah dasar ini untuk mulai mencatat uang.
              </Text>
            </View>
          </View>

          <Text style={profilScreenStyles.guideStep}>
            1. Tekan Catat untuk mencatat uang masuk atau uang keluar.
          </Text>
          <Text style={profilScreenStyles.guideStep}>
            2. Buka Riwayat untuk melihat, mengubah, atau menghapus catatan.
          </Text>
          <Text style={profilScreenStyles.guideStep}>
            3. Buka Dompet untuk melihat saldo cash, bank, e-wallet, dan dana
            darurat.
          </Text>
          <Text style={profilScreenStyles.guideStep}>
            4. Sinkronkan data supaya aman saat aplikasi dihapus atau HP
            diganti.
          </Text>
        </AppCard>

        <AppCard style={profilScreenStyles.aboutCard}>
          <Text style={profilScreenStyles.localTitle}>Tentang DompetKu</Text>
          <Text style={profilScreenStyles.aboutText}>
            DompetKu adalah aplikasi pencatatan uang pribadi berbasis
            offline-first. Data bisa dicatat di HP, lalu dibackup ke akun saat
            internet tersedia.
          </Text>
        </AppCard>
      </View>

      <View style={profilScreenStyles.section}>
        <Text style={profilScreenStyles.sectionTitle}>Akun</Text>

        {isGuestMode ? (
          <>
            <AppButton
              title="Masuk atau daftar akun"
              style={profilScreenStyles.actionButton}
              disabled={isProcessing}
              onPress={handleNeedLogin}
            />

            <AppButton
              title={
                isProcessing
                  ? "Keluar dari mode tamu..."
                  : "Keluar dari mode tamu"
              }
              variant="secondary"
              style={profilScreenStyles.secondaryActionButton}
              disabled={isProcessing}
              onPress={handleExitGuestMode}
            />
          </>
        ) : session ? (
          <AppButton
            title={isProcessing ? "Keluar akun..." : "Keluar akun"}
            variant="danger"
            style={profilScreenStyles.actionButton}
            disabled={isProcessing}
            onPress={confirmSignOut}
          />
        ) : (
          <AppButton
            title="Masuk atau daftar akun"
            style={profilScreenStyles.actionButton}
            disabled={isProcessing}
            onPress={handleNeedLogin}
          />
        )}
      </View>
    </AppScreen>
  );
}