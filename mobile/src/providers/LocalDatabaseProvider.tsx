import { Suspense, type ReactNode } from "react";
import { SQLiteProvider } from "expo-sqlite";

import { AppLoader } from "@/components";
import { DATABASE_NAME, migrateDbIfNeeded } from "@/database";

type LocalDatabaseProviderProps = {
  children: ReactNode;
};

export default function LocalDatabaseProvider({
  children,
}: LocalDatabaseProviderProps) {
  return (
    <Suspense fallback={<AppLoader label="Menyiapkan data lokal..." />}>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        onInit={migrateDbIfNeeded}
        useSuspense
      >
        {children}
      </SQLiteProvider>
    </Suspense>
  );
}