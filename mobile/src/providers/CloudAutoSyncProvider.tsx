import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AppState,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from "@/constants";
import { useAuthSession } from "@/providers/AuthProvider";

const MIN_AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const STARTUP_SYNC_DELAY_MS = 4500;
const RESUME_SYNC_DELAY_MS = 1800;
const SUCCESS_VISIBLE_MS = 1800;
const ERROR_VISIBLE_MS = 2600;

type CloudAutoSyncProviderProps = {
  children: ReactNode;
};

type SyncStatus = "idle" | "syncing" | "success" | "error";

function sumRecordValues(value: Record<string, number>) {
  return Object.values(value).reduce((total, item) => total + item, 0);
}

export default function CloudAutoSyncProvider({
  children,
}: CloudAutoSyncProviderProps) {
  const insets = useSafeAreaInsets();
  const { isReady, session, syncCloudNow } = useAuthSession();

  const userId = session?.user?.id ?? null;

  const lastAppStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isSyncingRef = useRef(false);
  const lastSyncAttemptAtRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState("");

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const clearStartupTimer = useCallback(() => {
    if (startupTimerRef.current) {
      clearTimeout(startupTimerRef.current);
      startupTimerRef.current = null;
    }
  }, []);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const showStatus = useCallback(
    (status: SyncStatus, message: string) => {
      clearHideTimer();
      setSyncStatus(status);
      setSyncMessage(message);
    },
    [clearHideTimer]
  );

  const hideLater = useCallback(
    (delayMs: number) => {
      clearHideTimer();

      hideTimerRef.current = setTimeout(() => {
        setSyncStatus("idle");
        setSyncMessage("");
        hideTimerRef.current = null;
      }, delayMs);
    },
    [clearHideTimer]
  );

  const runSilentSync = useCallback(
    async (reason: string) => {
      if (!isReady || !userId) {
        return;
      }

      if (AppState.currentState !== "active") {
        return;
      }

      if (isSyncingRef.current) {
        return;
      }

      const now = Date.now();

      if (now - lastSyncAttemptAtRef.current < MIN_AUTO_SYNC_INTERVAL_MS) {
        return;
      }

      try {
        isSyncingRef.current = true;
        lastSyncAttemptAtRef.current = now;

        showStatus("syncing", "Menyinkronkan data...");

        const result = await syncCloudNow();
        const pushedTotal = sumRecordValues(result.pushed);
        const pulledTotal = sumRecordValues(result.pulled);
        const totalChanged = pushedTotal + pulledTotal;

        showStatus(
          "success",
          totalChanged > 0
            ? "Data berhasil disinkronkan."
            : "Data sudah sinkron."
        );

        console.log(`auto sync berhasil: ${reason}`);
        hideLater(SUCCESS_VISIBLE_MS);
      } catch (error) {
        console.log("auto sync gagal:", error);
        showStatus("error", "Sinkronisasi gagal. Coba nanti.");
        hideLater(ERROR_VISIBLE_MS);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [hideLater, isReady, showStatus, syncCloudNow, userId]
  );

  useEffect(() => {
    clearStartupTimer();

    if (!isReady || !userId) {
      return;
    }

    startupTimerRef.current = setTimeout(() => {
      runSilentSync("startup");
    }, STARTUP_SYNC_DELAY_MS);

    return () => {
      clearStartupTimer();
    };
  }, [clearStartupTimer, isReady, runSilentSync, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = lastAppStateRef.current;
      lastAppStateRef.current = nextState;

      const wasInBackground =
        previousState === "background" || previousState === "inactive";

      if (wasInBackground && nextState === "active") {
        clearResumeTimer();

        resumeTimerRef.current = setTimeout(() => {
          runSilentSync("app_active");
        }, RESUME_SYNC_DELAY_MS);
      }
    });

    return () => {
      subscription.remove();
      clearResumeTimer();
    };
  }, [clearResumeTimer, runSilentSync]);

  useEffect(() => {
    if (!userId) {
      clearHideTimer();
      clearStartupTimer();
      clearResumeTimer();

      setSyncStatus("idle");
      setSyncMessage("");
      isSyncingRef.current = false;
      lastSyncAttemptAtRef.current = 0;
    }
  }, [clearHideTimer, clearResumeTimer, clearStartupTimer, userId]);

  useEffect(() => {
    return () => {
      clearHideTimer();
      clearStartupTimer();
      clearResumeTimer();
    };
  }, [clearHideTimer, clearResumeTimer, clearStartupTimer]);

  const shouldShowIndicator = syncStatus !== "idle" && syncMessage.length > 0;

  return (
    <>
      {children}

      {shouldShowIndicator ? (
        <View
          pointerEvents="none"
          style={[
            cloudAutoSyncStyles.indicator,
            {
              top: Math.max(insets.top + SPACING.sm, SPACING.lg),
            },
            syncStatus === "syncing" && cloudAutoSyncStyles.indicatorSyncing,
            syncStatus === "success" && cloudAutoSyncStyles.indicatorSuccess,
            syncStatus === "error" && cloudAutoSyncStyles.indicatorError,
          ]}
        >
          <Ionicons
            name={
              syncStatus === "syncing"
                ? "cloud-upload-outline"
                : syncStatus === "success"
                ? "checkmark-circle"
                : "alert-circle"
            }
            size={16}
            color={
              syncStatus === "error"
                ? COLORS.danger
                : syncStatus === "success"
                ? COLORS.success
                : COLORS.brandPrimary
            }
          />

          <Text
            style={[
              cloudAutoSyncStyles.indicatorText,
              syncStatus === "error" && cloudAutoSyncStyles.indicatorTextError,
            ]}
          >
            {syncMessage}
          </Text>
        </View>
      ) : null}
    </>
  );
}

const cloudAutoSyncStyles = StyleSheet.create({
  indicator: {
    position: "absolute",
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 999,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    shadowColor: "#18213C",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 8,
  },
  indicatorSyncing: {
    backgroundColor: COLORS.brandPrimarySoft,
    borderColor: COLORS.border,
  },
  indicatorSuccess: {
    backgroundColor: COLORS.successSoft,
    borderColor: "#C7EBD2",
  },
  indicatorError: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: "#F8CCCC",
  },
  indicatorText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  indicatorTextError: {
    color: COLORS.danger,
  },
});