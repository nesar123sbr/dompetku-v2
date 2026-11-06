import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CHUNK_SIZE = 1800; // Aman di bawah batas 2048 byte SecureStore Android

/**
 * Storage adapter terenkripsi untuk Supabase Auth.
 * Menggunakan expo-secure-store dengan chunking untuk token besar.
 * Secara otomatis memigrasikan sesi lama dari localStorage (plaintext).
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return typeof localStorage !== "undefined"
          ? localStorage.getItem(key)
          : null;
      } catch {
        return null;
      }
    }

    try {
      // 1. Cek apakah tersimpan dalam bentuk chunks
      const countStr = await SecureStore.getItemAsync(`${key}_chunk_count`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        let fullValue = "";
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (chunk === null) {
            return null;
          }
          fullValue += chunk;
        }
        return fullValue;
      }

      // 2. Cek apakah tersimpan sebagai single item di SecureStore
      const direct = await SecureStore.getItemAsync(key);
      if (direct) {
        return direct;
      }

      // 3. Migrasi otomatis sesi lama dari expo-sqlite/localStorage (plaintext)
      if (typeof localStorage !== "undefined") {
        const oldVal = localStorage.getItem(key);
        if (oldVal) {
          try {
            await this.setItem(key, oldVal);
            localStorage.removeItem(key);
            console.log(`Migrasi sesi lama untuk key "${key}" ke SecureStore berhasil.`);
            return oldVal;
          } catch (migErr) {
            console.log("Gagal memigrasikan sesi lama:", migErr);
            return oldVal;
          }
        }
      }

      return null;
    } catch (error) {
      console.log("secureStorage.getItem error:", error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(key, value);
        }
      } catch {}
      return;
    }

    try {
      // Hapus chunk lama jika ada
      const prevCountStr = await SecureStore.getItemAsync(`${key}_chunk_count`);
      if (prevCountStr) {
        const prevCount = parseInt(prevCountStr, 10);
        for (let i = 0; i < prevCount; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`).catch(() => {});
        }
      }

      // Potong menjadi chunks
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
      }
      await SecureStore.setItemAsync(`${key}_chunk_count`, String(chunks.length));

      // Hapus kunci unchunked lama dan localStorage jika tersisa
      await SecureStore.deleteItemAsync(key).catch(() => {});
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(key);
        }
      } catch {}
    } catch (error) {
      console.log("secureStorage.setItem error:", error);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(key);
        }
      } catch {}
      return;
    }

    try {
      const countStr = await SecureStore.getItemAsync(`${key}_chunk_count`);
      if (countStr) {
        const count = parseInt(countStr, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`).catch(() => {});
        }
        await SecureStore.deleteItemAsync(`${key}_chunk_count`).catch(() => {});
      }

      await SecureStore.deleteItemAsync(key).catch(() => {});

      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(key);
        }
      } catch {}
    } catch (error) {
      console.log("secureStorage.removeItem error:", error);
    }
  },
};
