import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSQLiteContext } from "expo-sqlite";
import type { Session, User } from "@supabase/supabase-js";

import {
  MODE_PENGGUNAAN,
  getInfoAkunSupabaseLokal,
  getModePenggunaan,
  setModePenggunaan,
  type AkunSupabaseLokalInfo,
} from "@/database";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  catatSessionAktifKePengaturanLokal,
  daftarAkunDenganEmail,
  keluarAkunDanKembaliKeModeLokal,
  kirimUlangOtpPendaftaran,
  masukDenganPasswordDanHubungkanDataLokal,
  sinkronisasiAwalDataLokalKeSupabase,
  sinkronisasiCloudSekarang,
  type RingkasanSinkronisasiDuaArah,
  type SinkronisasiAwalSummary,
  verifikasiOtpEmailDanHubungkanDataLokal,
  // 👇 1. IMPORT SERVICE LUPA PASSWORD
  kirimOtpResetPassword,
  resetPasswordDenganOtp,
} from "@/services";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isReady: boolean;
  isSupabaseConfigured: boolean;
  modePenggunaan: string;
  isGuestMode: boolean;
  akunLokal: AkunSupabaseLokalInfo | null;

  enterGuestMode: () => Promise<void>;
  exitGuestMode: () => Promise<void>;

  signUpWithEmail: (payload: {
    namaLengkap: string;
    email: string;
    password: string;
  }) => Promise<{
    email: string;
    user: User | null;
    session: Session | null;
    hasLocalData: boolean;
  }>;

  verifyEmailOtp: (payload: {
    email: string;
    token: string;
  }) => Promise<{
    user: User | null;
    session: Session | null;
    hasLocalData: boolean;
  }>;

  resendSignupOtp: (email: string) => Promise<void>;

  signInWithPassword: (payload: {
    email: string;
    password: string;
  }) => Promise<{
    user: User;
    session: Session;
    hasLocalData: boolean;
  }>;

  signOutUser: () => Promise<string>;

  syncInitialLocalData: () => Promise<SinkronisasiAwalSummary>;
  syncCloudNow: () => Promise<RingkasanSinkronisasiDuaArah>;

  // 👇 2A. TYPE UNTUK FUNCTION BARU
  sendPasswordResetOtp: (email: string) => Promise<void>;
  resetPasswordWithOtp: (payload: {
    email: string;
    token: string;
    passwordBaru: string;
  }) => Promise<void>;
};

const EMPTY_AKUN_LOKAL: AkunSupabaseLokalInfo = {
  authUserId: null,
  authEmail: null,
  authNama: null,
  butuhSinkronisasiAwal: false,
  adaDataLokalBermakna: false,
  terakhirSinkronisasiAt: null,
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  isReady: false,
  isSupabaseConfigured: false,
  modePenggunaan: MODE_PENGGUNAAN.NONE,
  isGuestMode: false,
  akunLokal: EMPTY_AKUN_LOKAL,

  enterGuestMode: async () => {},
  exitGuestMode: async () => {},

  signUpWithEmail: async () => ({
    email: "",
    user: null,
    session: null,
    hasLocalData: false,
  }),

  verifyEmailOtp: async () => ({
    user: null,
    session: null,
    hasLocalData: false,
  }),

  resendSignupOtp: async () => {},

  signInWithPassword: async () => {
    throw new Error("Belum diinisialisasi.");
  },

  signOutUser: async () => MODE_PENGGUNAAN.NONE,

  syncInitialLocalData: async () => ({
    profilPengguna: 0,
    dompet: 0,
    kategoriPemasukan: 0,
    kategoriPengeluaran: 0,
    pemasukan: 0,
    pengeluaran: 0,
    pengingatTagihan: 0,
    transferDompet: 0,
  }),

  syncCloudNow: async () => ({
    mode: "awal",
    pushed: {
      profilPengguna: 0,
      dompet: 0,
      kategoriPemasukan: 0,
      kategoriPengeluaran: 0,
      pemasukan: 0,
      pengeluaran: 0,
      pengingatTagihan: 0,
      transferDompet: 0,
      anggaranBulanan: 0,
    },
    pulled: {
      profilPengguna: 0,
      dompet: 0,
      kategoriPemasukan: 0,
      kategoriPengeluaran: 0,
      pemasukan: 0,
      pengeluaran: 0,
      pengingatTagihan: 0,
      transferDompet: 0,
      anggaranBulanan: 0,
    },
    lastSyncAt: "",
    conflictPolicy: "",
  }),

  // 👇 2B. DEFAULT FUNCTION KOSONG SAAT INISIALISASI
  sendPasswordResetOtp: async () => {},
  resetPasswordWithOtp: async () => {},
});

