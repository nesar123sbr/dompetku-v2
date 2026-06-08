// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      /**
       * SDK 56 membawa aturan React Hooks / React Compiler yang jauh lebih ketat.
       * Untuk fase upgrade aman, jadikan warning dulu supaya tidak perlu rewrite
       * flow state besar di transaksi, wallet, provider, dan sync.
       */
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    ignores: ["dist/*"],
  },
]);