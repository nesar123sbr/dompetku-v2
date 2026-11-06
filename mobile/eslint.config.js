// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      /**
       * React Compiler: seluruh manual memoization di kode sudah selaras / di-inline,
       * sehingga aturan ini aman dipromosikan kembali ke "error".
       */
      "react-hooks/preserve-manual-memoization": "error",
      /**
       * Aturan set-state-in-effect dipertahankan "warn" karena form kompleks
       * (transaksi, wallet, edit-transaksi) menggunakan sinkronisasi pemilihan default
       * saat daftar entitas SQLite dimuat (lihat docs/AUDIT_REPORT.md).
       */
      "react-hooks/set-state-in-effect": "warn",
      "import/namespace": "warn",
    },
  },
  {
    ignores: ["dist/*"],
  },
]);