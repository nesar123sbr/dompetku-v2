import { useState } from "react";
import { Keyboard, Text } from "react-native";
import { type Href, useRouter } from "expo-router";

import {
  AppButton,
  AppCard,
  AppTextField,
  AuthShell,
} from "@/components";
import { APP_FEATURES, ROUTES } from "@/constants";
import { useAuthSession } from "@/providers/AuthProvider";
import { authScreenStyles } from "@assets/styles/screens/auth/authScreen.styles";

export default function SignUpPage() {
  const router = useRouter();

  const {
    akunLokal,
    enterGuestMode,
    isSupabaseConfigured,
    signUpWithEmail,
  } = useAuthSession();

  const [namaLengkap, setNamaLengkap] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnteringGuestMode, setIsEnteringGuestMode] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSignUp() {
    Keyboard.dismiss();

    try {
      setFormError("");
      setSuccessMessage("");

      if (!isSupabaseConfigured) {
        setFormError(
          "Pencadangan cloud belum siap. Coba lagi nanti atau gunakan mode tanpa akun terlebih dahulu."
        );
        return;
      }

      const trimmedName = namaLengkap.trim();
      const normalizedEmail = email.trim().toLowerCase();

      if (trimmedName.length < 2) {
        setFormError("Nama lengkap minimal 2 karakter.");
        return;
      }

      if (!normalizedEmail) {
        setFormError("Email wajib diisi.");
        return;
      }

      if (password.length < 8) {
        setFormError("Password minimal 8 karakter.");
        return;
      }

      if (password !== konfirmasiPassword) {
        setFormError("Konfirmasi password belum sama.");
        return;
      }

      setIsSubmitting(true);

      const result = await signUpWithEmail({
        namaLengkap: trimmedName,
        email: normalizedEmail,
        password,
      });

      if (result.session) {
        router.replace(ROUTES.PROTECTED.DASHBOARD);
        return;
      }

      setSuccessMessage(
        "Akun berhasil dibuat. Cek email untuk melihat kode verifikasi."
      );

      const nextHref =
        `${ROUTES.AUTH.VERIFY_EMAIL}?email=${encodeURIComponent(
          normalizedEmail
        )}` as Href;

      router.replace(nextHref);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Akun belum berhasil dibuat."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEnterGuestMode() {
    try {
      setIsEnteringGuestMode(true);
      setFormError("");
      setSuccessMessage("");

      await enterGuestMode();
      router.replace(ROUTES.PROTECTED.DASHBOARD);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Mode tanpa akun belum berhasil dibuka."
      );
    } finally {
      setIsEnteringGuestMode(false);
    }
  }

  return (
    <AuthShell
      title="Buat akun DompetKu"
      subtitle="Buat akun untuk mengamankan catatan keuanganmu secara online dan memulihkannya saat ganti perangkat."
    >
      <AppCard style={authScreenStyles.noticeCard}>
        <Text style={authScreenStyles.infoLabel}>Pencadangan cloud</Text>
        <Text style={authScreenStyles.infoValue}>
          Buat akun untuk menyimpan cadangan catatan keuanganmu secara online.
        </Text>

        <Text style={authScreenStyles.inlineNote}>
          {akunLokal?.adaDataLokalBermakna
            ? "Kamu sudah punya catatan di perangkat ini. Setelah akun aktif, catatan tersebut tetap aman dan bisa dicadangkan ke akunmu."
            : "Setelah akun aktif, transaksi yang kamu catat dapat dicadangkan agar tetap aman saat aplikasi dihapus atau perangkat diganti."}
        </Text>
      </AppCard>

      <AppTextField
        label="Nama lengkap"
        placeholder="Contoh: Nesar Siburian"
        value={namaLengkap}
        onChangeText={(value) => {
          setNamaLengkap(value);
          setFormError("");
          setSuccessMessage("");
        }}
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
        returnKeyType="next"
      />

      <AppTextField
        label="Email"
        placeholder="nama@email.com"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setFormError("");
          setSuccessMessage("");
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
      />

      <AppTextField
        label="Password"
        placeholder="Minimal 8 karakter"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setFormError("");
          setSuccessMessage("");
        }}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        helperText="Gunakan minimal 8 karakter agar akun lebih aman."
        returnKeyType="next"
      />

      <AppTextField
        label="Konfirmasi password"
        placeholder="Ulangi password"
        value={konfirmasiPassword}
        onChangeText={(value) => {
          setKonfirmasiPassword(value);
          setFormError("");
          setSuccessMessage("");
        }}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={handleSignUp}
      />

      {!!formError ? (
        <Text style={authScreenStyles.errorText}>{formError}</Text>
      ) : null}

      {!!successMessage ? (
        <Text style={authScreenStyles.successText}>{successMessage}</Text>
      ) : null}

      <AppButton
        title={isSubmitting ? "Membuat akun..." : "Buat akun & kirim kode"}
        style={authScreenStyles.primaryButton}
        disabled={isSubmitting}
        onPress={handleSignUp}
      />

      <AppButton
        title="Sudah punya akun? Masuk"
        variant="secondary"
        style={authScreenStyles.secondaryButton}
        onPress={() => router.replace(ROUTES.AUTH.SIGN_IN)}
      />

      {APP_FEATURES.guestModeEnabled ? (
        <AppButton
          title={
            isEnteringGuestMode
              ? "Menyiapkan mode tanpa akun..."
              : "Gunakan tanpa akun"
          }
          style={authScreenStyles.tertiaryButton}
          disabled={isEnteringGuestMode}
          onPress={handleEnterGuestMode}
        />
      ) : null}

      <Text style={authScreenStyles.helperText}>
        Setelah daftar, DompetKu akan mengirim kode ke email kamu. Masukkan kode
        tersebut untuk mengaktifkan akun.
      </Text>
    </AuthShell>
  );
}