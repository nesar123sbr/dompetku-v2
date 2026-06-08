import type { SQLiteDatabase } from "expo-sqlite";
import type { User } from "@supabase/supabase-js";

import {
  catatAkunSupabaseLokal,
  getApakahAdaDataLokalBermakna,
  getInfoAkunSupabaseLokal,
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

  const message = error.message || fallback;
  const lower = message.toLowerCase();

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

export async function catatSessionAktifKePengaturanLokal(
  db: SQLiteDatabase,
  user: User
) {
  const currentInfo = await getInfoAkunSupabaseLokal(db);

  const inferredPending =
    currentInfo.butuhSinkronisasiAwal ||
    (currentInfo.adaDataLokalBermakna &&
      !currentInfo.terakhirSinkronisasiAt);

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
      await catatAkunSupabaseLokal(db, {
        userId: data.user.id,
        email: data.user.email ?? normalizedEmail,
        nama: getNamaDariUser(data.user),
        butuhSinkronisasiAwal: hasLocalData,
      });
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
    const hasLocalData = await getApakahAdaDataLokalBermakna(db);

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

    await catatAkunSupabaseLokal(db, {
      userId: resolvedUser.id,
      email: resolvedUser.email ?? normalizedEmail,
      nama: getNamaDariUser(resolvedUser),
      butuhSinkronisasiAwal: hasLocalData,
    });

    return {
      user: resolvedUser,
      session: resolvedSession,
      hasLocalData,
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
    const hasLocalData = await getApakahAdaDataLokalBermakna(db);

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

    await catatAkunSupabaseLokal(db, {
      userId: data.user.id,
      email: data.user.email ?? normalizedEmail,
      nama: getNamaDariUser(data.user),
      butuhSinkronisasiAwal: hasLocalData,
    });

    return {
      user: data.user,
      session: data.session,
      hasLocalData,
    };
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}

export async function keluarAkunDanKembaliKeModeLokal(
  db: SQLiteDatabase
) {
  try {
    const client = getSupabaseClientOrThrow();

    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }

    return turunkanModeSetelahKeluarAkun(db);
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error));
  }
}