import { useState } from "react";
import { Keyboard, Text } from "react-native";
import { useRouter } from "expo-router";

import {
  AppButton,
  AppCard,
  AppTextField,
  AuthShell,
} from "@/components";
import { APP_FEATURES, ROUTES } from "@/constants";
import { useAuthSession } from "@/providers/AuthProvider";
import { authScreenStyles } from "@assets/styles/screens/auth/authScreen.styles";

export default function SignInPage() {
  const router = useRouter();

  const {
    akunLokal,
    enterGuestMode,
    isSupabaseConfigured,
    signInWithPassword,
  } = useAuthSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnteringGuestMode, setIsEnteringGuestMode] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSignIn() {
    Keyboard.dismiss();

    try {
      setFormError("");

      if (!isSupabaseConfigured) {
        setFormError(
          "Pencadangan cloud belum siap. Coba lagi nanti atau gunakan mode tanpa akun terlebih dahulu."
        );
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        setFormError("Email wajib diisi.");
        return;
      }

      if (!password.trim()) {
        setFormError("Password wajib diisi.");
        return;
      }

      setIsSubmitting(true);

      await signInWithPassword({
        email: normalizedEmail,
        password,
      });

      router.replace(ROUTES.PROTECTED.DASHBOARD);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Belum berhasil masuk. Periksa email dan password kamu."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEnterGuestMode() {
    try {
      setIsEnteringGuestMode(true);
      setFormError("");

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
      title="Masuk ke DompetKu"
      subtitle="Masuk untuk menyimpan cadangan data ke akunmu, supaya catatan tetap aman saat aplikasi dihapus atau perangkat diganti."
    >
      <AppCard style={authScreenStyles.noticeCard}>
        <Text style={authScreenStyles.infoLabel}>Keamanan data</Text>
        <Text style={authScreenStyles.infoValue}>
          {isSupabaseConfigured
            ? "Pencadangan cloud siap digunakan."
            : "Pencadangan cloud belum tersedia saat ini."}
        </Text>

        <Text style={authScreenStyles.inlineNote}>
          {akunLokal?.adaDataLokalBermakna
            ? "Perangkat ini sudah punya catatan lokal. Saat kamu masuk, catatan tersebut tetap aman dan bisa dicadangkan ke akunmu."
            : "Masuk akun membantu DompetKu mencadangkan catatan keuanganmu secara online agar lebih aman."}
        </Text>
      </AppCard>

      <AppTextField
        label="Email"
        placeholder="nama@email.com"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setFormError("");
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
        placeholder="Masukkan password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setFormError("");
        }}
        secureTextEntry
        textContentType="password"
        autoComplete="password"
        returnKeyType="done"
        onSubmitEditing={handleSignIn}
      />

      {!!formError ? (
        <Text style={authScreenStyles.errorText}>{formError}</Text>
      ) : null}

      <AppButton
        title={isSubmitting ? "Masuk..." : "Masuk ke akun"}
        style={authScreenStyles.primaryButton}
        disabled={isSubmitting}
        onPress={handleSignIn}
      />

      <AppButton
        title="Lupa password?"
        variant="secondary"
        style={authScreenStyles.secondaryButton}
        onPress={() => router.push(ROUTES.AUTH.FORGOT_PASSWORD)}
      />

      <AppButton
        title="Belum punya akun? Daftar"
        variant="secondary"
        style={authScreenStyles.secondaryButton}
        onPress={() => router.push(ROUTES.AUTH.SIGN_UP)}
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
        Mode tanpa akun cocok untuk mencoba aplikasi. Untuk menjaga data tetap
        aman saat ganti perangkat, gunakan akun dan lakukan pencadangan.
      </Text>
    </AuthShell>
  );
}