import type { SQLiteDatabase } from "expo-sqlite";
import type { User } from "@supabase/supabase-js";
import { Alert } from "react-native";

import {
  catatAkunSupabaseLokal,
  getApakahAdaDataLokalBermakna,
  getInfoAkunSupabaseLokal,
  getPemilikDataLokal,
  hapusSemuaDataLokal,
  MODE_PENGGUNAAN,
  PENGATURAN_KEY,
  setNilaiPengaturanTeks,
  setPemilikDataLokal,
  turunkanModeSetelahKeluarAkun,
} from "@/database";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SignUpPayload = {
  namaLengkap: string;
  email: string;
  password: string;
};

type VerifyOtpPayload = {
  email: string;
  token: string;
};

type SignInPayload = {
  email: string;
  password: string;
};

function getSupabaseClientOrThrow() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi .env dulu dan pastikan project tidak sedang pause."
    );
  }

  return supabase;
}

function getFriendlyAuthErrorMessage(error: unknown) {
  const fallback = "Terjadi masalah saat memproses autentikasi.";

  if (!(error instanceof Error)) {
    return fallback;
  }

  const code =
    "code" in error && typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code.toLowerCase()
      : "";
  const message = error.message || fallback;
  const lower = message.toLowerCase();

  if (
    code === "weak_password" ||
    lower.includes("weak_password") ||
    lower.includes("weak") ||
    lower.includes("leaked")
  ) {
    return "Password ini terlalu umum atau pernah bocor di internet. Pakai password lain yang lebih unik.";
  }

  if (
    code === "over_email_send_rate_limit" ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("email rate limit exceeded") ||
    lower.includes("for security purposes, you can only request this")
  ) {
    return "Terlalu sering meminta kode. Tunggu beberapa saat lalu coba lagi.";
  }

  if (
    code === "otp_expired" ||
    lower.includes("otp_expired") ||
    lower.includes("token has expired") ||
    lower.includes("expired")
  ) {
    return "Kode sudah kedaluwarsa. Kirim ulang kode lalu coba lagi.";
  }

  if (lower.includes("project paused") || lower.includes("540")) {
    return "Project Supabase kamu sedang pause. Unpause dulu dari dashboard Supabase, lalu coba lagi.";
  }

  if (lower.includes("invalid login credentials")) {
    return "Email atau password salah.";
  }

  if (lower.includes("email not confirmed")) {
    return "Email belum diverifikasi. Selesaikan verifikasi kode terlebih dahulu.";
  }

  return message;
}

function getNamaDariUser(user: User | null | undefined) {
  const raw =
    user?.user_metadata?.nama_lengkap ??
    user?.user_metadata?.full_name ??
    "";

  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();

  return trimmed.length > 0 ? trimmed : null;
}

async function konfirmasiKonflikAkunLain(): Promise<"hapus_dan_muat" | "batal"> {
  return new Promise((resolve) => {
    Alert.alert(
      "Data di HP ini milik akun lain",
      "Perangkat ini masih menyimpan data dari akun sebelumnya. Untuk masuk dengan akun ini, hapus data di HP lalu muat data akunmu, atau batalkan untuk keluar.",
      [
        {
          text: "Batal & Keluar",
          style: "cancel",
          onPress: () => resolve("batal"),
        },
        {
          text: "Hapus data di HP lalu muat data akun ini",
          style: "destructive",
          onPress: () => resolve("hapus_dan_muat"),
        },
      ],
      { cancelable: false }
    );
  });
}

async function konfirmasiHubungkanDataGuest(): Promise<"hubungkan" | "batal"> {
  return new Promise((resolve) => {
    Alert.alert(
      "Hubungkan data di HP ke akun?",
      "Perangkat ini memiliki catatan keuangan lokal. Apakah kamu ingin menghubungkan dan mencadangkan data ini ke akun barumu?",
      [
        {
          text: "Batal & Keluar",
          style: "cancel",
          onPress: () => resolve("batal"),
        },
        {
          text: "Hubungkan ke Akun",
          onPress: () => resolve("hubungkan"),
        },
      ],
      { cancelable: false }
    );
  });
}