type AuthProviderProps = {
  children: ReactNode;
};

// 👇 HOTFIX 0.2: Helper untuk mengecek error token rusak
function isInvalidRefreshTokenError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found") ||
    message.includes("refresh token already used")
  );
}

// 👇 HOTFIX 0.2: Helper untuk membersihkan sesi rusak
async function bersihkanSessionSupabaseRusak() {
  if (!supabase) {
    return;
  }

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.log("bersihkanSessionSupabaseRusak error:", error);
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const db = useSQLiteContext();

  const [session, setSession] = useState<Session | null>(null);
  const [localMode, setLocalMode] = useState<string>(MODE_PENGGUNAAN.NONE);
  const [akunLokal, setAkunLokal] =
    useState<AkunSupabaseLokalInfo>(EMPTY_AKUN_LOKAL);

  const [isLocalReady, setIsLocalReady] = useState(false);
  const [isRemoteReady, setIsRemoteReady] = useState(false);

  // 👇 HOTFIX 0.1: Duplicate getModePenggunaan dihapus
  const refreshLocalState = useCallback(async () => {
    const mode = await getModePenggunaan(db);
    const info = await getInfoAkunSupabaseLokal(db);

    setLocalMode(mode);
    setAkunLokal(info);
  }, [db]);

  useEffect(() => {
    let isMounted = true;

    async function loadLocalState() {
      try {
        const mode = await getModePenggunaan(db);
        const info = await getInfoAkunSupabaseLokal(db);

        if (!isMounted) return;

        setLocalMode(mode);
        setAkunLokal(info);
      } catch (error) {
        console.log("loadLocalState error:", error);
      } finally {
        if (!isMounted) return;
        setIsLocalReady(true);
      }
    }

    loadLocalState();

    return () => {
      isMounted = false;
    };
  }, [db]);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured || !supabase) {
      setIsRemoteReady(true);
      return () => {
        isMounted = false;
      };
    }

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.log("getSession error:", error.message);
        }

        if (!isMounted) return;

        setSession(data?.session ?? null);
        setIsRemoteReady(true);
      })
      // 👇 HOTFIX 0.2: Menangkap error token dan membersihkannya
      .catch(async (error) => {
        console.log("getSession catch error:", error);

        if (isInvalidRefreshTokenError(error)) {
          await bersihkanSessionSupabaseRusak();
          setSession(null);
        }

        if (!isMounted) return;
        setIsRemoteReady(true);
      });

    // 👇 HOTFIX 0.3: Memanfaatkan event untuk mendeteksi log out otomatis
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setIsRemoteReady(true);
        return;
      }

      setSession(nextSession ?? null);
      setIsRemoteReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function syncSessionToLocalState() {
      if (!isLocalReady) {
        return;
      }

      try {
        if (session?.user) {
          const info = await catatSessionAktifKePengaturanLokal(
            db,
            session.user
          );

          if (!isMounted) return;

          setLocalMode(MODE_PENGGUNAAN.AUTHENTICATED);
          setAkunLokal(info);
          return;
        }

        const currentMode = await getModePenggunaan(db);

        if (!isMounted) return;

        setLocalMode(currentMode);

        const info = await getInfoAkunSupabaseLokal(db);

        if (!isMounted) return;
        setAkunLokal(info);
      } catch (error) {
        console.log("syncSessionToLocalState error:", error);
      }
    }

    syncSessionToLocalState();

    return () => {
      isMounted = false;
    };
  }, [db, isLocalReady, session]);

  const enterGuestMode = useCallback(async () => {
    await setModePenggunaan(db, MODE_PENGGUNAAN.GUEST);
    await refreshLocalState();
  }, [db, refreshLocalState]);

  const exitGuestMode = useCallback(async () => {
    await setModePenggunaan(db, MODE_PENGGUNAAN.NONE);
    await refreshLocalState();
  }, [db, refreshLocalState]);

  const signUpWithEmail = useCallback(
    async (payload: {
      namaLengkap: string;
      email: string;
      password: string;
    }) => {
      const result = await daftarAkunDenganEmail(db, payload);

      if (result.session) {
        setSession(result.session);
      }

      await refreshLocalState();

      return result;
    },
    [db, refreshLocalState]
  );

  const verifyEmailOtp = useCallback(
    async (payload: { email: string; token: string }) => {
      const result = await verifikasiOtpEmailDanHubungkanDataLokal(
        db,
        payload
      );

      setSession(result.session);
      await refreshLocalState();

      return result;
    },
    [db, refreshLocalState]
  );

  const resendSignupOtp = useCallback(async (email: string) => {
    await kirimUlangOtpPendaftaran(email);
  }, []);

  const signInWithPassword = useCallback(
    async (payload: { email: string; password: string }) => {
      const result = await masukDenganPasswordDanHubungkanDataLokal(
        db,
        payload
      );

      setSession(result.session);
      await refreshLocalState();

      return result;
    },
    [db, refreshLocalState]
  );

  const signOutUser = useCallback(async () => {
    const nextMode = await keluarAkunDanKembaliKeModeLokal(db);

    setSession(null);
    await refreshLocalState();

    return nextMode;
  }, [db, refreshLocalState]);

  const syncInitialLocalData = useCallback(async () => {
    if (!session?.user) {
      throw new Error("Kamu harus masuk ke akun dulu sebelum sinkronisasi.");
    }

    const result = await sinkronisasiAwalDataLokalKeSupabase(
      db,
      session.user
    );

    await refreshLocalState();

    return result;
  }, [db, refreshLocalState, session]);

  const syncCloudNow = useCallback(async () => {
    if (!session?.user) {
      throw new Error("Kamu harus masuk ke akun dulu sebelum sinkronisasi.");
    }

    const result = await sinkronisasiCloudSekarang(db, session.user);

    await refreshLocalState();

    return result;
  }, [db, refreshLocalState, session]);

  // 👇 3. LOGIKA BARU UNTUK KIRIM & VERIFIKASI OTP RESET PASSWORD
  const sendPasswordResetOtp = useCallback(async (email: string) => {
    await kirimOtpResetPassword(email);
  }, []);

  const resetPasswordWithOtp = useCallback(
    async (payload: {
      email: string;
      token: string;
      passwordBaru: string;
    }) => {
      await resetPasswordDenganOtp(payload);
      setSession(null);
      await refreshLocalState();
    },
    [refreshLocalState]
  );

  const modePenggunaan = session
    ? MODE_PENGGUNAAN.AUTHENTICATED
    : localMode;

  const isGuestMode = modePenggunaan === MODE_PENGGUNAAN.GUEST;
  const isReady = isLocalReady && isRemoteReady;

  const value = useMemo<AuthContextValue>(() => {
    return {
      session,
      user: session?.user ?? null,
      isReady,
      isSupabaseConfigured,
      modePenggunaan,
      isGuestMode,
      akunLokal,

      enterGuestMode,
      exitGuestMode,

      signUpWithEmail,
      verifyEmailOtp,
      resendSignupOtp,
      signInWithPassword,
      signOutUser,
      syncInitialLocalData,
      syncCloudNow,

      // 👇 4. EXPORT FUNCTION AGAR BISA DIPAKAI DI LAYAR UI
      sendPasswordResetOtp,
      resetPasswordWithOtp,
    };
  }, [
    session,
    isReady,
    modePenggunaan,
    isGuestMode,
    akunLokal,
    enterGuestMode,
    exitGuestMode,
    signUpWithEmail,
    verifyEmailOtp,
    resendSignupOtp,
    signInWithPassword,
    signOutUser,
    syncInitialLocalData,
    syncCloudNow,
    sendPasswordResetOtp,
    resetPasswordWithOtp,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  return useContext(AuthContext);
}