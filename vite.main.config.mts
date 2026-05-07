import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // Native Node addons (.node files) must not be bundled by Vite/Rollup.
      // better-sqlite3 uses a native binding and must be required at runtime.
      external: ["better-sqlite3"],
      output: {
        entryFileNames: "main.js",
      },
    },
  },
});
