import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": "http://localhost:3000",
      "/auth": "http://localhost:3000",
      "/ob3": "http://localhost:3000",
      "/ob": "http://localhost:3000",
      "/verify": "http://localhost:3000",
      "/uploads": "http://localhost:3000",
      "/offline-verify": "http://localhost:3000",
      "/invites": "http://localhost:3000",
      "/track": "http://localhost:3000",
    },
  },
});