export async function tanganiKoneksiAkunDanDataLokal(
  db: SQLiteDatabase,
  user: User,
  normalizedEmail: string
): Promise<{ updatedHasLocalData: boolean }> {
  const client = getSupabaseClientOrThrow();
  const hasLocalData = await getApakahAdaDataLokalBermakna(db);
  const owner = await getPemilikDataLokal(db);

  if (hasLocalData && owner && owner !== user.id) {
    const action = await konfirmasiKonflikAkunLain();
    if (action === "batal") {
      await client.auth.signOut({ scope: "local" }).catch(() => {});
      throw new Error("Masuk akun dibatalkan.");
    }

    await hapusSemuaDataLokal(db);
    await setPemilikDataLokal(db, user.id);
    await catatAkunSupabaseLokal(db, {
      userId: user.id,
      email: user.email ?? normalizedEmail,
      nama: getNamaDariUser(user),
      butuhSinkronisasiAwal: false,
    });
    return { updatedHasLocalData: false };
  }

  if (hasLocalData && !owner) {
    const action = await konfirmasiHubungkanDataGuest();
    if (action === "batal") {
      await client.auth.signOut({ scope: "local" }).catch(() => {});
      throw new Error("Masuk akun dibatalkan.");
    }

    await setPemilikDataLokal(db, user.id);
    await catatAkunSupabaseLokal(db, {
      userId: user.id,
      email: user.email ?? normalizedEmail,
      nama: getNamaDariUser(user),
      butuhSinkronisasiAwal: true,
    });
    return { updatedHasLocalData: true };
  }

  await setPemilikDataLokal(db, user.id);
  const updatedHasLocalData = await getApakahAdaDataLokalBermakna(db);
  await catatAkunSupabaseLokal(
    db,
    {
      userId: user.id,
      email: user.email ?? normalizedEmail,
      nama: getNamaDariUser(user),
      butuhSinkronisasiAwal: updatedHasLocalData,
    },
    { preserveExistingPending: true }
  );

  return { updatedHasLocalData };
}

export async function catatSessionAktifKePengaturanLokal(
  db: SQLiteDatabase,
  user: User
) {
  const owner = await getPemilikDataLokal(db);
  const hasLocalData = await getApakahAdaDataLokalBermakna(db);

  if (hasLocalData && owner && owner !== user.id) {
    return getInfoAkunSupabaseLokal(db);
  }

  await setPemilikDataLokal(db, user.id);

  const currentInfo = await getInfoAkunSupabaseLokal(db);
  const inferredPending =
    currentInfo.butuhSinkronisasiAwal ||
    (currentInfo.adaDataLokalBermakna && !currentInfo.terakhirSinkronisasiAt);

  return catatAkunSupabaseLokal(
    db,
    {
      userId: user.id,
      email: user.email ?? null,
      nama: getNamaDariUser(user),
      butuhSinkronisasiAwal: inferredPending,
    },
    {
      preserveExistingPending: true,
    }
  );
}

export async function daftarAkunDenganEmail(
  db: SQLiteDatabase,
  payload: SignUpPayload
) {
  try {
    const client = getSupabaseClientOrThrow();
    const normalizedEmail = payload.email.trim().toLowerCase();
    const trimmedName = payload.namaLengkap.trim();
    const hasLocalData = await getApakahAdaDataLokalBermakna(db);

    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password: payload.password,
      options: {
        data: {
          nama_lengkap: trimmedName,
          butuh_sinkronisasi_awal: hasLocalData,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.session && data.user) {
      const { updatedHasLocalData } = await tanganiKoneksiAkunDanDataLokal(
        db,
        data.user,
        normalizedEmail
      );

      return {
        email: normalizedEmail,
        user: data.user,
        session: data.session,
        hasLocalData: updatedHasLocalData,
      };
    }

    return {
      email: normalizedEmail,
      user: data.user ?? null,
      session: data.session ?? null,
      hasLocalData,
    };
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

export async function verifikasiOtpEmailDanHubungkanDataLokal(
  db: SQLiteDatabase,
  payload: VerifyOtpPayload
) {
  try {
    const client = getSupabaseClientOrThrow();
    const normalizedEmail = payload.email.trim().toLowerCase();
    const cleanToken = payload.token.trim();

    const { data, error } = await client.auth.verifyOtp({
      email: normalizedEmail,
      token: cleanToken,
      type: "email",
    });

    if (error) {
      throw error;
    }

    const resolvedSession =
      data.session ??
      (await client.auth.getSession()).data.session ??
      null;

    const resolvedUser = data.user ?? resolvedSession?.user ?? null;

    if (!resolvedUser) {
      throw new Error(
        "Verifikasi berhasil, tetapi data pengguna belum terbentuk. Coba masuk ulang dengan email dan password."
      );
    }

    const { updatedHasLocalData } = await tanganiKoneksiAkunDanDataLokal(
      db,
      resolvedUser,
      normalizedEmail
    );

    return {
      user: resolvedUser,
      session: resolvedSession,
      hasLocalData: updatedHasLocalData,
    };
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

export async function kirimUlangOtpPendaftaran(email: string) {
  try {
    const client = getSupabaseClientOrThrow();
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await client.auth.resend({
      type: "signup",
      email: normalizedEmail,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

// 👇 TAMBAHAN SERVICE LUPA PASSWORD
export async function kirimOtpResetPassword(email: string) {
  try {
    const client = getSupabaseClientOrThrow();
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await client.auth.resetPasswordForEmail(
      normalizedEmail
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

export async function resetPasswordDenganOtp(payload: {
  email: string;
  token: string;
  passwordBaru: string;
}) {
  try {
    const client = getSupabaseClientOrThrow();
    const normalizedEmail = payload.email.trim().toLowerCase();

    const { error: verifyError } = await client.auth.verifyOtp({
      email: normalizedEmail,
      token: payload.token.trim(),
      type: "recovery",
    });

    if (verifyError) {
      throw verifyError;
    }

    const { error: updateError } = await client.auth.updateUser({
      password: payload.passwordBaru,
    });

    if (updateError) {
      throw updateError;
    }

    // Sign out supaya user harus login lagi dengan password barunya
    await client.auth.signOut({ scope: "local" });
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}
// 👆 AKHIR TAMBAHAN SERVICE LUPA PASSWORD

export async function masukDenganPasswordDanHubungkanDataLokal(
  db: SQLiteDatabase,
  payload: SignInPayload
) {
  try {
    const client = getSupabaseClientOrThrow();
    const normalizedEmail = payload.email.trim().toLowerCase();

    const { data, error } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password: payload.password,
    });

    if (error) {
      throw error;
    }

    if (!data.session || !data.user) {
      throw new Error("Sesi login tidak berhasil dibentuk.");
    }

    const { updatedHasLocalData } = await tanganiKoneksiAkunDanDataLokal(
      db,
      data.user,
      normalizedEmail
    );

    return {
      user: data.user,
      session: data.session,
      hasLocalData: updatedHasLocalData,
    };
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

export async function keluarAkunDanKembaliKeModeLokal(
  db: SQLiteDatabase,
  options?: { hapusDataLokal?: boolean }
) {
  try {
    const client = getSupabaseClientOrThrow();

    const { error } = await client.auth.signOut();

    if (error) {
      await client.auth.signOut({ scope: "local" }).catch(() => {});
    }
  } catch {
    try {
      if (supabase) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      }
    } catch {}
  }

  if (options?.hapusDataLokal) {
    await hapusSemuaDataLokal(db);
    return MODE_PENGGUNAAN.NONE;
  }

  return await turunkanModeSetelahKeluarAkun(db);
}

export async function hapusAkunPenggunaCloud(
  db: SQLiteDatabase,
  options?: { hapusDataLokal?: boolean }
) {
  try {
    const client = getSupabaseClientOrThrow();
    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    if (sessionError || !sessionData?.session) {
      throw new Error(
        "Tidak ada sesi akun aktif. Masuk kembali terlebih dahulu untuk menghapus akun."
      );
    }

    const { data, error } = await client.functions.invoke("delete-account", {
      method: "POST",
    });

    if (error) {
      const serverMsg =
        (data && typeof data === "object" && "error" in data
          ? (data as { error: string }).error
          : null) ?? error.message;
      throw new Error(serverMsg || "Gagal menghapus akun di cloud.");
    }

    await client.auth.signOut({ scope: "local" }).catch(() => {});

    if (options?.hapusDataLokal) {
      await hapusSemuaDataLokal(db);
      return MODE_PENGGUNAAN.NONE;
    }

    await setPemilikDataLokal(db, null);
    await setNilaiPengaturanTeks(db, PENGATURAN_KEY.CLOUD_SYNC_CURSOR, "");

    return await turunkanModeSetelahKeluarAkun(db);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}
